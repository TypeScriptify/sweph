/*************************************************************
 * Swiss Ephemeris house calculations
 * Translated from swehouse.c
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.
 * All rights reserved. (AGPL)
 *************************************************************/

import {
  DEGTORAD, RADTODEG, OK, ERR,
  SE_ASC, SE_MC, SE_ARMC, SE_NASCMC,
  SEFLG_SIDEREAL, SEFLG_SPEED, SEFLG_EQUATORIAL, SEFLG_NONUT, SEFLG_RADIANS,
  SE_SUN, SE_SIDM_FAGAN_BRADLEY,
  SE_SIDBIT_ECL_T0, SE_SIDBIT_SSY_PLANE,
  SSY_PLANE_NODE_E2000, SSY_PLANE_NODE, SSY_PLANE_INCL,
  J2000, J_TO_J2000, J2000_TO_J,
} from './constants';

import type { SweData, Houses } from './types';
import { createHouses } from './types';

import {
  sweDegnorm, sweDifdeg2n, sweRadnorm,
  sweCotrans,
  swiCoortrf, swiCartpol, swiPolcart, swiCartpolSp, swiPolcartSp,
  swiCrossProd, swiDotProdUnit,
  swiPrecess, swiEpsiln, swiNutation,
  sweDeltatEx, sweSidtime0,
} from './swephlib';

import {
  sweCalcUt, sweSetSidMode,
  sweGetAyanamsaEx, swiGetAyanamsaWithSpeed,
  swiInitSwedIfStart,
} from './sweph';

/* ---- Constants ---- */
const VERY_SMALL = 1e-10;
const MILLIARCSEC = 1.0 / 3600000.0;
const SOLAR_YEAR = 365.24219893;
const ARMCS = (SOLAR_YEAR + 1) / SOLAR_YEAR * 360;
const VERY_SMALL_PLAC_ITER = 1.0 / 360000.0;
const SUNSHINE_KEEP_MC_SOUTH = 0;

/* ---- Degree-based trig helpers ---- */
function sind(x: number): number { return Math.sin(x * DEGTORAD); }
function cosd(x: number): number { return Math.cos(x * DEGTORAD); }
function tand(x: number): number { return Math.tan(x * DEGTORAD); }
function asind(x: number): number { return Math.asin(x) * RADTODEG; }
function acosd(x: number): number { return Math.acos(x) * RADTODEG; }
function atand(x: number): number { return Math.atan(x) * RADTODEG; }

/* ==================================================================
 * Part 1: Core trig helpers
 * ================================================================== */

/**
 * Asc2 - oblique triangle solver
 * x in range 0..90, f in range -90..+90
 */
function asc2(x: number, f: number, sine: number, cose: number): number {
  let ass = -tand(f) * sine + cose * cosd(x);
  if (Math.abs(ass) < VERY_SMALL) ass = 0;
  let sinx = sind(x);
  if (Math.abs(sinx) < VERY_SMALL) sinx = 0;
  if (sinx === 0) {
    ass = ass < 0 ? -VERY_SMALL : VERY_SMALL;
  } else if (ass === 0) {
    ass = sinx < 0 ? -90 : 90;
  } else {
    ass = atand(sinx / ass);
  }
  if (ass < 0) ass = 180 + ass;
  return ass;
}

/**
 * Asc1 - ecliptic/great circle intersection
 * Prepare quadrants before doing the work in Asc2.
 */
function asc1(x1: number, f: number, sine: number, cose: number): number {
  x1 = sweDegnorm(x1);
  const n = Math.floor(x1 / 90) + 1;
  if (Math.abs(90 - f) < VERY_SMALL) return 180;
  if (Math.abs(90 + f) < VERY_SMALL) return 0;
  let ass: number;
  if (n === 1)
    ass = asc2(x1, f, sine, cose);
  else if (n === 2)
    ass = 180 - asc2(180 - x1, -f, sine, cose);
  else if (n === 3)
    ass = 180 + asc2(x1 - 180, -f, sine, cose);
  else
    ass = 360 - asc2(360 - x1, f, sine, cose);
  ass = sweDegnorm(ass);
  if (Math.abs(ass - 90) < VERY_SMALL) ass = 90;
  if (Math.abs(ass - 180) < VERY_SMALL) ass = 180;
  if (Math.abs(ass - 270) < VERY_SMALL) ass = 270;
  if (Math.abs(ass - 360) < VERY_SMALL) ass = 0;
  return ass;
}

/**
 * AscDash - derivative of Asc1 for speed computation
 */
function ascDash(x: number, f: number, sine: number, cose: number): number {
  const cosx = cosd(x);
  const sinx = sind(x);
  const sinx2 = sinx * sinx;
  const c = cose * cosx - tand(f) * sine;
  const d = sinx2 + c * c;
  let dudt: number;
  if (d > VERY_SMALL) {
    dudt = (cosx * c + cose * sinx2) / d;
  } else {
    dudt = 0;
  }
  return dudt * ARMCS;
}

/** ARMC → MC (private to this module) */
function armcToMc(armc: number, eps: number): number {
  const cose = cosd(eps);
  if (Math.abs(armc - 90) > VERY_SMALL && Math.abs(armc - 270) > VERY_SMALL) {
    const tant = tand(armc);
    let mc = sweDegnorm(atand(tant / cose));
    if (armc > 90 && armc <= 270)
      mc = sweDegnorm(mc + 180);
    return mc;
  } else {
    return Math.abs(armc - 90) <= VERY_SMALL ? 90 : 270;
  }
}

/** If ascendant is on western half of horizon, add 180° */
function fixAscPolar(asc: number, armc: number, eps: number, geolat: number): number {
  const demc = atand(sind(armc) * tand(eps));
  if (geolat >= 0 && 90 - geolat + demc < 0)
    asc = sweDegnorm(asc + 180);
  if (geolat < 0 && -90 - geolat + demc > 0)
    asc = sweDegnorm(asc + 180);
  return asc;
}

/** APC sector helper */
function apcSector(n: number, ph: number, e: number, az: number): number {
  let kv: number, dasc: number;
  let isBelow = 0;
  if (Math.abs(ph * RADTODEG) > 90 - VERY_SMALL) {
    kv = 0;
    dasc = 0;
  } else {
    kv = Math.atan(Math.tan(ph) * Math.tan(e) * Math.cos(az) / (1 + Math.tan(ph) * Math.tan(e) * Math.sin(az)));
    if (Math.abs(ph * RADTODEG) < VERY_SMALL) {
      dasc = (90 - VERY_SMALL) * DEGTORAD;
      if (ph < 0) dasc = -dasc;
    } else {
      dasc = Math.atan(Math.sin(kv) / Math.tan(ph));
    }
  }
  let k: number;
  if (n < 8) {
    isBelow = 1;
    k = n - 1;
  } else {
    k = n - 13;
  }
  let a: number;
  if (isBelow) {
    a = kv + az + Math.PI / 2 + k * (Math.PI / 2 - kv) / 3;
  } else {
    a = kv + az + Math.PI / 2 + k * (Math.PI / 2 + kv) / 3;
  }
  a = sweRadnorm(a);
  let dret = Math.atan2(
    Math.tan(dasc) * Math.tan(ph) * Math.sin(az) + Math.sin(a),
    Math.cos(e) * (Math.tan(dasc) * Math.tan(ph) * Math.cos(az) + Math.cos(a)) + Math.sin(e) * Math.tan(ph) * Math.sin(az - a)
  );
  dret = sweDegnorm(dret * RADTODEG);
  return dret;
}

/** Sunshine init - compute offsets on diurnal/nocturnal arcs */
function sunshineInit(lat: number, dec: number, xh: number[]): number {
  let ad: number;
  const arg = tand(dec) * tand(lat);
  if (arg >= 1) {
    ad = 90 - VERY_SMALL;
  } else if (arg <= -1) {
    ad = -90 + VERY_SMALL;
  } else {
    ad = asind(arg);
  }
  const nsa = 90 - ad;
  const dsa = 90 + ad;
  xh[2] = -2 * nsa / 3;
  xh[3] = -1 * nsa / 3;
  xh[5] = 1 * nsa / 3;
  xh[6] = 2 * nsa / 3;
  xh[8] = -2 * dsa / 3;
  xh[9] = -1 * dsa / 3;
  xh[11] = 1 * dsa / 3;
  xh[12] = 2 * dsa / 3;
  if (Math.abs(arg) >= 1) return ERR;
  return OK;
}

/** Sunshine solution - Makransky */
function sunshineSolutionMakransky(ramc: number, lat: number, ecl: number, hsp: Houses): number {
  const xh = new Array<number>(13).fill(0);
  const dec = hsp.sundec;
  const sinlat = sind(lat);
  const coslat = cosd(lat);
  const tanlat = tand(lat);
  const tandec = tand(dec);
  const sinecl = sind(ecl);
  if (sunshineInit(lat, dec, xh) === ERR) return ERR;
  for (let ih = 1; ih <= 12; ih++) {
    let z = 0;
    if ((ih - 1) % 3 === 0) continue;
    const md = Math.abs(xh[ih]);
    let rah: number;
    if (ih <= 6)
      rah = sweDegnorm(ramc + 180 + xh[ih]);
    else
      rah = sweDegnorm(ramc + xh[ih]);
    if (lat < 0) rah = sweDegnorm(180 + rah);
    let zd: number;
    if (md === 90) {
      zd = 90.0 - atand(sinlat * tandec);
    } else {
      let a: number;
      if (md < 90) {
        a = atand(coslat * tand(md));
      } else {
        a = atand(tand(md - 90) / coslat);
      }
      const b = atand(tanlat * cosd(md));
      let c: number;
      if (ih <= 6) c = b + dec;
      else c = b - dec;
      const f = atand(sinlat * sind(md) * tand(c));
      zd = a + f;
    }
    const pole = asind(sind(zd) * sinlat);
    const q = asind(tandec * tand(pole));
    let w: number;
    if (ih <= 3 || ih >= 11)
      w = sweDegnorm(rah - q);
    else
      w = sweDegnorm(rah + q);
    let cu: number;
    let r = 0;
    if (w === 90) {
      r = atand(sinecl * tand(pole));
      cu = (ih <= 3 || ih >= 11) ? 90 + r : 90 - r;
    } else if (w === 270) {
      r = atand(sinecl * tand(pole));
      cu = (ih <= 3 || ih >= 11) ? 270 - r : 270 + r;
    } else {
      const m = atand(Math.abs(tand(pole) / cosd(w)));
      if (ih <= 3 || ih >= 11) {
        z = (w > 90 && w < 270) ? m - ecl : m + ecl;
      } else {
        z = (w > 90 && w < 270) ? m + ecl : m - ecl;
      }
      if (z === 90) {
        cu = w < 180 ? 90 : 270;
      } else {
        r = atand(Math.abs(cosd(m) * tand(w) / cosd(z)));
        if (w < 90) cu = r;
        else if (w > 90 && w < 180) cu = 180 - r;
        else if (w > 180 && w < 270) cu = 180 + r;
        else cu = 360 - r;
      }
      if (z > 90) {
        if (w < 90) cu = 180 - r;
        else if (w > 90 && w < 180) cu = r;
        else if (w > 180 && w < 270) cu = 360 - r;
        else cu = 180 + r;
      }
      if (lat < 0) cu = sweDegnorm(cu + 180);
    }
    hsp.cusp[ih] = cu;
  }
  return OK;
}

/** Sunshine solution - Treindl */
function sunshineSolutionTreindl(ramc: number, lat: number, ecl: number, hsp: Houses): number {
  const xh = new Array<number>(13).fill(0);
  const dec = hsp.sundec;
  const sinlat = sind(lat);
  const coslat = cosd(lat);
  const cosdec = cosd(dec);
  const tandec = tand(dec);
  const sinecl = sind(ecl);
  const cosecl = cosd(ecl);
  let retval = OK;
  sunshineInit(lat, dec, xh);
  const mcdec = atand(sind(ramc) * tand(ecl));
  const mcUnderHorizon = Math.abs(lat - mcdec) > 90;
  if (mcUnderHorizon && SUNSHINE_KEEP_MC_SOUTH) {
    for (let ih = 2; ih <= 12; ih++) xh[ih] = -xh[ih];
  }
  for (let ih = 1; ih <= 12; ih++) {
    if ((ih - 1) % 3 === 0) continue;
    const xhs = 2 * asind(cosdec * sind(xh[ih] / 2));
    const cosa = tandec * tand(xhs / 2);
    const alph = acosd(cosa);
    let alpha2: number, b: number;
    if (ih > 7) {
      alpha2 = 180 - alph;
      b = 90 - lat + dec;
    } else {
      alpha2 = alph;
      b = 90 - lat - dec;
    }
    const cosc = cosd(xhs) * cosd(b) + sind(xhs) * sind(b) * cosd(alpha2);
    const c = acosd(cosc);
    if (c < 1e-6) {
      hsp.serr = `Sunshine house ${ih} c=${c} very small`;
      retval = ERR;
    }
    const sinzd = sind(xhs) * sind(alpha2) / sind(c);
    const zd = asind(sinzd);
    const rax = atand(coslat * tand(zd));
    let pole = asind(sinzd * sinlat);
    let a: number;
    if (ih <= 6) {
      pole = -pole;
      a = sweDegnorm(rax + ramc + 180);
    } else {
      a = sweDegnorm(ramc + rax);
    }
    const hc = asc1(a, pole, sinecl, cosecl);
    hsp.cusp[ih] = hc;
  }
  if (mcUnderHorizon && !SUNSHINE_KEEP_MC_SOUTH) {
    for (let ih = 2; ih <= 12; ih++) {
      if ((ih - 1) % 3 === 0) continue;
      hsp.cusp[ih] = sweDegnorm(hsp.cusp[ih] + 180);
    }
  }
  return retval;
}

/* ==================================================================
 * CalcH - main house calculation engine
 * ================================================================== */
function calcH(th: number, fi: number, ekl: number, hsy: string, hsp: Houses): number {
  let tanfi: number, cosfi: number, sinfi: number;
  let a: number, c: number, f: number, fh1: number, fh2: number;
  let xh1: number, xh2: number, rectasc: number, ad3: number, acmc: number, vemc: number;
  let i: number, retc = OK;
  const cose = cosd(ekl);
  const sine = sind(ekl);
  const tane = tand(ekl);
  const niterMax = 100;
  let cuspsv: number;
  let tant: number;
  hsp.serr = '';
  hsp.doInterpol = false;
  /* north and south poles */
  if (Math.abs(Math.abs(fi) - 90) < VERY_SMALL) {
    fi = fi < 0 ? -90 + VERY_SMALL : 90 - VERY_SMALL;
  }
  tanfi = tand(fi);
  /* mc */
  if (Math.abs(th - 90) > VERY_SMALL && Math.abs(th - 270) > VERY_SMALL) {
    tant = tand(th);
    hsp.mc = atand(tant / cose);
    if (th > 90 && th <= 270)
      hsp.mc = sweDegnorm(hsp.mc + 180);
  } else {
    hsp.mc = Math.abs(th - 90) <= VERY_SMALL ? 90 : 270;
  }
  hsp.mc = sweDegnorm(hsp.mc);
  if (hsp.doSpeed) hsp.mcSpeed = ascDash(th, 0, sine, cose);
  /* ascendant */
  hsp.ac = asc1(th + 90, fi, sine, cose);
  if (hsp.doSpeed) hsp.acSpeed = ascDash(th + 90, fi, sine, cose);
  if (hsp.doHspeed) {
    for (i = 0; i <= 12; i++) hsp.cuspSpeed[i] = 0;
  }
  hsp.armcSpeed = ARMCS;
  hsp.cusp[1] = hsp.ac;
  hsp.cusp[10] = hsp.mc;
  if (hsp.doHspeed) {
    hsp.cuspSpeed[1] = hsp.acSpeed;
    hsp.cuspSpeed[10] = hsp.mcSpeed;
  }
  /* lowercase letters (except 'i') are deprecated */
  if (hsy.charCodeAt(0) > 95 && hsy !== 'i') {
    hsp.serr = `use of lower case letters like ${hsy} for house systems is deprecated`;
    hsy = String.fromCharCode(hsy.charCodeAt(0) - 32);
  }

  // Label for porphyry fallback (replaces C goto)
  let doPorphyry = false;

  switch (hsy) {
  case 'A':
  case 'E': { /* equal houses */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
    }
    for (i = 2; i <= 12; i++)
      hsp.cusp[i] = sweDegnorm(hsp.cusp[1] + (i - 1) * 30);
    if (hsp.doHspeed) {
      for (i = 1; i <= 12; i++) hsp.cuspSpeed[i] = hsp.acSpeed;
    }
    break;
  }
  case 'D': { /* equal, begin at MC */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    hsp.cusp[10] = hsp.mc;
    for (i = 11; i <= 12; i++)
      hsp.cusp[i] = sweDegnorm(hsp.cusp[10] + (i - 10) * 30);
    for (i = 1; i <= 9; i++)
      hsp.cusp[i] = sweDegnorm(hsp.cusp[10] + (i + 2) * 30);
    if (hsp.doHspeed) {
      for (i = 1; i <= 12; i++) hsp.cuspSpeed[i] = hsp.mcSpeed;
    }
    break;
  }
  case 'C': { /* Campanus */
    fh1 = asind(sind(fi) / 2);
    fh2 = asind(Math.sqrt(3) / 2 * sind(fi));
    cosfi = cosd(fi);
    if (Math.abs(cosfi) === 0) {
      if (fi > 0) xh1 = xh2 = 90;
      else xh1 = xh2 = 270;
    } else {
      xh1 = atand(Math.sqrt(3) / cosfi);
      xh2 = atand(1 / Math.sqrt(3) / cosfi);
    }
    hsp.cusp[11] = asc1(th + 90 - xh1, fh1, sine, cose);
    hsp.cusp[12] = asc1(th + 90 - xh2, fh2, sine, cose);
    hsp.cusp[2] = asc1(th + 90 + xh2, fh2, sine, cose);
    hsp.cusp[3] = asc1(th + 90 + xh1, fh1, sine, cose);
    if (hsp.doHspeed) {
      hsp.cuspSpeed[11] = ascDash(th + 90 - xh1, fh1, sine, cose);
      hsp.cuspSpeed[12] = ascDash(th + 90 - xh2, fh2, sine, cose);
      hsp.cuspSpeed[2] = ascDash(th + 90 + xh2, fh2, sine, cose);
      hsp.cuspSpeed[3] = ascDash(th + 90 + xh1, fh1, sine, cose);
    }
    if (Math.abs(fi) >= 90 - ekl) {
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
      if (acmc < 0) {
        hsp.ac = sweDegnorm(hsp.ac + 180);
        hsp.mc = sweDegnorm(hsp.mc + 180);
        for (i = 1; i <= 12; i++) {
          if (i >= 4 && i < 10) continue;
          hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
        }
      }
    }
    break;
  }
  case 'H': { /* Horizon / Azimut */
    if (fi > 0) fi = 90 - fi;
    else fi = -90 - fi;
    if (Math.abs(Math.abs(fi) - 90) < VERY_SMALL) {
      fi = fi < 0 ? -90 + VERY_SMALL : 90 - VERY_SMALL;
    }
    th = sweDegnorm(th + 180);
    fh1 = asind(sind(fi) / 2);
    fh2 = asind(Math.sqrt(3) / 2 * sind(fi));
    cosfi = cosd(fi);
    if (Math.abs(cosfi) === 0) {
      if (fi > 0) xh1 = xh2 = 90;
      else xh1 = xh2 = 270;
    } else {
      xh1 = atand(Math.sqrt(3) / cosfi);
      xh2 = atand(1 / Math.sqrt(3) / cosfi);
    }
    hsp.cusp[11] = asc1(th + 90 - xh1, fh1, sine, cose);
    hsp.cusp[12] = asc1(th + 90 - xh2, fh2, sine, cose);
    hsp.cusp[1] = asc1(th + 90, fi, sine, cose);
    hsp.cusp[2] = asc1(th + 90 + xh2, fh2, sine, cose);
    hsp.cusp[3] = asc1(th + 90 + xh1, fh1, sine, cose);
    if (hsp.doHspeed) {
      hsp.cuspSpeed[11] = ascDash(th + 90 - xh1, fh1, sine, cose);
      hsp.cuspSpeed[12] = ascDash(th + 90 - xh2, fh2, sine, cose);
      hsp.cuspSpeed[1] = ascDash(th + 90, fi, sine, cose);
      hsp.cuspSpeed[2] = ascDash(th + 90 + xh2, fh2, sine, cose);
      hsp.cuspSpeed[3] = ascDash(th + 90 + xh1, fh1, sine, cose);
    }
    if (Math.abs(fi) >= 90 - ekl) {
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
      if (acmc < 0) {
        hsp.ac = sweDegnorm(hsp.ac + 180);
        hsp.mc = sweDegnorm(hsp.mc + 180);
        for (i = 1; i <= 12; i++) {
          if (i >= 4 && i < 10) continue;
          hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
        }
      }
    }
    for (i = 1; i <= 3; i++) hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
    for (i = 11; i <= 12; i++) hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
    /* restore fi and th */
    if (fi > 0) fi = 90 - fi;
    else fi = -90 - fi;
    th = sweDegnorm(th + 180);
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    break;
  }
  case 'I':
  case 'i': { /* Sunshine houses */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
      if (!SUNSHINE_KEEP_MC_SOUTH && hsy === 'I') {
        hsp.mc = sweDegnorm(hsp.mc + 180);
        hsp.cusp[10] = hsp.mc;
      }
    }
    hsp.cusp[4] = sweDegnorm(hsp.cusp[10] + 180);
    hsp.cusp[7] = sweDegnorm(hsp.cusp[1] + 180);
    if (hsy === 'I') {
      retc = sunshineSolutionTreindl(th, fi, ekl, hsp);
    } else {
      retc = sunshineSolutionMakransky(th, fi, ekl, hsp);
    }
    if (retc === ERR) {
      hsp.serr = 'within polar circle, switched to Porphyry';
      doPorphyry = true;
    } else {
      hsp.doInterpol = hsp.doHspeed;
    }
    break;
  }
  case 'J': { /* Savard-A */
    sinfi = sind(fi);
    cosfi = cosd(fi);
    let xs1: number, xs2: number;
    if (Math.abs(fi) < VERY_SMALL) {
      xs2 = 1 / 3.0;
      xs1 = 2 / 3.0;
    } else {
      xs2 = sind(fi / 3) / sinfi;
      xs1 = sind(2 * fi / 3) / sinfi;
    }
    xs2 = asind(xs2);
    xs1 = asind(xs1);
    if (cosfi === 0) {
      if (fi > 0) xh1 = xh2 = 90;
      else xh1 = xh2 = 270;
    } else {
      xh1 = atand(tand(xs1) / cosfi);
      xh2 = atand(tand(xs2) / cosfi);
    }
    fh1 = asind(sind(fi) * sind(90 - xs1));
    fh2 = asind(sind(fi) * sind(90 - xs2));
    hsp.cusp[12] = asc1(th + 90 - xh2, fh2, sine, cose);
    hsp.cusp[11] = asc1(th + 90 - xh1, fh1, sine, cose);
    hsp.cusp[2] = asc1(th + 90 + xh2, fh2, sine, cose);
    hsp.cusp[3] = asc1(th + 90 + xh1, fh1, sine, cose);
    if (hsp.doHspeed) {
      hsp.cuspSpeed[11] = ascDash(th + 90 - xh1, fh1, sine, cose);
      hsp.cuspSpeed[12] = ascDash(th + 90 - xh2, fh2, sine, cose);
      hsp.cuspSpeed[3] = ascDash(th + 90 + xh1, fh1, sine, cose);
      hsp.cuspSpeed[2] = ascDash(th + 90 + xh2, fh2, sine, cose);
    }
    if (Math.abs(fi) >= 90 - ekl) {
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
      if (acmc < 0) {
        hsp.ac = sweDegnorm(hsp.ac + 180);
        hsp.mc = sweDegnorm(hsp.mc + 180);
        for (i = 1; i <= 12; i++) {
          if (i >= 4 && i < 10) continue;
          hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
        }
      }
    }
    break;
  }
  case 'K': { /* Koch */
    if (Math.abs(fi) >= 90 - ekl) {
      retc = ERR;
      hsp.serr = 'within polar circle, switched to Porphyry';
      doPorphyry = true;
      break;
    }
    let sina = sind(hsp.mc) * sine / cosd(fi);
    if (sina > 1) sina = 1;
    if (sina < -1) sina = -1;
    const cosa = Math.sqrt(1 - sina * sina);
    c = atand(tanfi / cosa);
    ad3 = asind(sind(c) * sina) / 3.0;
    hsp.cusp[11] = asc1(th + 30 - 2 * ad3, fi, sine, cose);
    hsp.cusp[12] = asc1(th + 60 - ad3, fi, sine, cose);
    hsp.cusp[2] = asc1(th + 120 + ad3, fi, sine, cose);
    hsp.cusp[3] = asc1(th + 150 + 2 * ad3, fi, sine, cose);
    if (hsp.doHspeed) {
      hsp.cuspSpeed[11] = ascDash(th + 30 - 2 * ad3, fi, sine, cose);
      hsp.cuspSpeed[12] = ascDash(th + 60 - ad3, fi, sine, cose);
      hsp.cuspSpeed[2] = ascDash(th + 120 + ad3, fi, sine, cose);
      hsp.cuspSpeed[3] = ascDash(th + 150 + 2 * ad3, fi, sine, cose);
    }
    break;
  }
  case 'L': { /* Pullen SD sinusoidal delta */
    let d: number, q1: number;
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    }
    q1 = 180 - acmc;
    d = (acmc - 90) / 4.0;
    if (acmc <= 30) {
      hsp.cusp[11] = hsp.cusp[12] = sweDegnorm(hsp.mc + acmc / 2);
    } else {
      hsp.cusp[11] = sweDegnorm(hsp.mc + 30 + d);
      hsp.cusp[12] = sweDegnorm(hsp.mc + 60 + 3 * d);
    }
    d = (q1 - 90) / 4.0;
    if (q1 <= 30) {
      hsp.cusp[2] = hsp.cusp[3] = sweDegnorm(hsp.ac + q1 / 2);
    } else {
      hsp.cusp[2] = sweDegnorm(hsp.ac + 30 + d);
      hsp.cusp[3] = sweDegnorm(hsp.ac + 60 + 3 * d);
    }
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'N': { /* equal/1=Aries */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    for (i = 1; i <= 12; i++) hsp.cusp[i] = (i - 1) * 30.0;
    break;
  }
  case 'O': { /* Porphyry */
    doPorphyry = true;
    break;
  }
  case 'Q': { /* Pullen sinusoidal ratio */
    const third = 1.0 / 3.0;
    const two23 = Math.pow(2.0 * 2.0, third);
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    }
    let q = acmc;
    if (q > 90) q = 180 - q;
    let x: number, xr: number, xr3: number, xr4: number;
    if (q < 1e-30) {
      x = xr = xr3 = 0;
      xr4 = 180;
    } else {
      const cc = (180 - q) / q;
      const csq = cc * cc;
      const ccr = Math.pow(csq - cc, third);
      const cqx = Math.sqrt(two23 * ccr + 1.0);
      const r1 = 0.5 * cqx;
      const r2 = 0.5 * Math.sqrt(-2 * (1 - 2 * cc) / cqx - two23 * ccr + 2);
      const r = r1 + r2 - 0.5;
      x = q / (2 * r + 1);
      xr = r * x;
      xr3 = xr * r * r;
      xr4 = xr3 * r;
    }
    if (acmc > 90) {
      hsp.cusp[11] = sweDegnorm(hsp.mc + xr3);
      hsp.cusp[12] = sweDegnorm(hsp.cusp[11] + xr4);
      hsp.cusp[2] = sweDegnorm(hsp.ac + xr);
      hsp.cusp[3] = sweDegnorm(hsp.cusp[2] + x);
    } else {
      hsp.cusp[11] = sweDegnorm(hsp.mc + xr);
      hsp.cusp[12] = sweDegnorm(hsp.cusp[11] + x);
      hsp.cusp[2] = sweDegnorm(hsp.ac + xr3);
      hsp.cusp[3] = sweDegnorm(hsp.cusp[2] + xr4);
    }
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'R': { /* Regiomontanus */
    fh1 = atand(tanfi * 0.5);
    fh2 = atand(tanfi * cosd(30));
    hsp.cusp[11] = asc1(30 + th, fh1, sine, cose);
    hsp.cusp[12] = asc1(60 + th, fh2, sine, cose);
    hsp.cusp[2] = asc1(120 + th, fh2, sine, cose);
    hsp.cusp[3] = asc1(150 + th, fh1, sine, cose);
    if (hsp.doHspeed) {
      hsp.cuspSpeed[11] = ascDash(30 + th, fh1, sine, cose);
      hsp.cuspSpeed[12] = ascDash(60 + th, fh2, sine, cose);
      hsp.cuspSpeed[2] = ascDash(120 + th, fh2, sine, cose);
      hsp.cuspSpeed[3] = ascDash(150 + th, fh1, sine, cose);
    }
    if (Math.abs(fi) >= 90 - ekl) {
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
      if (acmc < 0) {
        hsp.ac = sweDegnorm(hsp.ac + 180);
        hsp.mc = sweDegnorm(hsp.mc + 180);
        for (i = 1; i <= 12; i++) {
          if (i >= 4 && i < 10) continue;
          hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
        }
      }
    }
    break;
  }
  case 'S': { /* Sripati */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    }
    const q1 = 180 - acmc;
    const s1 = q1 / 3.0;
    const s4 = acmc / 3.0;
    hsp.cusp[1] = sweDegnorm(hsp.ac - s4 * 0.5);
    hsp.cusp[2] = sweDegnorm(hsp.ac + s1 * 0.5);
    hsp.cusp[3] = sweDegnorm(hsp.ac + s1 * 1.5);
    hsp.cusp[10] = sweDegnorm(hsp.mc - s1 * 0.5);
    hsp.cusp[11] = sweDegnorm(hsp.mc + s4 * 0.5);
    hsp.cusp[12] = sweDegnorm(hsp.mc + s4 * 1.5);
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'T': { /* Topocentric (Polich/Page) */
    fh1 = atand(tanfi / 3.0);
    fh2 = atand(tanfi * 2.0 / 3.0);
    hsp.cusp[11] = asc1(30 + th, fh1, sine, cose);
    hsp.cusp[12] = asc1(60 + th, fh2, sine, cose);
    hsp.cusp[2] = asc1(120 + th, fh2, sine, cose);
    hsp.cusp[3] = asc1(150 + th, fh1, sine, cose);
    if (hsp.doHspeed) {
      hsp.cuspSpeed[11] = ascDash(30 + th, fh1, sine, cose);
      hsp.cuspSpeed[12] = ascDash(60 + th, fh2, sine, cose);
      hsp.cuspSpeed[2] = ascDash(120 + th, fh2, sine, cose);
      hsp.cuspSpeed[3] = ascDash(150 + th, fh1, sine, cose);
    }
    if (Math.abs(fi) >= 90 - ekl) {
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
      if (acmc < 0) {
        hsp.ac = sweDegnorm(hsp.ac + 180);
        hsp.mc = sweDegnorm(hsp.mc + 180);
        for (i = 1; i <= 12; i++)
          hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
      }
    }
    break;
  }
  case 'V': { /* Vehlow */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    hsp.cusp[1] = sweDegnorm(hsp.ac - 15);
    for (i = 2; i <= 12; i++)
      hsp.cusp[i] = sweDegnorm(hsp.cusp[1] + (i - 1) * 30);
    if (hsp.doHspeed) {
      for (i = 1; i <= 12; i++) hsp.cuspSpeed[i] = hsp.acSpeed;
    }
    break;
  }
  case 'W': { /* Whole sign */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
    }
    hsp.cusp[1] = hsp.ac - (hsp.ac % 30);
    for (i = 2; i <= 12; i++)
      hsp.cusp[i] = sweDegnorm(hsp.cusp[1] + (i - 1) * 30);
    break;
  }
  case 'X': { /* Meridian/axial rotation */
    a = th;
    for (i = 1; i <= 12; i++) {
      let j = i + 10;
      if (j > 12) j -= 12;
      a = sweDegnorm(a + 30);
      if (Math.abs(a - 90) > VERY_SMALL && Math.abs(a - 270) > VERY_SMALL) {
        tant = tand(a);
        hsp.cusp[j] = atand(tant / cose);
        if (a > 90 && a <= 270)
          hsp.cusp[j] = sweDegnorm(hsp.cusp[j] + 180);
      } else {
        hsp.cusp[j] = Math.abs(a - 90) <= VERY_SMALL ? 90 : 270;
      }
      hsp.cusp[j] = sweDegnorm(hsp.cusp[j]);
    }
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'M': { /* Morinus */
    a = th;
    const x3 = [0, 0, 0];
    for (i = 1; i <= 12; i++) {
      let j = i + 10;
      if (j > 12) j -= 12;
      a = sweDegnorm(a + 30);
      x3[0] = a;
      x3[1] = 0;
      sweCotrans(x3, x3, ekl);
      hsp.cusp[j] = x3[0];
    }
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'F': { /* Carter poli-equatorial */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
    }
    const x3 = [hsp.ac, 0, 0];
    sweCotrans(x3, x3, -ekl);
    a = x3[0];
    for (i = 2; i <= 12; i++) {
      if (i <= 3 || i >= 10) {
        const ra = sweDegnorm(a + (i - 1) * 30);
        if (Math.abs(ra - 90) > VERY_SMALL && Math.abs(ra - 270) > VERY_SMALL) {
          tant = tand(ra);
          hsp.cusp[i] = atand(tant / cose);
          if (ra > 90 && ra <= 270)
            hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
        } else {
          hsp.cusp[i] = Math.abs(ra - 90) <= VERY_SMALL ? 90 : 270;
        }
        hsp.cusp[i] = sweDegnorm(hsp.cusp[i]);
      }
    }
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'B': { /* Alcabitius */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    }
    const dek = asind(sind(hsp.ac) * sine);
    let r = -tanfi * tand(dek);
    if (r > 1) r = 1;
    if (r < -1) r = -1;
    const sda = acosd(r);
    const sna = 180 - sda;
    const sd3 = sda / 3;
    const sn3 = sna / 3;
    rectasc = sweDegnorm(th + sd3);
    hsp.cusp[11] = asc1(rectasc, 0, sine, cose);
    rectasc = sweDegnorm(th + 2 * sd3);
    hsp.cusp[12] = asc1(rectasc, 0, sine, cose);
    rectasc = sweDegnorm(th + 180 - 2 * sn3);
    hsp.cusp[2] = asc1(rectasc, 0, sine, cose);
    rectasc = sweDegnorm(th + 180 - sn3);
    hsp.cusp[3] = asc1(rectasc, 0, sine, cose);
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  case 'G': { /* 36 Gauquelin sectors */
    for (i = 1; i <= 36; i++) {
      hsp.cusp[i] = 0;
      hsp.cuspSpeed[i] = 0;
    }
    if (Math.abs(fi) >= 90 - ekl) {
      retc = ERR;
      hsp.serr = 'within polar circle, switched to Porphyry';
      doPorphyry = true;
      break;
    }
    a = asind(tand(fi) * tane);
    /* forth/second quarter */
    for (let ih = 2; ih <= 9; ih++) {
      const ih2 = 10 - ih;
      fh1 = atand(sind(a * ih2 / 9) / tane);
      rectasc = sweDegnorm((90 / 9) * ih2 + th);
      tant = tand(asind(sine * sind(asc1(rectasc, fh1, sine, cose))));
      if (Math.abs(tant) < VERY_SMALL) {
        hsp.cusp[ih] = rectasc;
        if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
      } else {
        f = atand(sind(asind(tanfi * tant) * ih2 / 9) / tant);
        hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
        cuspsv = 0;
        let ii: number;
        for (ii = 1; ii <= niterMax; ii++) {
          tant = tand(asind(sine * sind(hsp.cusp[ih])));
          if (Math.abs(tant) < VERY_SMALL) {
            hsp.cusp[ih] = rectasc;
            if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
            break;
          }
          f = atand(sind(asind(tanfi * tant) * ih2 / 9) / tant);
          hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
          if (ii > 1 && Math.abs(sweDifdeg2n(hsp.cusp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER)
            break;
          cuspsv = hsp.cusp[ih];
        }
        if (ii >= niterMax) {
          retc = ERR;
          hsp.serr = 'very close to polar circle, switched to Porphyry';
          doPorphyry = true;
          break;
        }
        if (hsp.doHspeed) hsp.cuspSpeed[ih] = ascDash(rectasc, f, sine, cose);
      }
      if (doPorphyry) break;
      hsp.cusp[ih + 18] = sweDegnorm(hsp.cusp[ih] + 180);
      if (hsp.doHspeed) hsp.cuspSpeed[ih + 18] = hsp.cuspSpeed[ih];
    }
    if (!doPorphyry) {
      /* first/third quarter */
      for (let ih = 29; ih <= 36; ih++) {
        const ih2 = ih - 28;
        fh1 = atand(sind(a * ih2 / 9) / tane);
        rectasc = sweDegnorm(180 - ih2 * 90 / 9 + th);
        tant = tand(asind(sine * sind(asc1(rectasc, fh1, sine, cose))));
        if (Math.abs(tant) < VERY_SMALL) {
          hsp.cusp[ih] = rectasc;
          if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
        } else {
          f = atand(sind(asind(tanfi * tant) * ih2 / 9) / tant);
          hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
          cuspsv = 0;
          let ii: number;
          for (ii = 1; ii <= niterMax; ii++) {
            tant = tand(asind(sine * sind(hsp.cusp[ih])));
            if (Math.abs(tant) < VERY_SMALL) {
              hsp.cusp[ih] = rectasc;
              if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
              break;
            }
            f = atand(sind(asind(tanfi * tant) * ih2 / 9) / tant);
            hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
            if (ii > 1 && Math.abs(sweDifdeg2n(hsp.cusp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER)
              break;
            cuspsv = hsp.cusp[ih];
          }
          if (ii >= niterMax) {
            retc = ERR;
            hsp.serr = 'very close to polar circle, switched to Porphyry';
            doPorphyry = true;
            break;
          }
          if (hsp.doHspeed) hsp.cuspSpeed[ih] = ascDash(rectasc, f, sine, cose);
        }
        if (doPorphyry) break;
        hsp.cusp[ih - 18] = sweDegnorm(hsp.cusp[ih] + 180);
        if (hsp.doHspeed) hsp.cuspSpeed[ih - 18] = hsp.cuspSpeed[ih];
      }
    }
    if (!doPorphyry) {
      hsp.cusp[1] = hsp.ac;
      hsp.cusp[10] = hsp.mc;
      hsp.cusp[19] = sweDegnorm(hsp.ac + 180);
      hsp.cusp[28] = sweDegnorm(hsp.mc + 180);
      if (hsp.doHspeed) {
        hsp.cuspSpeed[1] = hsp.acSpeed;
        hsp.cuspSpeed[10] = hsp.mcSpeed;
        hsp.cuspSpeed[19] = hsp.acSpeed;
        hsp.cuspSpeed[28] = hsp.mcSpeed;
      }
    }
    break;
  }
  case 'U': { /* Krusinski-Pisa */
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) hsp.ac = sweDegnorm(hsp.ac + 180);
    const xk = [hsp.ac, 0, 1];
    sweCotrans(xk, xk, -ekl);
    xk[0] = xk[0] - (th - 90);
    sweCotrans(xk, xk, -(90 - fi));
    const krHorizonLon = xk[0];
    xk[0] = 0;
    sweCotrans(xk, xk, -90);
    for (i = 0; i < 6; i++) {
      xk[0] = 30.0 * i;
      xk[1] = 0;
      sweCotrans(xk, xk, 90);
      xk[0] = xk[0] + krHorizonLon;
      sweCotrans(xk, xk, 90 - fi);
      xk[0] = sweDegnorm(xk[0] + (th - 90));
      hsp.cusp[i + 1] = atand(tand(xk[0]) / cosd(ekl));
      if (xk[0] > 90 && xk[0] <= 270)
        hsp.cusp[i + 1] = sweDegnorm(hsp.cusp[i + 1] + 180);
      hsp.cusp[i + 1] = sweDegnorm(hsp.cusp[i + 1]);
      hsp.cusp[i + 7] = sweDegnorm(hsp.cusp[i + 1] + 180);
    }
    break;
  }
  case 'Y': { /* APC houses */
    for (i = 1; i <= 12; i++) {
      hsp.cusp[i] = apcSector(i, fi * DEGTORAD, ekl * DEGTORAD, th * DEGTORAD);
    }
    hsp.cusp[10] = hsp.mc;
    hsp.cusp[4] = sweDegnorm(hsp.mc + 180);
    if (Math.abs(fi) >= 90 - ekl) {
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
      if (acmc < 0) {
        hsp.ac = sweDegnorm(hsp.ac + 180);
        hsp.mc = sweDegnorm(hsp.mc + 180);
        for (i = 1; i <= 12; i++)
          hsp.cusp[i] = sweDegnorm(hsp.cusp[i] + 180);
      }
    }
    hsp.doInterpol = hsp.doHspeed;
    break;
  }
  default: { /* Placidus (default) */
    if (Math.abs(fi) >= 90 - ekl) {
      retc = ERR;
      hsp.serr = 'within polar circle, switched to Porphyry';
      doPorphyry = true;
      break;
    }
    a = asind(tand(fi) * tane);
    fh1 = atand(sind(a / 3) / tane);
    fh2 = atand(sind(a * 2 / 3) / tane);
    /* house 11 */
    rectasc = sweDegnorm(30 + th);
    tant = tand(asind(sine * sind(asc1(rectasc, fh1, sine, cose))));
    let ih = 11;
    if (Math.abs(tant) < VERY_SMALL) {
      hsp.cusp[ih] = rectasc;
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
    } else {
      f = atand(sind(asind(tanfi * tant) / 3) / tant);
      hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
      cuspsv = 0;
      let ii: number;
      for (ii = 1; ii <= niterMax; ii++) {
        tant = tand(asind(sine * sind(hsp.cusp[ih])));
        if (Math.abs(tant) < VERY_SMALL) {
          hsp.cusp[ih] = rectasc;
          if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
          break;
        }
        f = atand(sind(asind(tanfi * tant) / 3) / tant);
        hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
        if (ii > 1 && Math.abs(sweDifdeg2n(hsp.cusp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER)
          break;
        cuspsv = hsp.cusp[ih];
      }
      if (ii >= niterMax) {
        retc = ERR;
        hsp.serr = 'very close to polar circle, switched to Porphyry';
        doPorphyry = true;
        break;
      }
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = ascDash(rectasc, f, sine, cose);
    }
    if (doPorphyry) break;
    /* house 12 */
    rectasc = sweDegnorm(60 + th);
    tant = tand(asind(sine * sind(asc1(rectasc, fh2, sine, cose))));
    ih = 12;
    if (Math.abs(tant) < VERY_SMALL) {
      hsp.cusp[ih] = rectasc;
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
    } else {
      f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
      hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
      cuspsv = 0;
      let ii: number;
      for (ii = 1; ii <= niterMax; ii++) {
        tant = tand(asind(sine * sind(hsp.cusp[ih])));
        if (Math.abs(tant) < VERY_SMALL) {
          hsp.cusp[ih] = rectasc;
          if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
          break;
        }
        f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
        hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
        if (ii > 1 && Math.abs(sweDifdeg2n(hsp.cusp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER)
          break;
        cuspsv = hsp.cusp[ih];
      }
      if (ii >= niterMax) {
        retc = ERR;
        hsp.serr = 'very close to polar circle, switched to Porphyry';
        doPorphyry = true;
        break;
      }
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = ascDash(rectasc, f, sine, cose);
    }
    if (doPorphyry) break;
    /* house 2 */
    rectasc = sweDegnorm(120 + th);
    tant = tand(asind(sine * sind(asc1(rectasc, fh2, sine, cose))));
    ih = 2;
    if (Math.abs(tant) < VERY_SMALL) {
      hsp.cusp[ih] = rectasc;
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
    } else {
      f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
      hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
      cuspsv = 0;
      let ii: number;
      for (ii = 1; ii <= niterMax; ii++) {
        tant = tand(asind(sine * sind(hsp.cusp[ih])));
        if (Math.abs(tant) < VERY_SMALL) {
          hsp.cusp[ih] = rectasc;
          if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
          break;
        }
        f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
        hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
        if (ii > 1 && Math.abs(sweDifdeg2n(hsp.cusp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER)
          break;
        cuspsv = hsp.cusp[ih];
      }
      if (ii >= niterMax) {
        retc = ERR;
        hsp.serr = 'very close to polar circle, switched to Porphyry';
        doPorphyry = true;
        break;
      }
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = ascDash(rectasc, f, sine, cose);
    }
    if (doPorphyry) break;
    /* house 3 */
    rectasc = sweDegnorm(150 + th);
    tant = tand(asind(sine * sind(asc1(rectasc, fh1, sine, cose))));
    ih = 3;
    if (Math.abs(tant) < VERY_SMALL) {
      hsp.cusp[ih] = rectasc;
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
    } else {
      f = atand(sind(asind(tanfi * tant) / 3) / tant);
      hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
      cuspsv = 0;
      let ii: number;
      for (ii = 1; ii <= niterMax; ii++) {
        tant = tand(asind(sine * sind(hsp.cusp[ih])));
        if (Math.abs(tant) < VERY_SMALL) {
          hsp.cusp[ih] = rectasc;
          if (hsp.doHspeed) hsp.cuspSpeed[ih] = hsp.armcSpeed;
          break;
        }
        f = atand(sind(asind(tanfi * tant) / 3) / tant);
        hsp.cusp[ih] = asc1(rectasc, f, sine, cose);
        if (ii > 1 && Math.abs(sweDifdeg2n(hsp.cusp[ih], cuspsv)) < VERY_SMALL_PLAC_ITER)
          break;
        cuspsv = hsp.cusp[ih];
      }
      if (ii >= niterMax) {
        retc = ERR;
        hsp.serr = 'very close to polar circle, switched to Porphyry';
        doPorphyry = true;
        break;
      }
      if (hsp.doHspeed) hsp.cuspSpeed[ih] = ascDash(rectasc, f, sine, cose);
    }
    break;
  }
  } /* end switch */

  /* Porphyry fallback (replaces C goto porphyry) */
  if (doPorphyry) {
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    }
    hsp.cusp[1] = hsp.ac;
    hsp.cusp[10] = hsp.mc;
    hsp.cusp[2] = sweDegnorm(hsp.ac + (180 - acmc) / 3);
    hsp.cusp[3] = sweDegnorm(hsp.ac + (180 - acmc) / 3 * 2);
    hsp.cusp[11] = sweDegnorm(hsp.mc + acmc / 3);
    hsp.cusp[12] = sweDegnorm(hsp.mc + acmc / 3 * 2);
    if (hsp.doHspeed) {
      const q1Speed = hsp.acSpeed - hsp.mcSpeed;
      hsp.cuspSpeed[1] = hsp.acSpeed;
      hsp.cuspSpeed[10] = hsp.mcSpeed;
      hsp.cuspSpeed[2] = hsp.acSpeed - q1Speed / 3;
      hsp.cuspSpeed[3] = hsp.acSpeed - q1Speed / 3 * 2;
      hsp.cuspSpeed[11] = hsp.acSpeed + q1Speed / 3;
      hsp.cuspSpeed[12] = hsp.acSpeed + q1Speed / 3 * 2;
    }
  }

  /* Also handle 'O' case that fell through to doPorphyry with retc=OK */
  if (hsy === 'O' && !doPorphyry) {
    acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    if (acmc < 0) {
      hsp.ac = sweDegnorm(hsp.ac + 180);
      hsp.cusp[1] = hsp.ac;
      acmc = sweDifdeg2n(hsp.ac, hsp.mc);
    }
    hsp.cusp[1] = hsp.ac;
    hsp.cusp[10] = hsp.mc;
    hsp.cusp[2] = sweDegnorm(hsp.ac + (180 - acmc) / 3);
    hsp.cusp[3] = sweDegnorm(hsp.ac + (180 - acmc) / 3 * 2);
    hsp.cusp[11] = sweDegnorm(hsp.mc + acmc / 3);
    hsp.cusp[12] = sweDegnorm(hsp.mc + acmc / 3 * 2);
    if (hsp.doHspeed) {
      const q1Speed = hsp.acSpeed - hsp.mcSpeed;
      hsp.cuspSpeed[1] = hsp.acSpeed;
      hsp.cuspSpeed[10] = hsp.mcSpeed;
      hsp.cuspSpeed[2] = hsp.acSpeed - q1Speed / 3;
      hsp.cuspSpeed[3] = hsp.acSpeed - q1Speed / 3 * 2;
      hsp.cuspSpeed[11] = hsp.acSpeed + q1Speed / 3;
      hsp.cuspSpeed[12] = hsp.acSpeed + q1Speed / 3 * 2;
    }
  }

  /* cusps 4-9 from 10-3 (opposite) */
  if (hsy !== 'G' && hsy !== 'Y' && hsy.toUpperCase() !== 'I') {
    hsp.cusp[4] = sweDegnorm(hsp.cusp[10] + 180);
    hsp.cusp[5] = sweDegnorm(hsp.cusp[11] + 180);
    hsp.cusp[6] = sweDegnorm(hsp.cusp[12] + 180);
    hsp.cusp[7] = sweDegnorm(hsp.cusp[1] + 180);
    hsp.cusp[8] = sweDegnorm(hsp.cusp[2] + 180);
    hsp.cusp[9] = sweDegnorm(hsp.cusp[3] + 180);
    if (hsp.doHspeed && !hsp.doInterpol) {
      hsp.cuspSpeed[4] = hsp.cuspSpeed[10];
      hsp.cuspSpeed[5] = hsp.cuspSpeed[11];
      hsp.cuspSpeed[6] = hsp.cuspSpeed[12];
      hsp.cuspSpeed[7] = hsp.cuspSpeed[1];
      hsp.cuspSpeed[8] = hsp.cuspSpeed[2];
      hsp.cuspSpeed[9] = hsp.cuspSpeed[3];
    }
  }

  /* vertex */
  if (fi >= 0) f = 90 - fi;
  else f = -90 - fi;
  hsp.vertex = asc1(th - 90, f, sine, cose);
  if (hsp.doSpeed) hsp.vertexSpeed = ascDash(th - 90, f, sine, cose);
  if (Math.abs(fi) <= ekl) {
    vemc = sweDifdeg2n(hsp.vertex, hsp.mc);
    if (vemc > 0) hsp.vertex = sweDegnorm(hsp.vertex + 180);
  }

  /* equatorial ascendant */
  const th2 = sweDegnorm(th + 90);
  if (Math.abs(th2 - 90) > VERY_SMALL && Math.abs(th2 - 270) > VERY_SMALL) {
    tant = tand(th2);
    hsp.equasc = atand(tant / cose);
    if (th2 > 90 && th2 <= 270)
      hsp.equasc = sweDegnorm(hsp.equasc + 180);
  } else {
    hsp.equasc = Math.abs(th2 - 90) <= VERY_SMALL ? 90 : 270;
  }
  hsp.equasc = sweDegnorm(hsp.equasc);
  if (hsp.doSpeed) hsp.equascSpeed = ascDash(th + 90, 0, sine, cose);

  /* co-ascendant W. Koch */
  hsp.coasc1 = sweDegnorm(asc1(th - 90, fi, sine, cose) + 180);
  if (hsp.doSpeed) hsp.coasc1Speed = ascDash(th - 90, fi, sine, cose);

  /* co-ascendant M. Munkasey */
  if (fi >= 0) {
    hsp.coasc2 = asc1(th + 90, 90 - fi, sine, cose);
    if (hsp.doSpeed) hsp.coasc2Speed = ascDash(th + 90, 90 - fi, sine, cose);
  } else {
    hsp.coasc2 = asc1(th + 90, -90 - fi, sine, cose);
    if (hsp.doSpeed) hsp.coasc2Speed = ascDash(th + 90, -90 - fi, sine, cose);
  }

  /* polar ascendant M. Munkasey */
  hsp.polasc = asc1(th - 90, fi, sine, cose);
  if (hsp.doSpeed) hsp.polascSpeed = ascDash(th - 90, fi, sine, cose);

  return retc;
}

/* ==================================================================
 * sweHousesArmcEx2 - core entry point
 * ================================================================== */

export function sweHousesArmcEx2(
  armc: number, geolat: number, eps: number, hsys: string,
  cusp: number[], ascmc: number[],
  cuspSpeed: number[] | null, ascmcSpeed: number[] | null,
  serr: { value: string } | null,
): number {
  const h = createHouses();
  let retc = 0;
  let ito = hsys.toUpperCase() === 'G' ? 36 : 12;
  armc = sweDegnorm(armc);
  h.doSpeed = false;
  h.doHspeed = false;
  if (ascmcSpeed !== null || cuspSpeed !== null)
    h.doSpeed = true;
  if (cuspSpeed !== null)
    h.doHspeed = true;
  if (hsys.toUpperCase() === 'I') {
    if (ascmc[9] === 99) {
      h.sundec = 0;
    } else {
      h.sundec = ascmc[9];
    }
    if (h.sundec < -24 || h.sundec > 24) {
      if (serr) serr.value = 'House system I (Sunshine) needs valid Sun declination in ascmc[9]';
      return ERR;
    }
  }
  retc = calcH(armc, geolat, eps, hsys, h);
  cusp[0] = 0;
  if (h.doHspeed && cuspSpeed) cuspSpeed[0] = 0;
  if (retc < 0) {
    ito = 12;
    if (serr) serr.value = h.serr;
  }
  for (let i = 1; i <= ito; i++) {
    cusp[i] = h.cusp[i];
    if (h.doHspeed && cuspSpeed) cuspSpeed[i] = h.cuspSpeed[i];
  }
  ascmc[0] = h.ac;
  ascmc[1] = h.mc;
  ascmc[2] = armc;
  ascmc[3] = h.vertex;
  ascmc[4] = h.equasc;
  ascmc[5] = h.coasc1;
  ascmc[6] = h.coasc2;
  ascmc[7] = h.polasc;
  for (let i = SE_NASCMC; i < 10; i++) ascmc[i] = 0;
  if (hsys.toUpperCase() === 'I') ascmc[9] = h.sundec;
  if (h.doSpeed && ascmcSpeed !== null) {
    ascmcSpeed[0] = h.acSpeed;
    ascmcSpeed[1] = h.mcSpeed;
    ascmcSpeed[2] = h.armcSpeed;
    ascmcSpeed[3] = h.vertexSpeed;
    ascmcSpeed[4] = h.equascSpeed;
    ascmcSpeed[5] = h.coasc1Speed;
    ascmcSpeed[6] = h.coasc2Speed;
    ascmcSpeed[7] = h.polascSpeed;
    for (let i = SE_NASCMC; i < 10; i++) ascmcSpeed[i] = 0;
  }
  if (h.doInterpol && cuspSpeed) {
    const dt = 1.0 / 86400;
    const darmc = dt * ARMCS;
    const hm1 = createHouses();
    const hp1 = createHouses();
    hm1.doSpeed = false; hm1.doHspeed = false;
    hp1.doSpeed = false; hp1.doHspeed = false;
    if (hsys.toUpperCase() === 'I') {
      hm1.sundec = h.sundec;
      hp1.sundec = h.sundec;
    }
    const rm1 = calcH(armc - darmc, geolat, eps, hsys, hm1);
    const rp1 = calcH(armc + darmc, geolat, eps, hsys, hp1);
    if (rp1 >= 0 && rm1 >= 0) {
      let dtUsed = dt;
      if (Math.abs(sweDifdeg2n(hp1.ac, h.ac)) > 90) {
        // use only lower interval
        for (let i = 1; i <= 12; i++) hp1.cusp[i] = h.cusp[i];
        dtUsed = dt / 2;
      } else if (Math.abs(sweDifdeg2n(hm1.ac, h.ac)) > 90) {
        for (let i = 1; i <= 12; i++) hm1.cusp[i] = h.cusp[i];
        dtUsed = dt / 2;
      }
      for (let i = 1; i <= 12; i++) {
        const dx = sweDifdeg2n(hp1.cusp[i], hm1.cusp[i]);
        cuspSpeed[i] = dx / 2 / dtUsed;
      }
    }
  }
  return retc;
}

/** Simple wrapper */
export function sweHousesArmc(
  armc: number, geolat: number, eps: number, hsys: string,
  cusp: number[], ascmc: number[],
): number {
  return sweHousesArmcEx2(armc, geolat, eps, hsys, cusp, ascmc, null, null, null);
}

/* ==================================================================
 * Public API: sweHouses, sweHousesEx, sweHousesEx2
 * ================================================================== */

export function sweHouses(
  swed: SweData, tjdUt: number, geolat: number, geolon: number, hsys: string,
  cusp: number[], ascmc: number[],
): number {
  swiInitSwedIfStart(swed);
  const tjde = tjdUt + sweDeltatEx(tjdUt, -1, swed);
  const epsRad = swiEpsiln(tjde, 0, swed);
  const epsDeg = epsRad * RADTODEG;
  const nutlo = [0, 0];
  swiNutation(tjde, 0, nutlo, swed);
  nutlo[0] *= RADTODEG;
  nutlo[1] *= RADTODEG;
  const armc = sweDegnorm(sweSidtime0(swed, tjdUt, epsDeg + nutlo[1], nutlo[0]) * 15 + geolon);
  if (hsys.toUpperCase() === 'I') {
    const flags = SEFLG_SPEED | SEFLG_EQUATORIAL;
    const result = sweCalcUt(swed, tjdUt, SE_SUN, flags);
    if (result.flags < 0) {
      sweHousesArmcEx2(armc, geolat, epsDeg + nutlo[1], 'O', cusp, ascmc, null, null, null);
      return ERR;
    }
    ascmc[9] = result.xx[1]; // declination (equatorial latitude)
  }
  return sweHousesArmcEx2(armc, geolat, epsDeg + nutlo[1], hsys, cusp, ascmc, null, null, null);
}

export function sweHousesEx(
  swed: SweData, tjdUt: number, iflag: number,
  geolat: number, geolon: number, hsys: string,
  cusp: number[], ascmc: number[],
): number {
  return sweHousesEx2(swed, tjdUt, iflag, geolat, geolon, hsys, cusp, ascmc, null, null, null);
}

export function sweHousesEx2(
  swed: SweData, tjdUt: number, iflag: number,
  geolat: number, geolon: number, hsys: string,
  cusp: number[], ascmc: number[],
  cuspSpeed: number[] | null, ascmcSpeed: number[] | null,
  serr: { value: string } | null,
): number {
  swiInitSwedIfStart(swed);
  let retc = 0;
  const tjde = tjdUt + sweDeltatEx(tjdUt, iflag, swed);
  const sip = swed.sidd;
  const xp = [0, 0, 0, 0, 0, 0];
  let retcMakr = 0;
  let ito = hsys.toUpperCase() === 'G' ? 36 : 12;
  if ((iflag & SEFLG_SIDEREAL) && !swed.ayanaIsSet)
    sweSetSidMode(swed, SE_SIDM_FAGAN_BRADLEY, 0, 0);
  const epsMean = swiEpsiln(tjde, 0, swed) * RADTODEG;
  const nutlo = [0, 0];
  swiNutation(tjde, 0, nutlo, swed);
  nutlo[0] *= RADTODEG;
  nutlo[1] *= RADTODEG;
  if (iflag & SEFLG_NONUT) {
    nutlo[0] = 0;
    nutlo[1] = 0;
  }
  let armc = sweDegnorm(sweSidtime0(swed, tjdUt, epsMean + nutlo[1], nutlo[0]) * 15 + geolon);
  let hsysUsed = hsys;
  if (hsys.toUpperCase() === 'I') {
    const flags = SEFLG_SPEED | SEFLG_EQUATORIAL;
    const result = sweCalcUt(swed, tjdUt, SE_SUN, flags);
    if (result.flags < 0) {
      hsysUsed = 'O';
      retcMakr = ERR;
    }
    xp[1] = result.xx[1]; // declination
    ascmc[9] = xp[1];
  }
  if (iflag & SEFLG_SIDEREAL) {
    if (sip.sidMode & SE_SIDBIT_ECL_T0)
      retc = siderealHousesEclT0(swed, tjde, armc, epsMean + nutlo[1], nutlo, geolat, hsysUsed, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
    else if (sip.sidMode & SE_SIDBIT_SSY_PLANE)
      retc = siderealHousesSsypl(swed, tjde, armc, epsMean + nutlo[1], nutlo, geolat, hsysUsed, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
    else
      retc = siderealHousesTrad(swed, tjde, iflag, armc, epsMean + nutlo[1], nutlo[0], geolat, hsysUsed, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
  } else {
    retc = sweHousesArmcEx2(armc, geolat, epsMean + nutlo[1], hsysUsed, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
    if (hsys.toUpperCase() === 'I') ascmc[9] = xp[1];
  }
  if (iflag & SEFLG_RADIANS) {
    for (let i = 1; i <= ito; i++) cusp[i] *= DEGTORAD;
    for (let i = 0; i < SE_NASCMC; i++) ascmc[i] *= DEGTORAD;
  }
  if (retcMakr < 0) return retcMakr;
  return retc;
}

/* ==================================================================
 * Sidereal house methods
 * ================================================================== */

function siderealHousesTrad(
  swed: SweData, tjde: number, iflag: number,
  armc: number, eps: number, nutl: number, lat: number,
  hsys: string, cusp: number[], ascmc: number[],
  cuspSpeed: number[] | null, ascmcSpeed: number[] | null,
  serr: { value: string } | null,
): number {
  let retc = OK;
  const ihs = hsys.toUpperCase();
  let ihs2 = ihs;
  const ayRes = sweGetAyanamsaEx(swed, tjde, iflag);
  const ay = ayRes.daya;
  const ito = ihs === 'G' ? 36 : 12;
  if (ihs === 'W') ihs2 = 'E';
  retc = sweHousesArmcEx2(armc, lat, eps, ihs2, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
  for (let i = 1; i <= ito; i++) {
    cusp[i] = sweDegnorm(cusp[i] - ay);
    if (ihs === 'W') cusp[i] -= cusp[i] % 30;
  }
  if (ihs === 'N') {
    for (let i = 1; i <= ito; i++) cusp[i] = (i - 1) * 30;
  }
  for (let i = 0; i < SE_NASCMC; i++) {
    if (i === 2) continue; /* armc */
    ascmc[i] = sweDegnorm(ascmc[i] - ay);
  }
  return retc;
}

function siderealHousesEclT0(
  swed: SweData, tjde: number,
  armc: number, eps: number, nutlo: number[], lat: number,
  hsys: string, cusp: number[], ascmc: number[],
  cuspSpeed: number[] | null, ascmcSpeed: number[] | null,
  serr: { value: string } | null,
): number {
  let retc = OK;
  const sip = swed.sidd;
  const ito = hsys.toUpperCase() === 'G' ? 36 : 12;
  const epst0 = swiEpsiln(sip.t0, 0, swed);
  const x = new Float64Array(6);
  x[0] = 1; x[4] = 1;
  swiCoortrf(x, x, -epst0, 0, 0);
  swiCoortrf(x, x, -epst0, 3, 3);
  swiPrecess(x, sip.t0, 0, J_TO_J2000, swed);
  swiPrecess(x, tjde, 0, J2000_TO_J, swed);
  const xh = new Float64Array(6);
  for (let i = 0; i < 6; i++) xh[i] = x[i];
  swiPrecess(xh, sip.t0, 0, J_TO_J2000, swed);
  swiPrecess(xh, tjde, 0, J2000_TO_J, swed);
  // x already has the values we need, just overwrite with proper flow
  x[0] = 1; x[1] = 0; x[2] = 0; x[3] = 0; x[4] = 1; x[5] = 0;
  swiCoortrf(x, x, -epst0, 0, 0);
  swiCoortrf(x, x, -epst0, 3, 3);
  swiPrecess(x, sip.t0, 0, J_TO_J2000, swed);
  swiPrecess(x, tjde, 0, J2000_TO_J, swed);
  swiCoortrf(x, x, (eps - nutlo[1]) * DEGTORAD, 0, 0);
  swiCoortrf(x, x, (eps - nutlo[1]) * DEGTORAD, 3, 3);
  const xl = new Array(6);
  for (let i = 0; i < 6; i++) xl[i] = x[i];
  swiCartpolSp(xl, xl);
  xl[0] += nutlo[0] * DEGTORAD;
  swiPolcartSp(xl, xl);
  for (let i = 0; i < 6; i++) x[i] = xl[i];
  swiCoortrf(x, x, -eps * DEGTORAD, 0, 0);
  swiCoortrf(x, x, -eps * DEGTORAD, 3, 3);
  const xnorm = new Float64Array(3);
  swiCrossProd(x, new Float64Array([x[3], x[4], x[5]]), xnorm);
  let rxy = xnorm[0] * xnorm[0] + xnorm[1] * xnorm[1];
  const c2 = rxy + xnorm[2] * xnorm[2];
  const rxyz = Math.sqrt(c2);
  rxy = Math.sqrt(rxy);
  const epsx = Math.asin(rxy / rxyz) * RADTODEG;
  if (Math.abs(x[5]) < 1e-15) x[5] = 1e-15;
  const fac = x[2] / x[5];
  const sgn = x[5] / Math.abs(x[5]);
  const xvpx = new Float64Array(3);
  for (let j = 0; j <= 2; j++)
    xvpx[j] = (x[j] - fac * x[j + 3]) * sgn;
  const x2 = new Array(3).fill(0);
  swiCartpol(xvpx, x2);
  const dvpx = x2[0] * RADTODEG;
  const armcx = sweDegnorm(armc - dvpx);
  retc = sweHousesArmcEx2(armcx, lat, epsx, hsys, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
  let dvpxe = Math.acos(swiDotProdUnit(x, xvpx)) * RADTODEG;
  if (tjde < sip.t0) dvpxe = -dvpxe;
  for (let i = 1; i <= ito; i++)
    cusp[i] = sweDegnorm(cusp[i] - dvpxe - sip.ayanT0);
  for (let i = 0; i <= SE_NASCMC; i++) {
    if (i === 2) continue;
    ascmc[i] = sweDegnorm(ascmc[i] - dvpxe - sip.ayanT0);
  }
  if (hsys === 'N') {
    for (let i = 1; i <= ito; i++) cusp[i] = (i - 1) * 30;
  }
  return retc;
}

function siderealHousesSsypl(
  swed: SweData, tjde: number,
  armc: number, eps: number, nutlo: number[], lat: number,
  hsys: string, cusp: number[], ascmc: number[],
  cuspSpeed: number[] | null, ascmcSpeed: number[] | null,
  serr: { value: string } | null,
): number {
  let retc = OK;
  const sip = swed.sidd;
  const ito = hsys.toUpperCase() === 'G' ? 36 : 12;
  const eps2000 = swiEpsiln(J2000, 0, swed);
  const x = new Float64Array(6);
  x[0] = 1; x[4] = 1;
  swiCoortrf(x, x, -SSY_PLANE_INCL, 0, 0);
  swiCoortrf(x, x, -SSY_PLANE_INCL, 3, 3);
  const xl = new Array(6);
  for (let i = 0; i < 6; i++) xl[i] = x[i];
  swiCartpolSp(xl, xl);
  xl[0] += SSY_PLANE_NODE_E2000;
  swiPolcartSp(xl, xl);
  for (let i = 0; i < 6; i++) x[i] = xl[i];
  swiCoortrf(x, x, -eps2000, 0, 0);
  swiCoortrf(x, x, -eps2000, 3, 3);
  swiPrecess(x, tjde, 0, J2000_TO_J, swed);
  const xp3 = new Float64Array(3);
  xp3[0] = x[3]; xp3[1] = x[4]; xp3[2] = x[5];
  swiPrecess(xp3, tjde, 0, J2000_TO_J, swed);
  x[3] = xp3[0]; x[4] = xp3[1]; x[5] = xp3[2];
  swiCoortrf(x, x, (eps - nutlo[1]) * DEGTORAD, 0, 0);
  swiCoortrf(x, x, (eps - nutlo[1]) * DEGTORAD, 3, 3);
  for (let i = 0; i < 6; i++) xl[i] = x[i];
  swiCartpolSp(xl, xl);
  xl[0] += nutlo[0] * DEGTORAD;
  swiPolcartSp(xl, xl);
  for (let i = 0; i < 6; i++) x[i] = xl[i];
  swiCoortrf(x, x, -eps * DEGTORAD, 0, 0);
  swiCoortrf(x, x, -eps * DEGTORAD, 3, 3);
  const xnorm = new Float64Array(3);
  swiCrossProd(x, new Float64Array([x[3], x[4], x[5]]), xnorm);
  let rxy = xnorm[0] * xnorm[0] + xnorm[1] * xnorm[1];
  const c2 = rxy + xnorm[2] * xnorm[2];
  const rxyz = Math.sqrt(c2);
  rxy = Math.sqrt(rxy);
  const epsx = Math.asin(rxy / rxyz) * RADTODEG;
  if (Math.abs(x[5]) < 1e-15) x[5] = 1e-15;
  const fac = x[2] / x[5];
  const sgn = x[5] / Math.abs(x[5]);
  const xvpx = new Float64Array(3);
  for (let j = 0; j <= 2; j++)
    xvpx[j] = (x[j] - fac * x[j + 3]) * sgn;
  const x2arr = new Array(3).fill(0);
  swiCartpol(xvpx, x2arr);
  const dvpx = x2arr[0] * RADTODEG;
  const armcx = sweDegnorm(armc - dvpx);
  retc = sweHousesArmcEx2(armcx, lat, epsx, hsys, cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
  let dvpxe = Math.acos(swiDotProdUnit(x, xvpx)) * RADTODEG;
  dvpxe -= SSY_PLANE_NODE * RADTODEG;
  /* ayanamsa between t0 and J2000 on solar system plane */
  const x0 = new Array(3);
  x0[0] = 1; x0[1] = 0; x0[2] = 0;
  if (sip.t0 !== J2000) {
    const x0f = new Float64Array(3);
    x0f[0] = x0[0]; x0f[1] = x0[1]; x0f[2] = x0[2];
    swiPrecess(x0f, sip.t0, 0, J_TO_J2000, swed);
    x0[0] = x0f[0]; x0[1] = x0f[1]; x0[2] = x0f[2];
  }
  swiCoortrf(new Float64Array(x0), new Float64Array(x0), eps2000, 0, 0);
  // The above line modifies x0 in-place since we pass same array
  // Need to handle differently for number arrays:
  {
    const tmp = new Float64Array(3);
    tmp[0] = x0[0]; tmp[1] = x0[1]; tmp[2] = x0[2];
    swiCoortrf(tmp, tmp, eps2000);
    x0[0] = tmp[0]; x0[1] = tmp[1]; x0[2] = tmp[2];
  }
  swiCartpol(x0, x0);
  x0[0] -= SSY_PLANE_NODE_E2000;
  swiPolcart(x0, x0);
  {
    const tmp = new Float64Array(3);
    tmp[0] = x0[0]; tmp[1] = x0[1]; tmp[2] = x0[2];
    swiCoortrf(tmp, tmp, SSY_PLANE_INCL);
    x0[0] = tmp[0]; x0[1] = tmp[1]; x0[2] = tmp[2];
  }
  swiCartpol(x0, x0);
  x0[0] += SSY_PLANE_NODE;
  const x00 = x0[0] * RADTODEG;
  for (let i = 1; i <= ito; i++)
    cusp[i] = sweDegnorm(cusp[i] - dvpxe - sip.ayanT0 - x00);
  for (let i = 0; i <= SE_NASCMC; i++) {
    if (i === 2) continue;
    ascmc[i] = sweDegnorm(ascmc[i] - dvpxe - sip.ayanT0 - x00);
  }
  if (hsys === 'N') {
    for (let i = 1; i <= ito; i++) cusp[i] = (i - 1) * 30;
  }
  return retc;
}

/* ==================================================================
 * sweHouseName
 * ================================================================== */

export function sweHouseName(hsys: string): string {
  let h = hsys;
  if (h !== 'i') h = h.toUpperCase();
  switch (h) {
    case 'A': return 'equal';
    case 'B': return 'Alcabitius';
    case 'C': return 'Campanus';
    case 'D': return 'equal (MC)';
    case 'E': return 'equal';
    case 'F': return 'Carter poli-equ.';
    case 'G': return 'Gauquelin sectors';
    case 'H': return 'horizon/azimut';
    case 'I': return 'Sunshine';
    case 'i': return 'Sunshine/alt.';
    case 'J': return 'Savard-A';
    case 'K': return 'Koch';
    case 'L': return 'Pullen SD';
    case 'M': return 'Morinus';
    case 'N': return 'equal/1=Aries';
    case 'O': return 'Porphyry';
    case 'Q': return 'Pullen SR';
    case 'R': return 'Regiomontanus';
    case 'S': return 'Sripati';
    case 'T': return 'Polich/Page';
    case 'U': return 'Krusinski-Pisa-Goelzer';
    case 'V': return 'equal/Vehlow';
    case 'W': return 'equal/ whole sign';
    case 'X': return 'axial rotation system/Meridian houses';
    case 'Y': return 'APC houses';
    default: return 'Placidus';
  }
}

/* ==================================================================
 * sweHousePos - planet house position
 * ================================================================== */

export function sweHousePos(
  armc: number, geolat: number, eps: number, hsys: string,
  xpin: number[], serr: { value: string } | null,
): number {
  const xp = [0, 0, 0, 0, 0, 0];
  const xeq = [0, 0, 0, 0, 0, 0];
  let hpos = 0;
  const sine = sind(eps);
  const cose = cosd(eps);
  let tanfi: number;
  hsys = hsys.toUpperCase();

  /* check if input is a house cusp */
  const hcusp = new Array(37).fill(0);
  const ascmcArr = new Array(10).fill(0);
  ascmcArr[9] = 99; // dirty hack for Sunshine
  if (sweHousesArmcEx2(armc, geolat, eps, hsys, hcusp, ascmcArr, null, null, serr) !== ERR) {
    hpos = 0;
    for (let i = 1; i <= 12; i++) {
      if (Math.abs(sweDifdeg2n(xpin[0], hcusp[i])) < MILLIARCSEC && xpin[1] === 0) {
        hpos = i;
      }
    }
    if (hpos > 0) return hpos;
  }
  let dsun = 0;
  if (hsys === 'I') dsun = ascmcArr[9];
  if (hsys === 'Y') {
    const xeqt = [ascmcArr[0], 0, 1];
    sweCotrans(xeqt, xeqt, -eps);
    dsun = xeqt[1];
  }

  let isAboveHor = false;
  let isWesternHalf = false;
  xeq[0] = xpin[0];
  xeq[1] = xpin[1];
  xeq[2] = 1;
  sweCotrans(xeq, xeq, -eps);
  let ra = xeq[0];
  let de = xeq[1];
  let mdd = sweDegnorm(ra - armc);
  let mdn = sweDegnorm(mdd + 180);
  if (mdd >= 180) mdd -= 360;
  if (mdn >= 180) mdn -= 360;

  switch (hsys) {
    case 'N': {
      xp[0] = xpin[0];
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'A': case 'E': case 'D': case 'V': case 'W': {
      let asc = asc1(sweDegnorm(armc + 90), geolat, sine, cose);
      asc = fixAscPolar(asc, armc, eps, geolat);
      xp[0] = sweDegnorm(xpin[0] - asc);
      if (hsys === 'V') xp[0] = sweDegnorm(xp[0] + 15);
      if (hsys === 'W') xp[0] = sweDegnorm(xp[0] + (asc % 30));
      if (hsys === 'D') {
        const mc = armcToMc(armc, eps);
        xp[0] = sweDegnorm(xpin[0] - mc - 90);
      }
      xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'O': case 'B': case 'S': {
      let asc = asc1(sweDegnorm(armc + 90), geolat, sine, cose);
      const mc = armcToMc(armc, eps);
      asc = fixAscPolar(asc, armc, eps, geolat);
      if (hsys === 'O' || hsys === 'S') {
        xp[0] = sweDegnorm(xpin[0] - asc);
        xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
        if (xp[0] < 180) hpos = 1;
        else { hpos = 7; xp[0] -= 180; }
        const acmc2 = sweDifdeg2n(asc, mc);
        if (xp[0] < 180 - acmc2)
          hpos += xp[0] * 3 / (180 - acmc2);
        else
          hpos += 3 + (xp[0] - 180 + acmc2) * 3 / acmc2;
        if (hsys === 'S') {
          hpos += 0.5;
          if (hpos > 12) hpos = 1;
        }
      } else { /* Alcabitius */
        const dek = asind(sind(asc) * sine);
        tanfi = tand(geolat);
        let r = -tanfi * tand(dek);
        const sda = Math.acos(r) * RADTODEG;
        const sna = 180 - sda;
        if (mdd > 0) {
          if (mdd < sda) hpos = mdd * 90 / sda;
          else hpos = 90 + (mdd - sda) * 90 / sna;
        } else {
          if (mdd > -sna) hpos = 360 + mdd * 90 / sna;
          else hpos = 270 + (mdd + sna) * 90 / sda;
        }
        hpos = sweDegnorm(hpos - 90) / 30.0 + 1.0;
        if (hpos >= 13.0) hpos -= 12;
      }
      break;
    }
    case 'X': {
      hpos = sweDegnorm(mdd - 90) / 30.0 + 1.0;
      break;
    }
    case 'F': {
      const x3 = [asc1(sweDegnorm(armc + 90), geolat, sine, cose), 0, 0];
      x3[0] = fixAscPolar(x3[0], armc, eps, geolat);
      sweCotrans(x3, x3, -eps);
      hpos = sweDegnorm(ra - x3[0]) / 30.0 + 1;
      break;
    }
    case 'M': {
      const a2 = xpin[0];
      if (Math.abs(a2 - 90) > VERY_SMALL && Math.abs(a2 - 270) > VERY_SMALL) {
        const tant2 = tand(a2);
        hpos = atand(tant2 / cose);
        if (a2 > 90 && a2 <= 270) hpos = sweDegnorm(hpos + 180);
      } else {
        hpos = Math.abs(a2 - 90) <= VERY_SMALL ? 90 : 270;
      }
      hpos = sweDegnorm(hpos - armc - 90);
      hpos = hpos / 30.0 + 1;
      break;
    }
    case 'K': {
      let isInvalid = false;
      let isCircumpolar = false;
      let adp: number;
      if (90 - geolat < de || -90 - geolat > de) {
        adp = 90; isCircumpolar = true;
      } else if (geolat - 90 > de || geolat + 90 < de) {
        adp = -90; isCircumpolar = true;
      } else {
        adp = asind(tand(geolat) * tand(de));
      }
      let admc = tand(eps) * tand(geolat) * sind(armc);
      if (Math.abs(admc) > 1) {
        admc = admc > 1 ? 1 : -1;
        isCircumpolar = true;
      }
      admc = asind(admc);
      const samc = 90 + admc;
      if (samc === 0) isInvalid = true;
      if (Math.abs(samc) > 0) {
        if (mdd >= 0) {
          const dfac = (mdd - adp + admc) / samc;
          xp[0] = sweDegnorm((dfac - 1) * 90);
          xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
          if (dfac > 2 || dfac < 0) isInvalid = true;
        } else {
          const dfac = (mdd + 180 + adp + admc) / samc;
          xp[0] = sweDegnorm((dfac + 1) * 90);
          xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
          if (dfac > 2 || dfac < 0) isInvalid = true;
        }
      }
      if (isInvalid) {
        xp[0] = 0;
        hpos = 0;
        if (serr) serr.value = 'Koch house position failed in circumpolar area';
        break;
      }
      if (isCircumpolar && serr) {
        serr.value = 'Koch house position, doubtful result in circumpolar area';
      }
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'C': {
      xeq[0] = sweDegnorm(mdd - 90);
      sweCotrans(xeq, xp, -geolat);
      xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'J': {
      const sinfi2 = sind(geolat);
      let xs1: number, xs2: number;
      if (Math.abs(geolat) < VERY_SMALL) {
        xs2 = 1 / 3.0; xs1 = 2 / 3.0;
      } else {
        xs2 = sind(geolat / 3) / sinfi2;
        xs1 = sind(2 * geolat / 3) / sinfi2;
      }
      xs2 = asind(xs2);
      xs1 = asind(xs1);
      const hcusp2 = new Array(13).fill(0);
      hcusp2[1] = 0; hcusp2[2] = xs2; hcusp2[3] = xs1;
      hcusp2[4] = 90; hcusp2[5] = 180 - xs1; hcusp2[6] = 180 - xs2;
      hcusp2[7] = 180; hcusp2[8] = 180 + xs2; hcusp2[9] = 180 + xs1;
      hcusp2[10] = 270; hcusp2[11] = 360 - xs1; hcusp2[12] = 360 - xs2;
      xeq[0] = sweDegnorm(mdd - 90);
      sweCotrans(xeq, xp, -geolat);
      const a3 = xp[0];
      let d2: number, c1: number, c2: number;
      if (sweDifdeg2n(hcusp2[6], hcusp2[1]) > 0) {
        d2 = sweDegnorm(a3 - hcusp2[1]);
        let ii: number;
        for (ii = 1; ii <= 12; ii++) {
          let j = ii + 1;
          c2 = j > 12 ? 360 : sweDegnorm(hcusp2[j] - hcusp2[1]);
          if (d2 < c2) break;
        }
        c1 = sweDegnorm(hcusp2[ii] - hcusp2[1]);
        const hsize = c2! - c1;
        hpos = hsize === 0 ? ii : ii + (d2 - c1) / hsize;
      } else {
        d2 = sweDegnorm(hcusp2[1] - a3);
        let ii: number;
        for (ii = 1; ii <= 12; ii++) {
          let j = ii + 1;
          c2 = j > 12 ? 360 : sweDegnorm(hcusp2[1] - hcusp2[j]);
          if (d2 < c2) break;
        }
        c1 = sweDegnorm(hcusp2[1] - hcusp2[ii]);
        const hsize = c2! - c1;
        hpos = hsize === 0 ? ii : ii + (d2 - c1) / hsize;
      }
      break;
    }
    case 'U': {
      let geolat2 = geolat;
      if (Math.abs(geolat2) < VERY_SMALL)
        geolat2 = geolat2 >= 0 ? VERY_SMALL : -VERY_SMALL;
      let asc2u = asc1(sweDegnorm(armc + 90), geolat2, sine, cose);
      asc2u = fixAscPolar(asc2u, armc, eps, geolat2);
      const xu = [asc2u, 0, 1];
      sweCotrans(xu, xu, -eps);
      const raep = sweDegnorm(armc + 90);
      xu[0] = sweDegnorm(raep - xu[0]);
      sweCotrans(xu, xu, -(90 - geolat2));
      let tanx = tand(xu[0]);
      let xtemp: number;
      if (geolat2 === 0) xtemp = tanx >= 0 ? 90 : -90;
      else xtemp = atand(tanx / cosd(90 - geolat2));
      if (xu[0] > 90 && xu[0] <= 270) xtemp = sweDegnorm(xtemp + 180);
      xu[0] = sweDegnorm(xtemp);
      const raaz = sweDegnorm(raep - xu[0]);
      xu[0] = raaz; xu[1] = 0;
      xu[0] = sweDegnorm(raep - xu[0]);
      sweCotrans(xu, xu, -(90 - geolat2));
      xu[1] = xu[1] + 90;
      sweCotrans(xu, xu, 90 - geolat2);
      const oblaz = xu[1];
      const xasc2 = [asc2u, 0, 1];
      sweCotrans(xasc2, xasc2, -eps);
      xasc2[0] = sweDegnorm(xasc2[0] - raaz);
      xtemp = atand(tand(xasc2[0]) / cosd(oblaz));
      if (xasc2[0] > 90 && xasc2[0] <= 270) xtemp = sweDegnorm(xtemp + 180);
      xasc2[0] = sweDegnorm(xtemp);
      xp[0] = sweDegnorm(xeq[0] - raaz);
      xtemp = atand(tand(xp[0]) / cosd(oblaz));
      if (xp[0] > 90 && xp[0] <= 270) xtemp = sweDegnorm(xtemp + 180);
      xp[0] = sweDegnorm(xtemp);
      xp[0] = sweDegnorm(xp[0] - xasc2[0]);
      xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'H': {
      xeq[0] = sweDegnorm(mdd - 90);
      sweCotrans(xeq, xp, 90 - geolat);
      xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'R': {
      if (Math.abs(mdd) < VERY_SMALL) xp[0] = 270;
      else if (180 - Math.abs(mdd) < VERY_SMALL) xp[0] = 90;
      else {
        let geolat2 = geolat, de2 = de;
        if (90 - Math.abs(geolat2) < VERY_SMALL)
          geolat2 = geolat2 > 0 ? 90 - VERY_SMALL : -90 + VERY_SMALL;
        if (90 - Math.abs(de2) < VERY_SMALL)
          de2 = de2 > 0 ? 90 - VERY_SMALL : -90 + VERY_SMALL;
        const a4 = tand(geolat2) * tand(de2) + cosd(mdd);
        xp[0] = sweDegnorm(atand(-a4 / sind(mdd)));
        if (mdd < 0) xp[0] += 180;
        xp[0] = sweDegnorm(xp[0]);
        xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      }
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'I': case 'Y': {
      if (geolat > 90 - MILLIARCSEC) geolat = 90 - MILLIARCSEC;
      if (geolat < -90 + MILLIARCSEC) geolat = -90 + MILLIARCSEC;
      if (90 - Math.abs(de) < VERY_SMALL)
        de = de > 0 ? 90 - VERY_SMALL : -90 + VERY_SMALL;
      let a5 = tand(geolat) * tand(de) + cosd(mdd);
      xp[0] = sweDegnorm(atand(-a5 / sind(mdd)));
      if (mdd < 0) xp[0] += 180;
      xp[0] = sweDegnorm(xp[0]);
      let sinad = tand(de) * tand(geolat);
      a5 = sinad + cosd(mdd);
      if (a5 >= 0) isAboveHor = true;
      let harmc = 90 - geolat;
      if (geolat < 0) harmc = 90 + geolat;
      let darmc = sweDegnorm(xp[0] - 270);
      if (darmc > 180) {
        isWesternHalf = true;
        darmc = 360 - darmc;
      }
      sinad = tand(dsun) * tand(geolat);
      let ad: number;
      if (sinad >= 1) ad = 90;
      else if (sinad <= -1) ad = -90;
      else ad = asind(sinad);
      let sad = 90 + ad;
      let san = 90 - ad;
      if (sad === 0 && isAboveHor) {
        xp[0] = 270;
      } else if (san === 0 && !isAboveHor) {
        xp[0] = 90;
      } else {
        let sa = sad;
        if (!isAboveHor) {
          dsun = -dsun;
          sa = san;
          darmc = 180 - darmc;
          isWesternHalf = !isWesternHalf;
        }
        const aa = acosd(cosd(harmc) * cosd(darmc));
        const aUsed = aa < VERY_SMALL ? VERY_SMALL : aa;
        let sinpsi = sind(harmc) / sind(aUsed);
        if (sinpsi > 1) sinpsi = 1;
        if (sinpsi < -1) sinpsi = -1;
        let y = sind(dsun) / sinpsi;
        if (y > 1) y = 90 - VERY_SMALL;
        else if (y < -1) y = -(90 - VERY_SMALL);
        else y = asind(y);
        let d2 = acosd(cosd(y) / cosd(dsun));
        if (dsun < 0) d2 = -d2;
        if (geolat < 0) d2 = -d2;
        darmc += d2;
        if (isWesternHalf) xp[0] = 270 - (darmc / sa) * 90;
        else xp[0] = 270 + (darmc / sa) * 90;
        if (!isAboveHor) xp[0] = sweDegnorm(xp[0] + 180);
      }
      xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      hpos = xp[0] / 30.0 + 1;
      break;
    }
    case 'T': {
      let fh = geolat;
      if (fh > 89.999) fh = 89.999;
      if (fh < -89.999) fh = -89.999;
      mdd = sweDegnorm(mdd);
      if (de > 90 - VERY_SMALL) de = 90 - VERY_SMALL;
      if (de < -90 + VERY_SMALL) de = -90 + VERY_SMALL;
      let sinad = tand(de) * tand(fh);
      if (sinad > 1.0) sinad = 1.0;
      if (sinad < -1.0) sinad = -1.0;
      const a6 = sinad + cosd(mdd);
      if (a6 >= 0) isAboveHor = true;
      if (!isAboveHor) {
        ra = sweDegnorm(ra + 180);
        de = -de;
        mdd = sweDegnorm(mdd + 180);
      }
      if (mdd > 180) ra = sweDegnorm(armc - mdd);
      tanfi = tand(fh);
      let ra0 = sweDegnorm(armc + 90);
      xp[1] = 1;
      xeq[1] = de;
      let fac2 = 2;
      let nloop = 0;
      while (Math.abs(xp[1]) > 0.000001 && nloop < 1000) {
        if (xp[1] > 0) {
          fh = atand(tand(fh) - tanfi / fac2);
          ra0 -= 90 / fac2;
        } else {
          fh = atand(tand(fh) + tanfi / fac2);
          ra0 += 90 / fac2;
        }
        xeq[0] = sweDegnorm(ra - ra0);
        sweCotrans(xeq, xp, 90 - fh);
        fac2 *= 2;
        nloop++;
      }
      hpos = sweDegnorm(ra0 - armc);
      if (mdd > 180) hpos = sweDegnorm(-hpos);
      if (!isAboveHor) hpos = sweDegnorm(hpos + 180);
      hpos = sweDegnorm(hpos - 90) / 30 + 1;
      break;
    }
    case 'P': case 'G': {
      if (90 - Math.abs(de) <= Math.abs(geolat)) {
        if (de * geolat < 0) xp[0] = sweDegnorm(90 + mdn / 2);
        else xp[0] = sweDegnorm(270 + mdd / 2);
        if (serr) serr.value = 'Otto Ludwig procedure within circumpolar regions.';
      } else {
        const sinad2 = tand(de) * tand(geolat);
        const ad2 = asind(sinad2);
        const a7 = sinad2 + cosd(mdd);
        if (a7 >= 0) isAboveHor = true;
        const sad2 = 90 + ad2;
        const san2 = 90 - ad2;
        if (isAboveHor) xp[0] = (mdd / sad2 + 3) * 90;
        else xp[0] = (mdn / san2 + 1) * 90;
        xp[0] = sweDegnorm(xp[0] + MILLIARCSEC);
      }
      if (hsys === 'G') {
        xp[0] = 360 - xp[0];
        hpos = xp[0] / 10.0 + 1;
      } else {
        hpos = xp[0] / 30.0 + 1;
      }
      break;
    }
    default: {
      /* simplified algorithm for unknown systems */
      hpos = 0;
      const hcusp3 = new Array(37).fill(0);
      const ascmc3 = new Array(10).fill(0);
      if (sweHousesArmcEx2(armc, geolat, eps, hsys, hcusp3, ascmc3, null, null, serr) === ERR) {
        if (serr) serr.value = `swe_house_pos(): failed for system ${hsys}`;
        break;
      }
      let d3: number, c1: number = 0, c2: number = 0;
      let ii: number = 1;
      if (sweDifdeg2n(hcusp3[6], hcusp3[1]) > 0) {
        d3 = sweDegnorm(xpin[0] - hcusp3[1]);
        for (ii = 1; ii <= 12; ii++) {
          const j = ii + 1;
          c2 = j > 12 ? 360 : sweDegnorm(hcusp3[j] - hcusp3[1]);
          if (d3 < c2) break;
        }
        c1 = sweDegnorm(hcusp3[ii] - hcusp3[1]);
      } else {
        d3 = sweDegnorm(hcusp3[1] - xpin[0]);
        for (ii = 1; ii <= 12; ii++) {
          const j = ii + 1;
          c2 = j > 12 ? 360 : sweDegnorm(hcusp3[1] - hcusp3[j]);
          if (d3 < c2) break;
        }
        c1 = sweDegnorm(hcusp3[1] - hcusp3[ii]);
      }
      const hsize = c2 - c1;
      hpos = hsize === 0 ? ii : ii + (d3 - c1) / hsize;
      if (serr) serr.value = `swe_house_pos(): using simplified algorithm for system ${hsys}`;
      break;
    }
  }
  return hpos;
}

/** ARMC to MC - public export (wrapper for C swi_armc_to_mc) */
export function swiArmcToMcHouse(armc: number, eps: number): number {
  return armcToMc(armc, eps);
}
