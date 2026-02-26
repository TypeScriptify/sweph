/*************************************************************
 * Swiss Ephemeris eclipse / rise-set / azalt / Gauquelin
 * Translated from swecl.c
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.
 * All rights reserved. (AGPL)
 *************************************************************/

import {
  DEGTORAD, RADTODEG, PI, OK, ERR, AUNIT, EARTH_RADIUS, EARTH_OBLATENESS,
  SE_ECL_NUT, SE_SUN, SE_MOON, SE_EARTH, SE_MERCURY, SE_VENUS, SE_MARS, SE_PLUTO, SE_NEPTUNE,
  SE_MEAN_NODE, SE_TRUE_NODE, SE_MEAN_APOG, SE_OSCU_APOG, SE_INTP_APOG, SE_INTP_PERG,
  SE_CHIRON, SE_CERES, SE_VESTA, SE_AST_OFFSET,
  SE_NPLANETS, SE_FICT_OFFSET,
  SE_CALC_RISE, SE_CALC_SET, SE_CALC_MTRANSIT, SE_CALC_ITRANSIT,
  SE_BIT_DISC_CENTER, SE_BIT_DISC_BOTTOM, SE_BIT_NO_REFRACTION,
  SE_BIT_GEOCTR_NO_ECL_LAT, SE_BIT_FIXED_DISC_SIZE,
  SE_BIT_FORCE_SLOW_METHOD,
  SE_BIT_CIVIL_TWILIGHT, SE_BIT_NAUTIC_TWILIGHT, SE_BIT_ASTRO_TWILIGHT,
  SE_ECL2HOR, SE_EQU2HOR, SE_HOR2EQU,
  SE_TRUE_TO_APP, SE_APP_TO_TRUE, SE_LAPSE_RATE,
  SE_ECL_CENTRAL, SE_ECL_NONCENTRAL, SE_ECL_TOTAL, SE_ECL_ANNULAR,
  SE_ECL_PARTIAL, SE_ECL_ANNULAR_TOTAL, SE_ECL_PENUMBRAL,
  SE_ECL_ALLTYPES_LUNAR,
  SE_ECL_VISIBLE, SE_ECL_MAX_VISIBLE,
  SE_ECL_1ST_VISIBLE, SE_ECL_2ND_VISIBLE, SE_ECL_3RD_VISIBLE, SE_ECL_4TH_VISIBLE,
  SE_ECL_PARTBEG_VISIBLE, SE_ECL_TOTBEG_VISIBLE, SE_ECL_TOTEND_VISIBLE, SE_ECL_PARTEND_VISIBLE,
  SE_ECL_PENUMBBEG_VISIBLE, SE_ECL_PENUMBEND_VISIBLE,
  SE_ECL_OCC_BEG_DAYLIGHT, SE_ECL_OCC_END_DAYLIGHT,
  SE_ECL_ONE_TRY,
  SE_NODBIT_MEAN, SE_NODBIT_OSCU_BAR, SE_NODBIT_FOPOINT,
  SE_SIDBIT_ECL_T0, SE_SIDBIT_SSY_PLANE,
  J2000, J_TO_J2000, J2000_TO_J, CLIGHT,
  SEFLG_SPEED, SEFLG_EQUATORIAL, SEFLG_TOPOCTR, SEFLG_NONUT, SEFLG_TRUEPOS,
  SEFLG_EPHMASK, SEFLG_XYZ, SEFLG_HELCTR, SEFLG_J2000, SEFLG_NOABERR,
  SEFLG_NOGDEFL, SEFLG_SWIEPH, SEFLG_RADIANS,
  SEFLG_BARYCTR, SEFLG_SIDEREAL, SEFLG_MOSEPH, SEFLG_ICRS, SEFLG_ORBEL_AA,
  SEI_SUN, SEI_SUNBARY, SEI_EARTH,
  SEI_ECL_GEOALT_MIN, SEI_ECL_GEOALT_MAX,
  NDIAM, PLA_DIAM,
  DSUN, DMOON, DEARTH_ECL, RSUN_ECL, RMOON, REARTH_ECL,
  SAROS_CYCLE, NSAROS_SOLAR, NSAROS_LUNAR,
  GEOGCONST, HELGRAVCONST, EARTH_MOON_MRAT,
  MOON_MEAN_DIST, MOON_MEAN_INCL, MOON_MEAN_ECC,
  NODE_CALC_INTV,
} from './constants';

import type { SweData, Epsilon, Nut } from './types';
import { createEpsilon, createNut } from './types';

import {
  sweDegnorm, sweCotrans, sweDeltatEx, sweSidtime,
  squareSum, swiPolcart, swiCartpol,
  swiPolcartSp, swiCartpolSp, swiCrossProd, swiMod2PI,
  swiCoortrf2, swiNutation, swiPrecess, swiBias,
} from './swephlib';

import {
  sweCalc, sweCalcUt, sweFixstar, sweSetTopo, swiInitSwedIfStart,
  swiForceAppPosEtc, swiGetObserver, swiGetDenum,
  swiPrecessSpeed, swiNutate, swiDeflectLight, swiAberrLight,
  calcEpsilon, nutMatrix,
  swiTropRa2SidLon, swiTropRa2SidLonSosy,
  sweGetAyanamsaEx,
} from './sweph';

import { swiMeanLunarElements } from './swemmoon';

import { sweHousePos } from './swehouse';

/* ---- Module state ---- */
let constLapseRate = SE_LAPSE_RATE;

/* ==================================================================
 * Refraction helpers
 * ================================================================== */

function calcDip(geoalt: number, atpress: number, attemp: number, lapseRate: number): number {
  const krefr = (0.0342 + lapseRate) / (0.154 * 0.0238);
  const d = 1 - 1.8480 * krefr * atpress / (273.15 + attemp) / (273.15 + attemp);
  return -180.0 / PI * Math.acos(1 / (1 + geoalt / EARTH_RADIUS)) * Math.sqrt(d);
}

function calcAstronomicalRefr(inalt: number, atpress: number, attemp: number): number {
  let r: number;
  if (inalt > 17.904104638432) {
    r = 0.97 / Math.tan(inalt * DEGTORAD);
  } else {
    r = (34.46 + 4.23 * inalt + 0.004 * inalt * inalt) / (1 + 0.505 * inalt + 0.0845 * inalt * inalt);
  }
  r = ((atpress - 80) / 930 / (1 + 0.00008 * (r + 39) * (attemp - 10)) * r) / 60.0;
  return r;
}

export function sweRefrac(inalt: number, atpress: number, attemp: number, calcFlag: number): number {
  const ptFactor = atpress / 1010.0 * 283.0 / (273.0 + attemp);
  let a: number, refr: number;
  if (calcFlag === SE_TRUE_TO_APP) {
    const trualt = inalt;
    if (trualt > 15) {
      a = Math.tan((90 - trualt) * DEGTORAD);
      refr = (58.276 * a - 0.0824 * a * a * a);
      refr *= ptFactor / 3600.0;
    } else if (trualt > -5) {
      a = trualt + 10.3 / (trualt + 5.11);
      if (a + 1e-10 >= 90) refr = 0;
      else refr = 1.02 / Math.tan(a * DEGTORAD);
      refr *= ptFactor / 60.0;
    } else {
      refr = 0;
    }
    let appalt = trualt;
    if (appalt + refr > 0) appalt += refr;
    return appalt;
  } else {
    const appalt = inalt;
    a = appalt + 7.31 / (appalt + 4.4);
    if (a + 1e-10 >= 90) refr = 0;
    else {
      refr = 1.00 / Math.tan(a * DEGTORAD);
      refr -= 0.06 * Math.sin(14.7 * refr + 13);
    }
    refr *= ptFactor / 60.0;
    let trualt = appalt;
    if (appalt - refr > 0) trualt = appalt - refr;
    return trualt;
  }
}

export function sweSetLapseRate(lapseRate: number): void {
  constLapseRate = lapseRate;
}

export function sweRefracExtended(
  inalt: number, geoalt: number, atpress: number, attemp: number,
  lapseRate: number, calcFlag: number, dret: number[] | null,
): number {
  let inaltAdj = inalt;
  if (inaltAdj > 90) inaltAdj = 180 - inaltAdj;
  const dip = calcDip(geoalt, atpress, attemp, lapseRate);
  if (calcFlag === SE_TRUE_TO_APP) {
    if (inaltAdj < -10) {
      if (dret !== null) { dret[0] = inaltAdj; dret[1] = inaltAdj; dret[2] = 0; dret[3] = dip; }
      return inaltAdj;
    }
    let y = inaltAdj;
    let D = 0.0;
    let yy0 = 0;
    let D0 = D;
    for (let i = 0; i < 5; i++) {
      D = calcAstronomicalRefr(y, atpress, attemp);
      const N2 = y - yy0;
      yy0 = D - D0 - N2;
      let N: number;
      if (N2 !== 0.0 && yy0 !== 0.0)
        N = y - N2 * (inaltAdj + D - y) / yy0;
      else
        N = inaltAdj + D;
      yy0 = y;
      D0 = D;
      y = N;
    }
    const refr = D;
    if (inaltAdj + refr < dip) {
      if (dret !== null) { dret[0] = inaltAdj; dret[1] = inaltAdj; dret[2] = 0; dret[3] = dip; }
      return inaltAdj;
    }
    if (dret !== null) { dret[0] = inaltAdj; dret[1] = inaltAdj + refr; dret[2] = refr; dret[3] = dip; }
    return inaltAdj + refr;
  } else {
    const refr = calcAstronomicalRefr(inaltAdj, atpress, attemp);
    const trualt = inaltAdj - refr;
    if (dret !== null) {
      if (inaltAdj > dip) {
        dret[0] = trualt; dret[1] = inaltAdj; dret[2] = refr; dret[3] = dip;
      } else {
        dret[0] = inaltAdj; dret[1] = inaltAdj; dret[2] = 0; dret[3] = dip;
      }
    }
    if (inaltAdj >= dip) return trualt;
    else return inaltAdj;
  }
}

/* ==================================================================
 * Azimuth / Altitude conversions
 * ================================================================== */

export function sweAzalt(
  swed: SweData, tjdUt: number, calcFlag: number,
  geopos: number[], atpress: number, attemp: number,
  xin: number[], xaz: number[],
): void {
  const x = [0, 0, 0, 0, 0, 0];
  const xra = [xin[0], xin[1], 1];
  const armc = sweDegnorm(sweSidtime(swed, tjdUt) * 15 + geopos[0]);
  if (calcFlag === SE_ECL2HOR) {
    const res = sweCalc(swed, tjdUt + sweDeltatEx(tjdUt, -1, swed), SE_ECL_NUT, 0);
    const epsTrue = res.xx[0];
    const tmp = [0, 0, 0];
    sweCotrans(xra, tmp, -epsTrue);
    xra[0] = tmp[0]; xra[1] = tmp[1]; xra[2] = tmp[2];
  }
  const mdd = sweDegnorm(xra[0] - armc);
  x[0] = sweDegnorm(mdd - 90);
  x[1] = xra[1];
  x[2] = 1;
  const h = [0, 0, 0];
  sweCotrans(x, h, 90 - geopos[1]);
  x[0] = sweDegnorm(h[0] + 90);
  xaz[0] = 360 - x[0];
  xaz[1] = h[1]; // true height
  let atpressAdj = atpress;
  if (atpressAdj === 0) {
    atpressAdj = 1013.25 * Math.pow(1 - 0.0065 * geopos[2] / 288, 5.255);
  }
  xaz[2] = sweRefracExtended(h[1], geopos[2], atpressAdj, attemp, constLapseRate, SE_TRUE_TO_APP, null);
}

export function sweAzaltRev(
  swed: SweData, tjdUt: number, calcFlag: number,
  geopos: number[], xin: number[], xout: number[],
): void {
  const x = [0, 0, 0, 0, 0, 0];
  const xaz = [xin[0], xin[1], 1];
  const armc = sweDegnorm(sweSidtime(swed, tjdUt) * 15 + geopos[0]);
  // azimuth from south clockwise → from east counterclock
  xaz[0] = 360 - xaz[0];
  xaz[0] = sweDegnorm(xaz[0] - 90);
  const dang = geopos[1] - 90;
  const eq = [0, 0, 0];
  sweCotrans(xaz, eq, dang);
  xaz[0] = sweDegnorm(eq[0] + armc + 90);
  xout[0] = xaz[0];
  xout[1] = eq[1];
  if (calcFlag === SE_HOR2EQU) return; // already equatorial
  // ecliptic
  const res = sweCalc(swed, tjdUt + sweDeltatEx(tjdUt, -1, swed), SE_ECL_NUT, 0);
  const epsTrue = res.xx[0];
  const ecl = [0, 0, 0];
  sweCotrans([xaz[0], eq[1], 1], ecl, epsTrue);
  xout[0] = ecl[0];
  xout[1] = ecl[1];
}

/* ==================================================================
 * Small helpers for rise/set
 * ================================================================== */

function findMaximum(y00: number, y11: number, y2: number, dx: number): { dxret: number; yret: number } {
  const c = y11;
  const b = (y2 - y00) / 2.0;
  const a = (y2 + y00) / 2.0 - c;
  const x = -b / 2 / a;
  const y = (4 * a * c - b * b) / 4 / a;
  return { dxret: (x - 1) * dx, yret: y };
}

function rdiTwilight(rsmi: number): number {
  if (rsmi & SE_BIT_ASTRO_TWILIGHT) return 18;
  if (rsmi & SE_BIT_NAUTIC_TWILIGHT) return 12;
  if (rsmi & SE_BIT_CIVIL_TWILIGHT) return 6;
  return 0;
}

function getSunRadPlusRefr(ipl: number, dd: number, rsmi: number, refr: number): number {
  let rdi = 0;
  let ddAdj = dd;
  if (rsmi & SE_BIT_FIXED_DISC_SIZE) {
    if (ipl === SE_SUN) ddAdj = 1.0;
    else if (ipl === SE_MOON) ddAdj = 0.00257;
  }
  if (!(rsmi & SE_BIT_DISC_CENTER))
    rdi = Math.asin(PLA_DIAM[ipl] / 2.0 / AUNIT / ddAdj) * RADTODEG;
  if (rsmi & SE_BIT_DISC_BOTTOM) rdi = -rdi;
  if (!(rsmi & SE_BIT_NO_REFRACTION)) rdi += refr;
  return rdi;
}

/* ==================================================================
 * Meridian transit
 * ================================================================== */

function calcMerTrans(
  swed: SweData, tjdUt: number, ipl: number, epheflag: number, rsmi: number,
  geopos: number[], starname: string | null,
  serr: { value: string } | null,
): { retval: number; tret: number } {
  let tjdEt = tjdUt + sweDeltatEx(tjdUt, epheflag, swed);
  let iflag = epheflag & SEFLG_EPHMASK;
  iflag |= (SEFLG_EQUATORIAL | SEFLG_TOPOCTR);
  const doFixstar = starname !== null && starname !== '';
  let armc0 = sweSidtime(swed, tjdUt) + geopos[0] / 15;
  if (armc0 >= 24) armc0 -= 24;
  if (armc0 < 0) armc0 += 24;
  armc0 *= 15;
  let x0: Float64Array;
  if (doFixstar) {
    const res = sweFixstar(swed, starname!, tjdEt, iflag);
    if (res.flags < 0) return { retval: ERR, tret: 0 };
    x0 = res.xx;
  } else {
    const res = sweCalc(swed, tjdEt, ipl, iflag);
    if (res.flags < 0) return { retval: ERR, tret: 0 };
    x0 = res.xx;
  }
  const x = [x0[0], x0[1], 0, 0, 0, 0];
  let t = tjdUt;
  let arxc = armc0;
  if (rsmi & SE_CALC_ITRANSIT) arxc = sweDegnorm(arxc + 180);
  for (let i = 0; i < 4; i++) {
    let mdd = sweDegnorm(x[0] - arxc);
    if (i > 0 && mdd > 180) mdd -= 360;
    t += mdd / 361;
    let armc = sweSidtime(swed, t) + geopos[0] / 15;
    if (armc >= 24) armc -= 24;
    if (armc < 0) armc += 24;
    armc *= 15;
    arxc = armc;
    if (rsmi & SE_CALC_ITRANSIT) arxc = sweDegnorm(arxc + 180);
    if (!doFixstar) {
      const te = t + sweDeltatEx(t, epheflag, swed);
      const res = sweCalc(swed, te, ipl, iflag);
      if (res.flags < 0) return { retval: ERR, tret: 0 };
      x[0] = res.xx[0]; x[1] = res.xx[1];
    }
  }
  return { retval: OK, tret: t };
}

/* ==================================================================
 * rise_set_fast — simple fast algorithm for moderate latitudes
 * ================================================================== */

function riseSetFast(
  swed: SweData, tjdUt: number, ipl: number,
  epheflag: number, rsmi: number,
  dgeo: number[], atpress: number, attemp: number,
  serr: { value: string } | null,
): { retval: number; tret: number } {
  const iflag = epheflag & SEFLG_EPHMASK;
  let iflagtopo = iflag | SEFLG_EQUATORIAL;
  let tohorFlag = SE_EQU2HOR;
  const facrise = (rsmi & SE_CALC_SET) ? -1 : 1;
  let nloop = (ipl === SE_MOON) ? 4 : 2;
  let isSecondRun = false;
  let tjdUtAdj = tjdUt;

  if (!(rsmi & SE_BIT_GEOCTR_NO_ECL_LAT)) {
    iflagtopo |= SEFLG_TOPOCTR;
    sweSetTopo(swed, dgeo[0], dgeo[1], dgeo[2]);
  }

  // run_rise_again loop
  for (;;) {
    const res0 = sweCalcUt(swed, tjdUtAdj, ipl, iflagtopo);
    if (res0.flags < 0) return { retval: ERR, tret: 0 };
    const xx = res0.xx;

    const decl = xx[1];
    let sda = -Math.tan(dgeo[1] * DEGTORAD) * Math.tan(decl * DEGTORAD);
    if (sda >= 1) sda = 10;
    else if (sda <= -1) sda = 180;
    else sda = Math.acos(sda) * RADTODEG;

    const armc = sweDegnorm(sweSidtime(swed, tjdUtAdj) * 15 + dgeo[0]);
    const md = sweDegnorm(xx[0] - armc);
    const mdrise = sweDegnorm(sda * facrise);
    let dmd = sweDegnorm(md - mdrise);
    if (dmd > 358) dmd -= 360;

    let tr = tjdUtAdj + dmd / 360;

    let atpressAdj = atpress;
    if (atpressAdj === 0) {
      atpressAdj = 1013.25 * Math.pow(1 - 0.0065 * dgeo[2] / 288, 5.255);
    }
    const xxRef = [0, 0, 0, 0, 0, 0];
    sweRefracExtended(0.000001, 0, atpressAdj, attemp, constLapseRate, SE_APP_TO_TRUE, xxRef);
    const refr = xxRef[1] - xxRef[0];

    if (rsmi & SE_BIT_GEOCTR_NO_ECL_LAT) {
      tohorFlag = SE_ECL2HOR;
      iflagtopo = iflag;
    } else {
      tohorFlag = SE_EQU2HOR;
      iflagtopo = iflag | SEFLG_EQUATORIAL | SEFLG_TOPOCTR;
      sweSetTopo(swed, dgeo[0], dgeo[1], dgeo[2]);
    }

    for (let i = 0; i < nloop; i++) {
      const resI = sweCalcUt(swed, tr, ipl, iflagtopo);
      if (resI.flags < 0) return { retval: ERR, tret: 0 };
      const xxi = Array.from(resI.xx);
      if (rsmi & SE_BIT_GEOCTR_NO_ECL_LAT) xxi[1] = 0;
      const rdi = getSunRadPlusRefr(ipl, xxi[2], rsmi, refr);
      const xaz = [0, 0, 0];
      const xaz2 = [0, 0, 0];
      sweAzalt(swed, tr, tohorFlag, dgeo, atpressAdj, attemp, xxi, xaz);
      sweAzalt(swed, tr + 0.001, tohorFlag, dgeo, atpressAdj, attemp, xxi, xaz2);
      const dd = xaz2[1] - xaz[1];
      const dalt = xaz[1] + rdi;
      let dt = dalt / dd / 1000.0;
      if (dt > 0.1) dt = 0.1;
      else if (dt < -0.1) dt = -0.1;
      tr -= dt;
    }

    if (tr < tjdUt && !isSecondRun) {
      tjdUtAdj += 0.5;
      isSecondRun = true;
      continue; // goto run_rise_again
    }
    return { retval: OK, tret: tr };
  }
}

/* ==================================================================
 * swe_rise_trans_true_hor — general rise/set with true horizon height
 * ================================================================== */

function sweRiseTransTrueHor(
  swed: SweData, tjdUt: number, ipl: number, starname: string | null,
  epheflag: number, rsmi: number,
  geopos: number[], atpress: number, attemp: number,
  horhgt: number,
  serr: { value: string } | null,
): { retval: number; tret: number } {
  const doFixstar = starname !== null && starname !== '';
  if (geopos[2] < SEI_ECL_GEOALT_MIN || geopos[2] > SEI_ECL_GEOALT_MAX) {
    if (serr) serr.value = `location for swe_rise_trans() must be between ${SEI_ECL_GEOALT_MIN} and ${SEI_ECL_GEOALT_MAX} m above sea`;
    return { retval: ERR, tret: 0 };
  }
  let horhgtAdj = horhgt;
  if (horhgtAdj === -100) {
    horhgtAdj = 0.0001 + calcDip(geopos[2], atpress, attemp, constLapseRate);
  }
  let iplAdj = ipl;
  if (iplAdj === SE_AST_OFFSET + 134340) iplAdj = SE_PLUTO;

  let iflag = epheflag;
  iflag &= (SEFLG_EPHMASK | SEFLG_NONUT | SEFLG_TRUEPOS);
  let tohorFlag = SE_EQU2HOR;
  if (rsmi & SE_BIT_GEOCTR_NO_ECL_LAT) {
    tohorFlag = SE_ECL2HOR;
  } else {
    iflag |= SEFLG_EQUATORIAL;
    iflag |= SEFLG_TOPOCTR;
    sweSetTopo(swed, geopos[0], geopos[1], geopos[2]);
  }

  if (rsmi & (SE_CALC_MTRANSIT | SE_CALC_ITRANSIT)) {
    return calcMerTrans(swed, tjdUt, iplAdj, epheflag, rsmi, geopos, starname, serr);
  }
  let rsmiAdj = rsmi;
  if (!(rsmiAdj & (SE_CALC_RISE | SE_CALC_SET))) rsmiAdj |= SE_CALC_RISE;

  // twilight
  if (iplAdj === SE_SUN && (rsmiAdj & (SE_BIT_CIVIL_TWILIGHT | SE_BIT_NAUTIC_TWILIGHT | SE_BIT_ASTRO_TWILIGHT))) {
    rsmiAdj |= (SE_BIT_NO_REFRACTION | SE_BIT_DISC_CENTER);
    horhgtAdj = -rdiTwilight(rsmiAdj);
  }

  const jmax = 14;
  const twohrs = 1.0 / 12.0;
  let tjdEt = tjdUt + sweDeltatEx(tjdUt, epheflag, swed);

  // Fixed star: compute once
  let xc = [0, 0, 0, 0, 0, 0];
  if (doFixstar) {
    const res = sweFixstar(swed, starname!, tjdEt, iflag);
    if (res.flags < 0) return { retval: ERR, tret: 0 };
    xc = Array.from(res.xx);
  }

  // Compute heights at 15 sampling points spanning ~28 hours
  const tc: number[] = new Array(24).fill(0);
  const h: number[] = new Array(24).fill(0);
  const xh: number[][] = [];
  for (let ii = 0; ii <= jmax + 6; ii++) xh.push([0, 0, 0, 0, 0, 0]);
  let dd = 0;
  let nculm = -1;
  const tculm: number[] = [0, 0, 0, 0];

  for (let ii = 0, t = tjdUt - twohrs; ii <= jmax; ii++, t += twohrs) {
    tc[ii] = t;
    if (!doFixstar) {
      const te = t + sweDeltatEx(t, epheflag, swed);
      const res = sweCalc(swed, te, iplAdj, iflag);
      if (res.flags < 0) return { retval: ERR, tret: 0 };
      xc = Array.from(res.xx);
    }
    if (rsmiAdj & SE_BIT_GEOCTR_NO_ECL_LAT) xc[1] = 0;

    if (ii === 0) {
      if (doFixstar) dd = 0;
      else if (rsmiAdj & SE_BIT_DISC_CENTER) dd = 0;
      else if (iplAdj < NDIAM) dd = PLA_DIAM[iplAdj];
      else if (iplAdj > SE_AST_OFFSET) dd = swed.astDiam * 1000; // km → m
      else dd = 0;
    }

    let curdist = xc[2];
    if (rsmiAdj & SE_BIT_FIXED_DISC_SIZE) {
      if (iplAdj === SE_SUN) curdist = 1.0;
      else if (iplAdj === SE_MOON) curdist = 0.00257;
    }
    const rdi = Math.asin(dd / 2 / AUNIT / curdist) * RADTODEG;

    const ah = [0, 0, 0, 0, 0, 0];
    sweAzalt(swed, t, tohorFlag, geopos, atpress, attemp, xc, ah);
    xh[ii] = [...ah];

    if (rsmiAdj & SE_BIT_DISC_BOTTOM) xh[ii][1] -= rdi;
    else xh[ii][1] += rdi;

    if (rsmiAdj & SE_BIT_NO_REFRACTION) {
      xh[ii][1] -= horhgtAdj;
      h[ii] = xh[ii][1];
    } else {
      const xcTmp = [0, 0, 0, 0, 0, 0];
      sweAzaltRev(swed, t, SE_HOR2EQU, geopos, xh[ii], xcTmp);
      const ahTmp = [0, 0, 0, 0, 0, 0];
      sweAzalt(swed, t, SE_EQU2HOR, geopos, atpress, attemp, xcTmp, ahTmp);
      ahTmp[1] -= horhgtAdj;
      ahTmp[2] -= horhgtAdj;
      xh[ii][1] = ahTmp[1];
      xh[ii][2] = ahTmp[2];
      h[ii] = ahTmp[2];
    }

    // Check for culmination
    if (ii > 1) {
      const dc0 = xh[ii - 2][1];
      const dc1 = xh[ii - 1][1];
      const dc2 = xh[ii][1];
      let calcCulm = 0;
      if (dc1 > dc0 && dc1 > dc2) calcCulm = 1;
      if (dc1 < dc0 && dc1 < dc2) calcCulm = 2;
      if (calcCulm) {
        let dt = twohrs;
        let tcu = t - dt;
        const fm = findMaximum(dc0, dc1, dc2, dt);
        tcu += fm.dxret + dt;
        dt /= 3;
        for (; dt > 0.0001; dt /= 3) {
          const dc = [0, 0, 0];
          for (let i = 0, tt = tcu - dt; i < 3; tt += dt, i++) {
            const te = tt + sweDeltatEx(tt, epheflag, swed);
            if (!doFixstar) {
              const res = sweCalc(swed, te, iplAdj, iflag);
              if (res.flags < 0) return { retval: ERR, tret: 0 };
              xc = Array.from(res.xx);
            }
            if (rsmiAdj & SE_BIT_GEOCTR_NO_ECL_LAT) xc[1] = 0;
            const ahC = [0, 0, 0, 0, 0, 0];
            sweAzalt(swed, tt, tohorFlag, geopos, atpress, attemp, xc, ahC);
            ahC[1] -= horhgtAdj;
            dc[i] = ahC[1];
          }
          const fm2 = findMaximum(dc[0], dc[1], dc[2], dt);
          tcu += fm2.dxret + dt;
        }
        nculm++;
        tculm[nculm] = tcu;
      }
    }
  }

  // Insert culminations into height array
  let jmaxAdj = jmax;
  for (let i = 0; i <= nculm; i++) {
    for (let j = 1; j <= jmaxAdj; j++) {
      if (tculm[i] < tc[j]) {
        for (let k = jmaxAdj; k >= j; k--) {
          tc[k + 1] = tc[k];
          h[k + 1] = h[k];
        }
        tc[j] = tculm[i];
        if (!doFixstar) {
          const te = tc[j] + sweDeltatEx(tc[j], epheflag, swed);
          const res = sweCalc(swed, te, iplAdj, iflag);
          if (res.flags < 0) return { retval: ERR, tret: 0 };
          xc = Array.from(res.xx);
          if (rsmiAdj & SE_BIT_GEOCTR_NO_ECL_LAT) xc[1] = 0;
        }
        let curdist = xc[2];
        if (rsmiAdj & SE_BIT_FIXED_DISC_SIZE) {
          if (iplAdj === SE_SUN) curdist = 1.0;
          else if (iplAdj === SE_MOON) curdist = 0.00257;
        }
        const rdi = Math.asin(dd / 2 / AUNIT / curdist) * RADTODEG;
        const ahIns = [0, 0, 0, 0, 0, 0];
        sweAzalt(swed, tc[j], tohorFlag, geopos, atpress, attemp, xc, ahIns);
        if (rsmiAdj & SE_BIT_DISC_BOTTOM) ahIns[1] -= rdi;
        else ahIns[1] += rdi;
        if (rsmiAdj & SE_BIT_NO_REFRACTION) {
          ahIns[1] -= horhgtAdj;
          h[j] = ahIns[1];
        } else {
          const xcRev = [0, 0, 0, 0, 0, 0];
          sweAzaltRev(swed, tc[j], SE_HOR2EQU, geopos, ahIns, xcRev);
          const ahRef = [0, 0, 0, 0, 0, 0];
          sweAzalt(swed, tc[j], SE_EQU2HOR, geopos, atpress, attemp, xcRev, ahRef);
          ahRef[1] -= horhgtAdj;
          ahRef[2] -= horhgtAdj;
          h[j] = ahRef[2];
        }
        jmaxAdj++;
        break;
      }
    }
  }

  // Binary search for zero-crossings
  for (let ii = 1; ii <= jmaxAdj; ii++) {
    if (h[ii - 1] * h[ii] >= 0) continue;
    if (h[ii - 1] < h[ii] && !(rsmiAdj & SE_CALC_RISE)) continue;
    if (h[ii - 1] > h[ii] && !(rsmiAdj & SE_CALC_SET)) continue;
    const dc = [h[ii - 1], h[ii]];
    const t2 = [tc[ii - 1], tc[ii]];
    for (let i = 0; i < 20; i++) {
      const t = (t2[0] + t2[1]) / 2;
      if (!doFixstar) {
        const te = t + sweDeltatEx(t, epheflag, swed);
        const res = sweCalc(swed, te, iplAdj, iflag);
        if (res.flags < 0) return { retval: ERR, tret: 0 };
        xc = Array.from(res.xx);
        if (rsmiAdj & SE_BIT_GEOCTR_NO_ECL_LAT) xc[1] = 0;
      }
      let curdist = xc[2];
      if (rsmiAdj & SE_BIT_FIXED_DISC_SIZE) {
        if (iplAdj === SE_SUN) curdist = 1.0;
        else if (iplAdj === SE_MOON) curdist = 0.00257;
      }
      const rdi = Math.asin(dd / 2 / AUNIT / curdist) * RADTODEG;
      const ahBin = [0, 0, 0, 0, 0, 0];
      sweAzalt(swed, t, tohorFlag, geopos, atpress, attemp, xc, ahBin);
      if (rsmiAdj & SE_BIT_DISC_BOTTOM) ahBin[1] -= rdi;
      else ahBin[1] += rdi;
      let aha: number;
      if (rsmiAdj & SE_BIT_NO_REFRACTION) {
        ahBin[1] -= horhgtAdj;
        aha = ahBin[1];
      } else {
        const xcRev = [0, 0, 0, 0, 0, 0];
        sweAzaltRev(swed, t, SE_HOR2EQU, geopos, ahBin, xcRev);
        const ahRef = [0, 0, 0, 0, 0, 0];
        sweAzalt(swed, t, SE_EQU2HOR, geopos, atpress, attemp, xcRev, ahRef);
        ahRef[1] -= horhgtAdj;
        ahRef[2] -= horhgtAdj;
        aha = ahRef[2];
      }
      if (aha * dc[0] <= 0) { dc[1] = aha; t2[1] = t; }
      else { dc[0] = aha; t2[0] = t; }
    }
    const t = (t2[0] + t2[1]) / 2;
    if (t > tjdUt) {
      return { retval: OK, tret: t };
    }
  }
  if (serr) serr.value = `rise or set not found for planet ${iplAdj}`;
  return { retval: -2, tret: 0 };
}

/* ==================================================================
 * swe_rise_trans — main entry point
 * ================================================================== */

export function sweRiseTrans(
  swed: SweData, tjdUt: number, ipl: number, starname: string | null,
  epheflag: number, rsmi: number,
  geopos: number[], atpress: number, attemp: number,
  serr: { value: string } | null,
): { retval: number; tret: number } {
  swiInitSwedIfStart(swed);
  const doFixstar = starname !== null && starname !== '';
  if (!doFixstar
    && (rsmi & (SE_CALC_RISE | SE_CALC_SET))
    && !(rsmi & SE_BIT_FORCE_SLOW_METHOD)
    && !(rsmi & (SE_BIT_CIVIL_TWILIGHT | SE_BIT_NAUTIC_TWILIGHT | SE_BIT_ASTRO_TWILIGHT))
    && (ipl >= SE_SUN && ipl <= SE_TRUE_NODE)
    && (Math.abs(geopos[1]) <= 60 || (ipl === SE_SUN && Math.abs(geopos[1]) <= 65))
  ) {
    return riseSetFast(swed, tjdUt, ipl, epheflag, rsmi, geopos, atpress, attemp, serr);
  }
  return sweRiseTransTrueHor(swed, tjdUt, ipl, starname, epheflag, rsmi, geopos, atpress, attemp, 0, serr);
}

export function sweRiseTransTrueHorExport(
  swed: SweData, tjdUt: number, ipl: number, starname: string | null,
  epheflag: number, rsmi: number,
  geopos: number[], atpress: number, attemp: number,
  horhgt: number,
  serr: { value: string } | null,
): { retval: number; tret: number } {
  swiInitSwedIfStart(swed);
  return sweRiseTransTrueHor(swed, tjdUt, ipl, starname, epheflag, rsmi, geopos, atpress, attemp, horhgt, serr);
}

/* ==================================================================
 * swe_gauquelin_sector
 * ================================================================== */

export function sweGauquelinSector(
  swed: SweData,
  tUt: number, ipl: number, starname: string | null,
  iflag: number, imeth: number,
  geopos: number[], atpress: number, attemp: number,
  serr: { value: string } | null,
): { retval: number; dgsect: number } {
  swiInitSwedIfStart(swed);
  if (imeth < 0 || imeth > 5) {
    if (serr) serr.value = `invalid method: ${imeth}`;
    return { retval: ERR, dgsect: 0 };
  }
  let iplAdj = ipl;
  if (iplAdj === SE_AST_OFFSET + 134340) iplAdj = SE_PLUTO;
  const doFixstar = starname !== null && starname !== '';

  /*
   * Methods 0 and 1: geometrically from ecliptic longitude and latitude
   */
  if (imeth === 0 || imeth === 1) {
    const tEt = tUt + sweDeltatEx(tUt, iflag, swed);
    const epsRad = swiEpsilnImport(tEt, iflag, swed);
    const eps = epsRad * RADTODEG;
    const nutlo = [0, 0];
    swiNutationImport(tEt, iflag, nutlo, swed);
    nutlo[0] *= RADTODEG;
    nutlo[1] *= RADTODEG;
    const armc = sweDegnorm(sweSidtime0Import(swed, tUt, eps + nutlo[1], nutlo[0]) * 15 + geopos[0]);
    let x0: Float64Array;
    if (doFixstar) {
      const res = sweFixstar(swed, starname!, tEt, iflag);
      if (res.flags < 0) return { retval: ERR, dgsect: 0 };
      x0 = res.xx;
    } else {
      const res = sweCalc(swed, tEt, iplAdj, iflag);
      if (res.flags < 0) return { retval: ERR, dgsect: 0 };
      x0 = res.xx;
    }
    const xpin = [x0[0], imeth === 1 ? 0 : x0[1], x0[2], x0[3], x0[4], x0[5]];
    const dgsect = sweHousePos(armc, geopos[1], eps + nutlo[1], 'G', xpin, null);
    return { retval: OK, dgsect };
  }

  /*
   * Methods 2-5: from rise and set times
   */
  const epheflag = iflag & SEFLG_EPHMASK;
  let risemeth = 0;
  if (imeth === 2 || imeth === 4) risemeth |= SE_BIT_NO_REFRACTION;
  if (imeth === 2 || imeth === 3) risemeth |= SE_BIT_DISC_CENTER;

  // find next rising
  let riseRes = sweRiseTrans(swed, tUt, iplAdj, starname, epheflag, SE_CALC_RISE | risemeth, geopos, atpress, attemp, serr);
  if (riseRes.retval === ERR) return { retval: ERR, dgsect: 0 };
  let riseFound = riseRes.retval !== -2;
  let trise = riseRes.tret;

  // find next setting
  let setRes = sweRiseTrans(swed, tUt, iplAdj, starname, epheflag, SE_CALC_SET | risemeth, geopos, atpress, attemp, serr);
  if (setRes.retval === ERR) return { retval: ERR, dgsect: 0 };
  let setFound = setRes.retval !== -2;
  let tset = setRes.tret;

  let aboveHorizon = false;

  if (trise < tset && riseFound) {
    aboveHorizon = false;
    // find last set
    let t = tUt - 1.2;
    if (setFound) t = tset - 1.2;
    setFound = true;
    setRes = sweRiseTrans(swed, t, iplAdj, starname, epheflag, SE_CALC_SET | risemeth, geopos, atpress, attemp, serr);
    if (setRes.retval === ERR) return { retval: ERR, dgsect: 0 };
    if (setRes.retval === -2) setFound = false;
    tset = setRes.tret;
  } else if (trise >= tset && setFound) {
    aboveHorizon = true;
    // find last rise
    let t = tUt - 1.2;
    if (riseFound) t = trise - 1.2;
    riseFound = true;
    riseRes = sweRiseTrans(swed, t, iplAdj, starname, epheflag, SE_CALC_RISE | risemeth, geopos, atpress, attemp, serr);
    if (riseRes.retval === ERR) return { retval: ERR, dgsect: 0 };
    if (riseRes.retval === -2) riseFound = false;
    trise = riseRes.tret;
  }

  if (riseFound && setFound) {
    let dgsect: number;
    if (aboveHorizon) {
      dgsect = (tUt - trise) / (tset - trise) * 18 + 1;
    } else {
      dgsect = (tUt - tset) / (trise - tset) * 18 + 19;
    }
    return { retval: OK, dgsect };
  } else {
    if (serr) serr.value = `rise or set not found for planet ${iplAdj}`;
    return { retval: ERR, dgsect: 0 };
  }
}

/* ---- swe_pheno / swe_pheno_ut: planetary phenomena ---- */

const EULER = 2.718281828459;
const NMAG_ELEM = SE_VESTA + 1; // 21

/* Magnitude elements: [V(1,0), coeff1, coeff2, coeff3] */
const MAG_ELEM: number[][] = [
  [-26.86, 0, 0, 0],           // Sun
  [-12.55, 0, 0, 0],           // Moon
  [-0.42, 3.80, -2.73, 2.00],  // Mercury (obsolete placeholder)
  [-4.40, 0.09, 2.39, -0.65],  // Venus (obsolete placeholder)
  [-1.52, 1.60, 0, 0],         // Mars
  [-9.40, 0.5, 0, 0],          // Jupiter
  [-8.88, -2.60, 1.25, 0.044], // Saturn
  [-7.19, 0.0, 0, 0],          // Uranus
  [-6.87, 0.0, 0, 0],          // Neptune
  [-1.00, 0.0, 0, 0],          // Pluto
  [99, 0, 0, 0],               // Mean Node
  [99, 0, 0, 0],               // True Node
  [99, 0, 0, 0],               // Mean Apog
  [99, 0, 0, 0],               // Oscu Apog
  [99, 0, 0, 0],               // Earth
  [6.5, 0.15, 0, 0],           // Chiron
  [7.0, 0.15, 0, 0],           // Pholus
  [3.34, 0.12, 0, 0],          // Ceres
  [4.13, 0.11, 0, 0],          // Pallas
  [5.33, 0.32, 0, 0],          // Juno
  [3.20, 0.32, 0, 0],          // Vesta
];

function swiDotProdUnit(x: number[] | Float64Array, y: number[] | Float64Array): number {
  let dop = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const e1 = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
  const e2 = Math.sqrt(y[0] * y[0] + y[1] * y[1] + y[2] * y[2]);
  dop /= e1;
  dop /= e2;
  if (dop > 1) dop = 1;
  if (dop < -1) dop = -1;
  return dop;
}

/**
 * swe_pheno: planetary phenomena (phase angle, phase, elongation, diameter, magnitude, horiz parallax)
 *
 * attr[0] = phase angle (degrees)
 * attr[1] = phase (illuminated fraction, 0..1)
 * attr[2] = elongation (degrees)
 * attr[3] = apparent diameter (degrees)
 * attr[4] = apparent magnitude
 * attr[5] = horizontal parallax (Moon only, degrees)
 */
export function swePheno(
  swed: SweData, tjd: number, ipl: number, iflag: number,
  serr: { value: string } | null,
): { retval: number; attr: number[] } {
  const attr = new Array(20).fill(0);
  let serr2 = '';
  iflag &= ~(0x40000 | 0x80000); // SEFLG_JPLHOR | SEFLG_JPLHOR_APPROX
  /* Pluto with asteroid number 134340 treated as SE_PLUTO */
  if (ipl === SE_AST_OFFSET + 134340) ipl = SE_PLUTO;
  /* Ceres - Vesta must be SE_CERES etc., not 10001 etc. */
  if (ipl > SE_AST_OFFSET && ipl <= SE_AST_OFFSET + 4)
    ipl = ipl - SE_AST_OFFSET - 1 + SE_CERES;
  iflag = iflag & (SEFLG_EPHMASK | SEFLG_TRUEPOS | SEFLG_J2000 |
    SEFLG_NONUT | SEFLG_NOGDEFL | SEFLG_NOABERR | SEFLG_TOPOCTR);
  let iflagp = iflag & (SEFLG_EPHMASK | SEFLG_TRUEPOS | SEFLG_J2000 |
    SEFLG_NONUT | SEFLG_NOABERR);
  iflagp |= SEFLG_HELCTR;
  let epheflag = iflag & SEFLG_EPHMASK;
  /*
   * geocentric planet (XYZ)
   */
  let res = sweCalc(swed, tjd, ipl, iflag | SEFLG_XYZ);
  if (res.flags === ERR) {
    if (serr) serr.value = res.serr;
    return { retval: ERR, attr };
  }
  const xx = Array.from(res.xx);
  let retflag = res.flags;
  // check epheflag and adjust
  const epheflag2 = retflag & SEFLG_EPHMASK;
  if (epheflag !== epheflag2) {
    iflag = (iflag & ~epheflag) | epheflag2;
    iflagp = (iflagp & ~epheflag) | epheflag2;
    epheflag = epheflag2;
  }
  /* geocentric planet (lon/lat/dist) */
  res = sweCalc(swed, tjd, ipl, iflag);
  if (res.flags === ERR) {
    if (serr) serr.value = res.serr;
    return { retval: ERR, attr };
  }
  const lbr = Array.from(res.xx);
  /* if moon, we need sun as well, for magnitude */
  let xxs: number[] = [];
  if (ipl === SE_MOON) {
    res = sweCalc(swed, tjd, SE_SUN, iflag | SEFLG_XYZ);
    if (res.flags === ERR) {
      if (serr) serr.value = res.serr;
      return { retval: ERR, attr };
    }
    xxs = Array.from(res.xx);
  }
  let lbr2: number[] = [0, 0, 0, 0, 0, 0];
  let dt = 0;
  if (ipl !== SE_SUN && ipl !== SE_EARTH &&
      ipl !== SE_MEAN_NODE && ipl !== SE_TRUE_NODE &&
      ipl !== SE_MEAN_APOG && ipl !== SE_OSCU_APOG) {
    /*
     * light time planet - earth
     */
    dt = lbr[2] * AUNIT / CLIGHT / 86400.0;
    if (iflag & SEFLG_TRUEPOS) dt = 0;
    /*
     * heliocentric planet at tjd - dt (XYZ)
     */
    res = sweCalc(swed, tjd - dt, ipl, iflagp | SEFLG_XYZ);
    if (res.flags === ERR) {
      if (serr) serr.value = res.serr;
      return { retval: ERR, attr };
    }
    const xx2 = Array.from(res.xx);
    /* heliocentric planet (lon/lat/dist) */
    res = sweCalc(swed, tjd - dt, ipl, iflagp);
    if (res.flags === ERR) {
      if (serr) serr.value = res.serr;
      return { retval: ERR, attr };
    }
    lbr2 = Array.from(res.xx);
    /*
     * phase angle
     */
    attr[0] = Math.acos(swiDotProdUnit(xx, xx2)) * RADTODEG;
    /*
     * phase (illuminated fraction)
     */
    attr[1] = (1 + Math.cos(attr[0] * DEGTORAD)) / 2;
  }
  /*
   * apparent diameter of disk
   */
  let dd: number;
  if (ipl < NDIAM)
    dd = PLA_DIAM[ipl];
  else if (ipl > SE_AST_OFFSET)
    dd = swed.astDiam * 1000; /* km -> m */
  else
    dd = 0;
  if (lbr[2] < dd / 2 / AUNIT)
    attr[3] = 180; /* assume position on surface of earth */
  else
    attr[3] = Math.asin(dd / 2 / AUNIT / lbr[2]) * 2 * RADTODEG;
  /*
   * apparent magnitude
   */
  if (ipl > SE_AST_OFFSET || (ipl < NMAG_ELEM && MAG_ELEM[ipl][0] < 99)) {
    if (ipl === SE_SUN) {
      /* ratio apparent diameter : average diameter */
      let fac = attr[3] / (Math.asin(PLA_DIAM[SE_SUN] / 2.0 / AUNIT) * 2 * RADTODEG);
      fac *= fac;
      attr[4] = MAG_ELEM[ipl][0] - 2.5 * Math.log10(fac);
    } else if (ipl === SE_MOON) {
      /* MAG_MOON_VREIJS formula */
      const a = attr[0];
      if (a <= 147.1385465) {
        /* Allen, C.W., 1976, Astrophysical Quantities */
        attr[4] = -21.62 + 0.026 * Math.abs(a) + 0.000000004 * Math.pow(a, 4);
        attr[4] += 5 * Math.log10(lbr[2] * lbr2[2] * AUNIT / EARTH_RADIUS);
      } else {
        /* Samaha cube phase angle */
        attr[4] = -4.5444 - (2.5 * Math.log10(Math.pow(180 - a, 3)));
        attr[4] += 5 * Math.log10(lbr[2] * lbr2[2] * AUNIT / EARTH_RADIUS);
      }
    /* MAG_MALLAMA_2018 formulas for Mercury through Neptune */
    } else if (ipl === 2) { /* Mercury */
      const a = attr[0];
      const a2 = a * a; const a3 = a2 * a; const a4 = a3 * a; const a5 = a4 * a; const a6 = a5 * a;
      attr[4] = -0.613 + a * 6.3280E-02 - a2 * 1.6336E-03 + a3 * 3.3644E-05 - a4 * 3.4265E-07 + a5 * 1.6893E-09 - a6 * 3.0334E-12;
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
    } else if (ipl === 3) { /* Venus */
      const a = attr[0];
      const a2 = a * a; const a3 = a2 * a; const a4 = a3 * a;
      if (a <= 163.7)
        attr[4] = -4.384 - a * 1.044E-03 + a2 * 3.687E-04 - a3 * 2.814E-06 + a4 * 8.938E-09;
      else
        attr[4] = 236.05828 - a * 2.81914E+00 + a2 * 8.39034E-03;
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
      if (attr[0] > 179.0)
        serr2 = `magnitude value for Venus at phase angle i=${attr[0].toFixed(1)} is bad; formula is valid only for i < 179.0`;
    } else if (ipl === 4) { /* Mars */
      const a = attr[0];
      const a2 = a * a;
      if (a <= 50.0)
        attr[4] = -1.601 + a * 0.02267 - a2 * 0.0001302;
      else
        attr[4] = -0.367 - a * 0.02573 + a2 * 0.0003445;
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
    } else if (ipl === 5) { /* Jupiter */
      const a = attr[0];
      const a2 = a * a;
      attr[4] = -9.395 - a * 3.7E-04 + a2 * 6.16E-04;
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
    } else if (ipl === 6) { /* Saturn */
      const a = attr[0];
      const T = (tjd - dt - J2000) / 36525.0;
      const inc = (28.075216 - 0.012998 * T + 0.000004 * T * T) * DEGTORAD;
      const om = (169.508470 + 1.394681 * T + 0.000412 * T * T) * DEGTORAD;
      let sinB = (Math.sin(inc) * Math.cos(lbr[1] * DEGTORAD)
                  * Math.sin(lbr[0] * DEGTORAD - om)
                  - Math.cos(inc) * Math.sin(lbr[1] * DEGTORAD));
      const sinB2 = (Math.sin(inc) * Math.cos(lbr2[1] * DEGTORAD)
                  * Math.sin(lbr2[0] * DEGTORAD - om)
                  - Math.cos(inc) * Math.sin(lbr2[1] * DEGTORAD));
      sinB = Math.abs(Math.sin((Math.asin(sinB) + Math.asin(sinB2)) / 2.0));
      attr[4] = -8.914 - 1.825 * sinB + 0.026 * a - 0.378 * sinB * Math.pow(2.7182818, -2.25 * a);
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
    } else if (ipl === 7) { /* Uranus */
      const a = attr[0];
      const a2 = a * a;
      const fi_ = 0; // sub-Earth latitude in deg; ignored
      attr[4] = -7.110 - 8.4E-04 * fi_ + a * 6.587E-3 + a2 * 1.045E-4;
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
      attr[4] -= 0.05;
    } else if (ipl === 8) { /* Neptune */
      if (tjd < 2444239.5) {
        attr[4] = -6.89;
      } else if (tjd <= 2451544.5) {
        attr[4] = -6.89 - 0.0055 * (tjd - 2444239.5) / 365.25;
      } else {
        attr[4] = -7.00;
      }
      attr[4] += 5 * Math.log10(lbr2[2] * lbr[2]);
    } else if (ipl < SE_CHIRON) {
      attr[4] = 5 * Math.log10(lbr2[2] * lbr[2])
                + MAG_ELEM[ipl][1] * attr[0] / 100.0
                + MAG_ELEM[ipl][2] * attr[0] * attr[0] / 10000.0
                + MAG_ELEM[ipl][3] * attr[0] * attr[0] * attr[0] / 1000000.0
                + MAG_ELEM[ipl][0];
    } else if (ipl < NMAG_ELEM || ipl > SE_AST_OFFSET) {
      /* other planets, asteroids */
      const ph1 = Math.pow(EULER, -3.33 * Math.pow(Math.tan(attr[0] * DEGTORAD / 2), 0.63));
      const ph2 = Math.pow(EULER, -1.87 * Math.pow(Math.tan(attr[0] * DEGTORAD / 2), 1.22));
      let me0: number, me1: number;
      if (ipl < NMAG_ELEM) {
        me0 = MAG_ELEM[ipl][0];
        me1 = MAG_ELEM[ipl][1];
      } else if (ipl === SE_AST_OFFSET + 1566) {
        /* Icarus */
        me0 = 16.9;
        me1 = 0.15;
      } else {
        me0 = swed.astH;
        me1 = swed.astG;
      }
      attr[4] = 5 * Math.log10(lbr2[2] * lbr[2])
                + me0
                - 2.5 * Math.log10((1 - me1) * ph1 + me1 * ph2);
    } else {
      /* fictitious bodies */
      attr[4] = 0;
    }
  }
  if (ipl !== SE_SUN && ipl !== SE_EARTH) {
    /*
     * elongation of planet
     */
    res = sweCalc(swed, tjd, SE_SUN, iflag | SEFLG_XYZ);
    if (res.flags === ERR) {
      if (serr) serr.value = res.serr;
      return { retval: ERR, attr };
    }
    const xx2Sun = Array.from(res.xx);
    res = sweCalc(swed, tjd, SE_SUN, iflag);
    if (res.flags === ERR) {
      if (serr) serr.value = res.serr;
      return { retval: ERR, attr };
    }
    attr[2] = Math.acos(swiDotProdUnit(xx, xx2Sun)) * RADTODEG;
  }
  /* horizontal parallax */
  if (ipl === SE_MOON) {
    /* geocentric horizontal parallax */
    res = sweCalc(swed, tjd, ipl, epheflag | SEFLG_TRUEPOS | SEFLG_EQUATORIAL | SEFLG_RADIANS);
    if (res.flags === ERR) {
      if (serr) serr.value = res.serr;
      return { retval: ERR, attr };
    }
    const xm = Array.from(res.xx);
    const sinhp = EARTH_RADIUS / xm[2] / AUNIT;
    attr[5] = Math.asin(sinhp) / DEGTORAD;
    /* topocentric horizontal parallax */
    if (iflag & SEFLG_TOPOCTR) {
      res = sweCalc(swed, tjd, ipl, epheflag | SEFLG_XYZ | SEFLG_TOPOCTR);
      if (res.flags === ERR) {
        if (serr) serr.value = res.serr;
        return { retval: ERR, attr };
      }
      const xmTopo = Array.from(res.xx);
      res = sweCalc(swed, tjd, ipl, epheflag | SEFLG_XYZ);
      if (res.flags === ERR) {
        if (serr) serr.value = res.serr;
        return { retval: ERR, attr };
      }
      const xxGeo = Array.from(res.xx);
      attr[5] = Math.acos(swiDotProdUnit(xmTopo, xxGeo)) / DEGTORAD;
    }
  }
  if (serr2 && serr) serr.value = serr2;
  return { retval: iflag, attr };
}

/**
 * swe_pheno_ut: planetary phenomena for UT
 */
export function swePhenoUt(
  swed: SweData, tjdUt: number, ipl: number, iflag: number,
  serr: { value: string } | null,
): { retval: number; attr: number[] } {
  let epheflag = iflag & SEFLG_EPHMASK;
  if (epheflag === 0) {
    epheflag = SEFLG_SWIEPH;
    iflag |= SEFLG_SWIEPH;
  }
  let deltat = sweDeltatEx(tjdUt, iflag, swed);
  let result = swePheno(swed, tjdUt + deltat, ipl, iflag, serr);
  /* if ephe required is not ephe returned, adjust delta t */
  if ((result.retval & SEFLG_EPHMASK) !== epheflag) {
    deltat = sweDeltatEx(tjdUt, result.retval, swed);
    result = swePheno(swed, tjdUt + deltat, ipl, iflag, serr);
  }
  return result;
}

/* ---- Internal imports used by gauquelin method 0/1 ---- */
import { swiEpsiln as swiEpsilnImport, swiNutation as swiNutationImport, sweSidtime0 as sweSidtime0Import } from './swephlib';

/* ==================================================================
 * Saros cycle data tables
 * ================================================================== */

interface SarosData { seriesNo: number; tstart: number }

const SAROS_DATA_SOLAR: SarosData[] = [
  {seriesNo: 0, tstart: 641886.5},
  {seriesNo: 1, tstart: 672214.5},
  {seriesNo: 2, tstart: 676200.5},
  {seriesNo: 3, tstart: 693357.5},
  {seriesNo: 4, tstart: 723685.5},
  {seriesNo: 5, tstart: 727671.5},
  {seriesNo: 6, tstart: 744829.5},
  {seriesNo: 7, tstart: 775157.5},
  {seriesNo: 8, tstart: 779143.5},
  {seriesNo: 9, tstart: 783131.5},
  {seriesNo: 10, tstart: 820044.5},
  {seriesNo: 11, tstart: 810859.5},
  {seriesNo: 12, tstart: 748993.5},
  {seriesNo: 13, tstart: 792492.5},
  {seriesNo: 14, tstart: 789892.5},
  {seriesNo: 15, tstart: 787294.5},
  {seriesNo: 16, tstart: 824207.5},
  {seriesNo: 17, tstart: 834779.5},
  {seriesNo: 18, tstart: 838766.5},
  {seriesNo: 19, tstart: 869094.5},
  {seriesNo: 20, tstart: 886251.5},
  {seriesNo: 21, tstart: 890238.5},
  {seriesNo: 22, tstart: 927151.5},
  {seriesNo: 23, tstart: 937722.5},
  {seriesNo: 24, tstart: 941709.5},
  {seriesNo: 25, tstart: 978623.5},
  {seriesNo: 26, tstart: 989194.5},
  {seriesNo: 27, tstart: 993181.5},
  {seriesNo: 28, tstart: 1023510.5},
  {seriesNo: 29, tstart: 1034081.5},
  {seriesNo: 30, tstart: 972214.5},
  {seriesNo: 31, tstart: 1061811.5},
  {seriesNo: 32, tstart: 1006529.5},
  {seriesNo: 33, tstart: 997345.5},
  {seriesNo: 34, tstart: 1021088.5},
  {seriesNo: 35, tstart: 1038245.5},
  {seriesNo: 36, tstart: 1042231.5},
  {seriesNo: 37, tstart: 1065974.5},
  {seriesNo: 38, tstart: 1089716.5},
  {seriesNo: 39, tstart: 1093703.5},
  {seriesNo: 40, tstart: 1117446.5},
  {seriesNo: 41, tstart: 1141188.5},
  {seriesNo: 42, tstart: 1145175.5},
  {seriesNo: 43, tstart: 1168918.5},
  {seriesNo: 44, tstart: 1192660.5},
  {seriesNo: 45, tstart: 1196647.5},
  {seriesNo: 46, tstart: 1220390.5},
  {seriesNo: 47, tstart: 1244132.5},
  {seriesNo: 48, tstart: 1234948.5},
  {seriesNo: 49, tstart: 1265277.5},
  {seriesNo: 50, tstart: 1282433.5},
  {seriesNo: 51, tstart: 1207395.5},
  {seriesNo: 52, tstart: 1217968.5},
  {seriesNo: 53, tstart: 1254881.5},
  {seriesNo: 54, tstart: 1252282.5},
  {seriesNo: 55, tstart: 1262855.5},
  {seriesNo: 56, tstart: 1293182.5},
  {seriesNo: 57, tstart: 1297169.5},
  {seriesNo: 58, tstart: 1314326.5},
  {seriesNo: 59, tstart: 1344654.5},
  {seriesNo: 60, tstart: 1348640.5},
  {seriesNo: 61, tstart: 1365798.5},
  {seriesNo: 62, tstart: 1396126.5},
  {seriesNo: 63, tstart: 1400112.5},
  {seriesNo: 64, tstart: 1417270.5},
  {seriesNo: 65, tstart: 1447598.5},
  {seriesNo: 66, tstart: 1444999.5},
  {seriesNo: 67, tstart: 1462157.5},
  {seriesNo: 68, tstart: 1492485.5},
  {seriesNo: 69, tstart: 1456959.5},
  {seriesNo: 70, tstart: 1421434.5},
  {seriesNo: 71, tstart: 1471518.5},
  {seriesNo: 72, tstart: 1455748.5},
  {seriesNo: 73, tstart: 1466320.5},
  {seriesNo: 74, tstart: 1496648.5},
  {seriesNo: 75, tstart: 1500634.5},
  {seriesNo: 76, tstart: 1511207.5},
  {seriesNo: 77, tstart: 1548120.5},
  {seriesNo: 78, tstart: 1552106.5},
  {seriesNo: 79, tstart: 1562679.5},
  {seriesNo: 80, tstart: 1599592.5},
  {seriesNo: 81, tstart: 1603578.5},
  {seriesNo: 82, tstart: 1614150.5},
  {seriesNo: 83, tstart: 1644479.5},
  {seriesNo: 84, tstart: 1655050.5},
  {seriesNo: 85, tstart: 1659037.5},
  {seriesNo: 86, tstart: 1695950.5},
  {seriesNo: 87, tstart: 1693351.5},
  {seriesNo: 88, tstart: 1631484.5},
  {seriesNo: 89, tstart: 1727666.5},
  {seriesNo: 90, tstart: 1672384.5},
  {seriesNo: 91, tstart: 1663200.5},
  {seriesNo: 92, tstart: 1693529.5},
  {seriesNo: 93, tstart: 1710685.5},
  {seriesNo: 94, tstart: 1714672.5},
  {seriesNo: 95, tstart: 1738415.5},
  {seriesNo: 96, tstart: 1755572.5},
  {seriesNo: 97, tstart: 1766144.5},
  {seriesNo: 98, tstart: 1789887.5},
  {seriesNo: 99, tstart: 1807044.5},
  {seriesNo: 100, tstart: 1817616.5},
  {seriesNo: 101, tstart: 1841359.5},
  {seriesNo: 102, tstart: 1858516.5},
  {seriesNo: 103, tstart: 1862502.5},
  {seriesNo: 104, tstart: 1892831.5},
  {seriesNo: 105, tstart: 1903402.5},
  {seriesNo: 106, tstart: 1887633.5},
  {seriesNo: 107, tstart: 1924547.5},
  {seriesNo: 108, tstart: 1921948.5},
  {seriesNo: 109, tstart: 1873251.5},
  {seriesNo: 110, tstart: 1890409.5},
  {seriesNo: 111, tstart: 1914151.5},
  {seriesNo: 112, tstart: 1918138.5},
  {seriesNo: 113, tstart: 1935296.5},
  {seriesNo: 114, tstart: 1959038.5},
  {seriesNo: 115, tstart: 1963024.5},
  {seriesNo: 116, tstart: 1986767.5},
  {seriesNo: 117, tstart: 2010510.5},
  {seriesNo: 118, tstart: 2014496.5},
  {seriesNo: 119, tstart: 2031654.5},
  {seriesNo: 120, tstart: 2061982.5},
  {seriesNo: 121, tstart: 2065968.5},
  {seriesNo: 122, tstart: 2083126.5},
  {seriesNo: 123, tstart: 2113454.5},
  {seriesNo: 124, tstart: 2104269.5},
  {seriesNo: 125, tstart: 2108256.5},
  {seriesNo: 126, tstart: 2151755.5},
  {seriesNo: 127, tstart: 2083302.5},
  {seriesNo: 128, tstart: 2080704.5},
  {seriesNo: 129, tstart: 2124203.5},
  {seriesNo: 130, tstart: 2121603.5},
  {seriesNo: 131, tstart: 2132176.5},
  {seriesNo: 132, tstart: 2162504.5},
  {seriesNo: 133, tstart: 2166490.5},
  {seriesNo: 134, tstart: 2177062.5},
  {seriesNo: 135, tstart: 2207390.5},
  {seriesNo: 136, tstart: 2217962.5},
  {seriesNo: 137, tstart: 2228534.5},
  {seriesNo: 138, tstart: 2258862.5},
  {seriesNo: 139, tstart: 2269434.5},
  {seriesNo: 140, tstart: 2273421.5},
  {seriesNo: 141, tstart: 2310334.5},
  {seriesNo: 142, tstart: 2314320.5},
  {seriesNo: 143, tstart: 2311722.5},
  {seriesNo: 144, tstart: 2355221.5},
  {seriesNo: 145, tstart: 2319695.5},
  {seriesNo: 146, tstart: 2284169.5},
  {seriesNo: 147, tstart: 2314498.5},
  {seriesNo: 148, tstart: 2325069.5},
  {seriesNo: 149, tstart: 2329056.5},
  {seriesNo: 150, tstart: 2352799.5},
  {seriesNo: 151, tstart: 2369956.5},
  {seriesNo: 152, tstart: 2380528.5},
  {seriesNo: 153, tstart: 2404271.5},
  {seriesNo: 154, tstart: 2421428.5},
  {seriesNo: 155, tstart: 2425414.5},
  {seriesNo: 156, tstart: 2455743.5},
  {seriesNo: 157, tstart: 2472900.5},
  {seriesNo: 158, tstart: 2476886.5},
  {seriesNo: 159, tstart: 2500629.5},
  {seriesNo: 160, tstart: 2517786.5},
  {seriesNo: 161, tstart: 2515187.5},
  {seriesNo: 162, tstart: 2545516.5},
  {seriesNo: 163, tstart: 2556087.5},
  {seriesNo: 164, tstart: 2487635.5},
  {seriesNo: 165, tstart: 2504793.5},
  {seriesNo: 166, tstart: 2535121.5},
  {seriesNo: 167, tstart: 2525936.5},
  {seriesNo: 168, tstart: 2543094.5},
  {seriesNo: 169, tstart: 2573422.5},
  {seriesNo: 170, tstart: 2577408.5},
  {seriesNo: 171, tstart: 2594566.5},
  {seriesNo: 172, tstart: 2624894.5},
  {seriesNo: 173, tstart: 2628880.5},
  {seriesNo: 174, tstart: 2646038.5},
  {seriesNo: 175, tstart: 2669780.5},
  {seriesNo: 176, tstart: 2673766.5},
  {seriesNo: 177, tstart: 2690924.5},
  {seriesNo: 178, tstart: 2721252.5},
  {seriesNo: 179, tstart: 2718653.5},
  {seriesNo: 180, tstart: 2729226.5},
];

const SAROS_DATA_LUNAR: SarosData[] = [
  {seriesNo: 1, tstart: 782437.5},
  {seriesNo: 2, tstart: 799593.5},
  {seriesNo: 3, tstart: 783824.5},
  {seriesNo: 4, tstart: 754884.5},
  {seriesNo: 5, tstart: 824724.5},
  {seriesNo: 6, tstart: 762857.5},
  {seriesNo: 7, tstart: 773430.5},
  {seriesNo: 8, tstart: 810343.5},
  {seriesNo: 9, tstart: 807743.5},
  {seriesNo: 10, tstart: 824901.5},
  {seriesNo: 11, tstart: 855229.5},
  {seriesNo: 12, tstart: 859215.5},
  {seriesNo: 13, tstart: 876373.5},
  {seriesNo: 14, tstart: 906701.5},
  {seriesNo: 15, tstart: 910687.5},
  {seriesNo: 16, tstart: 927845.5},
  {seriesNo: 17, tstart: 958173.5},
  {seriesNo: 18, tstart: 962159.5},
  {seriesNo: 19, tstart: 979317.5},
  {seriesNo: 20, tstart: 1009645.5},
  {seriesNo: 21, tstart: 1007046.5},
  {seriesNo: 22, tstart: 1017618.5},
  {seriesNo: 23, tstart: 1054531.5},
  {seriesNo: 24, tstart: 979493.5},
  {seriesNo: 25, tstart: 976895.5},
  {seriesNo: 26, tstart: 1020394.5},
  {seriesNo: 27, tstart: 1017794.5},
  {seriesNo: 28, tstart: 1028367.5},
  {seriesNo: 29, tstart: 1058695.5},
  {seriesNo: 30, tstart: 1062681.5},
  {seriesNo: 31, tstart: 1073253.5},
  {seriesNo: 32, tstart: 1110167.5},
  {seriesNo: 33, tstart: 1114153.5},
  {seriesNo: 34, tstart: 1131311.5},
  {seriesNo: 35, tstart: 1161639.5},
  {seriesNo: 36, tstart: 1165625.5},
  {seriesNo: 37, tstart: 1176197.5},
  {seriesNo: 38, tstart: 1213111.5},
  {seriesNo: 39, tstart: 1217097.5},
  {seriesNo: 40, tstart: 1221084.5},
  {seriesNo: 41, tstart: 1257997.5},
  {seriesNo: 42, tstart: 1255398.5},
  {seriesNo: 43, tstart: 1186946.5},
  {seriesNo: 44, tstart: 1283128.5},
  {seriesNo: 45, tstart: 1227845.5},
  {seriesNo: 46, tstart: 1225247.5},
  {seriesNo: 47, tstart: 1255575.5},
  {seriesNo: 48, tstart: 1272732.5},
  {seriesNo: 49, tstart: 1276719.5},
  {seriesNo: 50, tstart: 1307047.5},
  {seriesNo: 51, tstart: 1317619.5},
  {seriesNo: 52, tstart: 1328191.5},
  {seriesNo: 53, tstart: 1358519.5},
  {seriesNo: 54, tstart: 1375676.5},
  {seriesNo: 55, tstart: 1379663.5},
  {seriesNo: 56, tstart: 1409991.5},
  {seriesNo: 57, tstart: 1420562.5},
  {seriesNo: 58, tstart: 1424549.5},
  {seriesNo: 59, tstart: 1461463.5},
  {seriesNo: 60, tstart: 1465449.5},
  {seriesNo: 61, tstart: 1436509.5},
  {seriesNo: 62, tstart: 1493179.5},
  {seriesNo: 63, tstart: 1457653.5},
  {seriesNo: 64, tstart: 1435298.5},
  {seriesNo: 65, tstart: 1452456.5},
  {seriesNo: 66, tstart: 1476198.5},
  {seriesNo: 67, tstart: 1480184.5},
  {seriesNo: 68, tstart: 1503928.5},
  {seriesNo: 69, tstart: 1527670.5},
  {seriesNo: 70, tstart: 1531656.5},
  {seriesNo: 71, tstart: 1548814.5},
  {seriesNo: 72, tstart: 1579142.5},
  {seriesNo: 73, tstart: 1583128.5},
  {seriesNo: 74, tstart: 1600286.5},
  {seriesNo: 75, tstart: 1624028.5},
  {seriesNo: 76, tstart: 1628015.5},
  {seriesNo: 77, tstart: 1651758.5},
  {seriesNo: 78, tstart: 1675500.5},
  {seriesNo: 79, tstart: 1672901.5},
  {seriesNo: 80, tstart: 1683474.5},
  {seriesNo: 81, tstart: 1713801.5},
  {seriesNo: 82, tstart: 1645349.5},
  {seriesNo: 83, tstart: 1649336.5},
  {seriesNo: 84, tstart: 1686249.5},
  {seriesNo: 85, tstart: 1683650.5},
  {seriesNo: 86, tstart: 1694222.5},
  {seriesNo: 87, tstart: 1731136.5},
  {seriesNo: 88, tstart: 1735122.5},
  {seriesNo: 89, tstart: 1745694.5},
  {seriesNo: 90, tstart: 1776022.5},
  {seriesNo: 91, tstart: 1786594.5},
  {seriesNo: 92, tstart: 1797166.5},
  {seriesNo: 93, tstart: 1827494.5},
  {seriesNo: 94, tstart: 1838066.5},
  {seriesNo: 95, tstart: 1848638.5},
  {seriesNo: 96, tstart: 1878966.5},
  {seriesNo: 97, tstart: 1882952.5},
  {seriesNo: 98, tstart: 1880354.5},
  {seriesNo: 99, tstart: 1923853.5},
  {seriesNo: 100, tstart: 1881741.5},
  {seriesNo: 101, tstart: 1852801.5},
  {seriesNo: 102, tstart: 1889715.5},
  {seriesNo: 103, tstart: 1893701.5},
  {seriesNo: 104, tstart: 1897688.5},
  {seriesNo: 105, tstart: 1928016.5},
  {seriesNo: 106, tstart: 1938588.5},
  {seriesNo: 107, tstart: 1942575.5},
  {seriesNo: 108, tstart: 1972903.5},
  {seriesNo: 109, tstart: 1990059.5},
  {seriesNo: 110, tstart: 1994046.5},
  {seriesNo: 111, tstart: 2024375.5},
  {seriesNo: 112, tstart: 2034946.5},
  {seriesNo: 113, tstart: 2045518.5},
  {seriesNo: 114, tstart: 2075847.5},
  {seriesNo: 115, tstart: 2086418.5},
  {seriesNo: 116, tstart: 2083820.5},
  {seriesNo: 117, tstart: 2120733.5},
  {seriesNo: 118, tstart: 2124719.5},
  {seriesNo: 119, tstart: 2062852.5},
  {seriesNo: 120, tstart: 2086596.5},
  {seriesNo: 121, tstart: 2103752.5},
  {seriesNo: 122, tstart: 2094568.5},
  {seriesNo: 123, tstart: 2118311.5},
  {seriesNo: 124, tstart: 2142054.5},
  {seriesNo: 125, tstart: 2146040.5},
  {seriesNo: 126, tstart: 2169783.5},
  {seriesNo: 127, tstart: 2186940.5},
  {seriesNo: 128, tstart: 2197512.5},
  {seriesNo: 129, tstart: 2214670.5},
  {seriesNo: 130, tstart: 2238412.5},
  {seriesNo: 131, tstart: 2242398.5},
  {seriesNo: 132, tstart: 2266142.5},
  {seriesNo: 133, tstart: 2289884.5},
  {seriesNo: 134, tstart: 2287285.5},
  {seriesNo: 135, tstart: 2311028.5},
  {seriesNo: 136, tstart: 2334770.5},
  {seriesNo: 137, tstart: 2292659.5},
  {seriesNo: 138, tstart: 2276890.5},
  {seriesNo: 139, tstart: 2326974.5},
  {seriesNo: 140, tstart: 2304619.5},
  {seriesNo: 141, tstart: 2308606.5},
  {seriesNo: 142, tstart: 2345520.5},
  {seriesNo: 143, tstart: 2349506.5},
  {seriesNo: 144, tstart: 2360078.5},
  {seriesNo: 145, tstart: 2390406.5},
  {seriesNo: 146, tstart: 2394392.5},
  {seriesNo: 147, tstart: 2411550.5},
  {seriesNo: 148, tstart: 2441878.5},
  {seriesNo: 149, tstart: 2445864.5},
  {seriesNo: 150, tstart: 2456437.5},
  {seriesNo: 151, tstart: 2486765.5},
  {seriesNo: 152, tstart: 2490751.5},
  {seriesNo: 153, tstart: 2501323.5},
  {seriesNo: 154, tstart: 2538236.5},
  {seriesNo: 155, tstart: 2529052.5},
  {seriesNo: 156, tstart: 2473771.5},
  {seriesNo: 157, tstart: 2563367.5},
  {seriesNo: 158, tstart: 2508085.5},
  {seriesNo: 159, tstart: 2505486.5},
  {seriesNo: 160, tstart: 2542400.5},
  {seriesNo: 161, tstart: 2546386.5},
  {seriesNo: 162, tstart: 2556958.5},
  {seriesNo: 163, tstart: 2587287.5},
  {seriesNo: 164, tstart: 2597858.5},
  {seriesNo: 165, tstart: 2601845.5},
  {seriesNo: 166, tstart: 2632173.5},
  {seriesNo: 167, tstart: 2649330.5},
  {seriesNo: 168, tstart: 2653317.5},
  {seriesNo: 169, tstart: 2683645.5},
  {seriesNo: 170, tstart: 2694217.5},
  {seriesNo: 171, tstart: 2698203.5},
  {seriesNo: 172, tstart: 2728532.5},
  {seriesNo: 173, tstart: 2739103.5},
  {seriesNo: 174, tstart: 2683822.5},
  {seriesNo: 175, tstart: 2740492.5},
  {seriesNo: 176, tstart: 2724722.5},
  {seriesNo: 177, tstart: 2708952.5},
  {seriesNo: 178, tstart: 2732695.5},
  {seriesNo: 179, tstart: 2749852.5},
  {seriesNo: 180, tstart: 2753839.5},
];

/* ==================================================================
 * Small eclipse helpers
 * ================================================================== */

function findZero(y00: number, y11: number, y2: number, dx: number): { dxret: number; dxret2: number } | null {
  const c = y11;
  const b = (y2 - y00) / 2.0;
  const a = (y2 + y00) / 2.0 - c;
  if (b * b - 4 * a * c < 0) return null;
  const x1 = (-b + Math.sqrt(b * b - 4 * a * c)) / 2 / a;
  const x2 = (-b - Math.sqrt(b * b - 4 * a * c)) / 2 / a;
  return { dxret: (x1 - 1) * dx, dxret2: (x2 - 1) * dx };
}

function calcPlanetStar(
  swed: SweData, tjdEt: number, ipl: number, starname: string | null,
  iflag: number,
): { retval: number; xx: Float64Array; serr: string } {
  if (starname !== null && starname !== '') {
    const res = sweFixstar(swed, starname, tjdEt, iflag);
    return { retval: res.flags, xx: res.xx, serr: res.serr || '' };
  } else {
    const res = sweCalc(swed, tjdEt, ipl, iflag);
    return { retval: res.flags, xx: res.xx, serr: res.serr };
  }
}

function dotProd(x: number[] | Float64Array, y: number[] | Float64Array): number {
  return x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
}

/* ==================================================================
 * Phase 2: Core internal functions
 * ================================================================== */

function eclipseWhere(
  swed: SweData, tjdUt: number, ipl: number, starname: string | null,
  ifl: number,
): { retval: number; geopos: number[]; dcore: number[] } {
  const dcore = new Array(10).fill(0);
  const geopos = [0, 0];
  let retc = 0;
  const de = 6378140.0 / AUNIT;
  let earthobl = 1 - EARTH_OBLATENESS;
  const rmoon = RMOON;
  const dmoon = 2 * rmoon;
  let noEclipse = false;
  const iflag = SEFLG_SPEED | SEFLG_EQUATORIAL | ifl;
  const iflag2 = iflag | SEFLG_RADIANS;
  const iflagXyz = iflag | SEFLG_XYZ;
  const deltat = sweDeltatEx(tjdUt, ifl, swed);
  const tjd = tjdUt + deltat;
  /* moon in cartesian coordinates */
  let res = sweCalc(swed, tjd, SE_MOON, iflagXyz);
  if (res.flags === ERR) return { retval: ERR, geopos, dcore };
  const rm = Array.from(res.xx);
  /* moon in polar coordinates */
  res = sweCalc(swed, tjd, SE_MOON, iflag2);
  if (res.flags === ERR) return { retval: ERR, geopos, dcore };
  const lm = Array.from(res.xx);
  /* sun/star in cartesian coordinates */
  let res2 = calcPlanetStar(swed, tjd, ipl, starname, iflagXyz);
  if (res2.retval === ERR) return { retval: ERR, geopos, dcore };
  const rs = Array.from(res2.xx);
  /* sun/star in polar coordinates */
  res2 = calcPlanetStar(swed, tjd, ipl, starname, iflag2);
  if (res2.retval === ERR) return { retval: ERR, geopos, dcore };
  const ls = Array.from(res2.xx);
  /* save original positions */
  const rst = [rs[0], rs[1], rs[2]];
  const rmt = [rm[0], rm[1], rm[2]];
  const oe = swed.oec;
  let sidt: number;
  if (ifl & SEFLG_NONUT)
    sidt = sweSidtime0Import(swed, tjdUt, oe.eps * RADTODEG, 0) * 15 * DEGTORAD;
  else
    sidt = sweSidtime(swed, tjdUt) * 15 * DEGTORAD;
  /* radius of planet disk in AU */
  let drad: number;
  if (starname !== null && starname !== '')
    drad = 0;
  else if (ipl < NDIAM)
    drad = PLA_DIAM[ipl] / 2 / AUNIT;
  else if (ipl > SE_AST_OFFSET)
    drad = swed.astDiam / 2 * 1000 / AUNIT;
  else
    drad = 0;
  /* iter_where loop: 2 iterations for oblateness correction */
  for (let niter = 0; niter <= 1; niter++) {
    for (let i = 0; i <= 2; i++) { rs[i] = rst[i]; rm[i] = rmt[i]; }
    /* Account for oblateness: correct z coordinate */
    const lx = [lm[0], lm[1], lm[2]];
    swiPolcart(lx, rm);
    rm[2] /= earthobl;
    const dm = Math.sqrt(squareSum(rm));
    const lx2 = [ls[0], ls[1], ls[2]];
    swiPolcart(lx2, rs);
    rs[2] /= earthobl;
    /* sun - moon vector */
    const e = [0, 0, 0];
    const et = [0, 0, 0];
    for (let i = 0; i <= 2; i++) {
      e[i] = rm[i] - rs[i];
      et[i] = rmt[i] - rst[i];
    }
    const dsm = Math.sqrt(squareSum(e));
    const dsmt = Math.sqrt(squareSum(et));
    for (let i = 0; i <= 2; i++) {
      e[i] /= dsm;
      et[i] /= dsmt;
    }
    const sinf1 = (drad - rmoon) / dsm;
    const cosf1 = Math.sqrt(1 - sinf1 * sinf1);
    const sinf2 = (drad + rmoon) / dsm;
    const cosf2 = Math.sqrt(1 - sinf2 * sinf2);
    /* distance of moon from fundamental plane */
    const s0 = -dotProd(rm, e);
    /* distance of shadow axis from geocenter */
    const r0 = Math.sqrt(dm * dm - s0 * s0);
    /* diameter of core shadow on fundamental plane */
    const d0 = (s0 / dsm * (drad * 2 - dmoon) - dmoon) / cosf1;
    /* diameter of half-shadow on fundamental plane */
    const D0 = (s0 / dsm * (drad * 2 + dmoon) + dmoon) / cosf2;
    dcore[2] = r0;
    dcore[3] = d0;
    dcore[4] = D0;
    dcore[5] = cosf1;
    dcore[6] = cosf2;
    for (let i = 2; i < 5; i++) dcore[i] *= AUNIT / 1000.0;
    /* eclipse phase */
    retc = 0;
    if (de * cosf1 >= r0) {
      retc |= SE_ECL_CENTRAL;
    } else if (r0 <= de * cosf1 + Math.abs(d0) / 2) {
      retc |= SE_ECL_NONCENTRAL;
    } else if (r0 <= de * cosf2 + D0 / 2) {
      retc |= (SE_ECL_PARTIAL | SE_ECL_NONCENTRAL);
    } else {
      retc = 0;
      noEclipse = true;
    }
    /* distance of shadow point from fundamental plane */
    let d = s0 * s0 + de * de - dm * dm;
    d = d > 0 ? Math.sqrt(d) : 0;
    const s = s0 - d;
    /* geographic position of eclipse center */
    const xs = [0, 0, 0];
    for (let i = 0; i <= 2; i++) xs[i] = rm[i] + s * e[i];
    const xst = [xs[0], xs[1], xs[2]];
    xst[2] *= earthobl;
    swiCartpol(xst, xst);
    if (niter === 0) {
      const cosfi = Math.cos(xst[1]);
      const sinfi = Math.sin(xst[1]);
      const eobl = EARTH_OBLATENESS;
      const cc = 1 / Math.sqrt(cosfi * cosfi + (1 - eobl) * (1 - eobl) * sinfi * sinfi);
      const ss = (1 - eobl) * (1 - eobl) * cc;
      earthobl = ss;
      continue; /* next iteration */
    }
    swiPolcart(xst, xst);
    /* to longitude and latitude */
    swiCartpol(xs, xs);
    xs[0] -= sidt;
    xs[0] *= RADTODEG;
    xs[1] *= RADTODEG;
    xs[0] = sweDegnorm(xs[0]);
    if (xs[0] > 180) xs[0] -= 360;
    geopos[0] = xs[0];
    geopos[1] = xs[1];
    /* diameter of core shadow at place of maximum eclipse */
    const x = [0, 0, 0];
    for (let i = 0; i <= 2; i++) x[i] = rmt[i] - xst[i];
    const sDist = Math.sqrt(squareSum(x));
    dcore[0] = (sDist / dsmt * (drad * 2 - dmoon) - dmoon) * cosf1;
    dcore[0] *= AUNIT / 1000.0;
    dcore[1] = (sDist / dsmt * (drad * 2 + dmoon) + dmoon) * cosf2;
    dcore[1] *= AUNIT / 1000.0;
    if (!(retc & SE_ECL_PARTIAL) && !noEclipse) {
      if (dcore[0] > 0) retc |= SE_ECL_ANNULAR;
      else retc |= SE_ECL_TOTAL;
    }
  }
  return { retval: retc, geopos, dcore };
}

function eclipseHow(
  swed: SweData, tjdUt: number, ipl: number, starname: string | null,
  ifl: number, geolon: number, geolat: number, geohgt: number,
): { retval: number; attr: number[] } {
  const attr = new Array(20).fill(0);
  let retc = 0;
  const iflag = SEFLG_EQUATORIAL | SEFLG_TOPOCTR | ifl;
  const iflagcart = iflag | SEFLG_XYZ;
  const geoposArr = [geolon, geolat, geohgt];
  const te = tjdUt + sweDeltatEx(tjdUt, ifl, swed);
  sweSetTopo(swed, geolon, geolat, geohgt);
  let res2 = calcPlanetStar(swed, te, ipl, starname, iflag);
  if (res2.retval === ERR) return { retval: ERR, attr };
  const ls = Array.from(res2.xx);
  let res = sweCalc(swed, te, SE_MOON, iflag);
  if (res.flags === ERR) return { retval: ERR, attr };
  const lm = Array.from(res.xx);
  res2 = calcPlanetStar(swed, te, ipl, starname, iflagcart);
  if (res2.retval === ERR) return { retval: ERR, attr };
  const xs = Array.from(res2.xx);
  res = sweCalc(swed, te, SE_MOON, iflagcart);
  if (res.flags === ERR) return { retval: ERR, attr };
  const xm = Array.from(res.xx);
  /* radius of planet disk in AU */
  let drad: number;
  if (starname !== null && starname !== '') drad = 0;
  else if (ipl < NDIAM) drad = PLA_DIAM[ipl] / 2 / AUNIT;
  else if (ipl > SE_AST_OFFSET) drad = swed.astDiam / 2 * 1000 / AUNIT;
  else drad = 0;
  /* azimuth and altitude */
  const xh = [0, 0, 0];
  sweAzalt(swed, tjdUt, SE_EQU2HOR, geoposArr, 0, 10, ls, xh);
  /* eclipse description */
  const rmoonDeg = Math.asin(RMOON / lm[2]) * RADTODEG;
  const rsunDeg = Math.asin(drad / ls[2]) * RADTODEG;
  const rsplusrm = rsunDeg + rmoonDeg;
  const rsminusrm = rsunDeg - rmoonDeg;
  const x1 = [0, 0, 0], x2 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    x1[i] = xs[i] / ls[2];
    x2[i] = xm[i] / lm[2];
  }
  const dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
  /* phase */
  if (dctr < rsminusrm) retc = SE_ECL_ANNULAR;
  else if (dctr < Math.abs(rsminusrm)) retc = SE_ECL_TOTAL;
  else if (dctr < rsplusrm) retc = SE_ECL_PARTIAL;
  else retc = 0;
  /* ratio of moon/sun diameters */
  attr[1] = rsunDeg > 0 ? rmoonDeg / rsunDeg : 0;
  /* magnitude: fraction of solar diameter covered */
  const lsunleft = -dctr + rsunDeg + rmoonDeg;
  attr[0] = rsunDeg > 0 ? lsunleft / rsunDeg / 2 : 1;
  /* obscuration: fraction of solar disc covered */
  const lsun = rsunDeg;
  const lmoon = rmoonDeg;
  const lctr = dctr;
  if (retc === 0 || lsun === 0) {
    attr[2] = 1;
  } else if (retc === SE_ECL_TOTAL || retc === SE_ECL_ANNULAR) {
    attr[2] = lmoon * lmoon / lsun / lsun;
  } else {
    let a = 2 * lctr * lmoon;
    let b = 2 * lctr * lsun;
    if (a < 1e-9) {
      attr[2] = lmoon * lmoon / lsun / lsun;
    } else {
      a = (lctr * lctr + lmoon * lmoon - lsun * lsun) / a;
      if (a > 1) a = 1; if (a < -1) a = -1;
      b = (lctr * lctr + lsun * lsun - lmoon * lmoon) / b;
      if (b > 1) b = 1; if (b < -1) b = -1;
      a = Math.acos(a);
      b = Math.acos(b);
      let sc1 = a * lmoon * lmoon / 2;
      let sc2 = b * lsun * lsun / 2;
      sc1 -= Math.cos(a) * Math.sin(a) * lmoon * lmoon / 2;
      sc2 -= Math.cos(b) * Math.sin(b) * lsun * lsun / 2;
      attr[2] = (sc1 + sc2) * 2 / PI / lsun / lsun;
    }
  }
  attr[7] = dctr;
  /* approximate minimum height for visibility */
  const hminAppr = -(34.4556 + (1.75 + 0.37) * Math.sqrt(geohgt)) / 60;
  if (xh[1] + rsunDeg + Math.abs(hminAppr) >= 0 && retc)
    retc |= SE_ECL_VISIBLE;
  attr[4] = xh[0]; /* azimuth */
  attr[5] = xh[1]; /* true altitude */
  attr[6] = xh[2]; /* apparent altitude */
  if (ipl === SE_SUN && (starname === null || starname === '')) {
    /* NASA magnitude */
    attr[8] = attr[0];
    if (retc & (SE_ECL_TOTAL | SE_ECL_ANNULAR))
      attr[8] = attr[1];
    /* saros series and member */
    let found = false;
    for (let i = 0; i < NSAROS_SOLAR; i++) {
      let d = (tjdUt - SAROS_DATA_SOLAR[i].tstart) / SAROS_CYCLE;
      if (d < 0 && d * SAROS_CYCLE > -2) d = 0.0000001;
      if (d < 0) continue;
      const j = Math.floor(d);
      if ((d - j) * SAROS_CYCLE < 2) {
        attr[9] = SAROS_DATA_SOLAR[i].seriesNo;
        attr[10] = j + 1;
        found = true;
        break;
      }
      const k = j + 1;
      if ((k - d) * SAROS_CYCLE < 2) {
        attr[9] = SAROS_DATA_SOLAR[i].seriesNo;
        attr[10] = k + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      attr[9] = attr[10] = -99999999;
    }
  }
  return { retval: retc, attr };
}

function lunEclipseHow(
  swed: SweData, tjdUt: number, ifl: number,
): { retval: number; attr: number[]; dcore: number[] } {
  const dcore = new Array(10).fill(0);
  const attr = new Array(20).fill(0);
  let retc = 0;
  const rmoon = RMOON;
  const dmoon = 2 * rmoon;
  const iflag = SEFLG_SPEED | SEFLG_EQUATORIAL | ifl | SEFLG_XYZ;
  const deltat = sweDeltatEx(tjdUt, ifl, swed);
  const tjd = tjdUt + deltat;
  /* moon in cartesian coordinates */
  let res = sweCalc(swed, tjd, SE_MOON, iflag);
  if (res.flags === ERR) return { retval: ERR, attr, dcore };
  const rm = Array.from(res.xx);
  const dm = Math.sqrt(squareSum(rm));
  /* sun in cartesian coordinates */
  res = sweCalc(swed, tjd, SE_SUN, iflag);
  if (res.flags === ERR) return { retval: ERR, attr, dcore };
  const rs = Array.from(res.xx);
  const ds = Math.sqrt(squareSum(rs));
  const x1 = [0, 0, 0], x2 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    x1[i] = rs[i] / ds;
    x2[i] = rm[i] / dm;
  }
  const dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
  /* selenocentric sun */
  for (let i = 0; i <= 2; i++) rs[i] -= rm[i];
  /* selenocentric earth */
  for (let i = 0; i <= 2; i++) rm[i] = -rm[i];
  /* sun - earth vector */
  const e = [0, 0, 0];
  for (let i = 0; i <= 2; i++) e[i] = rm[i] - rs[i];
  const dsm = Math.sqrt(squareSum(e));
  for (let i = 0; i <= 2; i++) e[i] /= dsm;
  const f1 = (RSUN_ECL - REARTH_ECL) / dsm;
  const cosf1 = Math.sqrt(1 - f1 * f1);
  const f2 = (RSUN_ECL + REARTH_ECL) / dsm;
  const cosf2 = Math.sqrt(1 - f2 * f2);
  /* distance of earth from fundamental plane */
  const s0 = -dotProd(rm, e);
  /* distance of shadow axis from selenocenter */
  const r0 = Math.sqrt(dm * dm - s0 * s0);
  /* diameter of core shadow (with atmosphere 1/50 factor) */
  let d0 = Math.abs(s0 / dsm * (DSUN - DEARTH_ECL) - DEARTH_ECL) * (1 + 1.0 / 50.0) / cosf1;
  let D0 = (s0 / dsm * (DSUN + DEARTH_ECL) + DEARTH_ECL) * (1 + 1.0 / 50.0) / cosf2;
  d0 /= cosf1;
  D0 /= cosf2;
  /* NASA agreement factors */
  d0 *= 0.99405;
  D0 *= 0.98813;
  dcore[0] = r0;
  dcore[1] = d0;
  dcore[2] = D0;
  dcore[3] = cosf1;
  dcore[4] = cosf2;
  /* phase and umbral magnitude */
  if (d0 / 2 >= r0 + rmoon / cosf1) {
    retc = SE_ECL_TOTAL;
    attr[0] = (d0 / 2 - r0 + rmoon) / dmoon;
  } else if (d0 / 2 >= r0 - rmoon / cosf1) {
    retc = SE_ECL_PARTIAL;
    attr[0] = (d0 / 2 - r0 + rmoon) / dmoon;
  } else if (D0 / 2 >= r0 - rmoon / cosf2) {
    retc = SE_ECL_PENUMBRAL;
    attr[0] = 0;
  }
  attr[8] = attr[0];
  /* penumbral magnitude */
  attr[1] = (D0 / 2 - r0 + rmoon) / dmoon;
  if (retc !== 0) attr[7] = 180 - Math.abs(dctr);
  /* saros series and member */
  let found = false;
  for (let i = 0; i < NSAROS_LUNAR; i++) {
    let d = (tjdUt - SAROS_DATA_LUNAR[i].tstart) / SAROS_CYCLE;
    if (d < 0 && d * SAROS_CYCLE > -2) d = 0.0000001;
    if (d < 0) continue;
    const j = Math.floor(d);
    if ((d - j) * SAROS_CYCLE < 2) {
      attr[9] = SAROS_DATA_LUNAR[i].seriesNo;
      attr[10] = j + 1;
      found = true; break;
    }
    const k = j + 1;
    if ((k - d) * SAROS_CYCLE < 2) {
      attr[9] = SAROS_DATA_LUNAR[i].seriesNo;
      attr[10] = k + 1;
      found = true; break;
    }
  }
  if (!found) attr[9] = attr[10] = -99999999;
  return { retval: retc, attr, dcore };
}

/* ==================================================================
 * Phase 3: Contact time finders
 * ================================================================== */

function eclipseWhenLoc(
  swed: SweData, tjdStart: number, ifl: number, geopos: number[],
  backward: number,
): { retval: number; tret: number[]; attr: number[] } {
  const tret = new Array(10).fill(0);
  const attr = new Array(20).fill(0);
  let retflag = 0;
  let K = Math.floor((tjdStart - J2000) / 365.2425 * 12.3685);
  if (backward) K++; else K--;
  const iflag = SEFLG_EQUATORIAL | SEFLG_TOPOCTR | ifl;
  const iflagcart = iflag | SEFLG_XYZ;
  sweSetTopo(swed, geopos[0], geopos[1], geopos[2]);
  const twomin = 2.0 / 24.0 / 60.0;
  const tensec = 10.0 / 24.0 / 60.0 / 60.0;
  const twohr = 2.0 / 24.0;
  const tenmin = 10.0 / 24.0 / 60.0;
  for (;;) { /* next_try */
    retflag = 0;
    for (let i = 0; i <= 9; i++) tret[i] = 0;
    const T = K / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let Ff = sweDegnorm(160.7108 + 390.67050274 * K - 0.0016341 * T2 - 0.00000227 * T3 + 0.000000011 * T4);
    if (Ff > 180) Ff -= 180;
    if (Ff > 21 && Ff < 159) { if (backward) K--; else K++; continue; }
    let tjd = 2451550.09765 + 29.530588853 * K + 0.0001337 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
    let M = sweDegnorm(2.5534 + 29.10535669 * K - 0.0000218 * T2 - 0.00000011 * T3);
    let Mm = sweDegnorm(201.5643 + 385.81693528 * K + 0.1017438 * T2 + 0.00001239 * T3 + 0.000000058 * T4);
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    M *= DEGTORAD; Mm *= DEGTORAD;
    tjd = tjd - 0.4075 * Math.sin(Mm) + 0.1721 * E * Math.sin(M);
    sweSetTopo(swed, geopos[0], geopos[1], geopos[2]);
    let dtdiv = 2;
    let dtstart = 0.5;
    if (tjd < 1900000 || tjd > 2500000) dtstart = 2;
    for (let dt = dtstart; dt > 0.00001; dt /= dtdiv) {
      if (dt < 0.1) dtdiv = 3;
      const dc = [0, 0, 0];
      for (let i = 0, t = tjd - dt; i <= 2; i++, t += dt) {
        let r1 = sweCalc(swed, t, SE_SUN, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xs = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_SUN, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const ls = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xm = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const lm = Array.from(r1.xx);
        const dm = Math.sqrt(squareSum(xm));
        const ds = Math.sqrt(squareSum(xs));
        const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
        const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
        dc[i] = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
      }
      const fm = findMaximum(dc[0], dc[1], dc[2], dt);
      tjd += fm.dxret + dt;
    }
    /* check if eclipse at this location */
    let r1 = sweCalc(swed, tjd, SE_SUN, iflagcart);
    if (r1.flags === ERR) return { retval: ERR, tret, attr };
    const xsFinal = Array.from(r1.xx);
    r1 = sweCalc(swed, tjd, SE_SUN, iflag);
    if (r1.flags === ERR) return { retval: ERR, tret, attr };
    const lsFinal = Array.from(r1.xx);
    r1 = sweCalc(swed, tjd, SE_MOON, iflagcart);
    if (r1.flags === ERR) return { retval: ERR, tret, attr };
    const xmFinal = Array.from(r1.xx);
    r1 = sweCalc(swed, tjd, SE_MOON, iflag);
    if (r1.flags === ERR) return { retval: ERR, tret, attr };
    const lmFinal = Array.from(r1.xx);
    let dctr = Math.acos(swiDotProdUnit(xsFinal, xmFinal)) * RADTODEG;
    let rmoon = Math.asin(RMOON / lmFinal[2]) * RADTODEG;
    let rsun = Math.asin(RSUN_ECL / lsFinal[2]) * RADTODEG;
    let rsplusrm = rsun + rmoon;
    let rsminusrm = rsun - rmoon;
    if (dctr > rsplusrm) { if (backward) K--; else K++; continue; }
    tret[0] = tjd - sweDeltatEx(tjd, ifl, swed);
    tret[0] = tjd - sweDeltatEx(tret[0], ifl, swed);
    if ((backward && tret[0] >= tjdStart - 0.0001) || (!backward && tret[0] <= tjdStart + 0.0001)) {
      if (backward) K--; else K++; continue;
    }
    if (dctr < rsminusrm) retflag = SE_ECL_ANNULAR;
    else if (dctr < Math.abs(rsminusrm)) retflag = SE_ECL_TOTAL;
    else if (dctr <= rsplusrm) retflag = SE_ECL_PARTIAL;
    const dctrmin = dctr;
    /* contacts 2 and 3 */
    if (dctr > Math.abs(rsminusrm)) {
      tret[2] = tret[3] = 0;
    } else {
      const dc = [0, 0, 0];
      dc[1] = Math.abs(rsminusrm) - dctrmin;
      for (let i = 0, t = tjd - twomin; i <= 2; i += 2, t = tjd + twomin) {
        r1 = sweCalc(swed, t, SE_SUN, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xs = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xm = Array.from(r1.xx);
        const dm = Math.sqrt(squareSum(xm));
        const ds = Math.sqrt(squareSum(xs));
        rmoon = Math.asin(RMOON / dm) * RADTODEG * 0.99916;
        rsun = Math.asin(RSUN_ECL / ds) * RADTODEG;
        rsminusrm = rsun - rmoon;
        const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
        const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
        dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
        dc[i] = Math.abs(rsminusrm) - dctr;
      }
      const fz = findZero(dc[0], dc[1], dc[2], twomin);
      if (fz) {
        tret[2] = tjd + fz.dxret + twomin;
        tret[3] = tjd + fz.dxret2 + twomin;
      }
      for (let m = 0, dt = tensec; m < 2; m++, dt /= 10) {
        for (let j = 2; j <= 3; j++) {
          r1 = sweCalc(swed, tret[j], SE_SUN, iflagcart | SEFLG_SPEED);
          if (r1.flags === ERR) return { retval: ERR, tret, attr };
          const xs = Array.from(r1.xx);
          r1 = sweCalc(swed, tret[j], SE_MOON, iflagcart | SEFLG_SPEED);
          if (r1.flags === ERR) return { retval: ERR, tret, attr };
          const xm = Array.from(r1.xx);
          const dc2 = [0, 0];
          for (let i = 0; i < 2; i++) {
            if (i === 1) { for (let k = 0; k < 3; k++) { xs[k] -= xs[k + 3] * dt; xm[k] -= xm[k + 3] * dt; } }
            const dm = Math.sqrt(squareSum(xm));
            const ds = Math.sqrt(squareSum(xs));
            rmoon = Math.asin(RMOON / dm) * RADTODEG * 0.99916;
            rsun = Math.asin(RSUN_ECL / ds) * RADTODEG;
            rsminusrm = rsun - rmoon;
            const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
            const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
            dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
            dc2[i] = Math.abs(rsminusrm) - dctr;
          }
          const dt1 = -dc2[0] / ((dc2[0] - dc2[1]) / dt);
          tret[j] += dt1;
        }
      }
      tret[2] -= sweDeltatEx(tret[2], ifl, swed);
      tret[3] -= sweDeltatEx(tret[3], ifl, swed);
    }
    /* contacts 1 and 4 */
    {
      const dc = [0, 0, 0];
      dc[1] = rsplusrm - dctrmin;
      for (let i = 0, t = tjd - twohr; i <= 2; i += 2, t = tjd + twohr) {
        r1 = sweCalc(swed, t, SE_SUN, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xs = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xm = Array.from(r1.xx);
        const dm = Math.sqrt(squareSum(xm));
        const ds = Math.sqrt(squareSum(xs));
        rmoon = Math.asin(RMOON / dm) * RADTODEG;
        rsun = Math.asin(RSUN_ECL / ds) * RADTODEG;
        rsplusrm = rsun + rmoon;
        const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
        const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
        dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
        dc[i] = rsplusrm - dctr;
      }
      const fz = findZero(dc[0], dc[1], dc[2], twohr);
      if (fz) {
        tret[1] = tjd + fz.dxret + twohr;
        tret[4] = tjd + fz.dxret2 + twohr;
      }
      for (let m = 0, dt = tenmin; m < 3; m++, dt /= 10) {
        for (let j = 1; j <= 4; j += 3) {
          r1 = sweCalc(swed, tret[j], SE_SUN, iflagcart | SEFLG_SPEED);
          if (r1.flags === ERR) return { retval: ERR, tret, attr };
          const xs = Array.from(r1.xx);
          r1 = sweCalc(swed, tret[j], SE_MOON, iflagcart | SEFLG_SPEED);
          if (r1.flags === ERR) return { retval: ERR, tret, attr };
          const xm = Array.from(r1.xx);
          const dc2 = [0, 0];
          for (let i = 0; i < 2; i++) {
            if (i === 1) { for (let k = 0; k < 3; k++) { xs[k] -= xs[k + 3] * dt; xm[k] -= xm[k + 3] * dt; } }
            const dm = Math.sqrt(squareSum(xm));
            const ds = Math.sqrt(squareSum(xs));
            rmoon = Math.asin(RMOON / dm) * RADTODEG;
            rsun = Math.asin(RSUN_ECL / ds) * RADTODEG;
            rsplusrm = rsun + rmoon;
            const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
            const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
            dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
            dc2[i] = Math.abs(rsplusrm) - dctr;
          }
          const dt1 = -dc2[0] / ((dc2[0] - dc2[1]) / dt);
          tret[j] += dt1;
        }
      }
      tret[1] -= sweDeltatEx(tret[1], ifl, swed);
      tret[4] -= sweDeltatEx(tret[4], ifl, swed);
    }
    /* visibility of eclipse phases */
    for (let i = 4; i >= 0; i--) {
      if (tret[i] === 0) continue;
      const how = eclipseHow(swed, tret[i], SE_SUN, null, ifl, geopos[0], geopos[1], geopos[2]);
      if (how.retval === ERR) return { retval: ERR, tret, attr };
      if (how.attr[6] > 0) {
        retflag |= SE_ECL_VISIBLE;
        if (i === 0) retflag |= SE_ECL_MAX_VISIBLE;
        else if (i === 1) retflag |= SE_ECL_1ST_VISIBLE;
        else if (i === 2) retflag |= SE_ECL_2ND_VISIBLE;
        else if (i === 3) retflag |= SE_ECL_3RD_VISIBLE;
        else if (i === 4) retflag |= SE_ECL_4TH_VISIBLE;
      }
      if (i === 0) { for (let j = 0; j < 20; j++) attr[j] = how.attr[j]; }
    }
    if (!(retflag & SE_ECL_VISIBLE)) { if (backward) K--; else K++; continue; }
    /* sunrise and sunset during eclipse */
    const riseRes = sweRiseTrans(swed, tret[1] - 0.001, SE_SUN, null, ifl, SE_CALC_RISE | SE_BIT_DISC_BOTTOM, geopos, 0, 0, null);
    if (riseRes.retval === ERR) return { retval: ERR, tret, attr };
    if (riseRes.retval === -2) return { retval: retflag, tret, attr };
    const tjdr = riseRes.tret;
    const setRes = sweRiseTrans(swed, tret[1] - 0.001, SE_SUN, null, ifl, SE_CALC_SET | SE_BIT_DISC_BOTTOM, geopos, 0, 0, null);
    if (setRes.retval === ERR) return { retval: ERR, tret, attr };
    if (setRes.retval === -2) return { retval: retflag, tret, attr };
    const tjds = setRes.tret;
    if (tjds < tret[1] || (tjds > tjdr && tjdr > tret[4])) {
      if (backward) K--; else K++; continue;
    }
    if (tjdr > tret[1] && tjdr < tret[4]) {
      tret[5] = tjdr;
      if (!(retflag & SE_ECL_MAX_VISIBLE)) {
        tret[0] = tjdr;
        const how = eclipseHow(swed, tret[5], SE_SUN, null, ifl, geopos[0], geopos[1], geopos[2]);
        if (how.retval === ERR) return { retval: ERR, tret, attr };
        retflag &= ~(SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_PARTIAL);
        retflag |= (how.retval & (SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_PARTIAL));
      }
    }
    if (tjds > tret[1] && tjds < tret[4]) {
      tret[6] = tjds;
      if (!(retflag & SE_ECL_MAX_VISIBLE)) {
        tret[0] = tjds;
        const how = eclipseHow(swed, tret[6], SE_SUN, null, ifl, geopos[0], geopos[1], geopos[2]);
        if (how.retval === ERR) return { retval: ERR, tret, attr };
        retflag &= ~(SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_PARTIAL);
        retflag |= (how.retval & (SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_PARTIAL));
      }
    }
    return { retval: retflag, tret, attr };
  }
}

function occultWhenLoc(
  swed: SweData, tjdStart: number, ipl: number, starname: string | null,
  ifl: number, geopos: number[], backward: number,
): { retval: number; tret: number[]; attr: number[] } {
  const tret = new Array(10).fill(0);
  const attr = new Array(20).fill(0);
  let retflag = 0;
  const iflag = SEFLG_TOPOCTR | ifl;
  const iflaggeo = iflag & ~SEFLG_TOPOCTR;
  const iflagcart = iflag | SEFLG_XYZ;
  let direction = 1;
  const oneTry = backward & SE_ECL_ONE_TRY;
  let backwardBit = backward & 1;
  if (backwardBit) direction = -1;
  let stopAfterThis = false;
  sweSetTopo(swed, geopos[0], geopos[1], geopos[2]);
  const twomin = 2.0 / 24.0 / 60.0;
  const tensec = 10.0 / 24.0 / 60.0 / 60.0;
  const twohr = 2.0 / 24.0;
  const tenmin = 10.0 / 24.0 / 60.0;
  const dadd2 = 1;
  let t = tjdStart;
  let tjd = tjdStart;
  for (;;) { /* next_try */
    retflag = 0;
    for (let i = 0; i <= 9; i++) tret[i] = 0;
    let res2 = calcPlanetStar(swed, t, ipl, starname, iflaggeo);
    if (res2.retval === ERR) return { retval: ERR, tret, attr };
    let ls = Array.from(res2.xx);
    if (Math.abs(ls[1]) > 7 && starname !== null && starname !== '') {
      return { retval: ERR, tret, attr };
    }
    let res = sweCalc(swed, t, SE_MOON, iflaggeo);
    if (res.flags === ERR) return { retval: ERR, tret, attr };
    let lm = Array.from(res.xx);
    let dl = sweDegnorm(ls[0] - lm[0]);
    if (direction < 0) dl -= 360;
    while (Math.abs(dl) > 0.1) {
      t += dl / 13;
      res2 = calcPlanetStar(swed, t, ipl, starname, iflaggeo);
      if (res2.retval === ERR) return { retval: ERR, tret, attr };
      ls = Array.from(res2.xx);
      res = sweCalc(swed, t, SE_MOON, iflaggeo);
      if (res.flags === ERR) return { retval: ERR, tret, attr };
      lm = Array.from(res.xx);
      dl = sweDegnorm(ls[0] - lm[0]);
      if (dl > 180) dl -= 360;
    }
    tjd = t;
    let drad = Math.abs(ls[1] - lm[1]);
    if (drad > 2) {
      if (oneTry) { tret[0] = t + direction; return { retval: 0, tret, attr }; }
      t += direction * 20; tjd = t; continue;
    }
    /* radius of planet disk in AU */
    if (starname !== null && starname !== '') drad = 0;
    else if (ipl < NDIAM) drad = PLA_DIAM[ipl] / 2 / AUNIT;
    else if (ipl > SE_AST_OFFSET) drad = swed.astDiam / 2 * 1000 / AUNIT;
    else drad = 0;
    /* find time of minimum angular distance */
    let dtdiv = 2;
    let dtstart = dadd2;
    for (let dt = dtstart; dt > 0.00001; dt /= dtdiv) {
      if (dt < 0.01) dtdiv = 2;
      const dc = [0, 0, 0];
      for (let i = 0, tt = tjd - dt; i <= 2; i++, tt += dt) {
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflagcart);
        if (res2.retval === ERR) return { retval: ERR, tret, attr };
        const xs = Array.from(res2.xx);
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflag);
        if (res2.retval === ERR) return { retval: ERR, tret, attr };
        ls = Array.from(res2.xx);
        let r1 = sweCalc(swed, tt, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xm = Array.from(r1.xx);
        r1 = sweCalc(swed, tt, SE_MOON, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        lm = Array.from(r1.xx);
        if (dt < 0.1 && Math.abs(ls[1] - lm[1]) > 2) {
          if (oneTry || stopAfterThis) { stopAfterThis = true; }
          else { t = tjd + direction * 20; tjd = t; break; }
        }
        dc[i] = Math.acos(swiDotProdUnit(xs, xm)) * RADTODEG;
        const rmoonTmp = Math.asin(RMOON / lm[2]) * RADTODEG;
        const rsunTmp = Math.asin(drad / ls[2]) * RADTODEG;
        dc[i] -= (rmoonTmp + rsunTmp);
      }
      if (dc[0] === 0 && dc[1] === 0 && dc[2] === 0) break; /* inner break triggered reloop */
      const fm = findMaximum(dc[0], dc[1], dc[2], dt);
      tjd += fm.dxret + dt;
    }
    if (stopAfterThis) { tret[0] = tjd + direction; return { retval: 0, tret, attr }; }
    res2 = calcPlanetStar(swed, tjd, ipl, starname, iflagcart);
    if (res2.retval === ERR) return { retval: ERR, tret, attr };
    const xsFinal = Array.from(res2.xx);
    res2 = calcPlanetStar(swed, tjd, ipl, starname, iflag);
    if (res2.retval === ERR) return { retval: ERR, tret, attr };
    ls = Array.from(res2.xx);
    let r1 = sweCalc(swed, tjd, SE_MOON, iflagcart);
    if (r1.flags === ERR) return { retval: ERR, tret, attr };
    const xmFinal = Array.from(r1.xx);
    r1 = sweCalc(swed, tjd, SE_MOON, iflag);
    if (r1.flags === ERR) return { retval: ERR, tret, attr };
    lm = Array.from(r1.xx);
    let dctr = Math.acos(swiDotProdUnit(xsFinal, xmFinal)) * RADTODEG;
    let rmoon = Math.asin(RMOON / lm[2]) * RADTODEG;
    let rsun = Math.asin(drad / ls[2]) * RADTODEG;
    let rsplusrm = rsun + rmoon;
    let rsminusrm = rsun - rmoon;
    if (dctr > rsplusrm) {
      if (oneTry) { tret[0] = tjd + direction; return { retval: 0, tret, attr }; }
      t = tjd + direction * 20; tjd = t; continue;
    }
    tret[0] = tjd - sweDeltatEx(tjd, ifl, swed);
    tret[0] = tjd - sweDeltatEx(tret[0], ifl, swed);
    if ((backwardBit && tret[0] >= tjdStart - 0.0001) || (!backwardBit && tret[0] <= tjdStart + 0.0001)) {
      if (oneTry) { tret[0] = tjd + direction; return { retval: 0, tret, attr }; }
      t = tjd + direction * 20; tjd = t; continue;
    }
    if (dctr < rsminusrm) retflag = SE_ECL_ANNULAR;
    else if (dctr < Math.abs(rsminusrm)) retflag = SE_ECL_TOTAL;
    else if (dctr <= rsplusrm) retflag = SE_ECL_PARTIAL;
    const dctrmin = dctr;
    /* contacts 2 and 3 */
    if (dctr > Math.abs(rsminusrm)) {
      tret[2] = tret[3] = 0;
    } else {
      const dc = [0, 0, 0];
      dc[1] = Math.abs(rsminusrm) - dctrmin;
      for (let i = 0, tt = tjd - twomin; i <= 2; i += 2, tt = tjd + twomin) {
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflagcart);
        if (res2.retval === ERR) return { retval: ERR, tret, attr };
        const xs = Array.from(res2.xx);
        r1 = sweCalc(swed, tt, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xm = Array.from(r1.xx);
        const dm = Math.sqrt(squareSum(xm));
        const ds = Math.sqrt(squareSum(xs));
        rmoon = Math.asin(RMOON / dm) * RADTODEG * 0.99916;
        rsun = Math.asin(drad / ds) * RADTODEG;
        rsminusrm = rsun - rmoon;
        const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
        const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
        dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
        dc[i] = Math.abs(rsminusrm) - dctr;
      }
      const fz = findZero(dc[0], dc[1], dc[2], twomin);
      if (fz) { tret[2] = tjd + fz.dxret + twomin; tret[3] = tjd + fz.dxret2 + twomin; }
      for (let m = 0, dt = tensec; m < 2; m++, dt /= 10) {
        for (let j = 2; j <= 3; j++) {
          res2 = calcPlanetStar(swed, tret[j], ipl, starname, iflagcart | SEFLG_SPEED);
          if (res2.retval === ERR) return { retval: ERR, tret, attr };
          const xs = Array.from(res2.xx);
          r1 = sweCalc(swed, tret[j], SE_MOON, iflagcart | SEFLG_SPEED);
          if (r1.flags === ERR) return { retval: ERR, tret, attr };
          const xm = Array.from(r1.xx);
          const dc2 = [0, 0];
          for (let i = 0; i < 2; i++) {
            if (i === 1) { for (let k = 0; k < 3; k++) { xs[k] -= xs[k + 3] * dt; xm[k] -= xm[k + 3] * dt; } }
            const dm = Math.sqrt(squareSum(xm));
            const ds = Math.sqrt(squareSum(xs));
            rmoon = Math.asin(RMOON / dm) * RADTODEG * 0.99916;
            rsun = Math.asin(drad / ds) * RADTODEG;
            rsminusrm = rsun - rmoon;
            const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
            const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
            dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
            dc2[i] = Math.abs(rsminusrm) - dctr;
          }
          tret[j] += -dc2[0] / ((dc2[0] - dc2[1]) / dt);
        }
      }
      tret[2] -= sweDeltatEx(tret[2], ifl, swed);
      tret[3] -= sweDeltatEx(tret[3], ifl, swed);
    }
    /* contacts 1 and 4 */
    if (starname === null || starname === '') {
      const dc = [0, 0, 0];
      dc[1] = rsplusrm - dctrmin;
      for (let i = 0, tt = tjd - twohr; i <= 2; i += 2, tt = tjd + twohr) {
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflagcart);
        if (res2.retval === ERR) return { retval: ERR, tret, attr };
        const xs = Array.from(res2.xx);
        r1 = sweCalc(swed, tt, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret, attr };
        const xm = Array.from(r1.xx);
        const dm = Math.sqrt(squareSum(xm));
        const ds = Math.sqrt(squareSum(xs));
        rmoon = Math.asin(RMOON / dm) * RADTODEG;
        rsun = Math.asin(drad / ds) * RADTODEG;
        rsplusrm = rsun + rmoon;
        const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
        const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
        dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
        dc[i] = rsplusrm - dctr;
      }
      const fz = findZero(dc[0], dc[1], dc[2], twohr);
      if (fz) { tret[1] = tjd + fz.dxret + twohr; tret[4] = tjd + fz.dxret2 + twohr; }
      for (let m = 0, dt = tenmin; m < 3; m++, dt /= 10) {
        for (let j = 1; j <= 4; j += 3) {
          res2 = calcPlanetStar(swed, tret[j], ipl, starname, iflagcart | SEFLG_SPEED);
          if (res2.retval === ERR) return { retval: ERR, tret, attr };
          const xs = Array.from(res2.xx);
          r1 = sweCalc(swed, tret[j], SE_MOON, iflagcart | SEFLG_SPEED);
          if (r1.flags === ERR) return { retval: ERR, tret, attr };
          const xm = Array.from(r1.xx);
          const dc2 = [0, 0];
          for (let i = 0; i < 2; i++) {
            if (i === 1) { for (let k = 0; k < 3; k++) { xs[k] -= xs[k + 3] * dt; xm[k] -= xm[k + 3] * dt; } }
            const dm = Math.sqrt(squareSum(xm));
            const ds = Math.sqrt(squareSum(xs));
            rmoon = Math.asin(RMOON / dm) * RADTODEG;
            rsun = Math.asin(drad / ds) * RADTODEG;
            rsplusrm = rsun + rmoon;
            const x1 = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
            const x2 = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
            dctr = Math.acos(swiDotProdUnit(x1, x2)) * RADTODEG;
            dc2[i] = Math.abs(rsplusrm) - dctr;
          }
          tret[j] += -dc2[0] / ((dc2[0] - dc2[1]) / dt);
        }
      }
      tret[1] -= sweDeltatEx(tret[1], ifl, swed);
      tret[4] -= sweDeltatEx(tret[4], ifl, swed);
    } else {
      /* fixed stars are point sources, contacts 1 and 4 = contacts 2 and 3 */
      tret[1] = tret[2];
      tret[4] = tret[3];
    }
    /* visibility of eclipse phases */
    for (let i = 4; i >= 0; i--) {
      if (tret[i] === 0) continue;
      const how = eclipseHow(swed, tret[i], ipl, starname, ifl, geopos[0], geopos[1], geopos[2]);
      if (how.retval === ERR) return { retval: ERR, tret, attr };
      if (how.attr[6] > 0) {
        retflag |= SE_ECL_VISIBLE;
        if (i === 0) retflag |= SE_ECL_MAX_VISIBLE;
        else if (i === 1) retflag |= SE_ECL_1ST_VISIBLE;
        else if (i === 2) retflag |= SE_ECL_2ND_VISIBLE;
        else if (i === 3) retflag |= SE_ECL_3RD_VISIBLE;
        else if (i === 4) retflag |= SE_ECL_4TH_VISIBLE;
      }
      if (i === 0) { for (let j = 0; j < 20; j++) attr[j] = how.attr[j]; }
    }
    if (!(retflag & SE_ECL_VISIBLE)) {
      if (oneTry) { tret[0] = tjd + direction; return { retval: 0, tret, attr }; }
      t = tjd + direction * 20; tjd = t; continue;
    }
    /* daylight checks */
    let riseRes = sweRiseTrans(swed, tret[1] - 0.1, ipl, starname, ifl, SE_CALC_RISE | SE_BIT_DISC_BOTTOM, geopos, 0, 0, null);
    if (riseRes.retval === ERR) return { retval: ERR, tret, attr };
    let setRes: { retval: number; tret: number } = { retval: 0, tret: 0 };
    if (riseRes.retval >= 0) {
      setRes = sweRiseTrans(swed, tret[1] - 0.1, ipl, starname, ifl, SE_CALC_SET | SE_BIT_DISC_BOTTOM, geopos, 0, 0, null);
      if (setRes.retval === ERR) return { retval: ERR, tret, attr };
    }
    if (riseRes.retval >= 0 && setRes.retval >= 0) {
      if (riseRes.tret > tret[1] && riseRes.tret < tret[4]) tret[5] = riseRes.tret;
      if (setRes.tret > tret[1] && setRes.tret < tret[4]) tret[6] = setRes.tret;
    }
    /* sun daylight check for beginning */
    riseRes = sweRiseTrans(swed, tret[1], SE_SUN, null, ifl, SE_CALC_RISE, geopos, 0, 0, null);
    if (riseRes.retval === ERR) return { retval: ERR, tret, attr };
    if (riseRes.retval >= 0) {
      setRes = sweRiseTrans(swed, tret[1], SE_SUN, null, ifl, SE_CALC_SET, geopos, 0, 0, null);
      if (setRes.retval === ERR) return { retval: ERR, tret, attr };
      if (setRes.retval >= 0 && setRes.tret < riseRes.tret)
        retflag |= SE_ECL_OCC_BEG_DAYLIGHT;
    }
    riseRes = sweRiseTrans(swed, tret[4], SE_SUN, null, ifl, SE_CALC_RISE, geopos, 0, 0, null);
    if (riseRes.retval === ERR) return { retval: ERR, tret, attr };
    if (riseRes.retval >= 0) {
      setRes = sweRiseTrans(swed, tret[4], SE_SUN, null, ifl, SE_CALC_SET, geopos, 0, 0, null);
      if (setRes.retval === ERR) return { retval: ERR, tret, attr };
      if (setRes.retval >= 0 && setRes.tret < riseRes.tret)
        retflag |= SE_ECL_OCC_END_DAYLIGHT;
    }
    return { retval: retflag, tret, attr };
  }
}

/* ==================================================================
 * Phase 4: Global search functions
 * ================================================================== */

export function sweSolEclipseWhenGlob(
  swed: SweData, tjdStart: number, ifl: number, ifltype: number,
  backward: number,
): { retval: number; tret: number[] } {
  swiInitSwedIfStart(swed);
  const tret = new Array(10).fill(0);
  const de = 6378.140;
  const twohr = 2.0 / 24.0;
  const tenmin = 10.0 / 24.0 / 60.0;
  let retflag = 0;
  let direction = 1;
  let dontTimes = false;
  ifl &= SEFLG_EPHMASK;
  const iflag = SEFLG_EQUATORIAL | ifl;
  const iflagcart = iflag | SEFLG_XYZ;
  if (ifltype === (SE_ECL_PARTIAL | SE_ECL_CENTRAL)) return { retval: ERR, tret };
  if (ifltype === (SE_ECL_ANNULAR_TOTAL | SE_ECL_NONCENTRAL)) return { retval: ERR, tret };
  if (ifltype === 0)
    ifltype = SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_PARTIAL | SE_ECL_ANNULAR_TOTAL | SE_ECL_NONCENTRAL | SE_ECL_CENTRAL;
  if (ifltype === SE_ECL_TOTAL || ifltype === SE_ECL_ANNULAR || ifltype === SE_ECL_ANNULAR_TOTAL)
    ifltype |= (SE_ECL_NONCENTRAL | SE_ECL_CENTRAL);
  if (ifltype === SE_ECL_PARTIAL) ifltype |= SE_ECL_NONCENTRAL;
  if (backward) direction = -1;
  let K = Math.floor((tjdStart - J2000) / 365.2425 * 12.3685);
  K -= direction;
  for (;;) { /* next_try */
    retflag = 0;
    dontTimes = false;
    for (let i = 0; i <= 9; i++) tret[i] = 0;
    const T = K / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let Ff = sweDegnorm(160.7108 + 390.67050274 * K - 0.0016341 * T2 - 0.00000227 * T3 + 0.000000011 * T4);
    if (Ff > 180) Ff -= 180;
    if (Ff > 21 && Ff < 159) { K += direction; continue; }
    let tjd = 2451550.09765 + 29.530588853 * K + 0.0001337 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
    let M = sweDegnorm(2.5534 + 29.10535669 * K - 0.0000218 * T2 - 0.00000011 * T3);
    let Mm = sweDegnorm(201.5643 + 385.81693528 * K + 0.1017438 * T2 + 0.00001239 * T3 + 0.000000058 * T4);
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    M *= DEGTORAD; Mm *= DEGTORAD;
    tjd = tjd - 0.4075 * Math.sin(Mm) + 0.1721 * E * Math.sin(M);
    let dtstart = 1;
    if (tjd < 2000000 || tjd > 2500000) dtstart = 5;
    let dtdiv = 4;
    for (let dt = dtstart; dt > 0.0001; dt /= dtdiv) {
      const dc = [0, 0, 0];
      for (let i = 0, t = tjd - dt; i <= 2; i++, t += dt) {
        let r1 = sweCalc(swed, t, SE_SUN, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const ls = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const lm = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_SUN, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const xs = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const xm = Array.from(r1.xx);
        const xa = [xs[0] / ls[2], xs[1] / ls[2], xs[2] / ls[2]];
        const xb = [xm[0] / lm[2], xm[1] / lm[2], xm[2] / lm[2]];
        dc[i] = Math.acos(swiDotProdUnit(xa, xb)) * RADTODEG;
        const rmoon = Math.asin(RMOON / lm[2]) * RADTODEG;
        const rsun = Math.asin(RSUN_ECL / ls[2]) * RADTODEG;
        dc[i] -= (rmoon + rsun);
      }
      const fm = findMaximum(dc[0], dc[1], dc[2], dt);
      tjd += fm.dxret + dt;
    }
    let tjds = tjd - sweDeltatEx(tjd, ifl, swed);
    tjds = tjd - sweDeltatEx(tjds, ifl, swed);
    tjds = tjd - sweDeltatEx(tjds, ifl, swed);
    tjd = tjds;
    let ew = eclipseWhere(swed, tjd, SE_SUN, null, ifl);
    if (ew.retval === ERR) return { retval: ERR, tret };
    retflag = ew.retval;
    const geopos = ew.geopos;
    const attr = new Array(20).fill(0);
    let how = eclipseHow(swed, tjd, SE_SUN, null, ifl, geopos[0], geopos[1], 0);
    if (how.retval === ERR) return { retval: ERR, tret };
    if (how.retval === 0) { K += direction; continue; }
    tret[0] = tjd;
    if ((backward && tret[0] >= tjdStart - 0.0001) || (!backward && tret[0] <= tjdStart + 0.0001)) {
      K += direction; continue;
    }
    ew = eclipseWhere(swed, tjd, SE_SUN, null, ifl);
    if (ew.retval === ERR) return { retval: ERR, tret };
    retflag = ew.retval;
    let dcore = ew.dcore;
    if (retflag === 0) {
      retflag = SE_ECL_PARTIAL | SE_ECL_NONCENTRAL;
      tret[4] = tret[5] = tjd;
      dontTimes = true;
    }
    /* check eclipse type */
    if (!(ifltype & SE_ECL_NONCENTRAL) && (retflag & SE_ECL_NONCENTRAL)) { K += direction; continue; }
    if (!(ifltype & SE_ECL_CENTRAL) && (retflag & SE_ECL_CENTRAL)) { K += direction; continue; }
    if (!(ifltype & SE_ECL_ANNULAR) && (retflag & SE_ECL_ANNULAR)) { K += direction; continue; }
    if (!(ifltype & SE_ECL_PARTIAL) && (retflag & SE_ECL_PARTIAL)) { K += direction; continue; }
    if (!(ifltype & (SE_ECL_TOTAL | SE_ECL_ANNULAR_TOTAL)) && (retflag & SE_ECL_TOTAL)) { K += direction; continue; }
    if (!dontTimes) {
      /* contact times */
      let o: number;
      if (retflag & SE_ECL_PARTIAL) o = 0;
      else if (retflag & SE_ECL_NONCENTRAL) o = 1;
      else o = 2;
      const dta = twohr;
      const dtb = tenmin / 3.0;
      for (let n = 0; n <= o; n++) {
        let i1: number, i2: number;
        if (n === 0) { i1 = 2; i2 = 3; }
        else if (n === 1) { if (retflag & SE_ECL_PARTIAL) continue; i1 = 4; i2 = 5; }
        else { if (retflag & SE_ECL_NONCENTRAL) continue; i1 = 6; i2 = 7; }
        const dc = [0, 0, 0];
        for (let i = 0, t = tjd - dta; i <= 2; i++, t += dta) {
          ew = eclipseWhere(swed, t, SE_SUN, null, ifl);
          if (ew.retval === ERR) return { retval: ERR, tret };
          dcore = ew.dcore;
          if (n === 0) dc[i] = dcore[4] / 2 + de / dcore[5] - dcore[2];
          else if (n === 1) dc[i] = Math.abs(dcore[3]) / 2 + de / dcore[6] - dcore[2];
          else dc[i] = de / dcore[6] - dcore[2];
        }
        const fz = findZero(dc[0], dc[1], dc[2], dta);
        if (fz) {
          tret[i1!] = tjd + fz.dxret + dta;
          tret[i2!] = tjd + fz.dxret2 + dta;
        }
        for (let m = 0, dt = dtb; m < 3; m++, dt /= 3) {
          for (let j = i1!; j <= i2!; j += (i2! - i1!)) {
            const dc2 = [0, 0];
            for (let i = 0, t = tret[j] - dt; i < 2; i++, t += dt) {
              ew = eclipseWhere(swed, t, SE_SUN, null, ifl);
              if (ew.retval === ERR) return { retval: ERR, tret };
              dcore = ew.dcore;
              if (n === 0) dc2[i] = dcore[4] / 2 + de / dcore[5] - dcore[2];
              else if (n === 1) dc2[i] = Math.abs(dcore[3]) / 2 + de / dcore[6] - dcore[2];
              else dc2[i] = de / dcore[6] - dcore[2];
            }
            const dt1 = dc2[1] / ((dc2[1] - dc2[0]) / dt);
            tret[j] -= dt1;
          }
        }
      }
      /* annular-total eclipses */
      if (retflag & SE_ECL_TOTAL) {
        ew = eclipseWhere(swed, tret[0], SE_SUN, null, ifl);
        if (ew.retval === ERR) return { retval: ERR, tret };
        const dc0 = ew.dcore[0];
        ew = eclipseWhere(swed, tret[4], SE_SUN, null, ifl);
        if (ew.retval === ERR) return { retval: ERR, tret };
        const dc1 = ew.dcore[0];
        ew = eclipseWhere(swed, tret[5], SE_SUN, null, ifl);
        if (ew.retval === ERR) return { retval: ERR, tret };
        const dc2 = ew.dcore[0];
        if (dc0 * dc1 < 0 || dc0 * dc2 < 0) {
          retflag |= SE_ECL_ANNULAR_TOTAL;
          retflag &= ~SE_ECL_TOTAL;
        }
      }
      if (!(ifltype & SE_ECL_TOTAL) && (retflag & SE_ECL_TOTAL)) { K += direction; continue; }
      if (!(ifltype & SE_ECL_ANNULAR_TOTAL) && (retflag & SE_ECL_ANNULAR_TOTAL)) { K += direction; continue; }
      /* time of local apparent noon */
      const k2 = 2;
      const dc = [0, 0];
      for (let i = 0; i < 2; i++) {
        const j = i + k2;
        const tt = tret[j] + sweDeltatEx(tret[j], ifl, swed);
        let r1 = sweCalc(swed, tt, SE_SUN, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const ls = Array.from(r1.xx);
        r1 = sweCalc(swed, tt, SE_MOON, iflag);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const lm = Array.from(r1.xx);
        dc[i] = sweDegnorm(ls[0] - lm[0]);
        if (dc[i] > 180) dc[i] -= 360;
      }
      if (dc[0] * dc[1] >= 0) {
        tret[1] = 0;
      } else {
        let tjdNoon = tjds;
        let dt = 0.1;
        let dt1 = (tret[3] - tret[2]) / 2.0;
        if (dt1 < dt) dt = dt1 / 2.0;
        for (let j = 0; dt > 0.01; j++, dt /= 3) {
          const dc2 = [0, 0];
          for (let i = 0, t = tjdNoon; i <= 1; i++, t -= dt) {
            const tt = t + sweDeltatEx(t, ifl, swed);
            let r1 = sweCalc(swed, tt, SE_SUN, iflag);
            if (r1.flags === ERR) return { retval: ERR, tret };
            const ls = Array.from(r1.xx);
            r1 = sweCalc(swed, tt, SE_MOON, iflag);
            if (r1.flags === ERR) return { retval: ERR, tret };
            const lm = Array.from(r1.xx);
            dc2[i] = sweDegnorm(ls[0] - lm[0]);
            if (dc2[i] > 180) dc2[i] -= 360;
            if (dc2[i] > 180) dc2[i] -= 360;
          }
          const a = (dc2[1] - dc2[0]) / dt;
          if (a < 1e-10) break;
          dt1 = dc2[0] / a;
          tjdNoon += dt1;
        }
        tret[1] = tjdNoon;
      }
    }
    return { retval: retflag, tret };
  }
}

export function sweLunOccultWhenGlob(
  swed: SweData, tjdStart: number, ipl: number, starname: string | null,
  ifl: number, ifltype: number, backward: number,
): { retval: number; tret: number[] } {
  swiInitSwedIfStart(swed);
  const tret = new Array(10).fill(0);
  const de = 6378.140;
  const twohr = 2.0 / 24.0;
  const tenmin = 10.0 / 24.0 / 60.0;
  let retflag = 0;
  let direction = 1;
  let dontTimes = false;
  const oneTry = backward & SE_ECL_ONE_TRY;
  if (ipl < 0) ipl = 0;
  if (ipl === SE_AST_OFFSET + 134340) ipl = SE_PLUTO;
  ifl &= SEFLG_EPHMASK;
  const iflag = SEFLG_EQUATORIAL | ifl;
  const iflagcart = iflag | SEFLG_XYZ;
  let backwardBit = backward & 1;
  if (ifltype === (SE_ECL_PARTIAL | SE_ECL_CENTRAL)) return { retval: ERR, tret };
  if (ipl !== SE_SUN) {
    const ifltype2 = ifltype & ~(SE_ECL_NONCENTRAL | SE_ECL_CENTRAL);
    if (ifltype2 === SE_ECL_ANNULAR || ifltype === SE_ECL_ANNULAR_TOTAL) return { retval: ERR, tret };
  }
  if (ipl !== SE_SUN && (ifltype & (SE_ECL_ANNULAR | SE_ECL_ANNULAR_TOTAL)))
    ifltype &= ~(SE_ECL_ANNULAR | SE_ECL_ANNULAR_TOTAL);
  if (ifltype === 0) {
    ifltype = SE_ECL_TOTAL | SE_ECL_PARTIAL | SE_ECL_NONCENTRAL | SE_ECL_CENTRAL;
    if (ipl === SE_SUN) ifltype |= (SE_ECL_ANNULAR | SE_ECL_ANNULAR_TOTAL);
  }
  if (ifltype & (SE_ECL_TOTAL | SE_ECL_ANNULAR | SE_ECL_ANNULAR_TOTAL))
    ifltype |= (SE_ECL_NONCENTRAL | SE_ECL_CENTRAL);
  if (ifltype & SE_ECL_PARTIAL) ifltype |= SE_ECL_NONCENTRAL;
  if (backwardBit) direction = -1;
  let t = tjdStart;
  let tjd = t;
  for (;;) { /* next_try */
    retflag = 0; dontTimes = false;
    for (let i = 0; i <= 9; i++) tret[i] = 0;
    let res2 = calcPlanetStar(swed, t, ipl, starname, ifl);
    if (res2.retval === ERR) return { retval: ERR, tret };
    let ls = Array.from(res2.xx);
    if (Math.abs(ls[1]) > 7 && starname !== null && starname !== '') return { retval: ERR, tret };
    let res = sweCalc(swed, t, SE_MOON, ifl);
    if (res.flags === ERR) return { retval: ERR, tret };
    let lm = Array.from(res.xx);
    let dl = sweDegnorm(ls[0] - lm[0]);
    if (direction < 0) dl -= 360;
    while (Math.abs(dl) > 0.1) {
      t += dl / 13;
      res2 = calcPlanetStar(swed, t, ipl, starname, ifl);
      if (res2.retval === ERR) return { retval: ERR, tret };
      ls = Array.from(res2.xx);
      res = sweCalc(swed, t, SE_MOON, ifl);
      if (res.flags === ERR) return { retval: ERR, tret };
      lm = Array.from(res.xx);
      dl = sweDegnorm(ls[0] - lm[0]);
      if (dl > 180) dl -= 360;
    }
    tjd = t;
    let drad = Math.abs(ls[1] - lm[1]);
    if (drad > 2) {
      if (oneTry) { tret[0] = t + direction; return { retval: 0, tret }; }
      t += direction * 20; tjd = t; continue;
    }
    if (starname !== null && starname !== '') drad = 0;
    else if (ipl < NDIAM) drad = PLA_DIAM[ipl] / 2 / AUNIT;
    else if (ipl > SE_AST_OFFSET) drad = swed.astDiam / 2 * 1000 / AUNIT;
    else drad = 0;
    const dadd2 = 1;
    let dtdiv = 3;
    for (let dt = dadd2; dt > 0.0001; dt /= dtdiv) {
      const dc = [0, 0, 0];
      for (let i = 0, tt = tjd - dt; i <= 2; i++, tt += dt) {
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflag);
        if (res2.retval === ERR) return { retval: ERR, tret };
        const xsT = Array.from(res2.xx);
        res = sweCalc(swed, tt, SE_MOON, iflag);
        if (res.flags === ERR) return { retval: ERR, tret };
        const lmT = Array.from(res.xx);
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflagcart);
        if (res2.retval === ERR) return { retval: ERR, tret };
        const xsC = Array.from(res2.xx);
        res = sweCalc(swed, tt, SE_MOON, iflagcart);
        if (res.flags === ERR) return { retval: ERR, tret };
        const xmC = Array.from(res.xx);
        dc[i] = Math.acos(swiDotProdUnit(xsC, xmC)) * RADTODEG;
        const rmoon = Math.asin(RMOON / lmT[2]) * RADTODEG;
        const rsun = Math.asin(drad / xsT[2]) * RADTODEG;
        dc[i] -= (rmoon + rsun);
      }
      const fm = findMaximum(dc[0], dc[1], dc[2], dt);
      tjd += fm.dxret + dt;
    }
    tjd -= sweDeltatEx(tjd, ifl, swed);
    const tjds = tjd;
    let ew = eclipseWhere(swed, tjd, ipl, starname, ifl);
    if (ew.retval === ERR) return { retval: ERR, tret };
    retflag = ew.retval;
    if (retflag === 0) {
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      t = tjd + direction * 20; tjd = t; continue;
    }
    tret[0] = tjd;
    if ((backwardBit && tret[0] >= tjdStart - 0.0001) || (!backwardBit && tret[0] <= tjdStart + 0.0001)) {
      t = tjd + direction * 20; tjd = t;
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      continue;
    }
    ew = eclipseWhere(swed, tjd, ipl, starname, ifl);
    if (ew.retval === ERR) return { retval: ERR, tret };
    retflag = ew.retval;
    let dcore = ew.dcore;
    if (retflag === 0) {
      retflag = SE_ECL_PARTIAL | SE_ECL_NONCENTRAL;
      tret[4] = tret[5] = tjd;
      dontTimes = true;
    }
    if (!(ifltype & SE_ECL_NONCENTRAL) && (retflag & SE_ECL_NONCENTRAL)) {
      t = tjd + direction * 20;
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      tjd = t; continue;
    }
    if (!(ifltype & SE_ECL_CENTRAL) && (retflag & SE_ECL_CENTRAL)) {
      t = tjd + direction * 20;
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      tjd = t; continue;
    }
    if (!(ifltype & SE_ECL_ANNULAR) && (retflag & SE_ECL_ANNULAR)) {
      t = tjd + direction * 20;
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      tjd = t; continue;
    }
    if (!(ifltype & SE_ECL_PARTIAL) && (retflag & SE_ECL_PARTIAL)) {
      t = tjd + direction * 20;
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      tjd = t; continue;
    }
    if (!(ifltype & (SE_ECL_TOTAL | SE_ECL_ANNULAR_TOTAL)) && (retflag & SE_ECL_TOTAL)) {
      t = tjd + direction * 20;
      if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
      tjd = t; continue;
    }
    if (!dontTimes) {
      let o: number;
      if (retflag & SE_ECL_PARTIAL) o = 0;
      else if (retflag & SE_ECL_NONCENTRAL) o = 1;
      else o = 2;
      const dta = twohr;
      const dtb = tenmin;
      for (let n = 0; n <= o; n++) {
        let i1: number, i2: number;
        if (n === 0) { i1 = 2; i2 = 3; }
        else if (n === 1) { if (retflag & SE_ECL_PARTIAL) continue; i1 = 4; i2 = 5; }
        else { if (retflag & SE_ECL_NONCENTRAL) continue; i1 = 6; i2 = 7; }
        const dc = [0, 0, 0];
        for (let i = 0, tt = tjd - dta; i <= 2; i++, tt += dta) {
          ew = eclipseWhere(swed, tt, ipl, starname, ifl);
          if (ew.retval === ERR) return { retval: ERR, tret };
          dcore = ew.dcore;
          if (n === 0) dc[i] = dcore[4] / 2 + de / dcore[5] - dcore[2];
          else if (n === 1) dc[i] = Math.abs(dcore[3]) / 2 + de / dcore[6] - dcore[2];
          else dc[i] = de / dcore[6] - dcore[2];
        }
        const fz = findZero(dc[0], dc[1], dc[2], dta);
        if (fz) { tret[i1!] = tjd + fz.dxret + dta; tret[i2!] = tjd + fz.dxret2 + dta; }
        for (let m = 0, dt = dtb; m < 3; m++, dt /= 3) {
          for (let j = i1!; j <= i2!; j += (i2! - i1!)) {
            const dc2 = [0, 0];
            for (let i = 0, tt = tret[j] - dt; i < 2; i++, tt += dt) {
              ew = eclipseWhere(swed, tt, ipl, starname, ifl);
              if (ew.retval === ERR) return { retval: ERR, tret };
              dcore = ew.dcore;
              if (n === 0) dc2[i] = dcore[4] / 2 + de / dcore[5] - dcore[2];
              else if (n === 1) dc2[i] = Math.abs(dcore[3]) / 2 + de / dcore[6] - dcore[2];
              else dc2[i] = de / dcore[6] - dcore[2];
            }
            tret[j] -= dc2[1] / ((dc2[1] - dc2[0]) / dt);
          }
        }
      }
      /* annular-total check */
      if (retflag & SE_ECL_TOTAL) {
        ew = eclipseWhere(swed, tret[0], ipl, starname, ifl);
        if (ew.retval === ERR) return { retval: ERR, tret };
        const dc0 = ew.dcore[0];
        ew = eclipseWhere(swed, tret[4], ipl, starname, ifl);
        if (ew.retval === ERR) return { retval: ERR, tret };
        const dc1 = ew.dcore[0];
        ew = eclipseWhere(swed, tret[5], ipl, starname, ifl);
        if (ew.retval === ERR) return { retval: ERR, tret };
        const dc2 = ew.dcore[0];
        if (dc0 * dc1 < 0 || dc0 * dc2 < 0) {
          retflag |= SE_ECL_ANNULAR_TOTAL; retflag &= ~SE_ECL_TOTAL;
        }
      }
      if (!(ifltype & SE_ECL_TOTAL) && (retflag & SE_ECL_TOTAL)) {
        t = tjd + direction * 20;
        if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
        tjd = t; continue;
      }
      if (!(ifltype & SE_ECL_ANNULAR_TOTAL) && (retflag & SE_ECL_ANNULAR_TOTAL)) {
        t = tjd + direction * 20;
        if (oneTry) { tret[0] = tjd; return { retval: 0, tret }; }
        tjd = t; continue;
      }
      /* time of local apparent noon */
      const k2 = 2;
      const dcN = [0, 0];
      for (let i = 0; i < 2; i++) {
        const j = i + k2;
        const tt = tret[j] + sweDeltatEx(tret[j], ifl, swed);
        res2 = calcPlanetStar(swed, tt, ipl, starname, iflag);
        if (res2.retval === ERR) return { retval: ERR, tret };
        ls = Array.from(res2.xx);
        res = sweCalc(swed, tt, SE_MOON, iflag);
        if (res.flags === ERR) return { retval: ERR, tret };
        lm = Array.from(res.xx);
        dcN[i] = sweDegnorm(ls[0] - lm[0]);
        if (dcN[i] > 180) dcN[i] -= 360;
      }
      if (dcN[0] * dcN[1] >= 0) {
        tret[1] = 0;
      } else {
        let tjdNoon = tjds;
        let dt = 0.1;
        let dt1 = (tret[3] - tret[2]) / 2.0;
        if (dt1 < dt) dt = dt1 / 2.0;
        for (let j = 0; dt > 0.01; j++, dt /= 3) {
          const dc2 = [0, 0];
          for (let i = 0, tt = tjdNoon; i <= 1; i++, tt -= dt) {
            const tte = tt + sweDeltatEx(tt, ifl, swed);
            res2 = calcPlanetStar(swed, tte, ipl, starname, iflag);
            if (res2.retval === ERR) return { retval: ERR, tret };
            ls = Array.from(res2.xx);
            res = sweCalc(swed, tte, SE_MOON, iflag);
            if (res.flags === ERR) return { retval: ERR, tret };
            lm = Array.from(res.xx);
            dc2[i] = sweDegnorm(ls[0] - lm[0]);
            if (dc2[i] > 180) dc2[i] -= 360;
            if (dc2[i] > 180) dc2[i] -= 360;
          }
          const a = (dc2[1] - dc2[0]) / dt;
          if (a < 1e-10) break;
          tjdNoon += dc2[0] / a;
        }
        tret[1] = tjdNoon;
      }
    }
    return { retval: retflag, tret };
  }
}

export function sweLunEclipseWhen(
  swed: SweData, tjdStart: number, ifl: number, ifltype: number,
  backward: number,
): { retval: number; tret: number[] } {
  swiInitSwedIfStart(swed);
  const tret = new Array(10).fill(0);
  let retflag = 0;
  let direction = 1;
  const twohr = 2.0 / 24.0;
  const tenmin = 10.0 / 24.0 / 60.0;
  ifl &= SEFLG_EPHMASK;
  const iflag = SEFLG_EQUATORIAL | ifl;
  const iflagcart = iflag | SEFLG_XYZ;
  ifltype &= ~(SE_ECL_CENTRAL | SE_ECL_NONCENTRAL);
  if (ifltype & (SE_ECL_ANNULAR | SE_ECL_ANNULAR_TOTAL)) {
    ifltype &= ~(SE_ECL_ANNULAR | SE_ECL_ANNULAR_TOTAL);
    if (ifltype === 0) return { retval: ERR, tret };
  }
  if (ifltype === 0) ifltype = SE_ECL_TOTAL | SE_ECL_PENUMBRAL | SE_ECL_PARTIAL;
  if (backward) direction = -1;
  let K = Math.floor((tjdStart - J2000) / 365.2425 * 12.3685);
  K -= direction;
  for (;;) { /* next_try */
    retflag = 0;
    for (let i = 0; i <= 9; i++) tret[i] = 0;
    const kk = K + 0.5;
    const T = kk / 1236.85;
    const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    let F = sweDegnorm(160.7108 + 390.67050274 * kk - 0.0016341 * T2 - 0.00000227 * T3 + 0.000000011 * T4);
    let Ff = F;
    if (Ff > 180) Ff -= 180;
    if (Ff > 21 && Ff < 159) { K += direction; continue; }
    let tjd = 2451550.09765 + 29.530588853 * kk + 0.0001337 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
    let M = sweDegnorm(2.5534 + 29.10535669 * kk - 0.0000218 * T2 - 0.00000011 * T3);
    let Mm = sweDegnorm(201.5643 + 385.81693528 * kk + 0.1017438 * T2 + 0.00001239 * T3 + 0.000000058 * T4);
    let Om = sweDegnorm(124.7746 - 1.56375580 * kk + 0.0020691 * T2 + 0.00000215 * T3);
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    let A1 = sweDegnorm(299.77 + 0.107408 * kk - 0.009173 * T2);
    M *= DEGTORAD; Mm *= DEGTORAD; F *= DEGTORAD; Om *= DEGTORAD;
    const F1 = F - 0.02665 * Math.sin(Om) * DEGTORAD;
    A1 *= DEGTORAD;
    tjd = tjd - 0.4075 * Math.sin(Mm)
              + 0.1721 * E * Math.sin(M)
              + 0.0161 * Math.sin(2 * Mm)
              - 0.0097 * Math.sin(2 * F1)
              + 0.0073 * E * Math.sin(Mm - M)
              - 0.0050 * E * Math.sin(Mm + M)
              - 0.0023 * Math.sin(Mm - 2 * F1)
              + 0.0021 * E * Math.sin(2 * M)
              + 0.0012 * Math.sin(Mm + 2 * F1)
              + 0.0006 * E * Math.sin(2 * Mm + M)
              - 0.0004 * Math.sin(3 * Mm)
              - 0.0003 * E * Math.sin(M + 2 * F1)
              + 0.0003 * Math.sin(A1)
              - 0.0002 * E * Math.sin(M - 2 * F1)
              - 0.0002 * E * Math.sin(2 * Mm - M)
              - 0.0002 * Math.sin(Om);
    let dtstart = 0.1;
    if (tjd < 2100000 || tjd > 2500000) dtstart = 5;
    let dtdiv = 4;
    for (let dt = dtstart; dt > 0.001; dt /= dtdiv) {
      const dc = [0, 0, 0];
      for (let i = 0, t = tjd - dt; i <= 2; i++, t += dt) {
        let r1 = sweCalc(swed, t, SE_SUN, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const xs = Array.from(r1.xx);
        r1 = sweCalc(swed, t, SE_MOON, iflagcart);
        if (r1.flags === ERR) return { retval: ERR, tret };
        const xm = Array.from(r1.xx);
        for (let m = 0; m < 3; m++) { xs[m] -= xm[m]; xm[m] = -xm[m]; }
        const ds = Math.sqrt(squareSum(xs));
        const dm = Math.sqrt(squareSum(xm));
        const xa = [xs[0] / ds, xs[1] / ds, xs[2] / ds];
        const xb = [xm[0] / dm, xm[1] / dm, xm[2] / dm];
        dc[i] = Math.acos(swiDotProdUnit(xa, xb)) * RADTODEG;
        const rearth = Math.asin(REARTH_ECL / dm) * RADTODEG;
        const rsun = Math.asin(RSUN_ECL / ds) * RADTODEG;
        dc[i] -= (rearth + rsun);
      }
      const fm = findMaximum(dc[0], dc[1], dc[2], dt);
      tjd += fm.dxret + dt;
    }
    let tjd2 = tjd - sweDeltatEx(tjd, ifl, swed);
    tjd2 = tjd - sweDeltatEx(tjd2, ifl, swed);
    tjd = tjd - sweDeltatEx(tjd2, ifl, swed);
    const leh = lunEclipseHow(swed, tjd, ifl);
    if (leh.retval === ERR) return { retval: ERR, tret };
    retflag = leh.retval;
    if (retflag === 0) { K += direction; continue; }
    tret[0] = tjd;
    if ((backward && tret[0] >= tjdStart - 0.0001) || (!backward && tret[0] <= tjdStart + 0.0001)) {
      K += direction; continue;
    }
    if (!(ifltype & SE_ECL_PENUMBRAL) && (retflag & SE_ECL_PENUMBRAL)) { K += direction; continue; }
    if (!(ifltype & SE_ECL_PARTIAL) && (retflag & SE_ECL_PARTIAL)) { K += direction; continue; }
    if (!(ifltype & SE_ECL_TOTAL) && (retflag & SE_ECL_TOTAL)) { K += direction; continue; }
    /* contact times */
    let o: number;
    if (retflag & SE_ECL_PENUMBRAL) o = 0;
    else if (retflag & SE_ECL_PARTIAL) o = 1;
    else o = 2;
    const dta = twohr;
    for (let n = 0; n <= o; n++) {
      let i1: number, i2: number;
      if (n === 0) { i1 = 6; i2 = 7; }
      else if (n === 1) { i1 = 2; i2 = 3; }
      else { i1 = 4; i2 = 5; }
      const dc = [0, 0, 0];
      for (let i = 0, t = tjd - dta; i <= 2; i++, t += dta) {
        const leh2 = lunEclipseHow(swed, t, ifl);
        if (leh2.retval === ERR) return { retval: ERR, tret };
        const dcore = leh2.dcore;
        if (n === 0) dc[i] = dcore[2] / 2 + RMOON / dcore[4] - dcore[0];
        else if (n === 1) dc[i] = dcore[1] / 2 + RMOON / dcore[3] - dcore[0];
        else dc[i] = dcore[1] / 2 - RMOON / dcore[3] - dcore[0];
      }
      const fz = findZero(dc[0], dc[1], dc[2], dta);
      let dtb = 0;
      if (fz) {
        dtb = (fz.dxret + dta) / 2;
        tret[i1] = tjd + fz.dxret + dta;
        tret[i2] = tjd + fz.dxret2 + dta;
      }
      for (let m = 0, dt = dtb / 2; m < 3; m++, dt /= 2) {
        for (let j = i1; j <= i2; j += (i2 - i1)) {
          const dc2 = [0, 0];
          for (let i = 0, t = tret[j] - dt; i < 2; i++, t += dt) {
            const leh2 = lunEclipseHow(swed, t, ifl);
            if (leh2.retval === ERR) return { retval: ERR, tret };
            const dcore = leh2.dcore;
            if (n === 0) dc2[i] = dcore[2] / 2 + RMOON / dcore[4] - dcore[0];
            else if (n === 1) dc2[i] = dcore[1] / 2 + RMOON / dcore[3] - dcore[0];
            else dc2[i] = dcore[1] / 2 - RMOON / dcore[3] - dcore[0];
          }
          tret[j] -= dc2[1] / ((dc2[1] - dc2[0]) / dt);
        }
      }
    }
    return { retval: retflag, tret };
  }
}

/* ==================================================================
 * Phase 5: Public wrapper functions
 * ================================================================== */

export function sweSolEclipseWhere(
  swed: SweData, tjdUt: number, ifl: number,
): { retval: number; geopos: number[]; attr: number[] } {
  swiInitSwedIfStart(swed);
  ifl &= SEFLG_EPHMASK;
  const ew = eclipseWhere(swed, tjdUt, SE_SUN, null, ifl);
  if (ew.retval < 0) return { retval: ew.retval, geopos: ew.geopos, attr: new Array(20).fill(0) };
  const retflag = ew.retval;
  const how = eclipseHow(swed, tjdUt, SE_SUN, null, ifl, ew.geopos[0], ew.geopos[1], 0);
  if (how.retval === ERR) return { retval: ERR, geopos: ew.geopos, attr: how.attr };
  how.attr[3] = ew.dcore[0];
  return { retval: retflag, geopos: ew.geopos, attr: how.attr };
}

export function sweSolEclipseHow(
  swed: SweData, tjdUt: number, ifl: number, geopos: number[],
): { retval: number; attr: number[] } {
  swiInitSwedIfStart(swed);
  if (geopos[2] < SEI_ECL_GEOALT_MIN || geopos[2] > SEI_ECL_GEOALT_MAX) return { retval: ERR, attr: new Array(20).fill(0) };
  ifl &= SEFLG_EPHMASK;
  const how = eclipseHow(swed, tjdUt, SE_SUN, null, ifl, geopos[0], geopos[1], geopos[2]);
  if (how.retval === ERR) return how;
  let retflag = how.retval;
  const ew = eclipseWhere(swed, tjdUt, SE_SUN, null, ifl);
  if (ew.retval === ERR) return { retval: ERR, attr: how.attr };
  if (retflag) retflag |= (ew.retval & (SE_ECL_CENTRAL | SE_ECL_NONCENTRAL));
  how.attr[3] = ew.dcore[0];
  /* sun azimuth/altitude at geopos */
  sweSetTopo(swed, geopos[0], geopos[1], geopos[2]);
  const res = sweCalcUt(swed, tjdUt, SE_SUN, ifl | SEFLG_TOPOCTR | SEFLG_EQUATORIAL);
  if (res.flags === ERR) return { retval: ERR, attr: how.attr };
  const xaz = [0, 0, 0];
  sweAzalt(swed, tjdUt, SE_EQU2HOR, geopos, 0, 10, Array.from(res.xx), xaz);
  how.attr[4] = xaz[0]; how.attr[5] = xaz[1]; how.attr[6] = xaz[2];
  if (xaz[2] <= 0) retflag = 0;
  if (retflag === 0) {
    for (let i = 0; i <= 3; i++) how.attr[i] = 0;
    for (let i = 8; i <= 10; i++) how.attr[i] = 0;
  }
  return { retval: retflag, attr: how.attr };
}

export function sweSolEclipseWhenLoc(
  swed: SweData, tjdStart: number, ifl: number, geopos: number[],
  backward: number,
): { retval: number; tret: number[]; attr: number[] } {
  swiInitSwedIfStart(swed);
  if (geopos[2] < SEI_ECL_GEOALT_MIN || geopos[2] > SEI_ECL_GEOALT_MAX)
    return { retval: ERR, tret: new Array(10).fill(0), attr: new Array(20).fill(0) };
  ifl &= SEFLG_EPHMASK;
  const loc = eclipseWhenLoc(swed, tjdStart, ifl, geopos, backward);
  if (loc.retval <= 0) return loc;
  let retflag = loc.retval;
  const ew = eclipseWhere(swed, loc.tret[0], SE_SUN, null, ifl);
  if (ew.retval === ERR) return { retval: ERR, tret: loc.tret, attr: loc.attr };
  retflag |= (ew.retval & SE_ECL_NONCENTRAL);
  loc.attr[3] = ew.dcore[0];
  return { retval: retflag, tret: loc.tret, attr: loc.attr };
}

export function sweLunOccultWhere(
  swed: SweData, tjdUt: number, ipl: number, starname: string | null, ifl: number,
): { retval: number; geopos: number[]; attr: number[] } {
  swiInitSwedIfStart(swed);
  if (ipl < 0) ipl = 0;
  ifl &= SEFLG_EPHMASK;
  if (ipl === SE_AST_OFFSET + 134340) ipl = SE_PLUTO;
  const ew = eclipseWhere(swed, tjdUt, ipl, starname, ifl);
  if (ew.retval < 0) return { retval: ew.retval, geopos: ew.geopos, attr: new Array(20).fill(0) };
  const retflag = ew.retval;
  const how = eclipseHow(swed, tjdUt, ipl, starname, ifl, ew.geopos[0], ew.geopos[1], 0);
  if (how.retval === ERR) return { retval: ERR, geopos: ew.geopos, attr: how.attr };
  how.attr[3] = ew.dcore[0];
  return { retval: retflag, geopos: ew.geopos, attr: how.attr };
}

export function sweLunOccultWhenLoc(
  swed: SweData, tjdStart: number, ipl: number, starname: string | null,
  ifl: number, geopos: number[], backward: number,
): { retval: number; tret: number[]; attr: number[] } {
  swiInitSwedIfStart(swed);
  if (geopos[2] < SEI_ECL_GEOALT_MIN || geopos[2] > SEI_ECL_GEOALT_MAX)
    return { retval: ERR, tret: new Array(10).fill(0), attr: new Array(20).fill(0) };
  if (ipl < 0) ipl = 0;
  if (ipl === SE_AST_OFFSET + 134340) ipl = SE_PLUTO;
  ifl &= SEFLG_EPHMASK;
  const loc = occultWhenLoc(swed, tjdStart, ipl, starname, ifl, geopos, backward);
  if (loc.retval <= 0) return loc;
  let retflag = loc.retval;
  const ew = eclipseWhere(swed, loc.tret[0], ipl, starname, ifl);
  if (ew.retval === ERR) return { retval: ERR, tret: loc.tret, attr: loc.attr };
  retflag |= (ew.retval & SE_ECL_NONCENTRAL);
  loc.attr[3] = ew.dcore[0];
  return { retval: retflag, tret: loc.tret, attr: loc.attr };
}

export function sweLunEclipseHow(
  swed: SweData, tjdUt: number, ifl: number, geopos: number[] | null,
): { retval: number; attr: number[] } {
  swiInitSwedIfStart(swed);
  if (geopos !== null && (geopos[2] < SEI_ECL_GEOALT_MIN || geopos[2] > SEI_ECL_GEOALT_MAX))
    return { retval: ERR, attr: new Array(20).fill(0) };
  ifl = ifl & ~SEFLG_TOPOCTR;
  ifl &= ~(0x40000 | 0x80000); /* SEFLG_JPLHOR | SEFLG_JPLHOR_APPROX */
  const leh = lunEclipseHow(swed, tjdUt, ifl);
  let retc = leh.retval;
  if (geopos === null) return { retval: retc, attr: leh.attr };
  /* azimuth and altitude of moon */
  sweSetTopo(swed, geopos[0], geopos[1], geopos[2]);
  const res = sweCalcUt(swed, tjdUt, SE_MOON, ifl | SEFLG_TOPOCTR | SEFLG_EQUATORIAL);
  if (res.flags === ERR) return { retval: ERR, attr: leh.attr };
  const xaz = [0, 0, 0];
  sweAzalt(swed, tjdUt, SE_EQU2HOR, geopos, 0, 10, Array.from(res.xx), xaz);
  leh.attr[4] = xaz[0]; leh.attr[5] = xaz[1]; leh.attr[6] = xaz[2];
  if (xaz[2] <= 0) retc = 0;
  return { retval: retc, attr: leh.attr };
}

export function sweLunEclipseWhenLoc(
  swed: SweData, tjdStart: number, ifl: number, geopos: number[],
  backward: number,
): { retval: number; tret: number[]; attr: number[] } {
  swiInitSwedIfStart(swed);
  const tret = new Array(10).fill(0);
  const attr = new Array(20).fill(0);
  if (geopos[2] < SEI_ECL_GEOALT_MIN || geopos[2] > SEI_ECL_GEOALT_MAX)
    return { retval: ERR, tret, attr };
  ifl &= ~(0x40000 | 0x80000);
  let tjdStartAdj = tjdStart;
  for (;;) { /* next_lun_ecl */
    const lew = sweLunEclipseWhen(swed, tjdStartAdj, ifl, 0, backward);
    if (lew.retval === ERR) return { retval: ERR, tret: lew.tret, attr };
    for (let i = 0; i < 10; i++) tret[i] = lew.tret[i];
    /* visibility */
    let retflag = 0;
    for (let i = 7; i >= 0; i--) {
      if (i === 1) continue;
      if (tret[i] === 0) continue;
      const how = sweLunEclipseHow(swed, tret[i], ifl, geopos);
      if (how.retval === ERR) return { retval: ERR, tret, attr };
      if (how.attr[6] > 0) {
        retflag |= SE_ECL_VISIBLE;
        if (i === 0) retflag |= SE_ECL_MAX_VISIBLE;
        else if (i === 2) retflag |= SE_ECL_PARTBEG_VISIBLE;
        else if (i === 3) retflag |= SE_ECL_PARTEND_VISIBLE;
        else if (i === 4) retflag |= SE_ECL_TOTBEG_VISIBLE;
        else if (i === 5) retflag |= SE_ECL_TOTEND_VISIBLE;
        else if (i === 6) retflag |= SE_ECL_PENUMBBEG_VISIBLE;
        else if (i === 7) retflag |= SE_ECL_PENUMBEND_VISIBLE;
      }
      if (i === 0) { for (let j = 0; j < 20; j++) attr[j] = how.attr[j]; }
    }
    if (!(retflag & SE_ECL_VISIBLE)) {
      tjdStartAdj = backward ? tret[0] - 25 : tret[0] + 25;
      continue;
    }
    /* moon rise and set */
    let tjdMax = tret[0];
    const riseRes = sweRiseTrans(swed, tret[6] - 0.001, SE_MOON, null, ifl, SE_CALC_RISE | SE_BIT_DISC_BOTTOM, geopos, 0, 0, null);
    if (riseRes.retval === ERR) return { retval: ERR, tret, attr };
    let setRes: { retval: number; tret: number } = { retval: 0, tret: 0 };
    if (riseRes.retval >= 0) {
      setRes = sweRiseTrans(swed, tret[6] - 0.001, SE_MOON, null, ifl, SE_CALC_SET | SE_BIT_DISC_BOTTOM, geopos, 0, 0, null);
      if (setRes.retval === ERR) return { retval: ERR, tret, attr };
    }
    if (riseRes.retval >= 0 && setRes.retval >= 0) {
      const tjdr = riseRes.tret;
      const tjds = setRes.tret;
      if (tjds < tret[6] || (tjds > tjdr && tjdr > tret[7])) {
        tjdStartAdj = backward ? tret[0] - 25 : tret[0] + 25;
        continue;
      }
      if (tjdr > tret[6] && tjdr < tret[7]) {
        tret[6] = 0;
        for (let i = 2; i <= 5; i++) { if (tjdr > tret[i]) tret[i] = 0; }
        tret[8] = tjdr;
        if (tjdr > tret[0]) tjdMax = tjdr;
      }
      if (tjds > tret[6] && tjds < tret[7]) {
        tret[7] = 0;
        for (let i = 2; i <= 5; i++) { if (tjds < tret[i]) tret[i] = 0; }
        tret[9] = tjds;
        if (tjds < tret[0]) tjdMax = tjds;
      }
    }
    tret[0] = tjdMax;
    const howFinal = sweLunEclipseHow(swed, tjdMax, ifl, geopos);
    if (howFinal.retval === ERR) return { retval: ERR, tret, attr };
    if (howFinal.retval === 0) {
      tjdStartAdj = backward ? tret[0] - 25 : tret[0] + 25;
      continue;
    }
    for (let j = 0; j < 20; j++) attr[j] = howFinal.attr[j];
    retflag |= (howFinal.retval & SE_ECL_ALLTYPES_LUNAR);
    return { retval: retflag, tret, attr };
  }
}

/* ==================================================================
 * Planetary nodes and apsides — swe_nod_aps / swe_nod_aps_ut
 * Translated from swecl.c lines 5001-5655
 * ================================================================== */

/* Mean orbital element tables (VSOP87 polynomials, Mercury–Neptune) */
const el_node: number[][] = [
  [ 48.330893,  1.1861890,  0.00017587,  0.000000211], /* Mercury */
  [ 76.679920,  0.9011190,  0.00040665, -0.000000080], /* Venus   */
  [  0,         0,          0,           0           ], /* Earth   */
  [ 49.558093,  0.7720923,  0.00001605,  0.000002325], /* Mars    */
  [100.464441,  1.0209550,  0.00040117,  0.000000569], /* Jupiter */
  [113.665524,  0.8770970, -0.00012067, -0.000002380], /* Saturn  */
  [ 74.005947,  0.5211258,  0.00133982,  0.000018516], /* Uranus  */
  [131.784057,  1.1022057,  0.00026006, -0.000000636], /* Neptune */
];
const el_peri: number[][] = [
  [ 77.456119,  1.5564775,  0.00029589,  0.000000056], /* Mercury */
  [131.563707,  1.4022188, -0.00107337, -0.000005315], /* Venus   */
  [102.937348,  1.7195269,  0.00045962,  0.000000499], /* Earth   */
  [336.060234,  1.8410331,  0.00013515,  0.000000318], /* Mars    */
  [ 14.331309,  1.6126668,  0.00103127, -0.000004569], /* Jupiter */
  [ 93.056787,  1.9637694,  0.00083757,  0.000004899], /* Saturn  */
  [173.005159,  1.4863784,  0.00021450,  0.000000433], /* Uranus  */
  [ 48.123691,  1.4262677,  0.00037918, -0.000000003], /* Neptune */
];
const el_incl: number[][] = [
  [  7.004986,  0.0018215, -0.00001809,  0.000000053], /* Mercury */
  [  3.394662,  0.0010037, -0.00000088, -0.000000007], /* Venus   */
  [  0,         0,          0,           0           ], /* Earth   */
  [  1.849726, -0.0006010,  0.00001276, -0.000000006], /* Mars    */
  [  1.303270, -0.0054966,  0.00000465, -0.000000004], /* Jupiter */
  [  2.488878, -0.0037363, -0.00001516,  0.000000089], /* Saturn  */
  [  0.773196,  0.0007744,  0.00003749, -0.000000092], /* Uranus  */
  [  1.769952, -0.0093082, -0.00000708,  0.000000028], /* Neptune */
];
const el_ecce: number[][] = [
  [  0.20563175,  0.000020406, -0.0000000284, -0.00000000017], /* Mercury */
  [  0.00677188, -0.000047766,  0.0000000975,  0.00000000044], /* Venus   */
  [  0.01670862, -0.000042037, -0.0000001236,  0.00000000004], /* Earth   */
  [  0.09340062,  0.000090483, -0.0000000806, -0.00000000035], /* Mars    */
  [  0.04849485,  0.000163244, -0.0000004719, -0.00000000197], /* Jupiter */
  [  0.05550862, -0.000346818, -0.0000006456,  0.00000000338], /* Saturn  */
  [  0.04629590, -0.000027337,  0.0000000790,  0.00000000025], /* Uranus  */
  [  0.00898809,  0.000006408, -0.0000000008, -0.00000000005], /* Neptune */
];
const el_sema: number[][] = [
  [  0.387098310,  0.0,  0.0,  0.0], /* Mercury */
  [  0.723329820,  0.0,  0.0,  0.0], /* Venus   */
  [  1.000001018,  0.0,  0.0,  0.0], /* Earth   */
  [  1.523679342,  0.0,  0.0,  0.0], /* Mars    */
  [  5.202603191,  0.0000001913,  0.0,  0.0], /* Jupiter */
  [  9.554909596,  0.0000021389,  0.0,  0.0], /* Saturn  */
  [ 19.218446062, -0.0000000372,  0.00000000098,  0.0], /* Uranus  */
  [ 30.110386869, -0.0000001663,  0.00000000069,  0.0], /* Neptune */
];
/* Ratios of mass of Sun to masses of the planets */
const plmass: number[] = [
    6023600,        /* Mercury */
     408523.719,    /* Venus */
     328900.5,      /* Earth and Moon */
    3098703.59,     /* Mars */
       1047.348644, /* Jupiter */
       3497.9018,   /* Saturn */
      22902.98,     /* Uranus */
      19412.26,     /* Neptune */
  136566000,        /* Pluto */
];
const ipl_to_elem: number[] = [2, 0, 0, 1, 3, 4, 5, 6, 7, 0, 0, 0, 0, 0, 2];

/**
 * Rotate J2000 equatorial XYZ → ecliptic of date.
 * C: swi_plan_for_osc_elem (sweph.c:5757)
 */
function swiPlanForOscElemNodAps(iflag: number, tjd: number, xx: Float64Array | number[], swed: SweData): number {
  const x = new Float64Array(6);
  let oe: Epsilon = swed.oec;
  const oectmp = createEpsilon();
  /* ICRS to J2000 */
  if (!(iflag & SEFLG_ICRS) && swiGetDenum(SEI_SUN, iflag, swed) >= 403) {
    swiBias(xx, tjd, iflag, false, swed);
  }
  /* precession, equator 2000 -> equator of date
   * attention: speed vector has to be rotated,
   * but daily precession 0.137" may not be added! */
  swiPrecess(xx, tjd, iflag, J2000_TO_J, swed);
  /* precess speed vector separately (C: swi_precess(xx+3, ...)) */
  const tmpSpd = [xx[3], xx[4], xx[5]];
  swiPrecess(tmpSpd, tjd, iflag, J2000_TO_J, swed);
  xx[3] = tmpSpd[0]; xx[4] = tmpSpd[1]; xx[5] = tmpSpd[2];
  /* epsilon */
  if (tjd === swed.oec.teps) {
    oe = swed.oec;
  } else if (tjd === J2000) {
    oe = swed.oec2000;
  } else {
    calcEpsilon(tjd, iflag, oectmp, swed);
    oe = oectmp;
  }
  /* nutation */
  if (!(iflag & SEFLG_NONUT)) {
    let nutp: Nut;
    if (tjd === swed.nut.tnut) {
      nutp = swed.nut;
    } else if (tjd === J2000) {
      nutp = swed.nut2000;
    } else if (tjd === swed.nutv.tnut) {
      nutp = swed.nutv;
    } else {
      nutp = createNut();
      swiNutation(tjd, iflag, nutp.nutlo, swed);
      nutp.tnut = tjd;
      nutp.snut = Math.sin(nutp.nutlo[1]);
      nutp.cnut = Math.cos(nutp.nutlo[1]);
      nutMatrix(nutp, oe);
    }
    for (let i = 0; i <= 2; i++) {
      x[i] = xx[0] * nutp.matrix[0][i] +
             xx[1] * nutp.matrix[1][i] +
             xx[2] * nutp.matrix[2][i];
    }
    /* speed: rotation only */
    for (let i = 0; i <= 2; i++) {
      x[i + 3] = xx[3] * nutp.matrix[0][i] +
                 xx[4] * nutp.matrix[1][i] +
                 xx[5] * nutp.matrix[2][i];
    }
    for (let i = 0; i <= 5; i++) xx[i] = x[i];
    /* transformation to ecliptic */
    swiCoortrf2(xx, xx, oe.seps, oe.ceps);
    swiCoortrf2(xx, xx, oe.seps, oe.ceps, 3, 3);
    swiCoortrf2(xx, xx, nutp.snut, nutp.cnut);
    swiCoortrf2(xx, xx, nutp.snut, nutp.cnut, 3, 3);
  } else {
    /* no nutation: just ecliptic transformation */
    swiCoortrf2(xx, xx, oe.seps, oe.ceps);
    swiCoortrf2(xx, xx, oe.seps, oe.ceps, 3, 3);
  }
  return OK;
}

/** Result from sweNodAps / sweNodApsUt */
export interface NodApsResult {
  retval: number;
  xnasc: number[];
  xndsc: number[];
  xperi: number[];
  xaphe: number[];
  serr: string;
}

/**
 * Compute planetary nodes and apsides.
 * C: swe_nod_aps (swecl.c:5064-5643)
 */
export function sweNodAps(
  swed: SweData,
  tjdEt: number,
  ipl: number,
  iflag: number,
  method: number,
): NodApsResult {
  let i: number, j: number, ij: number;
  let iplx: number;
  let ipli: number;
  let istart: number, iend: number;
  let iflJ2000: number;
  let plm: number;
  let t = (tjdEt - J2000) / 36525;
  let dt: number;
  const x = new Float64Array(6);
  const xx = new Float64Array(24);
  const xobs = new Float64Array(6);
  const x2000 = new Float64Array(6);
  const xpos: Float64Array[] = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
  const xnorm = new Float64Array(6);
  const xposm = new Float64Array(6);
  const xn: Float64Array[] = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
  const xs: Float64Array[] = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
  const xq: Float64Array[] = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
  const xa: Float64Array[] = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
  const xobs2 = new Float64Array(6);
  const x2 = new Float64Array(6);
  /* xna, xnd, xpe, xap are views into xx */
  const xna = xx.subarray(0, 6);
  const xnd = xx.subarray(6, 12);
  const xpe = xx.subarray(12, 18);
  const xap = xx.subarray(18, 24);
  let incl: number, sema: number, ecce: number, parg: number, ea: number;
  let vincl: number, vsema: number, vecce: number, pargx: number, eax: number;
  const pedp = swed.pldat[SEI_EARTH];
  const psbdp = swed.pldat[SEI_SUNBARY];
  const xsun = psbdp.x;
  const xear = pedp.x;
  let ep: number[];
  let Gmsm: number, dzmin: number;
  let rxy: number, rxyz: number, fac: number, sgn: number;
  let sinnode: number, cosnode: number, sinincl: number, cosincl: number;
  let sinu: number, cosu: number, sinE: number, cosE: number, cosE2: number;
  let uu: number, ny: number, ny2: number, c2: number, v2: number;
  let pp: number, ro: number, ro2: number, rn: number, rn2: number;
  let oe: Epsilon;
  let isTrueNodaps = false;
  let doAberr = !(iflag & (SEFLG_TRUEPOS | SEFLG_NOABERR));
  let doDefl = !(iflag & SEFLG_TRUEPOS) && !(iflag & SEFLG_NOGDEFL);
  const doFocalPoint = !!(method & SE_NODBIT_FOPOINT);
  let ellipseIsBary = false;
  let iflg0: number;
  let serr = '';
  const pldat_xreturn = new Float64Array(24);

  iflag &= ~(0x100000 | 0x200000); /* SEFLG_JPLHOR | SEFLG_JPLHOR_APPROX */

  /* Pluto as asteroid 134340 → main body SE_PLUTO */
  if (ipl === SE_AST_OFFSET + 134340) ipl = SE_PLUTO;

  /* to get control over the save area */
  swiForceAppPosEtc(swed);

  method %= SE_NODBIT_FOPOINT;
  ipli = ipl;
  if (ipl === SE_SUN) ipli = SE_EARTH;
  if (ipl === SE_MOON) {
    doDefl = false;
    if (!(iflag & SEFLG_HELCTR)) doAberr = false;
  }
  iflg0 = (iflag & (SEFLG_EPHMASK | SEFLG_NONUT)) | SEFLG_SPEED | SEFLG_TRUEPOS;
  if (ipli !== SE_MOON) iflg0 |= SEFLG_HELCTR;

  if (ipl === SE_MEAN_NODE || ipl === SE_TRUE_NODE ||
      ipl === SE_MEAN_APOG || ipl === SE_OSCU_APOG ||
      ipl < 0 ||
      (ipl >= SE_NPLANETS && ipl <= SE_AST_OFFSET)) {
    serr = `nodes/apsides for planet ${ipl} are not implemented`;
    return {
      retval: ERR, serr,
      xnasc: [0, 0, 0, 0, 0, 0], xndsc: [0, 0, 0, 0, 0, 0],
      xperi: [0, 0, 0, 0, 0, 0], xaphe: [0, 0, 0, 0, 0, 0],
    };
  }

  for (i = 0; i < 24; i++) xx[i] = 0;

  /***************************************
   * mean nodes and apsides
   ***************************************/
  if ((method === 0 || (method & SE_NODBIT_MEAN)) &&
      ((ipl >= SE_SUN && ipl <= SE_NEPTUNE) || ipl === SE_EARTH)) {
    if (ipl === SE_MOON) {
      const mle = swiMeanLunarElements(tjdEt);
      xna[0] = mle.node; xna[3] = mle.dnode;
      xpe[0] = mle.peri; xpe[3] = mle.dperi;
      incl = MOON_MEAN_INCL;
      vincl = 0;
      ecce = MOON_MEAN_ECC;
      vecce = 0;
      sema = MOON_MEAN_DIST / AUNIT;
      vsema = 0;
    } else {
      iplx = ipl_to_elem[ipl];
      ep = el_incl[iplx];
      incl = ep[0] + ep[1] * t + ep[2] * t * t + ep[3] * t * t * t;
      vincl = ep[1] / 36525;
      ep = el_sema[iplx];
      sema = ep[0] + ep[1] * t + ep[2] * t * t + ep[3] * t * t * t;
      vsema = ep[1] / 36525;
      ep = el_ecce[iplx];
      ecce = ep[0] + ep[1] * t + ep[2] * t * t + ep[3] * t * t * t;
      vecce = ep[1] / 36525;
      ep = el_node[iplx];
      /* ascending node */
      xna[0] = ep[0] + ep[1] * t + ep[2] * t * t + ep[3] * t * t * t;
      xna[3] = ep[1] / 36525;
      /* perihelion */
      ep = el_peri[iplx];
      xpe[0] = ep[0] + ep[1] * t + ep[2] * t * t + ep[3] * t * t * t;
      xpe[3] = ep[1] / 36525;
    }
    /* descending node */
    xnd[0] = sweDegnorm(xna[0] + 180);
    xnd[3] = xna[3];
    /* angular distance of perihelion from node */
    parg = xpe[0] = sweDegnorm(xpe[0] - xna[0]);
    pargx = xpe[3] = sweDegnorm(xpe[0] + xpe[3] - xna[3]);
    /* transform from orbital plane to mean ecliptic of date */
    {
      const cotBuf = [xpe[0], xpe[1], xpe[2]];
      sweCotrans(cotBuf, cotBuf, -incl);
      xpe[0] = cotBuf[0]; xpe[1] = cotBuf[1]; xpe[2] = cotBuf[2];
    }
    /* xpe+3 is aux. position, not speed!!! */
    {
      const cotBuf = [xpe[3], xpe[4], xpe[5]];
      sweCotrans(cotBuf, cotBuf, -incl - vincl);
      xpe[3] = cotBuf[0]; xpe[4] = cotBuf[1]; xpe[5] = cotBuf[2];
    }
    /* add node again */
    xpe[0] = sweDegnorm(xpe[0] + xna[0]);
    /* xpe+3 is aux. position, not speed!!! */
    xpe[3] = sweDegnorm(xpe[3] + xna[0] + xna[3]);
    /* speed */
    xpe[3] = sweDegnorm(xpe[3] - xpe[0]);
    /* heliocentric distance of perihelion and aphelion */
    xpe[2] = sema * (1 - ecce);
    xpe[5] = (sema + vsema) * (1 - ecce - vecce) - xpe[2];
    /* aphelion */
    xap[0] = sweDegnorm(xpe[0] + 180);
    xap[1] = -xpe[1];
    xap[3] = xpe[3];
    xap[4] = -xpe[4];
    if (doFocalPoint) {
      xap[2] = sema * ecce * 2;
      xap[5] = (sema + vsema) * (ecce + vecce) * 2 - xap[2];
    } else {
      xap[2] = sema * (1 + ecce);
      xap[5] = (sema + vsema) * (1 + ecce + vecce) - xap[2];
    }
    /* heliocentric distance of nodes */
    ea = Math.atan(Math.tan(-parg * DEGTORAD / 2) * Math.sqrt((1 - ecce) / (1 + ecce))) * 2;
    eax = Math.atan(Math.tan(-pargx * DEGTORAD / 2) * Math.sqrt((1 - ecce - vecce) / (1 + ecce + vecce))) * 2;
    xna[2] = sema * (Math.cos(ea) - ecce) / Math.cos(parg * DEGTORAD);
    xna[5] = (sema + vsema) * (Math.cos(eax) - ecce - vecce) / Math.cos(pargx * DEGTORAD);
    xna[5] -= xna[2];
    ea = Math.atan(Math.tan((180 - parg) * DEGTORAD / 2) * Math.sqrt((1 - ecce) / (1 + ecce))) * 2;
    eax = Math.atan(Math.tan((180 - pargx) * DEGTORAD / 2) * Math.sqrt((1 - ecce - vecce) / (1 + ecce + vecce))) * 2;
    xnd[2] = sema * (Math.cos(ea) - ecce) / Math.cos((180 - parg) * DEGTORAD);
    xnd[5] = (sema + vsema) * (Math.cos(eax) - ecce - vecce) / Math.cos((180 - pargx) * DEGTORAD);
    xnd[5] -= xnd[2];
    /* no light-time correction because speed is extremely small */
    for (i = 0; i < 4; i++) {
      const off = i * 6;
      xx[off + 0] *= DEGTORAD;
      xx[off + 1] *= DEGTORAD;
      xx[off + 3] *= DEGTORAD;
      xx[off + 4] *= DEGTORAD;
      /* swi_polcart_sp in-place */
      const tmpIn = [xx[off], xx[off + 1], xx[off + 2], xx[off + 3], xx[off + 4], xx[off + 5]];
      const tmpOut = [0, 0, 0, 0, 0, 0];
      swiPolcartSp(tmpIn, tmpOut);
      for (j = 0; j < 6; j++) xx[off + j] = tmpOut[j];
    }

  /***************************************
   * "true" or osculating nodes and apsides
   ***************************************/
  } else {
    /* first, we need a heliocentric distance of the planet */
    const calcRes0 = sweCalc(swed, tjdEt, ipli, iflg0);
    if (calcRes0.flags === ERR) {
      serr = calcRes0.serr;
      return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
    }
    for (i = 0; i < 6; i++) x[i] = calcRes0.xx[i];
    iflJ2000 = (iflag & SEFLG_EPHMASK) | SEFLG_J2000 | SEFLG_EQUATORIAL | SEFLG_XYZ | SEFLG_TRUEPOS | SEFLG_NONUT | SEFLG_SPEED;
    ellipseIsBary = false;
    if (ipli !== SE_MOON) {
      if ((method & SE_NODBIT_OSCU_BAR) && x[2] > 6) {
        iflJ2000 |= SEFLG_BARYCTR; /* only planets beyond Jupiter */
        ellipseIsBary = true;
      } else {
        iflJ2000 |= SEFLG_HELCTR;
      }
    }
    /* we need three positions and three speeds */
    if (ipli === SE_MOON) {
      dt = NODE_CALC_INTV;
      dzmin = 1e-15;
      Gmsm = GEOGCONST * (1 + 1 / EARTH_MOON_MRAT) / AUNIT / AUNIT / AUNIT * 86400.0 * 86400.0;
    } else {
      if ((ipli >= SE_MERCURY && ipli <= SE_PLUTO) || ipli === SE_EARTH)
        plm = 1 / plmass[ipl_to_elem[ipl]];
      else
        plm = 0;
      dt = NODE_CALC_INTV * 10 * x[2];
      dzmin = 1e-15 * dt / NODE_CALC_INTV;
      Gmsm = HELGRAVCONST * (1 + plm) / AUNIT / AUNIT / AUNIT * 86400.0 * 86400.0;
    }
    if (iflag & SEFLG_SPEED) {
      istart = 0; iend = 2;
    } else {
      istart = iend = 0; dt = 0;
    }
    for (i = istart, t = tjdEt - dt; i <= iend; i++, t += dt) {
      if (istart === iend) t = tjdEt;
      const cr = sweCalc(swed, t, ipli, iflJ2000);
      if (cr.flags === ERR) {
        serr = cr.serr;
        return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
      }
      for (j = 0; j < 6; j++) xpos[i][j] = cr.xx[j];
      /* the EMB is used instead of the earth */
      if (ipli === SE_EARTH) {
        const crm = sweCalc(swed, t, SE_MOON, iflJ2000 & ~(SEFLG_BARYCTR | SEFLG_HELCTR));
        if (crm.flags === ERR) {
          serr = crm.serr;
          return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
        }
        for (j = 0; j < 6; j++) xposm[j] = crm.xx[j];
        for (j = 0; j <= 5; j++)
          xpos[i][j] += xposm[j] / (EARTH_MOON_MRAT + 1.0);
      }
      swiPlanForOscElemNodAps(iflg0, t, xpos[i], swed);
    }
    for (i = istart; i <= iend; i++) {
      if (Math.abs(xpos[i][5]) < dzmin)
        xpos[i][5] = dzmin;
      fac = xpos[i][2] / xpos[i][5];
      sgn = xpos[i][5] / Math.abs(xpos[i][5]);
      for (j = 0; j <= 2; j++) {
        xn[i][j] = (xpos[i][j] - fac * xpos[i][j + 3]) * sgn;
        xs[i][j] = -xn[i][j];
      }
    }
    for (i = istart; i <= iend; i++) {
      /* node */
      rxy = Math.sqrt(xn[i][0] * xn[i][0] + xn[i][1] * xn[i][1]);
      cosnode = xn[i][0] / rxy;
      sinnode = xn[i][1] / rxy;
      /* inclination */
      swiCrossProd(xpos[i], xpos[i].subarray(3), xnorm);
      rxy = xnorm[0] * xnorm[0] + xnorm[1] * xnorm[1];
      c2 = rxy + xnorm[2] * xnorm[2];
      rxyz = Math.sqrt(c2);
      rxy = Math.sqrt(rxy);
      sinincl = rxy / rxyz;
      cosincl = Math.sqrt(1 - sinincl * sinincl);
      if (xnorm[2] < 0) cosincl = -cosincl; /* retrograde asteroid */
      /* argument of latitude */
      cosu = xpos[i][0] * cosnode + xpos[i][1] * sinnode;
      sinu = xpos[i][2] / sinincl;
      uu = Math.atan2(sinu, cosu);
      /* semi-axis */
      rxyz = Math.sqrt(squareSum(xpos[i]));
      v2 = squareSum(xpos[i], 3);
      sema = 1 / (2 / rxyz - v2 / Gmsm);
      /* eccentricity */
      pp = c2 / Gmsm;
      ecce = Math.sqrt(1 - pp / sema);
      /* eccentric anomaly */
      cosE = 1 / ecce * (1 - rxyz / sema);
      sinE = 1 / ecce / Math.sqrt(sema * Gmsm) * dotProd(xpos[i], xpos[i].subarray(3));
      /* true anomaly */
      ny = 2 * Math.atan(Math.sqrt((1 + ecce) / (1 - ecce)) * sinE / (1 + cosE));
      /* distance of perihelion from ascending node */
      xq[i][0] = swiMod2PI(uu - ny);
      xq[i][1] = 0;                       /* latitude */
      xq[i][2] = sema * (1 - ecce);       /* distance of perihelion */
      /* transformation to ecliptic coordinates */
      swiPolcart(xq[i], xq[i]);
      swiCoortrf2(xq[i], xq[i], -sinincl, cosincl);
      swiCartpol(xq[i], xq[i]);
      /* adding node, we get perihelion in ecl. coord. */
      xq[i][0] += Math.atan2(sinnode, cosnode);
      xa[i][0] = swiMod2PI(xq[i][0] + PI);
      xa[i][1] = -xq[i][1];
      if (doFocalPoint) {
        xa[i][2] = sema * ecce * 2;       /* distance of aphelion */
      } else {
        xa[i][2] = sema * (1 + ecce);     /* distance of aphelion */
      }
      swiPolcart(xq[i], xq[i]);
      swiPolcart(xa[i], xa[i]);
      /* new distance of node from orbital ellipse */
      ny = swiMod2PI(ny - uu);
      ny2 = swiMod2PI(ny + PI);
      /* eccentric anomaly */
      cosE = Math.cos(2 * Math.atan(Math.tan(ny / 2) / Math.sqrt((1 + ecce) / (1 - ecce))));
      cosE2 = Math.cos(2 * Math.atan(Math.tan(ny2 / 2) / Math.sqrt((1 + ecce) / (1 - ecce))));
      /* new distance */
      rn = sema * (1 - ecce * cosE);
      rn2 = sema * (1 - ecce * cosE2);
      /* old node distance */
      ro = Math.sqrt(squareSum(xn[i]));
      ro2 = Math.sqrt(squareSum(xs[i]));
      /* correct length of position vector */
      for (j = 0; j <= 2; j++) {
        xn[i][j] *= rn / ro;
        xs[i][j] *= rn2 / ro2;
      }
    }
    for (i = 0; i <= 2; i++) {
      if (iflag & SEFLG_SPEED) {
        xpe[i] = xq[1][i];
        xpe[i + 3] = (xq[2][i] - xq[0][i]) / dt / 2;
        xap[i] = xa[1][i];
        xap[i + 3] = (xa[2][i] - xa[0][i]) / dt / 2;
        xna[i] = xn[1][i];
        xna[i + 3] = (xn[2][i] - xn[0][i]) / dt / 2;
        xnd[i] = xs[1][i];
        xnd[i + 3] = (xs[2][i] - xs[0][i]) / dt / 2;
      } else {
        xpe[i] = xq[0][i];
        xpe[i + 3] = 0;
        xap[i] = xa[0][i];
        xap[i + 3] = 0;
        xna[i] = xn[0][i];
        xna[i + 3] = 0;
        xnd[i] = xs[0][i];
        xnd[i + 3] = 0;
      }
    }
    isTrueNodaps = true;
  }

  /* to set the variables required in the save area,
   * i.e. ecliptic, nutation, barycentric sun, earth
   * we compute the planet */
  if (ipli === SE_MOON && (iflag & (SEFLG_HELCTR | SEFLG_BARYCTR))) {
    swiForceAppPosEtc(swed);
    const cr2 = sweCalc(swed, tjdEt, SE_SUN, iflg0);
    if (cr2.flags === ERR) {
      serr = cr2.serr;
      return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
    }
  } else {
    const cr2 = sweCalc(swed, tjdEt, ipli, iflg0 | (iflag & SEFLG_TOPOCTR));
    if (cr2.flags === ERR) {
      serr = cr2.serr;
      return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
    }
  }

  /***********************
   * position of observer
   ***********************/
  if (iflag & SEFLG_TOPOCTR) {
    swiGetObserver(tjdEt, iflag, false, xobs, swed);
  } else {
    for (i = 0; i <= 5; i++) xobs[i] = 0;
  }
  if (iflag & (SEFLG_HELCTR | SEFLG_BARYCTR)) {
    if ((iflag & SEFLG_HELCTR) && !(iflag & SEFLG_MOSEPH))
      for (i = 0; i <= 5; i++) xobs[i] = xsun[i];
  } else if (ipl === SE_SUN && !(iflag & SEFLG_MOSEPH)) {
    for (i = 0; i <= 5; i++) xobs[i] = xsun[i];
  } else {
    /* barycentric position of observer */
    for (i = 0; i <= 5; i++) xobs[i] += xear[i];
  }

  /* ecliptic obliquity */
  if (iflag & SEFLG_J2000)
    oe = swed.oec2000;
  else
    oe = swed.oec;

  /*************************************************
   * conversions shared by mean and osculating points
   *************************************************/
  for (ij = 0; ij < 4; ij++) {
    const off = ij * 6;
    /* no nodes for earth */
    if (ipli === SE_EARTH && ij <= 1) {
      for (i = 0; i <= 5; i++) xx[off + i] = 0;
      continue;
    }
    /*********************
     * to equator
     *********************/
    if (isTrueNodaps && !(iflag & SEFLG_NONUT)) {
      swiCoortrf2(xx, xx, -swed.nut.snut, swed.nut.cnut, off, off);
      if (iflag & SEFLG_SPEED)
        swiCoortrf2(xx, xx, -swed.nut.snut, swed.nut.cnut, off + 3, off + 3);
    }
    swiCoortrf2(xx, xx, -oe.seps, oe.ceps, off, off);
    swiCoortrf2(xx, xx, -oe.seps, oe.ceps, off + 3, off + 3);
    if (isTrueNodaps) {
      /****************************
       * to mean ecliptic of date
       ****************************/
      if (!(iflag & SEFLG_NONUT)) {
        /* swiNutate operates on first 6 elements, so we use a temp buffer */
        const tmp = new Float64Array(6);
        for (i = 0; i < 6; i++) tmp[i] = xx[off + i];
        swiNutate(tmp, iflag, true, swed);
        for (i = 0; i < 6; i++) xx[off + i] = tmp[i];
      }
    }
    /*********************
     * to J2000
     *********************/
    {
      const tmp = new Float64Array(6);
      for (i = 0; i < 6; i++) tmp[i] = xx[off + i];
      swiPrecess(tmp, tjdEt, iflag, J_TO_J2000, swed);
      if (iflag & SEFLG_SPEED)
        swiPrecessSpeed(tmp, tjdEt, iflag, J_TO_J2000, swed);
      for (i = 0; i < 6; i++) xx[off + i] = tmp[i];
    }
    /*********************
     * to barycenter
     *********************/
    if (ipli === SE_MOON) {
      for (i = 0; i <= 5; i++) xx[off + i] += xear[i];
    } else {
      if (!(iflag & SEFLG_MOSEPH) && !ellipseIsBary)
        for (j = 0; j <= 5; j++) xx[off + j] += xsun[j];
    }
    /*********************
     * to correct center
     *********************/
    for (j = 0; j <= 5; j++) xx[off + j] -= xobs[j];
    /* geocentric perigee/apogee of sun */
    if (ipl === SE_SUN && !(iflag & (SEFLG_HELCTR | SEFLG_BARYCTR)))
      for (j = 0; j <= 5; j++) xx[off + j] = -xx[off + j];
    /*********************
     * light deflection
     *********************/
    dt = Math.sqrt(squareSum(xx, off)) * AUNIT / CLIGHT / 86400.0;
    if (doDefl) {
      const tmp = new Float64Array(6);
      for (i = 0; i < 6; i++) tmp[i] = xx[off + i];
      swiDeflectLight(tmp, dt, iflag, swed);
      for (i = 0; i < 6; i++) xx[off + i] = tmp[i];
    }
    /*********************
     * aberration
     *********************/
    if (doAberr) {
      const tmp = new Float64Array(6);
      for (i = 0; i < 6; i++) tmp[i] = xx[off + i];
      swiAberrLight(tmp, xobs, iflag);
      for (i = 0; i < 6; i++) xx[off + i] = tmp[i];
      /*
       * Apparent speed is also influenced by
       * the difference of speed of the earth between t and t-dt.
       */
      if (iflag & SEFLG_SPEED) {
        /* get barycentric sun and earth for t-dt into save area */
        const cr3 = sweCalc(swed, tjdEt - dt, ipli, iflg0 | (iflag & SEFLG_TOPOCTR));
        if (cr3.flags === ERR) {
          serr = cr3.serr;
          return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
        }
        if (iflag & SEFLG_TOPOCTR) {
          for (i = 0; i <= 5; i++) xobs2[i] = swed.topd.xobs[i];
        } else {
          for (i = 0; i <= 5; i++) xobs2[i] = 0;
        }
        if (iflag & (SEFLG_HELCTR | SEFLG_BARYCTR)) {
          if ((iflag & SEFLG_HELCTR) && !(iflag & SEFLG_MOSEPH))
            for (i = 0; i <= 5; i++) xobs2[i] = xsun[i];
        } else if (ipl === SE_SUN && !(iflag & SEFLG_MOSEPH)) {
          for (i = 0; i <= 5; i++) xobs2[i] = xsun[i];
        } else {
          /* barycentric position of observer */
          for (i = 0; i <= 5; i++) xobs2[i] += xear[i];
        }
        for (i = 3; i <= 5; i++)
          xx[off + i] += xobs[i] - xobs2[i];
        /* restore save area */
        const cr4 = sweCalc(swed, tjdEt, SE_SUN, iflg0 | (iflag & SEFLG_TOPOCTR));
        if (cr4.flags === ERR) {
          serr = cr4.serr;
          return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
        }
      }
    }
    /*********************
     * precession
     *********************/
    /* save J2000 coordinates; required for sidereal positions */
    for (j = 0; j <= 5; j++) x2000[j] = xx[off + j];
    if (!(iflag & SEFLG_J2000)) {
      const tmp = new Float64Array(6);
      for (i = 0; i < 6; i++) tmp[i] = xx[off + i];
      swiPrecess(tmp, tjdEt, iflag, J2000_TO_J, swed);
      if (iflag & SEFLG_SPEED)
        swiPrecessSpeed(tmp, tjdEt, iflag, J2000_TO_J, swed);
      for (i = 0; i < 6; i++) xx[off + i] = tmp[i];
    }
    /*********************
     * nutation
     *********************/
    if (!(iflag & SEFLG_NONUT)) {
      const tmp = new Float64Array(6);
      for (i = 0; i < 6; i++) tmp[i] = xx[off + i];
      swiNutate(tmp, iflag, false, swed);
      for (i = 0; i < 6; i++) xx[off + i] = tmp[i];
    }
    /* now we have equatorial cartesian coordinates; keep them */
    for (j = 0; j <= 5; j++) pldat_xreturn[18 + j] = xx[off + j];
    /************************************************
     * transformation to ecliptic.
     ************************************************/
    swiCoortrf2(xx, xx, oe.seps, oe.ceps, off, off);
    if (iflag & SEFLG_SPEED)
      swiCoortrf2(xx, xx, oe.seps, oe.ceps, off + 3, off + 3);
    if (!(iflag & SEFLG_NONUT)) {
      swiCoortrf2(xx, xx, swed.nut.snut, swed.nut.cnut, off, off);
      if (iflag & SEFLG_SPEED)
        swiCoortrf2(xx, xx, swed.nut.snut, swed.nut.cnut, off + 3, off + 3);
    }
    /* now we have ecliptic cartesian coordinates */
    for (j = 0; j <= 5; j++) pldat_xreturn[6 + j] = xx[off + j];
    /************************************
     * sidereal positions
     ************************************/
    if (iflag & SEFLG_SIDEREAL) {
      /* project onto ecliptic t0 */
      if (swed.sidd.sidMode & SE_SIDBIT_ECL_T0) {
        swiTropRa2SidLon(x2000, pldat_xreturn.subarray(6, 12), pldat_xreturn.subarray(18, 24), iflag, swed);
      /* project onto solar system equator */
      } else if (swed.sidd.sidMode & SE_SIDBIT_SSY_PLANE) {
        swiTropRa2SidLonSosy(x2000, pldat_xreturn.subarray(6, 12), iflag, swed);
      } else {
        /* traditional algorithm */
        swiCartpolSp(pldat_xreturn.subarray(6, 12), pldat_xreturn);
        const ayaRes = sweGetAyanamsaEx(swed, tjdEt, iflag);
        if (ayaRes.retc === ERR) {
          serr = ayaRes.serr;
          return { retval: ERR, xnasc: [0,0,0,0,0,0], xndsc: [0,0,0,0,0,0], xperi: [0,0,0,0,0,0], xaphe: [0,0,0,0,0,0], serr };
        }
        pldat_xreturn[0] -= ayaRes.daya * DEGTORAD;
        swiPolcartSp(pldat_xreturn, pldat_xreturn.subarray(6, 12));
      }
    }
    if ((iflag & SEFLG_XYZ) && (iflag & SEFLG_EQUATORIAL)) {
      for (j = 0; j <= 5; j++) xx[off + j] = pldat_xreturn[18 + j];
      continue;
    }
    if (iflag & SEFLG_XYZ) {
      for (j = 0; j <= 5; j++) xx[off + j] = pldat_xreturn[6 + j];
      continue;
    }
    /************************************************
     * transformation to polar coordinates
     ************************************************/
    swiCartpolSp(pldat_xreturn.subarray(18, 24), pldat_xreturn.subarray(12, 18));
    swiCartpolSp(pldat_xreturn.subarray(6, 12), pldat_xreturn);
    /**********************
     * radians to degrees
     **********************/
    if (!(iflag & SEFLG_RADIANS)) {
      for (j = 0; j < 2; j++) {
        pldat_xreturn[j] *= RADTODEG;         /* ecliptic */
        pldat_xreturn[j + 3] *= RADTODEG;
        pldat_xreturn[j + 12] *= RADTODEG;    /* equator */
        pldat_xreturn[j + 15] *= RADTODEG;
      }
    }
    if (iflag & SEFLG_EQUATORIAL) {
      for (j = 0; j <= 5; j++) xx[off + j] = pldat_xreturn[12 + j];
      continue;
    } else {
      for (j = 0; j <= 5; j++) xx[off + j] = pldat_xreturn[j];
      continue;
    }
  }

  /* copy to output */
  const xnasc = new Array<number>(6);
  const xndsc = new Array<number>(6);
  const xperi = new Array<number>(6);
  const xaphe = new Array<number>(6);
  for (i = 0; i <= 5; i++) {
    if (i > 2 && !(iflag & SEFLG_SPEED)) {
      xna[i] = xnd[i] = xpe[i] = xap[i] = 0;
    }
    xnasc[i] = xna[i];
    xndsc[i] = xnd[i];
    xperi[i] = xpe[i];
    xaphe[i] = xap[i];
  }
  return { retval: OK, xnasc, xndsc, xperi, xaphe, serr };
}

/**
 * Compute planetary nodes and apsides (UT version).
 * C: swe_nod_aps_ut (swecl.c:5645-5654)
 */
export function sweNodApsUt(
  swed: SweData,
  tjdUt: number,
  ipl: number,
  iflag: number,
  method: number,
): NodApsResult {
  const dt = sweDeltatEx(tjdUt, iflag, swed);
  return sweNodAps(swed, tjdUt + dt, ipl, iflag, method);
}

/* ==================================================================
 * Orbital elements & max/min distance
 * C: swe_get_orbital_elements, swe_orbit_max_min_true_distance
 * ================================================================== */

export interface OrbitalElementsResult {
  retval: number;
  dret: number[];
  serr: string;
}

export interface OrbitDistanceResult {
  retval: number;
  dmax: number;
  dmin: number;
  dtrue: number;
  serr: string;
}

/**
 * Compute gravitational constant GM for orbital elements.
 * C: get_gmsm (swecl.c:5676-5731)
 */
function getGmsm(swed: SweData, tjdEt: number, ipl: number, iflag: number, r: number): { retval: number; gmsm: number; serr: string } {
  let Gmsm = 0;
  let plm = 0;
  let serr = '';
  let iflJ2000p = (iflag & (SEFLG_EPHMASK | SEFLG_HELCTR | SEFLG_BARYCTR)) | SEFLG_J2000 | SEFLG_TRUEPOS | SEFLG_NONUT;
  if (!(iflJ2000p & (SEFLG_HELCTR | SEFLG_BARYCTR))) {
    iflJ2000p |= SEFLG_HELCTR;
  }
  if (ipl === SE_MOON) {
    Gmsm = GEOGCONST * (1 + 1 / EARTH_MOON_MRAT) / AUNIT / AUNIT / AUNIT * 86400.0 * 86400.0;
  } else {
    if ((ipl >= SE_MERCURY && ipl <= SE_PLUTO) || ipl === SE_EARTH) {
      plm = 0;
      if (iflag & SEFLG_ORBEL_AA) {
        if (ipl === SE_EARTH) {
          plm = 1.0 / plmass[ipl_to_elem[ipl]];
          plm += 1.0 / plmass[ipl_to_elem[SE_VENUS]];
          plm += 1.0 / plmass[ipl_to_elem[SE_MERCURY]];
        } else {
          for (let j = ipl; j >= SE_MERCURY; j--) {
            plm += 1.0 / plmass[ipl_to_elem[j]];
          }
          if (ipl >= SE_MARS)
            plm += 1.0 / plmass[ipl_to_elem[SE_EARTH]];
        }
      } else {
        plm = 1.0 / plmass[ipl_to_elem[ipl]];
      }
      Gmsm = HELGRAVCONST * (1 + plm) / AUNIT / AUNIT / AUNIT * 86400.0 * 86400.0;
    } else {
      // asteroid or fictitious object
      plm = 0;
      if (iflag & SEFLG_ORBEL_AA) {
        for (let j = SE_MERCURY; j <= SE_PLUTO; j++) {
          const res = sweCalc(swed, tjdEt, j, iflJ2000p);
          if (res.flags < 0) return { retval: ERR, gmsm: 0, serr: res.serr };
          serr = res.serr;
          if (r > res.xx[2])
            plm += 1.0 / plmass[ipl_to_elem[j]];
        }
        const resE = sweCalc(swed, tjdEt, SE_EARTH, iflJ2000p);
        if (resE.flags < 0) return { retval: ERR, gmsm: 0, serr: resE.serr };
        serr = resE.serr;
        if (r > resE.xx[2])
          plm += 1.0 / plmass[ipl_to_elem[SE_EARTH]];
      }
      Gmsm = HELGRAVCONST * (1 + plm) / AUNIT / AUNIT / AUNIT * 86400.0 * 86400.0;
    }
  }
  return { retval: OK, gmsm: Gmsm, serr };
}


/**
 * Compute osculating orbital elements (Kepler elements) of a planet or asteroid.
 * C: swe_get_orbital_elements (swecl.c:5772-5960)
 */
export function sweGetOrbitalElements(
  swed: SweData, tjdEt: number, ipl: number, iflag: number,
): OrbitalElementsResult {
  const dret = new Array(50).fill(0);
  let serr = '';
  if (ipl <= 0 || ipl === SE_MEAN_NODE || ipl === SE_TRUE_NODE ||
      ipl === SE_MEAN_APOG || ipl === SE_OSCU_APOG ||
      ipl === SE_INTP_APOG || ipl === SE_INTP_PERG) {
    return { retval: ERR, dret, serr: `error in swe_get_orbital_elements(): object ${ipl} not valid\n` };
  }
  const iflJ2000 = (iflag & SEFLG_EPHMASK) | SEFLG_J2000 | SEFLG_XYZ | SEFLG_TRUEPOS | SEFLG_NONUT | SEFLG_SPEED;
  const iflJ2000p = (iflag & SEFLG_EPHMASK) | SEFLG_J2000 | SEFLG_TRUEPOS | SEFLG_NONUT | SEFLG_SPEED;
  /* heliocentric distance */
  let res = sweCalc(swed, tjdEt, ipl, iflJ2000p);
  if (res.flags < 0) return { retval: ERR, dret, serr: res.serr };
  serr = res.serr;
  const r = res.xx[2];
  let iflJ2000c = iflJ2000;
  if (ipl !== SE_MOON) {
    if ((iflag & SEFLG_BARYCTR) && r > 6) {
      iflJ2000c |= SEFLG_BARYCTR;
    } else {
      iflJ2000c |= SEFLG_HELCTR;
    }
  }
  /* GM */
  const gmRes = getGmsm(swed, tjdEt, ipl, iflag, r);
  if (gmRes.retval === ERR) return { retval: ERR, dret, serr: gmRes.serr };
  const Gmsm = gmRes.gmsm;
  if (gmRes.serr) serr = gmRes.serr;
  /* J2000 ecliptic XYZ + speed */
  res = sweCalc(swed, tjdEt, ipl, iflJ2000c);
  if (res.flags < 0) return { retval: ERR, dret, serr: res.serr };
  if (res.serr) serr = res.serr;
  const xpos = [res.xx[0], res.xx[1], res.xx[2], res.xx[3], res.xx[4], res.xx[5]];
  /* EMB for Earth */
  if (ipl === SE_EARTH) {
    const moonRes = sweCalc(swed, tjdEt, SE_MOON, iflJ2000c & ~(SEFLG_BARYCTR | SEFLG_HELCTR));
    if (moonRes.flags < 0) return { retval: ERR, dret, serr: moonRes.serr };
    for (let j = 0; j <= 5; j++)
      xpos[j] += moonRes.xx[j] / (EARTH_MOON_MRAT + 1.0);
  }
  const fac = xpos[2] / xpos[5];
  const sgn = xpos[5] / Math.abs(xpos[5]);
  const xn = [0, 0, 0];
  const xs = [0, 0, 0];
  for (let j = 0; j <= 2; j++) {
    xn[j] = (xpos[j] - fac * xpos[j + 3]) * sgn;
    xs[j] = -xn[j];
  }
  /* node */
  let rxy = Math.sqrt(xn[0] * xn[0] + xn[1] * xn[1]);
  const cosnode = xn[0] / rxy;
  const sinnode = xn[1] / rxy;
  /* inclination */
  const xnorm = new Float64Array(3);
  swiCrossProd(xpos, [xpos[3], xpos[4], xpos[5]], xnorm);
  rxy = xnorm[0] * xnorm[0] + xnorm[1] * xnorm[1];
  const c2 = rxy + xnorm[2] * xnorm[2];
  let rxyz = Math.sqrt(c2);
  rxy = Math.sqrt(rxy);
  const sinincl = rxy / rxyz;
  let cosincl = Math.sqrt(1 - sinincl * sinincl);
  if (xnorm[2] < 0) cosincl = -cosincl; /* retrograde */
  const incl = Math.acos(cosincl) * RADTODEG;
  /* argument of latitude */
  const cosu = xpos[0] * cosnode + xpos[1] * sinnode;
  const sinu = xpos[2] / sinincl;
  const uu = Math.atan2(sinu, cosu);
  /* semi-axis */
  rxyz = Math.sqrt(squareSum(xpos));
  const v2 = xpos[3] * xpos[3] + xpos[4] * xpos[4] + xpos[5] * xpos[5];
  const sema = 1.0 / (2.0 / rxyz - v2 / Gmsm);
  /* eccentricity */
  const pp = c2 / Gmsm;
  let ecceRatio = pp / sema;
  if (ecceRatio > 1) ecceRatio = 1;
  const ecce = Math.sqrt(1 - ecceRatio);
  /* eccentric anomaly */
  let ecce2 = ecce;
  if (ecce2 === 0) ecce2 = 0.0000000001;
  const cosE = (1 / ecce2) * (1 - rxyz / sema);
  const sinE = (1 / ecce2 / Math.sqrt(sema * Gmsm)) * dotProd(xpos, [xpos[3], xpos[4], xpos[5]]);
  const eanom = sweDegnorm(Math.atan2(sinE, cosE) * RADTODEG);
  /* true anomaly */
  let ny = 2 * Math.atan(Math.sqrt((1 + ecce) / (1 - ecce)) * sinE / (1 + cosE));
  let tanom = sweDegnorm(ny * RADTODEG);
  if (eanom > 180 && tanom < 180) tanom += 180;
  if (eanom < 180 && tanom > 180) tanom -= 180;
  /* mean anomaly */
  const manom = sweDegnorm(eanom - ecce * RADTODEG * Math.sin(eanom * DEGTORAD));
  /* distance of perihelion from ascending node */
  const xq = [0, 0, 0];
  xq[0] = swiMod2PI(uu - ny);
  const parg = xq[0] * RADTODEG;
  xq[1] = 0;
  xq[2] = sema * (1 - ecce);
  /* transformation to ecliptic coordinates */
  swiPolcart(xq, xq);
  swiCoortrf2(xq, xq, -sinincl, cosincl);
  swiCartpol(xq, xq);
  /* adding node → perihelion in ecl. coord. */
  xq[0] += Math.atan2(sinnode, cosnode);
  const xa = [0, 0, 0];
  xa[0] = swiMod2PI(xq[0] + PI);
  xa[1] = -xq[1];
  xa[2] = sema * (1 + ecce);
  swiPolcart(xq, xq);
  swiPolcart(xa, xa);
  /* new distance of node from orbital ellipse */
  ny = swiMod2PI(ny - uu);
  const ny2 = swiMod2PI(ny + PI);
  const cosE_n = Math.cos(2 * Math.atan(Math.tan(ny / 2) / Math.sqrt((1 + ecce) / (1 - ecce))));
  const cosE2 = Math.cos(2 * Math.atan(Math.tan(ny2 / 2) / Math.sqrt((1 + ecce) / (1 - ecce))));
  const rn = sema * (1 - ecce * cosE_n);
  const rn2 = sema * (1 - ecce * cosE2);
  const ro = Math.sqrt(squareSum(xn));
  const ro2 = Math.sqrt(squareSum(xs));
  for (let j = 0; j <= 2; j++) {
    xn[j] *= rn / ro;
    xs[j] *= rn2 / ro2;
  }
  swiCartpol(xn, xn);
  swiCartpol(xq, xq);
  const node = xn[0] * RADTODEG;
  const peri = sweDegnorm(node + parg);
  const mlon = sweDegnorm(manom + peri);
  let csid = sema * Math.sqrt(sema); // sidereal period in sidereal years
  if (ipl === SE_MOON) {
    const semam = sema * AUNIT / 383397772.5;
    csid = semam * Math.sqrt(semam);
    csid *= 27.32166 / 365.25636300;
  }
  const dmot = 0.9856076686 / csid; // daily motion
  csid *= 365.25636 / 365.242189; // sidereal period in tropical years J2000
  // daily motion due to precession (Simon et al. 1994)
  const T = (tjdEt - J2000) / 365250.0;
  const T2 = T * T; const T3 = T2 * T; const T4 = T3 * T; const T5 = T4 * T;
  const pa = (50288.200 + 222.4045 * T + 0.2095 * T2 - 0.9408 * T3 - 0.0090 * T4 + 0.0010 * T5) / 3600.0 / 365250.0;
  const ysid = 360.0 / ((1295977422.83429 - 2 * 2.0441 * T - 3 * 0.00523 * T * T) / 3600.0 / 365250.0);
  const ytrop = 360.0 / ((1296027711.03429 + 2 * 109.15809 * T + 3 * 0.07207 * T2 - 4 * 0.23530 * T3 - 5 * 0.00180 * T4 + 6 * 0.00020 * T5) / 3600.0 / 365250.0);
  let ctro = 360.0 / (dmot + pa) / 365.242189;
  ctro *= ysid / ytrop;
  let csyn: number;
  if (ipl === SE_EARTH) csyn = 0;
  else csyn = 360.0 / (0.9856076686 - dmot);
  dret[0] = sema;
  dret[1] = ecce;
  dret[2] = incl;
  dret[3] = node;
  dret[4] = parg;
  dret[5] = peri;
  dret[6] = manom;
  dret[7] = tanom;
  dret[8] = eanom;
  dret[9] = mlon;
  dret[10] = csid;
  dret[11] = dmot;
  dret[12] = ctro;
  dret[13] = csyn;
  dret[14] = tjdEt - dret[6] / dmot;
  dret[15] = sema * (1 - ecce);
  dret[16] = sema * (1 + ecce);
  return { retval: OK, dret, serr };
}

/**
 * PQR transformation matrix + orbit constants from 5 Kepler elements.
 * C: osc_get_orbit_constants (swecl.c:5962-5988)
 */
function oscGetOrbitConstants(dp: number[], pqr: number[]): void {
  const sema = dp[0];
  const ecce = dp[1];
  const incl = dp[2];
  const node = dp[3];
  const parg = dp[4];
  const cosnode = Math.cos(node * DEGTORAD);
  const sinnode = Math.sin(node * DEGTORAD);
  const cosincl = Math.cos(incl * DEGTORAD);
  const sinincl = Math.sin(incl * DEGTORAD);
  const cosparg = Math.cos(parg * DEGTORAD);
  const sinparg = Math.sin(parg * DEGTORAD);
  const fac = Math.sqrt((1 - ecce) * (1 + ecce));
  pqr[0] = cosparg * cosnode - sinparg * cosincl * sinnode;
  pqr[1] = -sinparg * cosnode - cosparg * cosincl * sinnode;
  pqr[2] = sinincl * sinnode;
  pqr[3] = cosparg * sinnode + sinparg * cosincl * cosnode;
  pqr[4] = -sinparg * sinnode + cosparg * cosincl * cosnode;
  pqr[5] = -sinincl * cosnode;
  pqr[6] = sinparg * sinincl;
  pqr[7] = cosparg * sinincl;
  pqr[8] = cosincl;
  pqr[9] = sema;
  pqr[10] = ecce;
  pqr[11] = fac;
}

/**
 * Eccentric anomaly → ecliptic cartesian XYZ.
 * C: osc_get_ecl_pos (swecl.c:5990-6004)
 */
function oscGetEclPos(ean: number, pqr: number[], xp: number[]): void {
  const cose = Math.cos(ean * DEGTORAD);
  const sine = Math.sin(ean * DEGTORAD);
  const sema = pqr[9];
  const ecce = pqr[10];
  const fac = pqr[11];
  const x0 = sema * (cose - ecce);
  const x1 = sema * fac * sine;
  xp[0] = pqr[0] * x0 + pqr[1] * x1;
  xp[1] = pqr[3] * x0 + pqr[4] * x1;
  xp[2] = pqr[6] * x0 + pqr[7] * x1;
}

/**
 * Euclidean 3D distance between two vectors.
 * C: get_dist_from_2_vectors (swecl.c:6006-6013)
 */
function getDistFrom2Vectors(x1: number[], x2: number[]): number {
  const r0 = x1[0] - x2[0];
  const r1 = x1[1] - x2[1];
  const r2 = x1[2] - x2[2];
  return Math.sqrt(r0 * r0 + r1 * r1 + r2 * r2);
}

/**
 * Hill-climbing search for maximum distance on one ellipse relative to a fixed point.
 * C: osc_iterate_max_dist (swecl.c:6015-6049)
 */
function oscIterateMaxDist(pqr: number[], xa: number[], xb: number[], highPrec: boolean): { deanopt: number; drmax: number } {
  let ean = 0;
  let eansv = 0;
  const dstepMin = highPrec ? 0.000001 : 1;
  oscGetEclPos(ean, pqr, xa);
  let r = getDistFrom2Vectors(xb, xa);
  let rmax = r;
  let dstep = 1;
  while (dstep >= dstepMin) {
    for (let i = 0; i < 2; i++) {
      while (r >= rmax) {
        eansv = ean;
        ean += (i === 0) ? dstep : -dstep;
        oscGetEclPos(ean, pqr, xa);
        r = getDistFrom2Vectors(xb, xa);
        if (r > rmax) rmax = r;
      }
      ean = eansv;
      r = rmax;
    }
    ean = eansv;
    r = rmax;
    dstep /= 10;
  }
  return { deanopt: eansv, drmax: rmax };
}

/**
 * Hill-climbing search for minimum distance on one ellipse relative to a fixed point.
 * C: osc_iterate_min_dist (swecl.c:6051-6085)
 */
function oscIterateMinDist(pqr: number[], xa: number[], xb: number[], highPrec: boolean): { deanopt: number; drmin: number } {
  let ean = 0;
  let eansv = 0;
  const dstepMin = highPrec ? 0.000001 : 1;
  oscGetEclPos(ean, pqr, xa);
  let r = getDistFrom2Vectors(xb, xa);
  let rmin = r;
  let dstep = 1;
  while (dstep >= dstepMin) {
    for (let i = 0; i < 2; i++) {
      while (r <= rmin) {
        eansv = ean;
        ean += (i === 0) ? dstep : -dstep;
        oscGetEclPos(ean, pqr, xa);
        r = getDistFrom2Vectors(xb, xa);
        if (r < rmin) rmin = r;
      }
      ean = eansv;
      r = rmin;
    }
    ean = eansv;
    r = rmin;
    dstep /= 10;
  }
  return { deanopt: eansv, drmin: rmin };
}

/**
 * Max/min/true heliocentric distance from Kepler elements.
 * C: orbit_max_min_true_distance_helio (swecl.c:6090-6117)
 */
function orbitMaxMinTrueDistanceHelio(
  swed: SweData, tjdEt: number, ipl: number, iflag: number,
): OrbitDistanceResult {
  let ipli = ipl;
  const iflagi = iflag & (SEFLG_EPHMASK | SEFLG_HELCTR | SEFLG_BARYCTR);
  if (ipl === SE_SUN) ipli = SE_EARTH;
  const elemRes = sweGetOrbitalElements(swed, tjdEt, ipli, iflagi);
  if (elemRes.retval === ERR) return { retval: ERR, dmax: 0, dmin: 0, dtrue: 0, serr: elemRes.serr };
  const de = elemRes.dret;
  const dmax = de[16];
  const dmin = de[15];
  const pqri = new Array(20).fill(0);
  oscGetOrbitConstants(de, pqri);
  const xinner = [0, 0, 0];
  oscGetEclPos(de[8], pqri, xinner);
  const dtrue = Math.sqrt(xinner[0] * xinner[0] + xinner[1] * xinner[1] + xinner[2] * xinner[2]);
  return { retval: elemRes.retval, dmax, dmin, dtrue, serr: elemRes.serr };
}

/**
 * Compute maximum possible distance, minimum possible distance, and current true distance
 * of a planet geocentrically (or heliocentrically).
 * C: swe_orbit_max_min_true_distance (swecl.c:6159-6276)
 */
export function sweOrbitMaxMinTrueDistance(
  swed: SweData, tjdEt: number, ipl: number, iflag: number,
): OrbitDistanceResult {
  const iflagi = iflag & (SEFLG_EPHMASK | SEFLG_HELCTR | SEFLG_BARYCTR);
  /* Sun, Moon, or heliocentric: delegate */
  if (ipl === SE_SUN || ipl === SE_MOON || (iflagi & (SEFLG_HELCTR | SEFLG_BARYCTR))) {
    return orbitMaxMinTrueDistanceHelio(swed, tjdEt, ipl, iflagi);
  }
  /* planet orbital elements */
  const dpRes = sweGetOrbitalElements(swed, tjdEt, ipl, iflagi);
  if (dpRes.retval === ERR) return { retval: ERR, dmax: 0, dmin: 0, dtrue: 0, serr: dpRes.serr };
  const dp = dpRes.dret;
  /* Earth orbital elements */
  const deRes = sweGetOrbitalElements(swed, tjdEt, SE_EARTH, iflagi);
  if (deRes.retval === ERR) return { retval: ERR, dmax: 0, dmin: 0, dtrue: 0, serr: deRes.serr };
  const de = deRes.dret;
  /* determine outer/inner */
  let douter: number[], dinner: number[];
  if (de[0] > dp[0]) { douter = de; dinner = dp; }
  else { douter = dp; dinner = de; }
  const pqro = new Array(20).fill(0);
  const pqri = new Array(20).fill(0);
  oscGetOrbitConstants(douter, pqro);
  oscGetOrbitConstants(dinner, pqri);
  let eano = douter[8];
  let eani = dinner[8];
  const xouter = [0, 0, 0];
  const xinner = [0, 0, 0];
  oscGetEclPos(eano, pqro, xouter);
  oscGetEclPos(eani, pqri, xinner);
  const rtrue = getDistFrom2Vectors(xouter, xinner);
  /* coarse search: 182×182 grid */
  const ncnt = 182;
  const dstep = 2;
  const maxXouter = [0, 0, 0];
  const maxXinner = [0, 0, 0];
  const minXouter = [0, 0, 0];
  const minXinner = [0, 0, 0];
  let rmax = 0, rmin = 100000000;
  let maxEanisv = 0, maxEanosv = 0, minEanisv = 0, minEanosv = 0;
  for (let j = 0; j < ncnt; j++) {
    eano = j * dstep;
    oscGetEclPos(eano, pqro, xouter);
    for (let i = 0; i < ncnt; i++) {
      eani = i;
      oscGetEclPos(eani, pqri, xinner);
      const rr = getDistFrom2Vectors(xouter, xinner);
      if (rr > rmax) {
        rmax = rr;
        maxEanisv = eani;
        maxEanosv = eano;
        for (let k = 0; k < 3; k++) { maxXouter[k] = xouter[k]; maxXinner[k] = xinner[k]; }
      }
      if (rr < rmin) {
        rmin = rr;
        minEanisv = eani;
        minEanosv = eano;
        for (let k = 0; k < 3; k++) { minXouter[k] = xouter[k]; minXinner[k] = xinner[k]; }
      }
    }
  }
  /* iterative refinement: maximum distance */
  eani = maxEanisv;
  eano = maxEanosv;
  for (let k = 0; k < 3; k++) { xouter[k] = maxXouter[k]; xinner[k] = maxXinner[k]; }
  let rmaxsv = 0;
  const nitermax = 300;
  for (let k = 0; k <= nitermax; k++) {
    let res = oscIterateMaxDist(pqri, xinner, xouter, true);
    eani = res.deanopt; rmax = res.drmax;
    res = oscIterateMaxDist(pqro, xouter, xinner, true);
    eano = res.deanopt; rmax = res.drmax;
    if (k > 0 && Math.abs(rmax - rmaxsv) < 0.00000001) break;
    rmaxsv = rmax;
  }
  /* iterative refinement: minimum distance */
  eani = minEanisv;
  eano = minEanosv;
  for (let k = 0; k < 3; k++) { xouter[k] = minXouter[k]; xinner[k] = minXinner[k]; }
  let rminsv = 0;
  for (let k = 0; k <= nitermax; k++) {
    let res = oscIterateMinDist(pqri, xinner, xouter, true);
    eani = res.deanopt; rmin = res.drmin;
    res = oscIterateMinDist(pqro, xouter, xinner, true);
    eano = res.deanopt; rmin = res.drmin;
    if (k > 0 && Math.abs(rmin - rminsv) < 0.00000001) break;
    rminsv = rmin;
  }
  return { retval: dpRes.retval, dmax: rmax, dmin: rmin, dtrue: rtrue, serr: dpRes.serr };
}
