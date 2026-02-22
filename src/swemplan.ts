/*************************************************************
 * swemplan.ts — Moshier semi-analytical planetary ephemeris
 * Translated from swemplan.c
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

import {
  J2000, J1900, B1950, STR, DEGTORAD, RADTODEG,
  OK, ERR,
  SEFLG_MOSEPH,
  MOSHPLEPH_START, MOSHPLEPH_END,
  SUN_EARTH_MRAT, EARTH_MOON_MRAT, KGAUSS,
  PLAN_SPEED_INTV,
  J_TO_J2000,
  SE_NFICT_ELEM,
  SEI_EMB, SEI_EARTH,
} from './constants';

import type { SweData, PlanData, Plantbl } from './types';

import {
  swiPolcart, swiCoortrf, swiCoortrf2, swiPrecess,
  swiMod2PI, swiKepler, swiEpsiln, sweDegnorm,
} from './swephlib';

import {
  mer404, ven404, ear404, mar404, jup404,
  sat404, ura404, nep404, plu404,
} from './swemptab';

/* ================================================================
 * Constants
 * ================================================================ */

const TIMESCALE = 3652500.0;
const FICT_GEO = 1;
const KGAUSS_GEO = 0.0000298122353216;

function mods3600(x: number): number {
  return x - 1.296e6 * Math.floor(x / 1.296e6);
}

/* ================================================================
 * Internal planet number → Moshier table index
 * ================================================================ */
const pnoint2msh = [2, 2, 0, 1, 3, 4, 5, 6, 7, 8];

/* From Simon et al. (1994): arc sec per 10000 Julian years */
const freqs = [
  53810162868.8982,
  21066413643.3548,
  12959774228.3429,
  6890507749.3988,
  1092566037.7991,
  439960985.5372,
  154248119.3933,
  78655032.0744,
  52272245.1795,
];

/* Arc sec */
const phases = [
  252.25090552 * 3600.0,
  181.97980085 * 3600.0,
  100.46645683 * 3600.0,
  355.43299958 * 3600.0,
  34.35151874 * 3600.0,
  50.07744430 * 3600.0,
  314.05500511 * 3600.0,
  304.34866548 * 3600.0,
  860492.1546,
];

const planets: readonly Plantbl[] = [
  mer404, ven404, ear404, mar404, jup404,
  sat404, ura404, nep404, plu404,
];

/* sin/cos lookup tables */
const ss: number[][] = Array.from({ length: 9 }, () => new Array(24).fill(0));
const cc: number[][] = Array.from({ length: 9 }, () => new Array(24).fill(0));

/* ================================================================
 * sscc: prepare sin/cos lookup table for multiple angles
 * ================================================================ */
function sscc(k: number, arg: number, n: number): void {
  const su = Math.sin(arg);
  const cu = Math.cos(arg);
  ss[k][0] = su;
  cc[k][0] = cu;
  let sv = 2.0 * su * cu;
  let cv = cu * cu - su * su;
  ss[k][1] = sv;
  cc[k][1] = cv;
  for (let i = 2; i < n; i++) {
    const s = su * cv + cu * sv;
    cv = cu * cv - su * sv;
    sv = s;
    ss[k][i] = sv;
    cc[k][i] = cv;
  }
}

/* ================================================================
 * swi_moshplan2: evaluate Moshier series for one planet
 *
 * Returns heliocentric ecliptic polar coordinates of equinox J2000:
 *   pobj[0] = longitude (radians)
 *   pobj[1] = latitude  (radians)
 *   pobj[2] = radius    (AU)
 * ================================================================ */
export function swiMoshplan2(J: number, iplm: number, pobj: Float64Array | number[]): number {
  const plan = planets[iplm];
  const T = (J - J2000) / TIMESCALE;

  /* Calculate sin(i*MM), cos(i*MM) for needed multiples */
  for (let i = 0; i < 9; i++) {
    const j = plan.maxHarmonic[i];
    if (j > 0) {
      const sr = (mods3600(freqs[i] * T) + phases[i]) * STR;
      sscc(i, sr, j);
    }
  }

  /* Pointers into tables (using indices) */
  let pi = 0;    // index into plan.argTbl
  let pli = 0;   // index into plan.lonTbl
  let pbi = 0;   // index into plan.latTbl
  let pri = 0;   // index into plan.radTbl

  let sl = 0.0, sb = 0.0, sr = 0.0;

  for (;;) {
    const np = plan.argTbl[pi++];
    if (np < 0) break;

    if (np === 0) {
      /* Polynomial term */
      const nt = plan.argTbl[pi++];
      /* Longitude polynomial */
      let cu = plan.lonTbl[pli++];
      for (let ip = 0; ip < nt; ip++) cu = cu * T + plan.lonTbl[pli++];
      sl += mods3600(cu);
      /* Latitude polynomial */
      cu = plan.latTbl[pbi++];
      for (let ip = 0; ip < nt; ip++) cu = cu * T + plan.latTbl[pbi++];
      sb += cu;
      /* Radius polynomial */
      cu = plan.radTbl[pri++];
      for (let ip = 0; ip < nt; ip++) cu = cu * T + plan.radTbl[pri++];
      sr += cu;
      continue;
    }

    /* Periodic term: build combined angle */
    let k1 = 0;
    let cv = 0.0, sv = 0.0;
    for (let ip = 0; ip < np; ip++) {
      let j = plan.argTbl[pi++];
      const m = plan.argTbl[pi++] - 1;
      if (j) {
        let k = j < 0 ? -j : j;
        k -= 1;
        let su = ss[m][k];
        if (j < 0) su = -su;
        const ccu = cc[m][k];
        if (k1 === 0) {
          sv = su;
          cv = ccu;
          k1 = 1;
        } else {
          const t = su * cv + ccu * sv;
          cv = ccu * cv - su * sv;
          sv = t;
        }
      }
    }

    /* Highest power of T */
    const nt = plan.argTbl[pi++];

    /* Longitude */
    let cul = plan.lonTbl[pli++];
    let sul = plan.lonTbl[pli++];
    for (let ip = 0; ip < nt; ip++) {
      cul = cul * T + plan.lonTbl[pli++];
      sul = sul * T + plan.lonTbl[pli++];
    }
    sl += cul * cv + sul * sv;

    /* Latitude */
    let cub = plan.latTbl[pbi++];
    let sub = plan.latTbl[pbi++];
    for (let ip = 0; ip < nt; ip++) {
      cub = cub * T + plan.latTbl[pbi++];
      sub = sub * T + plan.latTbl[pbi++];
    }
    sb += cub * cv + sub * sv;

    /* Radius */
    let cur = plan.radTbl[pri++];
    let sur = plan.radTbl[pri++];
    for (let ip = 0; ip < nt; ip++) {
      cur = cur * T + plan.radTbl[pri++];
      sur = sur * T + plan.radTbl[pri++];
    }
    sr += cur * cv + sur * sv;
  }

  pobj[0] = STR * sl;
  pobj[1] = STR * sb;
  pobj[2] = STR * plan.distance * sr + plan.distance;
  return OK;
}

/* ================================================================
 * embofs_mosh: EMB → Earth correction
 * ================================================================ */
function embofsMosh(swed: SweData, tjd: number, xemb: Float64Array | number[]): void {
  const seps = swed.oec.seps;
  const ceps = swed.oec.ceps;
  const T = (tjd - J1900) / 36525.0;

  /* Mean anomaly of moon (MP) */
  let a = sweDegnorm(((1.44e-5 * T + 0.009192) * T + 477198.8491) * T + 296.104608);
  a *= DEGTORAD;
  const smp = Math.sin(a);
  const cmp = Math.cos(a);
  const s2mp = 2.0 * smp * cmp;
  const c2mp = cmp * cmp - smp * smp;

  /* Mean elongation of moon (D) */
  a = sweDegnorm(((1.9e-6 * T - 0.001436) * T + 445267.1142) * T + 350.737486);
  a = 2.0 * DEGTORAD * a;
  const s2d = Math.sin(a);
  const c2d = Math.cos(a);

  /* Mean distance of moon from ascending node (F) */
  a = sweDegnorm(((-3.0e-7 * T - 0.003211) * T + 483202.0251) * T + 11.250889);
  a *= DEGTORAD;
  const sf = Math.sin(a);
  const cf = Math.cos(a);
  const s2f = 2.0 * sf * cf;
  const sx = s2d * cmp - c2d * smp; // sin(2D - MP)
  // const cx = c2d * cmp + s2d * smp; // cos(2D - MP) — not used for L

  /* Mean longitude of moon (LP) */
  let L = ((1.9e-6 * T - 0.001133) * T + 481267.8831) * T + 270.434164;
  /* Mean anomaly of sun (M) */
  const M = sweDegnorm(((-3.3e-6 * T - 1.50e-4) * T + 35999.0498) * T + 358.475833);

  /* Ecliptic longitude of the moon */
  L = L
    + 6.288750 * smp
    + 1.274018 * sx
    + 0.658309 * s2d
    + 0.213616 * s2mp
    - 0.185596 * Math.sin(DEGTORAD * M)
    - 0.114336 * s2f;

  /* Ecliptic latitude */
  const apl = smp * cf;
  const sxb = cmp * sf;
  let B = 5.128189 * sf
    + 0.280606 * (apl + sxb)
    + 0.277693 * (apl - sxb)
    + 0.173238 * (s2d * cf - c2d * sf);
  B *= DEGTORAD;

  /* Parallax of the moon */
  let p = 0.950724
    + 0.051818 * cmp
    + 0.009531 * (c2d * cmp + s2d * smp)
    + 0.007843 * c2d
    + 0.002824 * c2mp;
  p *= DEGTORAD;

  L = sweDegnorm(L);
  L *= DEGTORAD;

  /* Distance in AU */
  const dist = 4.263523e-5 / Math.sin(p);

  /* Convert to rectangular ecliptic */
  const xyz = [L, B, dist, 0, 0, 0];
  swiPolcart(xyz, xyz);
  /* Convert to equatorial */
  swiCoortrf2(xyz, xyz, -seps, ceps);
  /* Precess to J2000 */
  swiPrecess(xyz, tjd, 0, J_TO_J2000, swed);

  /* EMB → Earth */
  for (let i = 0; i <= 2; i++) {
    xemb[i] -= xyz[i] / (EARTH_MOON_MRAT + 1.0);
  }
}

/* ================================================================
 * swi_moshplan: compute Moshier ephemeris
 *
 * Returns heliocentric cartesian equatorial J2000 coordinates.
 * xpret: planet position+speed (6 doubles) or null
 * xeret: earth  position+speed (6 doubles) or null
 * ================================================================ */
export function swiMoshplan(
  swed: SweData,
  tjd: number,
  ipli: number,
  doSave: boolean,
  xpret: Float64Array | number[] | null,
  xeret: Float64Array | number[] | null,
): number {
  let doEarth = false;
  const dx = [0, 0, 0];
  const x2 = [0, 0, 0];
  const xxe = new Float64Array(6);
  const xxp = new Float64Array(6);
  const iplm = pnoint2msh[ipli];
  const pdp = swed.pldat[ipli];
  const pedp = swed.pldat[SEI_EARTH];
  const seps2000 = swed.oec2000.seps;
  const ceps2000 = swed.oec2000.ceps;

  let xp: Float64Array | number[];
  let xe: Float64Array | number[];
  if (doSave) {
    xp = pdp.x;
    xe = pedp.x;
  } else {
    xp = xxp;
    xe = xxe;
  }

  if (doSave || ipli === SEI_EARTH || xeret !== null) doEarth = true;

  /* Check range */
  if (tjd < MOSHPLEPH_START - 0.3 || tjd > MOSHPLEPH_END + 0.3) {
    return ERR;
  }

  /* Earth (for geocentric position) */
  if (doEarth) {
    if (tjd === pedp.teval && pedp.iephe === SEFLG_MOSEPH) {
      xe = pedp.x;
    } else {
      /* EMB heliocentric ecliptic 2000 polar */
      swiMoshplan2(tjd, pnoint2msh[SEI_EMB], xe);
      swiPolcart(xe, xe);
      swiCoortrf2(xe, xe, -seps2000, ceps2000);
      embofsMosh(swed, tjd, xe);
      if (doSave) {
        pedp.teval = tjd;
        pedp.xflgs = -1;
        pedp.iephe = SEFLG_MOSEPH;
      }
      /* Speed: one more position */
      swiMoshplan2(tjd - PLAN_SPEED_INTV, pnoint2msh[SEI_EMB], x2);
      swiPolcart(x2, x2);
      swiCoortrf2(x2, x2, -seps2000, ceps2000);
      embofsMosh(swed, tjd - PLAN_SPEED_INTV, x2);
      for (let i = 0; i <= 2; i++) dx[i] = (xe[i] - x2[i]) / PLAN_SPEED_INTV;
      for (let i = 0; i <= 2; i++) xe[i + 3] = dx[i];
    }
    if (xeret !== null) {
      for (let i = 0; i <= 5; i++) xeret[i] = xe[i];
    }
  }

  /* Earth is the planet wanted */
  if (ipli === SEI_EARTH) {
    xp = xe;
  } else {
    /* Other planet */
    if (tjd === pdp.teval && pdp.iephe === SEFLG_MOSEPH) {
      xp = pdp.x;
    } else {
      swiMoshplan2(tjd, iplm, xp);
      swiPolcart(xp, xp);
      swiCoortrf2(xp, xp, -seps2000, ceps2000);
      if (doSave) {
        pdp.teval = tjd;
        pdp.xflgs = -1;
        pdp.iephe = SEFLG_MOSEPH;
      }
      /* Speed */
      const dt = PLAN_SPEED_INTV;
      swiMoshplan2(tjd - dt, iplm, x2);
      swiPolcart(x2, x2);
      swiCoortrf2(x2, x2, -seps2000, ceps2000);
      for (let i = 0; i <= 2; i++) dx[i] = (xp[i] - x2[i]) / dt;
      for (let i = 0; i <= 2; i++) xp[i + 3] = dx[i];
    }
    if (xpret !== null) {
      for (let i = 0; i <= 5; i++) xpret[i] = xp[i];
    }
  }
  return OK;
}

/* ================================================================
 * Fictitious planets: built-in orbital elements
 * ================================================================ */

const planFictNam: readonly string[] = [
  'Cupido', 'Hades', 'Zeus', 'Kronos',
  'Apollon', 'Admetos', 'Vulkanus', 'Poseidon',
  'Isis-Transpluto', 'Nibiru', 'Harrington',
  'Leverrier', 'Adams',
  'Lowell', 'Pickering',
];

/** Neely's revised elements for Uranian planets */
const planOscuElem: readonly (readonly number[])[] = [
  [J1900, J1900, 163.7409, 40.99837, 0.00460, 171.4333, 129.8325, 1.0833], // Cupido
  [J1900, J1900, 27.6496, 50.66744, 0.00245, 148.1796, 161.3339, 1.0500],  // Hades
  [J1900, J1900, 165.1232, 59.21436, 0.00120, 299.0440, 0.0000, 0.0000],   // Zeus
  [J1900, J1900, 169.0193, 64.81960, 0.00305, 208.8801, 0.0000, 0.0000],   // Kronos
  [J1900, J1900, 138.0533, 70.29949, 0.00000, 0.0000, 0.0000, 0.0000],     // Apollon
  [J1900, J1900, 351.3350, 73.62765, 0.00000, 0.0000, 0.0000, 0.0000],     // Admetos
  [J1900, J1900, 55.8983, 77.25568, 0.00000, 0.0000, 0.0000, 0.0000],      // Vulcanus
  [J1900, J1900, 165.5163, 83.66907, 0.00000, 0.0000, 0.0000, 0.0000],     // Poseidon
  [2368547.66, 2431456.5, 0.0, 77.775, 0.3, 0.7, 0, 0],                    // Isis-Transpluto
  [1856113.380954, 1856113.380954, 0.0, 234.8921, 0.981092, 103.966, -44.567, 158.708], // Nibiru
  [2374696.5, J2000, 0.0, 101.2, 0.411, 208.5, 275.4, 32.4],               // Harrington
  [2395662.5, 2395662.5, 34.05, 36.15, 0.10761, 284.75, 0, 0],             // Leverrier's Neptune
  [2395662.5, 2395662.5, 24.28, 37.25, 0.12062, 299.11, 0, 0],             // Adams's Neptune
  [2425977.5, 2425977.5, 281, 43.0, 0.202, 204.9, 0, 0],                   // Lowell's Pluto
  [2425977.5, 2425977.5, 48.95, 55.1, 0.31, 280.1, 100, 15],               // Pickering's Pluto
];

export function swiGetFictName(ipl: number): string {
  if (ipl >= 0 && ipl < planFictNam.length) return planFictNam[ipl];
  return 'name not found';
}

/**
 * Read orbital elements for a fictitious planet.
 * In this React Native build, only built-in elements are supported
 * (no file reading).
 */
function readElements(ipl: number): {
  tjd0: number; tequ: number; mano: number; sema: number;
  ecce: number; parg: number; node: number; incl: number;
  fictIfl: number;
} | null {
  if (ipl < 0 || ipl >= SE_NFICT_ELEM) return null;
  const el = planOscuElem[ipl];
  return {
    tjd0: el[0],
    tequ: el[1],
    mano: el[2] * DEGTORAD,
    sema: el[3],
    ecce: el[4],
    parg: el[5] * DEGTORAD,
    node: el[6] * DEGTORAD,
    incl: el[7] * DEGTORAD,
    fictIfl: 0,
  };
}

/* ================================================================
 * swi_osc_el_plan: compute a planet from osculating elements
 * ================================================================ */
export function swiOscElPlan(
  swed: SweData,
  tjd: number,
  xp: Float64Array | number[],
  ipl: number,
  ipli: number,
  xearth: Float64Array | number[],
  xsun: Float64Array | number[],
): number {
  const el = readElements(ipl);
  if (el === null) return ERR;

  const { tjd0, tequ, mano, sema, ecce, parg, node, incl, fictIfl } = el;

  /* daily motion */
  let dmot = 0.9856076686 * DEGTORAD / sema / Math.sqrt(sema);
  if (fictIfl & FICT_GEO) dmot /= Math.sqrt(SUN_EARTH_MRAT);

  const cosnode = Math.cos(node);
  const sinnode = Math.sin(node);
  const cosincl = Math.cos(incl);
  const sinincl = Math.sin(incl);
  const cosparg = Math.cos(parg);
  const sinparg = Math.sin(parg);

  /* Gaussian vector */
  const pqr = [
    cosparg * cosnode - sinparg * cosincl * sinnode,
    -sinparg * cosnode - cosparg * cosincl * sinnode,
    sinincl * sinnode,
    cosparg * sinnode + sinparg * cosincl * cosnode,
    -sinparg * sinnode + cosparg * cosincl * cosnode,
    -sinincl * cosnode,
    sinparg * sinincl,
    cosparg * sinincl,
    cosincl,
  ];

  /* Kepler problem */
  let E = swiMod2PI(mano + (tjd - tjd0) * dmot);
  const M = E;

  /* Better E for very high eccentricity and small M */
  if (ecce > 0.975) {
    let M2 = M * RADTODEG;
    let M180or0 = 0;
    if (M2 > 150 && M2 < 210) {
      M2 -= 180;
      M180or0 = 180;
    }
    if (M2 > 330) M2 -= 360;
    let Msgn = 1;
    if (M2 < 0) {
      M2 = -M2;
      Msgn = -1;
    }
    if (M2 < 30) {
      M2 *= DEGTORAD;
      const alpha = (1 - ecce) / (4 * ecce + 0.5);
      const beta = M2 / (8 * ecce + 1);
      const zeta = Math.pow(beta + Math.sqrt(beta * beta + alpha * alpha), 1 / 3);
      let sigma = zeta - alpha / 2;
      sigma = sigma - 0.078 * sigma * sigma * sigma * sigma * sigma / (1 + ecce);
      E = Msgn * (M2 + ecce * (3 * sigma - 4 * sigma * sigma * sigma)) + M180or0;
    }
  }
  E = swiKepler(E, M, ecce);

  /* Position and speed, referred to orbital plane */
  let K: number;
  if (fictIfl & FICT_GEO) {
    K = KGAUSS_GEO / Math.sqrt(sema);
  } else {
    K = KGAUSS / Math.sqrt(sema);
  }
  const cose = Math.cos(E);
  const sine = Math.sin(E);
  const fac = Math.sqrt((1 - ecce) * (1 + ecce));
  const rho = 1 - ecce * cose;

  const x0 = sema * (cose - ecce);
  const x1 = sema * fac * sine;
  const x3 = -K * sine / rho;
  const x4 = K * fac * cose / rho;

  /* Transformation to ecliptic */
  xp[0] = pqr[0] * x0 + pqr[1] * x1;
  xp[1] = pqr[3] * x0 + pqr[4] * x1;
  xp[2] = pqr[6] * x0 + pqr[7] * x1;
  xp[3] = pqr[0] * x3 + pqr[1] * x4;
  xp[4] = pqr[3] * x3 + pqr[4] * x4;
  xp[5] = pqr[6] * x3 + pqr[7] * x4;

  /* Transformation to equator */
  const eps = swiEpsiln(tequ, 0, swed);
  swiCoortrf(xp, xp, -eps);
  swiCoortrf(xp, xp, -eps, 3, 3);  // xp+3

  /* Precess to J2000 */
  if (tequ !== J2000) {
    swiPrecess(xp, tequ, 0, J_TO_J2000, swed);
    /* precess speed part: copy xp[3..5] into temp, precess, copy back */
    const xpSpd = [xp[3], xp[4], xp[5]];
    swiPrecess(xpSpd, tequ, 0, J_TO_J2000, swed);
    xp[3] = xpSpd[0]; xp[4] = xpSpd[1]; xp[5] = xpSpd[2];
  }

  /* To solar system barycentre */
  if (fictIfl & FICT_GEO) {
    for (let i = 0; i <= 5; i++) xp[i] += xearth[i];
  } else {
    for (let i = 0; i <= 5; i++) xp[i] += xsun[i];
  }

  const pdp = swed.pldat[ipli];
  if (pdp.x === xp) {
    pdp.teval = tjd;
    pdp.iephe = swed.pldat[SEI_EARTH].iephe;
  }
  return OK;
}
