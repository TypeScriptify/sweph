/*************************************************************
 * swephlib.ts — Swiss Ephemeris library functions
 * Translated from swephlib.c
 *
 * coordinate transformations, obliquity, nutation, precession,
 * delta t, sidereal time, CRC, Chebyshev interpolation, etc.
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

import {
  PI, TWOPI, DEGTORAD, RADTODEG, J2000, B1950, J1900, B1850, STR,
  SEFLG_JPLEPH, SEFLG_SWIEPH, SEFLG_MOSEPH, SEFLG_EPHMASK,
  SEFLG_SPEED, SEFLG_BARYCTR, SEFLG_JPLHOR, SEFLG_JPLHOR_APPROX,
  PREC_IAU_1976_CTIES, PREC_IAU_2000_CTIES, PREC_IAU_2006_CTIES,
  SEMOD_PREC_IAU_1976, SEMOD_PREC_IAU_2000, SEMOD_PREC_IAU_2006,
  SEMOD_PREC_BRETAGNON_2003, SEMOD_PREC_NEWCOMB, SEMOD_PREC_OWEN_1990,
  SEMOD_PREC_SIMON_1994, SEMOD_PREC_WILLIAMS_1994, SEMOD_PREC_LASKAR_1986,
  SEMOD_PREC_VONDRAK_2011, SEMOD_PREC_DEFAULT, SEMOD_PREC_DEFAULT_SHORT,
  SEMOD_PREC_WILL_EPS_LASK,
  SEMOD_NUT_IAU_1980, SEMOD_NUT_IAU_CORR_1987, SEMOD_NUT_IAU_2000A,
  SEMOD_NUT_IAU_2000B, SEMOD_NUT_WOOLARD, SEMOD_NUT_DEFAULT,
  SEMOD_SIDT_IAU_1976, SEMOD_SIDT_IAU_2006, SEMOD_SIDT_IERS_CONV_2010,
  SEMOD_SIDT_LONGTERM, SEMOD_SIDT_DEFAULT,
  SEMOD_BIAS_NONE, SEMOD_BIAS_IAU2000, SEMOD_BIAS_IAU2006,
  SEMOD_BIAS_DEFAULT,
  SEMOD_JPLHOR_LONG_AGREEMENT, SEMOD_JPLHORA_1, SEMOD_JPLHORA_2,
  SEMOD_JPLHORA_3, SEMOD_JPLHORA_DEFAULT,
  SEMOD_DELTAT_STEPHENSON_MORRISON_1984, SEMOD_DELTAT_STEPHENSON_1997,
  SEMOD_DELTAT_STEPHENSON_MORRISON_2004, SEMOD_DELTAT_ESPENAK_MEEUS_2006,
  SEMOD_DELTAT_STEPHENSON_ETC_2016, SEMOD_DELTAT_DEFAULT,
  SEMOD_NPREC, SEMOD_NNUT, SEMOD_NSIDT, SEMOD_NBIAS,
  SEMOD_NJPLHOR, SEMOD_NJPLHORA, SEMOD_NDELTAT,
  SEI_NMODELS,
  DPSI_DEPS_IAU1980_TJD0_HORIZONS, HORIZONS_TJD0_DPSI_DEPS_IAU1980,
  DPSI_IAU1980_TJD0, DEPS_IAU1980_TJD0,
  J2000_TO_J, J_TO_J2000,
  NUT_SPEED_INTV, SE_TIDAL_DEFAULT, SE_TIDAL_26, SE_TIDAL_AUTOMATIC,
  SE_TIDAL_DE200, SE_TIDAL_DE403, SE_TIDAL_DE404, SE_TIDAL_DE405,
  SE_TIDAL_DE406, SE_TIDAL_DE421, SE_TIDAL_DE422, SE_TIDAL_DE430,
  SE_TIDAL_DE431, SE_TIDAL_DE441, SE_TIDAL_STEPHENSON_2016,
  SE_DELTAT_AUTOMATIC, SE_DE_NUMBER, SE_TIDAL_MOSEPH,
  SEI_FILE_MOON,
  SE_MODEL_PREC_LONGTERM, SE_MODEL_PREC_SHORTTERM, SE_MODEL_NUT,
  SE_MODEL_SIDT, SE_MODEL_BIAS, SE_MODEL_JPLHOR_MODE, SE_MODEL_JPLHORA_MODE,
  SE_MODEL_DELTAT,
  AS_MAXCH, SWE_DATA_DPSI_DEPS,
  SE_SPLIT_DEG_ROUND_DEG, SE_SPLIT_DEG_ROUND_MIN, SE_SPLIT_DEG_ROUND_SEC,
  SE_SPLIT_DEG_KEEP_DEG, SE_SPLIT_DEG_KEEP_SIGN, SE_SPLIT_DEG_NAKSHATRA,
  SE_SPLIT_DEG_ZODIACAL,
  OK, ERR, ENDMARK,
  AUNIT, CLIGHT, NCTIES,
  SEI_MOON, SEI_EMB, SEI_MERCURY, SEI_VENUS, SEI_MARS,
  SEI_JUPITER, SEI_SATURN, SEI_URANUS, SEI_NEPTUNE, SEI_PLUTO,
  SEI_SUNBARY, SEI_CERES, SEI_PALLAS, SEI_JUNO, SEI_VESTA,
  SEI_CHIRON, SEI_PHOLUS,
  SE_PLMOON_OFFSET, SE_AST_OFFSET, SE_FILE_SUFFIX,
} from './constants';

import type { SweData, Epsilon, Nut, Interpol } from './types';

// IAU 2000A nutation data — placeholder imports (will be provided by swenut2000a.ts)
// For now we declare them; the actual file will export these arrays.
import {
  O1MAS2DEG, NLS, NLS_2000B, NPL,
  nls as nutLsArgMul, cls as nutLsCoef,
  npl as nutPlArgMul, icpl as nutPlCoef,
} from './swenut2000a';

/* ================================================================
 * Utility: square_sum (replaces C macro)
 * ================================================================ */
export function squareSum(x: ArrayLike<number>, off = 0): number {
  return x[off] * x[off] + x[off + 1] * x[off + 1] + x[off + 2] * x[off + 2];
}

/* ================================================================
 * 1. Angle normalization
 * ================================================================ */

/** Reduce x modulo 360 degrees → [0, 360) */
export function sweDegnorm(x: number): number {
  let y = x % 360.0;
  if (Math.abs(y) < 1e-13) y = 0;
  if (y < 0.0) y += 360.0;
  return y;
}

/** Reduce x modulo 2*PI → [0, 2π) */
export function sweRadnorm(x: number): number {
  let y = x % TWOPI;
  if (Math.abs(y) < 1e-13) y = 0;
  if (y < 0.0) y += TWOPI;
  return y;
}

/** Midpoint in degrees */
export function sweDegMidp(x1: number, x0: number): number {
  const d = sweDifdeg2n(x1, x0);
  return sweDegnorm(x0 + d / 2);
}

/** Midpoint in radians */
export function sweRadMidp(x1: number, x0: number): number {
  return DEGTORAD * sweDegMidp(x1 * RADTODEG, x0 * RADTODEG);
}

/** Reduce x modulo 2*PI (no near-zero fix) */
export function swiMod2PI(x: number): number {
  let y = x % TWOPI;
  if (y < 0.0) y += TWOPI;
  return y;
}

/** Quick angle normalization (assumes x is at most one period off) */
export function swiAngnorm(x: number): number {
  if (x < 0.0) return x + TWOPI;
  else if (x >= TWOPI) return x - TWOPI;
  else return x;
}

/* ================================================================
 * 2. Cross product
 * ================================================================ */

export function swiCrossProd(
  a: ArrayLike<number>, b: ArrayLike<number>, x: Float64Array, xOff = 0,
): void {
  x[xOff]     = a[1] * b[2] - a[2] * b[1];
  x[xOff + 1] = a[2] * b[0] - a[0] * b[2];
  x[xOff + 2] = a[0] * b[1] - a[1] * b[0];
}

/* ================================================================
 * 3. Chebyshev evaluation
 * ================================================================ */

/**
 * Evaluate Chebyshev series coef[0..ncf-1] at x in [-1, 1].
 * ACM algorithm 446 by Broucke.
 */
export function swiEcheb(x: number, coef: ArrayLike<number>, ncf: number): number {
  const x2 = x * 2;
  let br = 0, brp2 = 0, brpp = 0;
  for (let j = ncf - 1; j >= 0; j--) {
    brp2 = brpp;
    brpp = br;
    br = x2 * brpp - brp2 + coef[j];
  }
  return (br - brp2) * 0.5;
}

/** Evaluate derivative of Chebyshev series */
export function swiEdcheb(x: number, coef: ArrayLike<number>, ncf: number): number {
  const x2 = x * 2;
  let bf = 0, bj = 0;
  let xjp2 = 0, xjpl = 0;
  let bjp2 = 0, bjpl = 0;
  for (let j = ncf - 1; j >= 1; j--) {
    const dj = j + j;
    const xj = coef[j] * dj + xjp2;
    bj = x2 * bjpl - bjp2 + xj;
    bf = bjp2;
    bjp2 = bjpl;
    bjpl = bj;
    xjp2 = xjpl;
    xjpl = xj;
  }
  return (bj - bf) * 0.5;
}

/* ================================================================
 * 4. Coordinate transforms
 * ================================================================ */

/**
 * Ecliptical ↔ equatorial polar coordinate conversion (degrees).
 * For ecl→equ: eps must be negative. For equ→ecl: eps must be positive.
 * xpo, xpn are [lon, lat, dist] in degrees (dist passed through).
 */
export function sweCotrans(xpo: number[], xpn: number[], eps: number): void {
  const e = eps * DEGTORAD;
  const x = new Float64Array(6);
  x[0] = xpo[0] * DEGTORAD;
  x[1] = xpo[1] * DEGTORAD;
  x[2] = 1;
  swiPolcart(x, x);
  swiCoortrf(x, x, e);
  swiCartpol(x, x);
  xpn[0] = x[0] * RADTODEG;
  xpn[1] = x[1] * RADTODEG;
  xpn[2] = xpo[2];
}

/**
 * Ecliptical ↔ equatorial polar with speed (degrees).
 * For ecl→equ: eps must be negative. For equ→ecl: eps must be positive.
 * xpo, xpn are [lon, lat, dist, lonSpd, latSpd, distSpd].
 */
export function sweCotransSp(xpo: number[], xpn: number[], eps: number): void {
  const e = eps * DEGTORAD;
  const x = new Float64Array(6);
  for (let i = 0; i <= 5; i++) x[i] = xpo[i];
  x[0] *= DEGTORAD;
  x[1] *= DEGTORAD;
  x[2] = 1;
  x[3] *= DEGTORAD;
  x[4] *= DEGTORAD;
  swiPolcartSp(x, x);
  swiCoortrf(x, x, e);
  swiCoortrfOff(x, 3, x, 3, e);
  swiCartpolSp(x, xpn);
  xpn[0] *= RADTODEG;
  xpn[1] *= RADTODEG;
  xpn[2] = xpo[2];
  xpn[3] *= RADTODEG;
  xpn[4] *= RADTODEG;
  xpn[5] = xpo[5];
}

/**
 * Ecliptical ↔ equatorial cartesian rotation.
 * For ecl→equ: eps must be negative.
 */
export function swiCoortrf(
  xpo: ArrayLike<number>, xpn: Float64Array | number[], eps: number,
  srcOff = 0, dstOff = 0,
): void {
  const sineps = Math.sin(eps);
  const coseps = Math.cos(eps);
  const x0 = xpo[srcOff];
  const x1 = xpo[srcOff + 1] * coseps + xpo[srcOff + 2] * sineps;
  const x2 = -xpo[srcOff + 1] * sineps + xpo[srcOff + 2] * coseps;
  xpn[dstOff] = x0;
  xpn[dstOff + 1] = x1;
  xpn[dstOff + 2] = x2;
}

/** Offset variant for speed arrays (replaces C's `swi_coortrf(x+3, x+3, e)`) */
function swiCoortrfOff(
  xpo: ArrayLike<number>, srcOff: number,
  xpn: Float64Array | number[], dstOff: number,
  eps: number,
): void {
  swiCoortrf(xpo, xpn, eps, srcOff, dstOff);
}

/**
 * Ecliptical ↔ equatorial cartesian rotation with pre-computed sin/cos.
 * For ecl→equ: sineps must be -sin(eps).
 */
export function swiCoortrf2(
  xpo: ArrayLike<number>, xpn: Float64Array | number[],
  sineps: number, coseps: number,
  srcOff = 0, dstOff = 0,
): void {
  const x0 = xpo[srcOff];
  const x1 = xpo[srcOff + 1] * coseps + xpo[srcOff + 2] * sineps;
  const x2 = -xpo[srcOff + 1] * sineps + xpo[srcOff + 2] * coseps;
  xpn[dstOff] = x0;
  xpn[dstOff + 1] = x1;
  xpn[dstOff + 2] = x2;
}

/** Cartesian [x,y,z] → polar [lon, lat, rad] */
export function swiCartpol(x: ArrayLike<number>, l: Float64Array | number[], srcOff = 0, dstOff = 0): void {
  const x0 = x[srcOff], x1 = x[srcOff + 1], x2 = x[srcOff + 2];
  if (x0 === 0 && x1 === 0 && x2 === 0) {
    l[dstOff] = l[dstOff + 1] = l[dstOff + 2] = 0;
    return;
  }
  let rxy = x0 * x0 + x1 * x1;
  const rad = Math.sqrt(rxy + x2 * x2);
  rxy = Math.sqrt(rxy);
  let lon = Math.atan2(x1, x0);
  if (lon < 0.0) lon += TWOPI;
  let lat: number;
  if (rxy === 0) {
    lat = x2 >= 0 ? PI / 2 : -(PI / 2);
  } else {
    lat = Math.atan(x2 / rxy);
  }
  l[dstOff] = lon;
  l[dstOff + 1] = lat;
  l[dstOff + 2] = rad;
}

/** Polar [lon, lat, rad] → cartesian [x, y, z] */
export function swiPolcart(l: ArrayLike<number>, x: Float64Array | number[], srcOff = 0, dstOff = 0): void {
  const cosl1 = Math.cos(l[srcOff + 1]);
  const xx0 = l[srcOff + 2] * cosl1 * Math.cos(l[srcOff]);
  const xx1 = l[srcOff + 2] * cosl1 * Math.sin(l[srcOff]);
  const xx2 = l[srcOff + 2] * Math.sin(l[srcOff + 1]);
  x[dstOff] = xx0;
  x[dstOff + 1] = xx1;
  x[dstOff + 2] = xx2;
}

/** Cartesian position+speed → polar position+speed */
export function swiCartpolSp(x: ArrayLike<number>, l: Float64Array | number[]): void {
  // zero position: direction of motion
  if (x[0] === 0 && x[1] === 0 && x[2] === 0) {
    const ll = new Float64Array(6);
    ll[5] = Math.sqrt(squareSum(x, 3));
    swiCartpol(x, ll, 3, 0);
    ll[2] = 0;
    ll[3] = 0; ll[4] = 0;
    for (let i = 0; i <= 5; i++) l[i] = ll[i];
    return;
  }
  // zero speed
  if (x[3] === 0 && x[4] === 0 && x[5] === 0) {
    l[3] = l[4] = l[5] = 0;
    swiCartpol(x, l);
    return;
  }
  // position
  let rxy = x[0] * x[0] + x[1] * x[1];
  const rad = Math.sqrt(rxy + x[2] * x[2]);
  rxy = Math.sqrt(rxy);
  const lon = Math.atan2(x[1], x[0]) < 0 ? Math.atan2(x[1], x[0]) + TWOPI : Math.atan2(x[1], x[0]);
  const lat = Math.atan(x[2] / rxy);
  // speed
  const coslon = x[0] / rxy;
  const sinlon = x[1] / rxy;
  const coslat = rxy / rad;
  const sinlat = x[2] / rad;
  let xx3 = x[3] * coslon + x[4] * sinlon;
  const xx4_lon = -x[3] * sinlon + x[4] * coslon;
  l[3] = xx4_lon / rxy;  // speed in longitude
  const xx4 = -sinlat * xx3 + coslat * x[5];
  const xx5 = coslat * xx3 + sinlat * x[5];
  l[4] = xx4 / rad;      // speed in latitude
  l[5] = xx5;            // speed in radius
  l[0] = lon;
  l[1] = lat;
  l[2] = rad;
}

/** Polar position+speed → cartesian position+speed */
export function swiPolcartSp(l: ArrayLike<number>, x: Float64Array | number[]): void {
  // zero speed
  if (l[3] === 0 && l[4] === 0 && l[5] === 0) {
    x[3] = x[4] = x[5] = 0;
    swiPolcart(l, x);
    return;
  }
  const coslon = Math.cos(l[0]);
  const sinlon = Math.sin(l[0]);
  const coslat = Math.cos(l[1]);
  const sinlat = Math.sin(l[1]);
  const xx0 = l[2] * coslat * coslon;
  const xx1 = l[2] * coslat * sinlon;
  const xx2 = l[2] * sinlat;
  // speed
  const rxyz = l[2];
  const rxy = Math.sqrt(xx0 * xx0 + xx1 * xx1);
  const xx5 = l[5];
  const xx4 = l[4] * rxyz;
  x[5] = sinlat * xx5 + coslat * xx4;
  const xx3 = coslat * xx5 - sinlat * xx4;
  const xx4b = l[3] * rxy;
  x[3] = coslon * xx3 - sinlon * xx4b;
  x[4] = sinlon * xx3 + coslon * xx4b;
  x[0] = xx0;
  x[1] = xx1;
  x[2] = xx2;
}

/** Dot product of unit vectors → cosine of angle, clamped to [-1,1] */
export function swiDotProdUnit(x: ArrayLike<number>, y: ArrayLike<number>): number {
  let dop = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const e1 = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
  const e2 = Math.sqrt(y[0] * y[0] + y[1] * y[1] + y[2] * y[2]);
  dop /= e1;
  dop /= e2;
  if (dop > 1) dop = 1;
  if (dop < -1) dop = -1;
  return dop;
}

/* ================================================================
 * 5. Centisecond and degree utilities
 * ================================================================ */

/** Normalize centiseconds to [0, DEG360) */
export function sweCsnorm(p: number): number {
  let q = p;
  while (q < 0) q += 360 * 360000;
  while (q >= 360 * 360000) q -= 360 * 360000;
  return q;
}

/** Difference in centiseconds, normalized to [-180°, 180°) */
export function sweDifcsn(p1: number, p2: number): number {
  let diff = (p1 - p2) % (360 * 360000);
  if (diff >= 180 * 360000) diff -= 360 * 360000;
  if (diff < -180 * 360000) diff += 360 * 360000;
  return diff;
}

/** Difference of two radian angles, normalized to [-PI, PI) */
export function sweDifrad2n(p1: number, p2: number): number {
  let d = sweRadnorm(p1 - p2);
  if (d >= PI) return d - TWOPI;
  return d;
}

/** Difference in degrees, normalized to [-180, 180) */
export function sweDifdeg2n(p1: number, p2: number): number {
  let d = p1 - p2;
  d = d % 360.0;
  if (Math.abs(d) < 1e-14) d = 0;
  if (d >= 180.0) d -= 360.0;
  if (d < -180.0) d += 360.0;
  return d;
}

/** Double → int32 (C-style truncation + rounding to nearest) */
export function sweD2l(x: number): number {
  if (x >= 0) return Math.floor(x + 0.5);
  else return Math.ceil(x - 0.5);
}

/** Day of week: Monday = 0, ... Sunday = 6 */
export function sweDayOfWeek(jd: number): number {
  return (Math.floor(jd - 2433282 - 1.5) % 7 + 7) % 7;
}

/* ================================================================
 * 6. swe_split_deg
 * ================================================================ */

export interface SplitDegResult {
  deg: number;
  min: number;
  sec: number;
  secFr: number;
  sign: number;
}

function splitDegNakshatra(ddeg: number, roundflag: number): SplitDegResult {
  let dateflag = false;
  let deg: number, min: number, sec: number, secfr: number;

  if ((roundflag & SE_SPLIT_DEG_ROUND_DEG) !== 0) {
    ddeg = Math.round(ddeg);
    ddeg = ddeg % 360;
    const inak = Math.trunc(ddeg / (360 / 27));
    deg = ddeg - inak * (360 / 27);
    return { deg, min: 0, sec: 0, secFr: 0, sign: inak };
  }
  if ((roundflag & SE_SPLIT_DEG_ROUND_MIN) !== 0) dateflag = true;
  if ((roundflag & SE_SPLIT_DEG_ROUND_SEC) !== 0) dateflag = true;

  ddeg = ddeg % 360;
  const inak = Math.trunc(ddeg / (360 / 27));
  ddeg -= inak * (360 / 27);
  deg = Math.trunc(ddeg);
  let d = (ddeg - deg) * 60;
  min = Math.trunc(d);
  d = (d - min) * 60;
  sec = Math.trunc(d);
  secfr = d - sec;

  if (dateflag) {
    if ((roundflag & SE_SPLIT_DEG_ROUND_SEC) !== 0) {
      if (secfr >= 0.5) sec++;
      secfr = 0;
      if (sec >= 60) { sec = 0; min++; }
      if (min >= 60) { min = 0; deg++; }
    }
    if ((roundflag & SE_SPLIT_DEG_ROUND_MIN) !== 0) {
      if (sec >= 30) min++;
      sec = 0; secfr = 0;
      if (min >= 60) { min = 0; deg++; }
    }
  }
  return { deg, min, sec, secFr: secfr, sign: inak };
}

export function sweSplitDeg(
  ddeg: number,
  roundflag: number,
): SplitDegResult {
  if ((roundflag & SE_SPLIT_DEG_NAKSHATRA) !== 0) {
    return splitDegNakshatra(ddeg, roundflag);
  }

  let dateflag = false;
  let deg: number, min: number, sec: number, secfr: number, sgn: number;

  if ((roundflag & SE_SPLIT_DEG_ROUND_DEG) !== 0) dateflag = true;
  if ((roundflag & SE_SPLIT_DEG_ROUND_MIN) !== 0) dateflag = true;
  if ((roundflag & SE_SPLIT_DEG_ROUND_SEC) !== 0) dateflag = true;

  if ((roundflag & SE_SPLIT_DEG_KEEP_DEG) !== 0) {
    if (ddeg < 0) {
      sgn = -1;
      ddeg = -ddeg;
    } else {
      sgn = 0;
    }
    if ((roundflag & SE_SPLIT_DEG_KEEP_SIGN) !== 0) {
      // not applicable without zodiacal
    }
  } else if ((roundflag & SE_SPLIT_DEG_ZODIACAL) !== 0) {
    sgn = 0;
    ddeg = sweDegnorm(ddeg);
    sgn = Math.trunc(ddeg / 30);
    ddeg = ddeg % 30;
  } else {
    sgn = 0;
    if (ddeg < 0) { sgn = -1; ddeg = -ddeg; }
  }

  deg = Math.trunc(ddeg);
  let d = (ddeg - deg) * 60;
  min = Math.trunc(d);
  d = (d - min) * 60;
  sec = Math.trunc(d);
  secfr = d - sec;

  if (dateflag) {
    if ((roundflag & SE_SPLIT_DEG_ROUND_SEC) !== 0) {
      if (secfr >= 0.5) sec++;
      secfr = 0;
      if (sec >= 60) { sec = 0; min++; }
      if (min >= 60) { min = 0; deg++; }
    }
    if ((roundflag & SE_SPLIT_DEG_ROUND_MIN) !== 0) {
      if (sec >= 30) min++;
      sec = 0; secfr = 0;
      if (min >= 60) { min = 0; deg++; }
    }
    if ((roundflag & SE_SPLIT_DEG_ROUND_DEG) !== 0) {
      if (min >= 30) deg++;
      min = 0; sec = 0; secfr = 0;
    }
    if ((roundflag & SE_SPLIT_DEG_ZODIACAL) !== 0) {
      if (deg >= 30) {
        deg = 0;
        sgn++;
        if (sgn >= 12) sgn = 0;
      }
    }
  }

  return { deg, min, sec, secFr: secfr, sign: sgn };
}

/* ================================================================
 * 7. CRC32
 * ================================================================ */

let crc32Table: Uint32Array | null = null;
const CRC32_POLY = 0x04c11db7; // AUTODIN II, Ethernet, FDDI — MSB-first

function initCrc32(): void {
  if (crc32Table) return;
  crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = (i << 24) >>> 0;
    for (let j = 8; j > 0; j--) {
      c = c & 0x80000000 ? ((c << 1) ^ CRC32_POLY) >>> 0 : (c << 1) >>> 0;
    }
    crc32Table[i] = c >>> 0;
  }
}

export function swiCrc32(buf: Uint8Array, len: number): number {
  initCrc32();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < len; i++) {
    crc = ((crc << 8) ^ crc32Table![((crc >>> 24) ^ buf[i]) & 0xFF]) >>> 0;
  }
  return (~crc) >>> 0;
}

/* ================================================================
 * 8. Kepler equation solver
 * ================================================================ */

export function swiKepler(E: number, M: number, ecce: number): number {
  let dE = 1;
  let E1 = E;
  const maxIter = 200;
  for (let i = 0; i < maxIter && Math.abs(dE) > 1e-12; i++) {
    dE = (E1 - ecce * Math.sin(E1) - M) / (1 - ecce * Math.cos(E1));
    E1 -= dE;
  }
  return E1;
}

/* ================================================================
 * 9. FK4 ↔ FK5
 * ================================================================ */

export function swiFK4_FK5(xp: Float64Array | number[], tjd: number): void {
  // equinox and epoch J2000 to B1950
  const cosRA = Math.cos(xp[0]);
  const sinRA = Math.sin(xp[0]);
  const cosDec = Math.cos(xp[1]);
  const sinDec = Math.sin(xp[1]);
  // E-terms removal
  const a0 = -1.62557e-6;
  const a1 = -0.31919e-6;
  const a2 = -0.13843e-6;
  const d0 = a0 * cosDec * cosRA + a1 * cosDec * sinRA + a2 * sinDec;
  xp[0] += -a0 * sinRA + a1 * cosRA + (a0 * cosRA + a1 * sinRA) * sinDec / cosDec * d0;
  xp[1] += d0 * (cosDec - sinDec * d0);
}

export function swiFK5_FK4(xp: Float64Array | number[], tjd: number): void {
  // reverse: add E-terms
  const cosRA = Math.cos(xp[0]);
  const sinRA = Math.sin(xp[0]);
  const cosDec = Math.cos(xp[1]);
  const sinDec = Math.sin(xp[1]);
  const a0 = -1.62557e-6;
  const a1 = -0.31919e-6;
  const a2 = -0.13843e-6;
  const d0 = a0 * cosDec * cosRA + a1 * cosDec * sinRA + a2 * sinDec;
  xp[0] -= -a0 * sinRA + a1 * cosRA + (a0 * cosRA + a1 * sinRA) * sinDec / cosDec * d0;
  xp[1] -= d0 * (cosDec - sinDec * d0);
}

/* ================================================================
 * 10. Astro-model helpers
 * ================================================================ */

function getPrecModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_PREC_LONGTERM];
  return m !== 0 ? m : SEMOD_PREC_DEFAULT;
}

function getPrecModelShort(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_PREC_SHORTTERM];
  return m !== 0 ? m : SEMOD_PREC_DEFAULT;
}

function getNutModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_NUT];
  return m !== 0 ? m : SEMOD_NUT_DEFAULT;
}

function getSidtModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_SIDT];
  return m !== 0 ? m : SEMOD_SIDT_DEFAULT;
}

function getBiasModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_BIAS];
  return m !== 0 ? m : SEMOD_BIAS_DEFAULT;
}

function getJplHorModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_JPLHOR_MODE];
  return m !== 0 ? m : SEMOD_JPLHOR_LONG_AGREEMENT;
}

function getJplHoraModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_JPLHORA_MODE];
  return m !== 0 ? m : SEMOD_JPLHORA_DEFAULT;
}

function getDeltatModel(swed: SweData): number {
  const m = swed.astroModels[SE_MODEL_DELTAT];
  return m !== 0 ? m : SEMOD_DELTAT_DEFAULT;
}

export function sweSetAstroModels(swed: SweData, saession: string): void {
  // parse comma-separated list of model numbers
  const parts = saession.split(',');
  for (let i = 0; i < parts.length && i < SEI_NMODELS; i++) {
    const val = parseInt(parts[i].trim(), 10);
    if (!isNaN(val)) {
      swed.astroModels[i] = val;
    }
  }
}

export function sweGetAstroModels(swed: SweData): string {
  const parts: string[] = [];
  for (let i = 0; i < SEI_NMODELS; i++) {
    parts.push(String(swed.astroModels[i]));
  }
  return parts.join(',');
}

/** Guess ephemeris flag from SweData */
export function swiGuessEpheFlag(swed: SweData): number {
  if ((swed.lastEpheflag & SEFLG_JPLEPH) !== 0) return SEFLG_JPLEPH;
  if ((swed.lastEpheflag & SEFLG_MOSEPH) !== 0) return SEFLG_MOSEPH;
  return SEFLG_SWIEPH;
}

/* ================================================================
 * 11. Vondrak 2011 precession tables and functions
 * ================================================================ */

const AS2R = DEGTORAD / 3600.0;
const D2PI = TWOPI;
const EPS0 = 84381.406 * AS2R;

/* pepol[4][2], peper[5][10] — for swi_ldp_peps */
const pepol: readonly [number, number][] = [
  [+8134.017132, +84028.206305],
  [+5043.0520035, +0.3624445],
  [-0.00710733, -0.00004039],
  [+0.000000271, -0.000000110],
];

const peper: readonly number[][] = [
  [+409.90, +396.15, +537.22, +402.90, +417.15, +288.92, +4043.00, +306.00, +277.00, +203.00],
  [-6908.287473, -3198.706291, +1453.674527, -857.748557, +1173.231614, -156.981465, +371.836550, -216.619040, +193.691479, +11.891524],
  [+753.872780, -247.805823, +379.471484, -53.880558, -90.109153, -353.600190, -63.115353, -28.248187, +17.703387, +38.911307],
  [-2845.175469, +449.844989, -1255.915323, +886.736783, +418.887514, +997.912441, -240.979710, +76.541307, -36.788069, -170.964086],
  [-1704.720302, -862.308358, +447.832178, -889.571909, +190.402846, -56.564991, -296.222622, -75.859952, +67.473503, +3.014055],
];

/* pqpol[4][2], pqper[5][8] — for pre_pecl */
const pqpol: readonly [number, number][] = [
  [+5851.607687, -1600.886300],
  [-0.1189000, +1.1689818],
  [-0.00028913, -0.00000020],
  [+0.000000101, -0.000000437],
];

const pqper: readonly number[][] = [
  [708.15, 2309, 1620, 492.2, 1183, 622, 882, 547],
  [-5486.751211, -17.127623, -617.517403, 413.44294, 78.614193, -180.732815, -87.676083, 46.140315],
  [-684.66156, 2446.28388, 399.671049, -356.652376, -186.387003, -316.80007, 198.296701, 101.135679],
  [667.66673, -2354.886252, -428.152441, 376.202861, 184.778874, 335.321713, -185.138669, -120.97283],
  [-5523.863691, -549.74745, -310.998056, 421.535876, -36.776172, -145.278396, -34.74445, 22.885731],
];

/* xypol[4][2], xyper[5][14] — for pre_pequ */
const xypol: readonly [number, number][] = [
  [+5453.282155, -73750.930350],
  [+0.4252841, -0.7675452],
  [-0.00037173, -0.00018725],
  [-0.000000152, +0.000000231],
];

const xyper: readonly number[][] = [
  [256.75, 708.15, 274.2, 241.45, 2309, 492.2, 396.1, 288.9, 231.1, 1610, 620, 157.87, 220.3, 1200],
  [-819.940624, -8444.676815, 2600.009459, 2755.17563, -167.659835, 871.855056, 44.769698, -512.313065, -819.415595, -538.071099, -189.793622, -402.922932, 179.516345, -9.814756],
  [75004.344875, 624.033993, 1251.136893, -1102.212834, -2660.66498, 699.291817, 153.16722, -950.865637, 499.754645, -145.18821, 558.116553, -23.923029, -165.405086, 9.344131],
  [81491.287984, 787.163481, 1251.296102, -1257.950837, -2966.79973, 639.744522, 131.600209, -445.040117, 584.522874, -89.756563, 524.42963, -13.549067, -210.157124, -44.919798],
  [1558.515853, 7774.939698, -2219.534038, -2523.969396, 247.850422, -846.485643, -1393.124055, 368.526116, 749.045012, 444.704518, 235.934465, 374.049623, -171.33018, -22.899655],
];

/** General precession in longitude and obliquity (Vondrak 2011) */
export function swiLdpPeps(tjd: number): { dpre: number; deps: number } {
  const NPOL = 4, NPER = 10;
  const t = (tjd - J2000) / 36525.0;
  let p = 0, q = 0;
  // periodic terms
  for (let i = 0; i < NPER; i++) {
    const w = D2PI * t;
    const a = w / peper[0][i];
    const s = Math.sin(a);
    const c = Math.cos(a);
    p += c * peper[1][i] + s * peper[3][i];
    q += c * peper[2][i] + s * peper[4][i];
  }
  // polynomial terms
  let w = 1;
  for (let i = 0; i < NPOL; i++) {
    p += pepol[i][0] * w;
    q += pepol[i][1] * w;
    w *= t;
  }
  return { dpre: p * AS2R, deps: q * AS2R };
}

/** Precession of the ecliptic (Vondrak 2011) */
function prePecl(tjd: number, vec: number[]): void {
  const NPOL = 4, NPER = 8;
  const t = (tjd - J2000) / 36525.0;
  let p = 0, q = 0;
  for (let i = 0; i < NPER; i++) {
    const w = D2PI * t;
    const a = w / pqper[0][i];
    const s = Math.sin(a);
    const c = Math.cos(a);
    p += c * pqper[1][i] + s * pqper[3][i];
    q += c * pqper[2][i] + s * pqper[4][i];
  }
  let w = 1;
  for (let i = 0; i < NPOL; i++) {
    p += pqpol[i][0] * w;
    q += pqpol[i][1] * w;
    w *= t;
  }
  p *= AS2R;
  q *= AS2R;
  let z = 1 - p * p - q * q;
  z = z < 0 ? 0 : Math.sqrt(z);
  const s = Math.sin(EPS0);
  const c = Math.cos(EPS0);
  vec[0] = p;
  vec[1] = -q * c - z * s;
  vec[2] = -q * s + z * c;
}

/** Precession of the equator (Vondrak 2011) */
function prePequ(tjd: number, veq: number[]): void {
  const NPOL = 4, NPER = 14;
  const t = (tjd - J2000) / 36525.0;
  let x = 0, y = 0;
  for (let i = 0; i < NPER; i++) {
    const w = D2PI * t;
    const a = w / xyper[0][i];
    const s = Math.sin(a);
    const c = Math.cos(a);
    x += c * xyper[1][i] + s * xyper[3][i];
    y += c * xyper[2][i] + s * xyper[4][i];
  }
  let w = 1;
  for (let i = 0; i < NPOL; i++) {
    x += xypol[i][0] * w;
    y += xypol[i][1] * w;
    w *= t;
  }
  x *= AS2R;
  y *= AS2R;
  veq[0] = x;
  veq[1] = y;
  const ww = x * x + y * y;
  veq[2] = ww < 1 ? Math.sqrt(1 - ww) : 0;
}

/** Precession matrix from Vondrak 2011 */
function prePmat(tjd: number, rp: number[]): void {
  const peqr = [0, 0, 0], pecl = [0, 0, 0];
  const v = new Float64Array(3);
  prePequ(tjd, peqr);
  prePecl(tjd, pecl);
  // equinox = cross(peqr, pecl)
  swiCrossProd(peqr, pecl, v);
  const w = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  const eqx = [v[0] / w, v[1] / w, v[2] / w];
  // v2 = cross(peqr, eqx)
  swiCrossProd(peqr, eqx, v);
  rp[0] = eqx[0]; rp[1] = eqx[1]; rp[2] = eqx[2];
  rp[3] = v[0]; rp[4] = v[1]; rp[5] = v[2];
  rp[6] = peqr[0]; rp[7] = peqr[1]; rp[8] = peqr[2];
}

/* ================================================================
 * 12. Owen 1990 precession
 * ================================================================ */

const owenEps0Coef: readonly number[][] = [
  [23.699391439256386, 5.2330816033981775e-1, -5.6259493384864815e-2, -8.2033318431602032e-3, 6.6774163554156385e-4, 2.4931584012812606e-5, -3.1313623302407878e-6, 2.0343814827951515e-7, 2.9182026615852936e-8, -4.1118760893281951e-9],
  [24.124759551704588, -1.2094875596566286e-1, -8.3914869653015218e-2, 3.5357075322387405e-3, 6.4557467824807032e-4, -2.5092064378707704e-5, -1.7631607274450848e-6, 1.3363622791424094e-7, 1.5577817511054047e-8, -2.4613907093017122e-9],
  [23.439103144206208, -4.9386077073143590e-1, -2.3965445283267805e-4, 8.6637485629656489e-3, -5.2828151901367600e-5, -4.3951004595359217e-5, -1.1058785949914705e-6, 6.2431490022621172e-8, 3.4725376218710764e-8, 1.3658853127005757e-9],
  [22.724671295125046, -1.6041813558650337e-1, 7.0646783888132504e-2, 1.4967806745062837e-3, -6.6857270989190734e-4, 5.7578378071604775e-6, 3.3738508454638728e-6, -2.2917813537654764e-7, -2.1019907929218137e-8, 4.3139832091694682e-9],
  [22.914636050333696, 3.2123508304962416e-1, 3.6633220173792710e-2, -5.9228324767696043e-3, -1.882379107379328e-4, 3.2274552870236244e-5, 4.9052463646336507e-7, -5.9064298731578425e-8, -2.0485712675098837e-8, -6.2163304813908160e-10],
];

const owenPsiaCoef: readonly number[][] = [
  [-218.57864954903122, 51.752257487741612, 1.3304715765661958e-1, 9.2048123521890745e-2, -6.0877528127241278e-3, -7.0013893644531700e-5, -4.9217728385458495e-5, -1.8578234189053723e-6, 7.4396426162029877e-7, -5.9157528981843864e-9],
  [-111.94350527506128, 55.175558131675861, 4.7366115762797613e-1, -4.7701750975398538e-2, -9.2445765329325809e-3, 7.0962838707454917e-4, 1.5140455277814658e-4, -7.7813159018954928e-7, -2.4729402281953378e-6, -1.0898887008726418e-7],
  [-2.041452011529441e-1, 55.969995858494106, -1.9295093699770936e-1, -5.6819574830421158e-3, 1.1073687302518981e-2, -9.0868489896815619e-5, -1.1999773777895820e-4, 9.9748697306154409e-6, 5.7911493603430550e-7, -2.3647526839778175e-7],
  [111.61366860604471, 56.404525305162447, 4.4403302410703782e-1, 7.1490030578883907e-2, -4.9184559079790816e-3, -1.3912698949042046e-3, -6.8490613661884005e-5, 1.2394328562905297e-6, 1.7719847841480384e-6, 2.4889095220628068e-7],
  [228.40683531269390, 60.056143904919826, 2.9583200718478960e-2, -1.5710838319490748e-1, -7.0017356811600801e-3, 3.3009615142224537e-3, 2.0318123852537664e-4, -6.5840216067828310e-5, -5.9077673352976155e-6, 1.3983942185303064e-6],
];

const owenOmaCoef: readonly number[][] = [
  [25.541291140949806, 2.377889511272162e-1, -3.7337334723142133e-1, 2.4579295485161534e-2, 4.3840999514263623e-3, -3.1126873333599556e-4, -9.8443045771748915e-6, -7.9403103080496923e-7, 1.0840116743893556e-9, 9.2865105216887919e-9],
  [24.429357654237926, -9.5205745947740161e-1, 8.6738296270534816e-2, 3.0061543426062955e-2, -4.1532480523019988e-3, -3.7920928393860939e-4, 3.5117012399609737e-5, 4.6811877283079217e-6, -8.1836046585546861e-8, -6.1803706664211173e-8],
  [23.450465062489337, -9.7259278279739817e-2, 1.1082286925130981e-2, -3.1469883339372219e-2, -1.0041906996819648e-4, 5.6455168475133958e-4, -8.4403910211030209e-6, -3.8269157371098435e-6, 3.1422585261198437e-7, 9.3481729116773404e-9],
  [22.581778052947806, -8.7069701538602037e-1, -9.8140710050197307e-2, 2.6025931340678079e-2, 4.8165322168786755e-3, -1.906558772193363e-4, -4.6838759635421777e-5, -1.6608525315998471e-6, -3.2347811293516124e-8, 2.8104728109642000e-9],
  [21.518861835737142, 2.0494789509441385e-1, 3.5193604846503161e-1, 1.5305977982348925e-2, -7.5015367726336455e-3, -4.0322553186065610e-4, 1.0655320434844041e-4, 7.1792339586935752e-6, -1.603874697543020e-6, -1.613563462813512e-7],
];

const owenChiaCoef: readonly number[][] = [
  [8.2378850337329404e-1, -3.7443109739678667, 4.0143936898854026e-1, 8.1822830214590811e-2, -8.5978790792656293e-3, -2.8350488448426132e-5, -4.2474671728156727e-5, -1.6214840884656678e-6, 7.8560442001953050e-7, -1.032016641696707e-8],
  [-2.1726062070318606, 7.8470515033132925e-1, 4.4044931004195718e-1, -8.0671247169971653e-2, -8.9672662444325007e-3, 9.2248978383109719e-4, 1.5143472266372874e-4, -1.6387009056475679e-6, -2.4405558979328144e-6, -1.0148113464009015e-7],
  [-4.8518673570735556e-1, 1.0016737299946743e-1, -4.7074888613099918e-1, -5.8604054305076092e-3, 1.4300208240553435e-2, -6.7127991650300028e-5, -1.3703764889645475e-4, 9.0505213684444634e-6, 6.0368690647808607e-7, -2.2135404747652171e-7],
  [-2.0950740076326087, -9.4447359463206877e-1, 4.0940512860493755e-1, 1.0261699700263508e-1, -5.3133241571955160e-3, -1.6634631550720911e-3, -5.9477519536647907e-5, 2.9651387319208926e-6, 1.6434499452070584e-6, 2.3720647656961084e-7],
  [6.3315163285678715e-1, 3.5241082918420464, 2.1223076605364606e-1, -1.5648122502767368e-1, -9.1964075390801980e-3, 3.3896161239812411e-3, 2.1485178626085787e-4, -6.6261759864793735e-5, -5.9257969712852667e-6, 1.3918759086160525e-6],
];

function getOwenT0Icof(tjd: number): { t0: number; icof: number } {
  const t0s = [-3392455.5, -470455.5, 2451544.5, 5373544.5, 8295544.5];
  let t0 = t0s[0];
  let j = 0;
  for (let i = 1; i < 5; i++) {
    if (tjd >= (t0s[i - 1] + t0s[i]) / 2) {
      t0 = t0s[i];
      j++;
    }
  }
  return { t0, icof: j };
}

function owenChebyshevBasis(tjd: number, t0: number): { k: number[]; tau: number[] } {
  const tau = new Array<number>(10);
  tau[0] = 0;
  tau[1] = (tjd - t0) / 36525.0 / 40.0;
  for (let i = 2; i <= 9; i++) tau[i] = tau[1] * tau[i - 1];
  const k = new Array<number>(10);
  k[0] = 1;
  k[1] = tau[1];
  k[2] = 2 * tau[2] - 1;
  k[3] = 4 * tau[3] - 3 * tau[1];
  k[4] = 8 * tau[4] - 8 * tau[2] + 1;
  k[5] = 16 * tau[5] - 20 * tau[3] + 5 * tau[1];
  k[6] = 32 * tau[6] - 48 * tau[4] + 18 * tau[2] - 1;
  k[7] = 64 * tau[7] - 112 * tau[5] + 56 * tau[3] - 7 * tau[1];
  k[8] = 128 * tau[8] - 256 * tau[6] + 160 * tau[4] - 32 * tau[2] + 1;
  k[9] = 256 * tau[9] - 576 * tau[7] + 432 * tau[5] - 120 * tau[3] + 9 * tau[1];
  return { k, tau };
}

function owenPreMatrix(tjd: number, rp: number[], iflag: number): void {
  const { t0, icof } = getOwenT0Icof(tjd);
  const { k } = owenChebyshevBasis(tjd, t0);
  let psia = 0, oma = 0, chia = 0;
  for (let i = 0; i < 10; i++) {
    psia += k[i] * owenPsiaCoef[icof][i];
    oma += k[i] * owenOmaCoef[icof][i];
    chia += k[i] * owenChiaCoef[icof][i];
  }
  if (iflag & (SEFLG_JPLHOR | SEFLG_JPLHOR_APPROX)) {
    psia += -0.000018560;
  }
  const eps0 = 84381.448 / 3600.0 * DEGTORAD;
  const psiaR = psia * DEGTORAD;
  const chiaR = chia * DEGTORAD;
  const omaR = oma * DEGTORAD;
  const coseps0 = Math.cos(eps0), sineps0 = Math.sin(eps0);
  const coschia = Math.cos(chiaR), sinchia = Math.sin(chiaR);
  const cospsia = Math.cos(psiaR), sinpsia = Math.sin(psiaR);
  const cosoma = Math.cos(omaR), sinoma = Math.sin(omaR);
  rp[0] = coschia * cospsia + sinchia * cosoma * sinpsia;
  rp[1] = (-coschia * sinpsia + sinchia * cosoma * cospsia) * coseps0 + sinchia * sinoma * sineps0;
  rp[2] = (-coschia * sinpsia + sinchia * cosoma * cospsia) * sineps0 - sinchia * sinoma * coseps0;
  rp[3] = -sinchia * cospsia + coschia * cosoma * sinpsia;
  rp[4] = (sinchia * sinpsia + coschia * cosoma * cospsia) * coseps0 + coschia * sinoma * sineps0;
  rp[5] = (sinchia * sinpsia + coschia * cosoma * cospsia) * sineps0 - coschia * sinoma * coseps0;
  rp[6] = sinoma * sinpsia;
  rp[7] = sinoma * cospsia * coseps0 - cosoma * sineps0;
  rp[8] = sinoma * cospsia * sineps0 + cosoma * coseps0;
}

function epsilnOwen1986(tjd: number): number {
  const { t0, icof } = getOwenT0Icof(tjd);
  const { k } = owenChebyshevBasis(tjd, t0);
  let eps = 0;
  for (let i = 0; i < 10; i++) {
    eps += k[i] * owenEps0Coef[icof][i];
  }
  return eps;
}

/* ================================================================
 * 13. Obliquity of the ecliptic
 * ================================================================ */

const OFFSET_EPS_JPLHORIZONS = 35.95;
const DCOR_EPS_JPL_TJD0 = 2437846.5;
const NDCOR_EPS_JPL = 51;

const dcorEpsJpl = [
  36.726, 36.627, 36.595, 36.578, 36.640, 36.659, 36.731, 36.765,
  36.662, 36.555, 36.335, 36.321, 36.354, 36.227, 36.289, 36.348, 36.257, 36.163,
  35.979, 35.896, 35.842, 35.825, 35.912, 35.950, 36.093, 36.191, 36.009, 35.943,
  35.875, 35.771, 35.788, 35.753, 35.822, 35.866, 35.771, 35.732, 35.543, 35.498,
  35.449, 35.409, 35.497, 35.556, 35.672, 35.760, 35.596, 35.565, 35.510, 35.394,
  35.385, 35.375, 35.415,
];

export function swiEpsiln(J: number, iflag: number, swed: SweData): number {
  const T = (J - J2000) / 36525.0;
  const precModel = getPrecModel(swed);
  const precModelShort = getPrecModelShort(swed);
  const jplhoraModel = getJplHoraModel(swed);
  let isJplhor = false;
  if (iflag & SEFLG_JPLHOR) isJplhor = true;
  if ((iflag & SEFLG_JPLHOR_APPROX)
    && jplhoraModel === SEMOD_JPLHORA_3
    && J <= HORIZONS_TJD0_DPSI_DEPS_IAU1980)
    isJplhor = true;

  let eps: number;
  if (isJplhor) {
    if (J > 2378131.5 && J < 2525323.5) {
      eps = (((1.813e-3 * T - 5.9e-4) * T - 46.8150) * T + 84381.448) * DEGTORAD / 3600;
    } else {
      eps = epsilnOwen1986(J) * DEGTORAD;
    }
  } else if ((iflag & SEFLG_JPLHOR_APPROX) && jplhoraModel === SEMOD_JPLHORA_2) {
    eps = (((1.813e-3 * T - 5.9e-4) * T - 46.8150) * T + 84381.448) * DEGTORAD / 3600;
  } else if (precModelShort === SEMOD_PREC_IAU_1976 && Math.abs(T) <= PREC_IAU_1976_CTIES) {
    eps = (((1.813e-3 * T - 5.9e-4) * T - 46.8150) * T + 84381.448) * DEGTORAD / 3600;
  } else if (precModel === SEMOD_PREC_IAU_1976) {
    eps = (((1.813e-3 * T - 5.9e-4) * T - 46.8150) * T + 84381.448) * DEGTORAD / 3600;
  } else if (precModelShort === SEMOD_PREC_IAU_2000 && Math.abs(T) <= PREC_IAU_2000_CTIES) {
    eps = (((1.813e-3 * T - 5.9e-4) * T - 46.84024) * T + 84381.406) * DEGTORAD / 3600;
  } else if (precModel === SEMOD_PREC_IAU_2000) {
    eps = (((1.813e-3 * T - 5.9e-4) * T - 46.84024) * T + 84381.406) * DEGTORAD / 3600;
  } else if (precModelShort === SEMOD_PREC_IAU_2006 && Math.abs(T) <= PREC_IAU_2006_CTIES) {
    eps = (((((-4.34e-8 * T - 5.76e-7) * T + 2.0034e-3) * T - 1.831e-4) * T - 46.836769) * T + 84381.406) * DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_NEWCOMB) {
    const Tn = (J - 2396758.0) / 36525.0;
    eps = (0.0017 * Tn * Tn * Tn - 0.0085 * Tn * Tn - 46.837 * Tn + 84451.68) * DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_IAU_2006) {
    eps = (((((-4.34e-8 * T - 5.76e-7) * T + 2.0034e-3) * T - 1.831e-4) * T - 46.836769) * T + 84381.406) * DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_BRETAGNON_2003) {
    eps = ((((((- 3e-11 * T - 2.48e-8) * T - 5.23e-7) * T + 1.99911e-3) * T - 1.667e-4) * T - 46.836051) * T + 84381.40880) * DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_SIMON_1994) {
    eps = (((((2.5e-8 * T - 5.1e-7) * T + 1.9989e-3) * T - 1.52e-4) * T - 46.80927) * T + 84381.412) * DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_WILLIAMS_1994) {
    eps = ((((-1.0e-6 * T + 2.0e-3) * T - 1.74e-4) * T - 46.833960) * T + 84381.409) * DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_LASKAR_1986 || precModel === SEMOD_PREC_WILL_EPS_LASK) {
    let T10 = T / 10.0;
    eps = ((((((((( 2.45e-10 * T10 + 5.79e-9) * T10 + 2.787e-7) * T10
      + 7.12e-7) * T10 - 3.905e-5) * T10 - 2.4967e-3) * T10
      - 5.138e-3) * T10 + 1.99925) * T10 - 0.0155) * T10 - 468.093) * T10
      + 84381.448;
    eps *= DEGTORAD / 3600.0;
  } else if (precModel === SEMOD_PREC_OWEN_1990) {
    eps = epsilnOwen1986(J) * DEGTORAD;
  } else {
    // SEMOD_PREC_VONDRAK_2011
    const { deps } = swiLdpPeps(J);
    eps = deps;
    if ((iflag & SEFLG_JPLHOR_APPROX) && jplhoraModel !== SEMOD_JPLHORA_2) {
      let tofs = (J - DCOR_EPS_JPL_TJD0) / 365.25;
      let dofs = OFFSET_EPS_JPLHORIZONS;
      if (tofs < 0) {
        tofs = 0;
        dofs = dcorEpsJpl[0];
      } else if (tofs >= NDCOR_EPS_JPL - 1) {
        tofs = NDCOR_EPS_JPL;
        dofs = dcorEpsJpl[NDCOR_EPS_JPL - 1];
      } else {
        const t0 = Math.trunc(tofs);
        dofs = (tofs - t0) * (dcorEpsJpl[t0] - dcorEpsJpl[t0 + 1]) + dcorEpsJpl[t0];
      }
      dofs /= (1000.0 * 3600.0);
      eps += dofs * DEGTORAD;
    }
  }
  return eps;
}

/* ================================================================
 * 14. Precession methods 1, 2, 3 and swi_precess dispatcher
 * ================================================================ */

function precess1(R: Float64Array | number[], J: number, direction: number, precMethod: number): number {
  if (J === J2000) return 0;
  const T = (J - J2000) / 36525.0;
  let Z = 0, z = 0, TH = 0;
  if (precMethod === SEMOD_PREC_IAU_1976) {
    Z = ((0.017998 * T + 0.30188) * T + 2306.2181) * T * DEGTORAD / 3600;
    z = ((0.018203 * T + 1.09468) * T + 2306.2181) * T * DEGTORAD / 3600;
    TH = ((-0.041833 * T - 0.42665) * T + 2004.3109) * T * DEGTORAD / 3600;
  } else if (precMethod === SEMOD_PREC_IAU_2000) {
    Z = (((((-0.0000002 * T - 0.0000327) * T + 0.0179663) * T + 0.3019015) * T + 2306.0809506) * T + 2.5976176) * DEGTORAD / 3600;
    z = (((((-0.0000003 * T - 0.000047) * T + 0.0182237) * T + 1.0947790) * T + 2306.0803226) * T - 2.5976176) * DEGTORAD / 3600;
    TH = ((((-0.0000001 * T - 0.0000601) * T - 0.0418251) * T - 0.4269353) * T + 2004.1917476) * T * DEGTORAD / 3600;
  } else if (precMethod === SEMOD_PREC_IAU_2006) {
    Z = (((((-0.0000003173 * T - 0.000005971) * T + 0.01801828) * T + 0.2988499) * T + 2306.083227) * T + 2.650545) * DEGTORAD / 3600;
    z = (((((-0.0000002904 * T - 0.000028596) * T + 0.01826837) * T + 1.0927348) * T + 2306.077181) * T - 2.650545) * DEGTORAD / 3600;
    TH = ((((-0.00000011274 * T - 0.000007089) * T - 0.04182264) * T - 0.4294934) * T + 2004.191903) * T * DEGTORAD / 3600;
  } else if (precMethod === SEMOD_PREC_BRETAGNON_2003) {
    Z = ((((((-0.00000000013 * T - 0.0000003040) * T - 0.000005708) * T + 0.01801752) * T + 0.3023262) * T + 2306.080472) * T + 2.72767) * DEGTORAD / 3600;
    z = ((((((-0.00000000005 * T - 0.0000002486) * T - 0.000028276) * T + 0.01826676) * T + 1.0956768) * T + 2306.076070) * T - 2.72767) * DEGTORAD / 3600;
    TH = ((((((0.000000000009 * T + 0.00000000036) * T - 0.0000001127) * T - 0.000007291) * T - 0.04182364) * T - 0.4266980) * T + 2004.190936) * T * DEGTORAD / 3600;
  } else if (precMethod === SEMOD_PREC_NEWCOMB) {
    const mills = 365242.198782;
    const t1 = (J2000 - B1850) / mills;
    const t2 = (J - B1850) / mills;
    const Tn = t2 - t1;
    const T2 = Tn * Tn, T3 = T2 * Tn;
    const Z1 = 23035.5548 + 139.720 * t1 + 0.069 * t1 * t1;
    Z = (Z1 * Tn + (30.242 - 0.269 * t1) * T2 + 17.996 * T3) * DEGTORAD / 3600.0;
    z = (Z1 * Tn + (109.478 - 0.387 * t1) * T2 + 18.324 * T3) * DEGTORAD / 3600.0;
    TH = ((20051.125 - 85.294 * t1 - 0.365 * t1 * t1) * Tn + (-42.647 - 0.365 * t1) * T2 - 41.802 * T3) * DEGTORAD / 3600.0;
  } else {
    return 0;
  }
  const sinth = Math.sin(TH), costh = Math.cos(TH);
  const sinZ = Math.sin(Z), cosZ = Math.cos(Z);
  const sinz = Math.sin(z), cosz = Math.cos(z);
  const A = cosZ * costh;
  const B = sinZ * costh;
  const x = [0, 0, 0];
  if (direction < 0) {
    // From J2000.0 to J
    x[0] = (A * cosz - sinZ * sinz) * R[0] - (B * cosz + cosZ * sinz) * R[1] - sinth * cosz * R[2];
    x[1] = (A * sinz + sinZ * cosz) * R[0] - (B * sinz - cosZ * cosz) * R[1] - sinth * sinz * R[2];
    x[2] = cosZ * sinth * R[0] - sinZ * sinth * R[1] + costh * R[2];
  } else {
    // From J to J2000.0
    x[0] = (A * cosz - sinZ * sinz) * R[0] + (A * sinz + sinZ * cosz) * R[1] + cosZ * sinth * R[2];
    x[1] = -(B * cosz + cosZ * sinz) * R[0] - (B * sinz - cosZ * cosz) * R[1] - sinZ * sinth * R[2];
    x[2] = -sinth * cosz * R[0] - sinth * sinz * R[1] + costh * R[2];
  }
  R[0] = x[0]; R[1] = x[1]; R[2] = x[2];
  return 0;
}

/* Laskar/Simon/Williams precession coefficient tables */
const pAcofWilliams = [-8.66e-10, -4.759e-8, 2.424e-7, 1.3095e-5, 1.7451e-4, -1.8055e-3, -0.235316, 0.076, 110.5407, 50287.70000];
const nodecofWilliams = [6.6402e-16, -2.69151e-15, -1.547021e-12, 7.521313e-12, 1.9e-10, -3.54e-9, -1.8103e-7, 1.26e-7, 7.436169e-5, -0.04207794833, 3.052115282424];
const inclcofWilliams = [1.2147e-16, 7.3759e-17, -8.26287e-14, 2.503410e-13, 2.4650839e-11, -5.4000441e-11, 1.32115526e-9, -6.012e-7, -1.62442e-5, 0.00227850649, 0.0];

const pAcofSimon = [-8.66e-10, -4.759e-8, 2.424e-7, 1.3095e-5, 1.7451e-4, -1.8055e-3, -0.235316, 0.07732, 111.2022, 50288.200];
const nodecofSimon = [6.6402e-16, -2.69151e-15, -1.547021e-12, 7.521313e-12, 1.9e-10, -3.54e-9, -1.8103e-7, 2.579e-8, 7.4379679e-5, -0.0420782900, 3.0521126906];
const inclcofSimon = [1.2147e-16, 7.3759e-17, -8.26287e-14, 2.503410e-13, 2.4650839e-11, -5.4000441e-11, 1.32115526e-9, -5.99908e-7, -1.624383e-5, 0.002278492868, 0.0];

const pAcofLaskar = [-8.66e-10, -4.759e-8, 2.424e-7, 1.3095e-5, 1.7451e-4, -1.8055e-3, -0.235316, 0.07732, 111.1971, 50290.966];
const nodecofLaskar = [6.6402e-16, -2.69151e-15, -1.547021e-12, 7.521313e-12, 6.3190131e-10, -3.48388152e-9, -1.813065896e-7, 2.75036225e-8, 7.4394531426e-5, -0.042078604317, 3.052112654975];
const inclcofLaskar = [1.2147e-16, 7.3759e-17, -8.26287e-14, 2.503410e-13, 2.4650839e-11, -5.4000441e-11, 1.32115526e-9, -5.998737027e-7, -1.6242797091e-5, 0.002278495537, 0.0];

function precess2(R: Float64Array | number[], J: number, iflag: number, direction: number, precMethod: number, swed: SweData): number {
  if (J === J2000) return 0;
  let pAcof: number[], nodecof: number[], inclcof: number[];
  if (precMethod === SEMOD_PREC_SIMON_1994) {
    pAcof = pAcofSimon as unknown as number[];
    nodecof = nodecofSimon as unknown as number[];
    inclcof = inclcofSimon as unknown as number[];
  } else if (precMethod === SEMOD_PREC_WILLIAMS_1994) {
    pAcof = pAcofWilliams as unknown as number[];
    nodecof = nodecofWilliams as unknown as number[];
    inclcof = inclcofWilliams as unknown as number[];
  } else {
    pAcof = pAcofLaskar as unknown as number[];
    nodecof = nodecofLaskar as unknown as number[];
    inclcof = inclcofLaskar as unknown as number[];
  }
  let T = (J - J2000) / 36525.0;
  // rotate from equator to ecliptic
  let eps: number;
  if (direction === 1) eps = swiEpsiln(J, iflag, swed);
  else eps = swiEpsiln(J2000, iflag, swed);
  let sineps = Math.sin(eps), coseps = Math.cos(eps);
  const x = [R[0], coseps * R[1] + sineps * R[2], -sineps * R[1] + coseps * R[2]];

  T /= 10.0; // thousands of years
  let pA = pAcof[0];
  for (let i = 1; i <= 9; i++) pA = pA * T + pAcof[i];
  pA *= DEGTORAD / 3600 * T;

  let W = nodecof[0];
  for (let i = 1; i <= 10; i++) W = W * T + nodecof[i];

  // rotate to node
  let zz = direction === 1 ? W + pA : W;
  let B = Math.cos(zz), A = Math.sin(zz);
  let tmp = B * x[0] + A * x[1];
  x[1] = -A * x[0] + B * x[1];
  x[0] = tmp;

  // rotate by inclination
  let incl = inclcof[0];
  for (let i = 1; i <= 10; i++) incl = incl * T + inclcof[i];
  if (direction === 1) incl = -incl;
  B = Math.cos(incl); A = Math.sin(incl);
  tmp = B * x[1] + A * x[2];
  x[2] = -A * x[1] + B * x[2];
  x[1] = tmp;

  // rotate back from node
  zz = direction === 1 ? -W : -W - pA;
  B = Math.cos(zz); A = Math.sin(zz);
  tmp = B * x[0] + A * x[1];
  x[1] = -A * x[0] + B * x[1];
  x[0] = tmp;

  // rotate to final equator
  if (direction === 1) eps = swiEpsiln(J2000, iflag, swed);
  else eps = swiEpsiln(J, iflag, swed);
  sineps = Math.sin(eps); coseps = Math.cos(eps);
  tmp = coseps * x[1] - sineps * x[2];
  x[2] = sineps * x[1] + coseps * x[2];
  x[1] = tmp;
  R[0] = x[0]; R[1] = x[1]; R[2] = x[2];
  return 0;
}

function precess3(R: Float64Array | number[], J: number, direction: number, iflag: number, precMeth: number): number {
  if (J === J2000) return 0;
  const pmat = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (precMeth === SEMOD_PREC_OWEN_1990) {
    owenPreMatrix(J, pmat, iflag);
  } else {
    prePmat(J, pmat);
  }
  const x = [0, 0, 0];
  if (direction === -1) {
    for (let i = 0; i <= 2; i++) {
      const j = i * 3;
      x[i] = R[0] * pmat[j] + R[1] * pmat[j + 1] + R[2] * pmat[j + 2];
    }
  } else {
    for (let i = 0; i <= 2; i++) {
      x[i] = R[0] * pmat[i] + R[1] * pmat[i + 3] + R[2] * pmat[i + 6];
    }
  }
  R[0] = x[0]; R[1] = x[1]; R[2] = x[2];
  return 0;
}

/** Precess equatorial coordinates between J and J2000 */
export function swiPrecess(R: Float64Array | number[], J: number, iflag: number, direction: number, swed: SweData): number {
  const T = (J - J2000) / 36525.0;
  const precModel = getPrecModel(swed);
  const precModelShort = getPrecModelShort(swed);
  const jplhoraModel = getJplHoraModel(swed);
  let isJplhor = false;
  if (iflag & SEFLG_JPLHOR) isJplhor = true;
  if ((iflag & SEFLG_JPLHOR_APPROX)
    && jplhoraModel === SEMOD_JPLHORA_3
    && J <= HORIZONS_TJD0_DPSI_DEPS_IAU1980) isJplhor = true;

  if (isJplhor) {
    if (J > 2378131.5 && J < 2525323.5) {
      return precess1(R, J, direction, SEMOD_PREC_IAU_1976);
    } else {
      return precess3(R, J, direction, iflag, SEMOD_PREC_OWEN_1990);
    }
  } else if (precModelShort === SEMOD_PREC_IAU_1976 && Math.abs(T) <= PREC_IAU_1976_CTIES) {
    return precess1(R, J, direction, SEMOD_PREC_IAU_1976);
  } else if (precModel === SEMOD_PREC_IAU_1976) {
    return precess1(R, J, direction, SEMOD_PREC_IAU_1976);
  } else if (precModelShort === SEMOD_PREC_IAU_2000 && Math.abs(T) <= PREC_IAU_2000_CTIES) {
    return precess1(R, J, direction, SEMOD_PREC_IAU_2000);
  } else if (precModel === SEMOD_PREC_IAU_2000) {
    return precess1(R, J, direction, SEMOD_PREC_IAU_2000);
  } else if (precModelShort === SEMOD_PREC_IAU_2006 && Math.abs(T) <= PREC_IAU_2006_CTIES) {
    return precess1(R, J, direction, SEMOD_PREC_IAU_2006);
  } else if (precModel === SEMOD_PREC_IAU_2006) {
    return precess1(R, J, direction, SEMOD_PREC_IAU_2006);
  } else if (precModel === SEMOD_PREC_BRETAGNON_2003) {
    return precess1(R, J, direction, SEMOD_PREC_BRETAGNON_2003);
  } else if (precModel === SEMOD_PREC_NEWCOMB) {
    return precess1(R, J, direction, SEMOD_PREC_NEWCOMB);
  } else if (precModel === SEMOD_PREC_LASKAR_1986) {
    return precess2(R, J, iflag, direction, SEMOD_PREC_LASKAR_1986, swed);
  } else if (precModel === SEMOD_PREC_SIMON_1994) {
    return precess2(R, J, iflag, direction, SEMOD_PREC_SIMON_1994, swed);
  } else if (precModel === SEMOD_PREC_WILLIAMS_1994 || precModel === SEMOD_PREC_WILL_EPS_LASK) {
    return precess2(R, J, iflag, direction, SEMOD_PREC_WILLIAMS_1994, swed);
  } else if (precModel === SEMOD_PREC_OWEN_1990) {
    return precess3(R, J, direction, iflag, SEMOD_PREC_OWEN_1990);
  } else {
    // SEMOD_PREC_VONDRAK_2011
    return precess3(R, J, direction, iflag, SEMOD_PREC_VONDRAK_2011);
  }
}

/* ================================================================
 * 15. Nutation — IAU 1980
 * ================================================================ */

// prettier-ignore
const nt = [
/* MM,MS,FF,DD,OM, LS, LS2,OC, OC2 */
 0, 0, 0, 0, 2,  2062,  2, -895,  5,
-2, 0, 2, 0, 1,    46,  0,  -24,  0,
 2, 0,-2, 0, 0,    11,  0,    0,  0,
-2, 0, 2, 0, 2,    -3,  0,    1,  0,
 1,-1, 0,-1, 0,    -3,  0,    0,  0,
 0,-2, 2,-2, 1,    -2,  0,    1,  0,
 2, 0,-2, 0, 1,     1,  0,    0,  0,
 0, 0, 2,-2, 2,-13187,-16, 5736,-31,
 0, 1, 0, 0, 0,  1426,-34,   54, -1,
 0, 1, 2,-2, 2,  -517, 12,  224, -6,
 0,-1, 2,-2, 2,   217, -5,  -95,  3,
 0, 0, 2,-2, 1,   129,  1,  -70,  0,
 2, 0, 0,-2, 0,    48,  0,    1,  0,
 0, 0, 2,-2, 0,   -22,  0,    0,  0,
 0, 2, 0, 0, 0,    17, -1,    0,  0,
 0, 1, 0, 0, 1,   -15,  0,    9,  0,
 0, 2, 2,-2, 2,   -16,  1,    7,  0,
 0,-1, 0, 0, 1,   -12,  0,    6,  0,
-2, 0, 0, 2, 1,    -6,  0,    3,  0,
 0,-1, 2,-2, 1,    -5,  0,    3,  0,
 2, 0, 0,-2, 1,     4,  0,   -2,  0,
 0, 1, 2,-2, 1,     4,  0,   -2,  0,
 1, 0, 0,-1, 0,    -4,  0,    0,  0,
 2, 1, 0,-2, 0,     1,  0,    0,  0,
 0, 0,-2, 2, 1,     1,  0,    0,  0,
 0, 1,-2, 2, 0,    -1,  0,    0,  0,
 0, 1, 0, 0, 2,     1,  0,    0,  0,
-1, 0, 0, 1, 1,     1,  0,    0,  0,
 0, 1, 2,-2, 0,    -1,  0,    0,  0,
 0, 0, 2, 0, 2, -2274, -2,  977, -5,
 1, 0, 0, 0, 0,   712,  1,   -7,  0,
 0, 0, 2, 0, 1,  -386, -4,  200,  0,
 1, 0, 2, 0, 2,  -301,  0,  129, -1,
 1, 0, 0,-2, 0,  -158,  0,   -1,  0,
-1, 0, 2, 0, 2,   123,  0,  -53,  0,
 0, 0, 0, 2, 0,    63,  0,   -2,  0,
 1, 0, 0, 0, 1,    63,  1,  -33,  0,
-1, 0, 0, 0, 1,   -58, -1,   32,  0,
-1, 0, 2, 2, 2,   -59,  0,   26,  0,
 1, 0, 2, 0, 1,   -51,  0,   27,  0,
 0, 0, 2, 2, 2,   -38,  0,   16,  0,
 2, 0, 0, 0, 0,    29,  0,   -1,  0,
 1, 0, 2,-2, 2,    29,  0,  -12,  0,
 2, 0, 2, 0, 2,   -31,  0,   13,  0,
 0, 0, 2, 0, 0,    26,  0,   -1,  0,
-1, 0, 2, 0, 1,    21,  0,  -10,  0,
-1, 0, 0, 2, 1,    16,  0,   -8,  0,
 1, 0, 0,-2, 1,   -13,  0,    7,  0,
-1, 0, 2, 2, 1,   -10,  0,    5,  0,
 1, 1, 0,-2, 0,    -7,  0,    0,  0,
 0, 1, 2, 0, 2,     7,  0,   -3,  0,
 0,-1, 2, 0, 2,    -7,  0,    3,  0,
 1, 0, 2, 2, 2,    -8,  0,    3,  0,
 1, 0, 0, 2, 0,     6,  0,    0,  0,
 2, 0, 2,-2, 2,     6,  0,   -3,  0,
 0, 0, 0, 2, 1,    -6,  0,    3,  0,
 0, 0, 2, 2, 1,    -7,  0,    3,  0,
 1, 0, 2,-2, 1,     6,  0,   -3,  0,
 0, 0, 0,-2, 1,    -5,  0,    3,  0,
 1,-1, 0, 0, 0,     5,  0,    0,  0,
 2, 0, 2, 0, 1,    -5,  0,    3,  0,
 0, 1, 0,-2, 0,    -4,  0,    0,  0,
 1, 0,-2, 0, 0,     4,  0,    0,  0,
 0, 0, 0, 1, 0,    -4,  0,    0,  0,
 1, 1, 0, 0, 0,    -3,  0,    0,  0,
 1, 0, 2, 0, 0,     3,  0,    0,  0,
 1,-1, 2, 0, 2,    -3,  0,    1,  0,
-1,-1, 2, 2, 2,    -3,  0,    1,  0,
-2, 0, 0, 0, 1,    -2,  0,    1,  0,
 3, 0, 2, 0, 2,    -3,  0,    1,  0,
 0,-1, 2, 2, 2,    -3,  0,    1,  0,
 1, 1, 2, 0, 2,     2,  0,   -1,  0,
-1, 0, 2,-2, 1,    -2,  0,    1,  0,
 2, 0, 0, 0, 1,     2,  0,   -1,  0,
 1, 0, 0, 0, 2,    -2,  0,    1,  0,
 3, 0, 0, 0, 0,     2,  0,    0,  0,
 0, 0, 2, 1, 2,     2,  0,   -1,  0,
-1, 0, 0, 0, 2,     1,  0,   -1,  0,
 1, 0, 0,-4, 0,    -1,  0,    0,  0,
-2, 0, 2, 2, 2,     1,  0,   -1,  0,
-1, 0, 2, 4, 2,    -2,  0,    1,  0,
 2, 0, 0,-4, 0,    -1,  0,    0,  0,
 1, 1, 2,-2, 2,     1,  0,   -1,  0,
 1, 0, 2, 2, 1,    -1,  0,    1,  0,
-2, 0, 2, 4, 2,    -1,  0,    1,  0,
-1, 0, 4, 0, 2,     1,  0,    0,  0,
 1,-1, 0,-2, 0,     1,  0,    0,  0,
 2, 0, 2,-2, 1,     1,  0,   -1,  0,
 2, 0, 2, 2, 2,    -1,  0,    0,  0,
 1, 0, 0, 2, 1,    -1,  0,    0,  0,
 0, 0, 4,-2, 2,     1,  0,    0,  0,
 3, 0, 2,-2, 2,     1,  0,    0,  0,
 1, 0, 2,-2, 0,    -1,  0,    0,  0,
 0, 1, 2, 0, 1,     1,  0,    0,  0,
-1,-1, 0, 2, 1,     1,  0,    0,  0,
 0, 0,-2, 0, 1,    -1,  0,    0,  0,
 0, 0, 2,-1, 2,    -1,  0,    0,  0,
 0, 1, 0, 2, 0,    -1,  0,    0,  0,
 1, 0,-2,-2, 0,    -1,  0,    0,  0,
 0,-1, 2, 0, 1,    -1,  0,    0,  0,
 1, 1, 0,-2, 1,    -1,  0,    0,  0,
 1, 0,-2, 2, 0,    -1,  0,    0,  0,
 2, 0, 0, 2, 0,     1,  0,    0,  0,
 0, 0, 2, 4, 2,    -1,  0,    0,  0,
 0, 1, 0, 1, 0,     1,  0,    0,  0,
// corrections to IAU 1980 nutation series by Herring 1987 (in 0.00001")
 101, 0, 0, 0, 1,-725, 0, 213, 0,
 101, 1, 0, 0, 0, 523, 0, 208, 0,
 101, 0, 2,-2, 2, 102, 0, -41, 0,
 101, 0, 2, 0, 2, -81, 0,  32, 0,
// cos for nutl and sin for nuto
 102, 0, 0, 0, 1, 417, 0, 224, 0,
 102, 1, 0, 0, 0,  61, 0, -24, 0,
 102, 0, 2,-2, 2,-118, 0, -47, 0,
 ENDMARK,
];

function calcNutationIau1980(J: number, nutlo: number[], swed: SweData): number {
  const nutModel = getNutModel(swed);
  const T = (J - J2000) / 36525.0;
  const T2 = T * T;
  // Fundamental arguments
  let OM = -6962890.539 * T + 450160.280 + (0.008 * T + 7.455) * T2;
  OM = sweDegnorm(OM / 3600) * DEGTORAD;
  let MS = 129596581.224 * T + 1287099.804 - (0.012 * T + 0.577) * T2;
  MS = sweDegnorm(MS / 3600) * DEGTORAD;
  let MM = 1717915922.633 * T + 485866.733 + (0.064 * T + 31.310) * T2;
  MM = sweDegnorm(MM / 3600) * DEGTORAD;
  let FF = 1739527263.137 * T + 335778.877 + (0.011 * T - 13.257) * T2;
  FF = sweDegnorm(FF / 3600) * DEGTORAD;
  let DD = 1602961601.328 * T + 1072261.307 + (0.019 * T - 6.891) * T2;
  DD = sweDegnorm(DD / 3600) * DEGTORAD;
  const args = [MM, MS, FF, DD, OM];
  const ns = [3, 2, 4, 4, 2];
  // Precompute sin/cos of multiple angles
  const ss: number[][] = [[], [], [], [], []];
  const cc: number[][] = [[], [], [], [], []];
  for (let k = 0; k <= 4; k++) {
    const arg = args[k];
    const n = ns[k];
    let su = Math.sin(arg), cu = Math.cos(arg);
    ss[k][0] = su; cc[k][0] = cu;
    let sv = 2.0 * su * cu, cv = cu * cu - su * su;
    ss[k][1] = sv; cc[k][1] = cv;
    for (let i = 2; i < n; i++) {
      const s = su * cv + cu * sv;
      cv = cu * cv - su * sv;
      sv = s;
      ss[k][i] = sv; cc[k][i] = cv;
    }
  }
  // first terms (not in table)
  let C = (-0.01742 * T - 17.1996) * ss[4][0];
  let D = (0.00089 * T + 9.2025) * cc[4][0];
  for (let pi = 0; nt[pi] !== ENDMARK; pi += 9) {
    if (nutModel !== SEMOD_NUT_IAU_CORR_1987 && (nt[pi] === 101 || nt[pi] === 102))
      continue;
    let k1 = 0, cv = 0, sv = 0;
    for (let m = 0; m < 5; m++) {
      let j = nt[pi + m];
      if (j > 100) j = 0;
      if (j !== 0) {
        let k = j < 0 ? -j : j;
        let su = ss[m][k - 1];
        if (j < 0) su = -su;
        const cu = cc[m][k - 1];
        if (k1 === 0) {
          sv = su; cv = cu; k1 = 1;
        } else {
          const sw = su * cv + cu * sv;
          cv = cu * cv - su * sv;
          sv = sw;
        }
      }
    }
    let f = nt[pi + 5] * 0.0001;
    if (nt[pi + 6] !== 0) f += 0.00001 * T * nt[pi + 6];
    let g = nt[pi + 7] * 0.0001;
    if (nt[pi + 8] !== 0) g += 0.00001 * T * nt[pi + 8];
    if (nt[pi] >= 100) { f *= 0.1; g *= 0.1; }
    if (nt[pi] !== 102) {
      C += f * sv;
      D += g * cv;
    } else {
      C += f * cv;
      D += g * sv;
    }
  }
  nutlo[0] = DEGTORAD * C / 3600.0;
  nutlo[1] = DEGTORAD * D / 3600.0;
  return 0;
}

/* ================================================================
 * 16. Nutation — IAU 2000A/B
 * ================================================================ */

function calcNutationIau2000ab(J: number, nutlo: number[], swed: SweData): number {
  const nutModel = getNutModel(swed);
  const T = (J - J2000) / 36525.0;
  // Fundamental arguments (Simon et al. 1994)
  const M = sweDegnorm((485868.249036 + T * (1717915923.2178 + T * (31.8792 + T * (0.051635 + T * (-0.00024470))))) / 3600.0) * DEGTORAD;
  const SM = sweDegnorm((1287104.79305 + T * (129596581.0481 + T * (-0.5532 + T * (0.000136 + T * (-0.00001149))))) / 3600.0) * DEGTORAD;
  const F = sweDegnorm((335779.526232 + T * (1739527262.8478 + T * (-12.7512 + T * (-0.001037 + T * 0.00000417)))) / 3600.0) * DEGTORAD;
  const D = sweDegnorm((1072260.70369 + T * (1602961601.2090 + T * (-6.3706 + T * (0.006593 + T * (-0.00003169))))) / 3600.0) * DEGTORAD;
  const OM = sweDegnorm((450160.398036 + T * (-6962890.5431 + T * (7.4722 + T * (0.007702 + T * (-0.00005939))))) / 3600.0) * DEGTORAD;

  // luni-solar nutation
  const inls = nutModel === SEMOD_NUT_IAU_2000B ? NLS_2000B : NLS;
  let dpsi = 0, deps = 0;
  for (let i = inls - 1; i >= 0; i--) {
    const j = i * 5;
    const darg = sweRadnorm(
      nutLsArgMul[j] * M + nutLsArgMul[j + 1] * SM +
      nutLsArgMul[j + 2] * F + nutLsArgMul[j + 3] * D +
      nutLsArgMul[j + 4] * OM
    );
    const sinarg = Math.sin(darg);
    const cosarg = Math.cos(darg);
    const k = i * 6;
    dpsi += (nutLsCoef[k] + nutLsCoef[k + 1] * T) * sinarg + nutLsCoef[k + 2] * cosarg;
    deps += (nutLsCoef[k + 3] + nutLsCoef[k + 4] * T) * cosarg + nutLsCoef[k + 5] * sinarg;
  }
  nutlo[0] = dpsi * O1MAS2DEG;
  nutlo[1] = deps * O1MAS2DEG;

  if (nutModel === SEMOD_NUT_IAU_2000A) {
    // planetary nutation
    const AL = sweRadnorm(2.35555598 + 8328.6914269554 * T);
    const ALSU = sweRadnorm(6.24006013 + 628.301955 * T);
    const AF = sweRadnorm(1.627905234 + 8433.466158131 * T);
    const AD = sweRadnorm(5.198466741 + 7771.3771468121 * T);
    const AOM = sweRadnorm(2.18243920 - 33.757045 * T);
    const ALME = sweRadnorm(4.402608842 + 2608.7903141574 * T);
    const ALVE = sweRadnorm(3.176146697 + 1021.3285546211 * T);
    const ALEA = sweRadnorm(1.753470314 + 628.3075849991 * T);
    const ALMA = sweRadnorm(6.203480913 + 334.0612426700 * T);
    const ALJU = sweRadnorm(0.599546497 + 52.9690962641 * T);
    const ALSA = sweRadnorm(0.874016757 + 21.3299104960 * T);
    const ALUR = sweRadnorm(5.481293871 + 7.4781598567 * T);
    const ALNE = sweRadnorm(5.321159000 + 3.8127774000 * T);
    const APA = (0.02438175 + 0.00000538691 * T) * T;
    const plArgs = [AL, ALSU, AF, AD, AOM, ALME, ALVE, ALEA, ALMA, ALJU, ALSA, ALUR, ALNE, APA];

    dpsi = 0; deps = 0;
    for (let i = NPL - 1; i >= 0; i--) {
      const j = i * 14;
      let darg = 0;
      for (let m = 0; m < 14; m++) darg += nutPlArgMul[j + m] * plArgs[m];
      darg = sweRadnorm(darg);
      const sinarg = Math.sin(darg);
      const cosarg = Math.cos(darg);
      const k = i * 4;
      dpsi += nutPlCoef[k] * sinarg + nutPlCoef[k + 1] * cosarg;
      deps += nutPlCoef[k + 2] * sinarg + nutPlCoef[k + 3] * cosarg;
    }
    nutlo[0] += dpsi * O1MAS2DEG;
    nutlo[1] += deps * O1MAS2DEG;

    // P03 precession corrections (Capitaine et al. 2005 = IAU 2006)
    dpsi = -8.1 * Math.sin(OM) - 0.6 * Math.sin(2 * F - 2 * D + 2 * OM);
    dpsi += T * (47.8 * Math.sin(OM) + 3.7 * Math.sin(2 * F - 2 * D + 2 * OM) + 0.6 * Math.sin(2 * F + 2 * OM) - 0.6 * Math.sin(2 * OM));
    deps = T * (-25.6 * Math.cos(OM) - 1.6 * Math.cos(2 * F - 2 * D + 2 * OM));
    nutlo[0] += dpsi / (3600.0 * 1000000.0);
    nutlo[1] += deps / (3600.0 * 1000000.0);
  }
  nutlo[0] *= DEGTORAD;
  nutlo[1] *= DEGTORAD;
  return 0;
}

/* ================================================================
 * 17. Nutation — Woolard 1953
 * ================================================================ */

function calcNutationWoolard(J: number, nutlo: number[]): number {
  const mjd = J - J1900;
  const t = mjd / 36525.0;
  const t2 = t * t;
  let a: number, b: number;
  a = 100.0021358 * t; b = 360.0 * (a - Math.trunc(a));
  const ls = 279.697 + 0.000303 * t2 + b;
  a = 1336.855231 * t; b = 360.0 * (a - Math.trunc(a));
  const ld = 270.434 - 0.001133 * t2 + b;
  a = 99.99736056000026 * t; b = 360.0 * (a - Math.trunc(a));
  const ms = (358.476 - 0.00015 * t2 + b) * DEGTORAD;
  a = 13255523.59 * t; b = 360.0 * (a - Math.trunc(a));
  const md = (296.105 + 0.009192 * t2 + b) * DEGTORAD;
  a = 5.372616667 * t; b = 360.0 * (a - Math.trunc(a));
  const nm = (259.183 + 0.002078 * t2 - b) * DEGTORAD;
  const tls = 2 * ls * DEGTORAD;
  const tnm = 2 * nm;
  const tld = 2 * ld * DEGTORAD;

  const dpsi = (-17.2327 - 0.01737 * t) * Math.sin(nm) + (-1.2729 - 0.00013 * t) * Math.sin(tls)
    + 0.2088 * Math.sin(tnm) - 0.2037 * Math.sin(tld) + (0.1261 - 0.00031 * t) * Math.sin(ms)
    + 0.0675 * Math.sin(md) - (0.0497 - 0.00012 * t) * Math.sin(tls + ms)
    - 0.0342 * Math.sin(tld - nm) - 0.0261 * Math.sin(tld + md) + 0.0214 * Math.sin(tls - ms)
    - 0.0149 * Math.sin(tls - tld + md) + 0.0124 * Math.sin(tls - nm) + 0.0114 * Math.sin(tld - md);
  const deps = (9.21 + 0.00091 * t) * Math.cos(nm) + (0.5522 - 0.00029 * t) * Math.cos(tls)
    - 0.0904 * Math.cos(tnm) + 0.0884 * Math.cos(tld) + 0.0216 * Math.cos(tls + ms)
    + 0.0183 * Math.cos(tld - nm) + 0.0113 * Math.cos(tld + md) - 0.0093 * Math.cos(tls - ms)
    - 0.0066 * Math.cos(tls - nm);
  nutlo[0] = dpsi / 3600.0 * DEGTORAD;
  nutlo[1] = deps / 3600.0 * DEGTORAD;
  return OK;
}

/* ================================================================
 * 18. Bessel interpolation and nutation dispatcher
 * ================================================================ */

function bessel(v: Float64Array | null, n: number, t: number): number {
  if (!v) return 0;
  if (t <= 0) return v[0];
  if (t >= n - 1) return v[n - 1];
  const p0 = Math.floor(t);
  const iy = Math.trunc(t);
  let ans = v[iy];
  const k0 = iy + 1;
  if (k0 >= n) return ans;
  const p = t - p0;
  ans += p * (v[k0] - v[iy]);
  if (iy - 1 < 0 || iy + 2 >= n) return ans;
  // first differences
  const d = [0, 0, 0, 0, 0, 0];
  let k = iy - 2;
  for (let i = 0; i < 5; i++) {
    d[i] = (k < 0 || k + 1 >= n) ? 0 : v[k + 1] - v[k];
    k++;
  }
  // second differences
  for (let i = 0; i < 4; i++) d[i] = d[i + 1] - d[i];
  let B = 0.25 * p * (p - 1.0);
  ans += B * (d[1] + d[2]);
  if (iy + 2 >= n) return ans;
  // third differences
  for (let i = 0; i < 3; i++) d[i] = d[i + 1] - d[i];
  B = 2.0 * B / 3.0;
  ans += (p - 0.5) * B * d[1];
  if (iy - 2 < 0 || iy + 3 > n) return ans;
  // fourth differences
  for (let i = 0; i < 2; i++) d[i] = d[i + 1] - d[i];
  B = 0.125 * B * (p + 1.0) * (p - 2.0);
  ans += B * (d[0] + d[1]);
  return ans;
}

function calcNutation(J: number, iflag: number, nutlo: number[], swed: SweData): number {
  const nutModel = getNutModel(swed);
  const jplhoraModel = getJplHoraModel(swed);
  let isJplhor = false;
  if (iflag & SEFLG_JPLHOR) isJplhor = true;
  if ((iflag & SEFLG_JPLHOR_APPROX)
    && jplhoraModel === SEMOD_JPLHORA_3
    && J <= HORIZONS_TJD0_DPSI_DEPS_IAU1980) isJplhor = true;

  if (isJplhor) {
    calcNutationIau1980(J, nutlo, swed);
    if (iflag & SEFLG_JPLHOR) {
      const n = Math.trunc(swed.eopTjdEnd - swed.eopTjdBeg + 0.000001);
      let J2 = J;
      if (J < swed.eopTjdBegHorizons) J2 = swed.eopTjdBegHorizons;
      const dpsi = bessel(swed.dpsi, n + 1, J2 - swed.eopTjdBeg);
      const deps = bessel(swed.deps, n + 1, J2 - swed.eopTjdBeg);
      nutlo[0] += dpsi / 3600.0 * DEGTORAD;
      nutlo[1] += deps / 3600.0 * DEGTORAD;
    } else {
      nutlo[0] += DPSI_IAU1980_TJD0 / 3600.0 * DEGTORAD;
      nutlo[1] += DEPS_IAU1980_TJD0 / 3600.0 * DEGTORAD;
    }
  } else if (nutModel === SEMOD_NUT_IAU_1980 || nutModel === SEMOD_NUT_IAU_CORR_1987) {
    calcNutationIau1980(J, nutlo, swed);
  } else if (nutModel === SEMOD_NUT_IAU_2000A || nutModel === SEMOD_NUT_IAU_2000B) {
    calcNutationIau2000ab(J, nutlo, swed);
    if ((iflag & SEFLG_JPLHOR_APPROX) && jplhoraModel === SEMOD_JPLHORA_2) {
      nutlo[0] += -41.7750 / 3600.0 / 1000.0 * DEGTORAD;
      nutlo[1] += -6.8192 / 3600.0 / 1000.0 * DEGTORAD;
    }
  } else if (nutModel === SEMOD_NUT_WOOLARD) {
    calcNutationWoolard(J, nutlo);
  }
  return OK;
}

function quadraticIntp(ym: number, y0: number, yp: number, x: number): number {
  const c = y0;
  const b = (yp - ym) / 2.0;
  const a = (yp + ym) / 2.0 - c;
  return a * x * x + b * x + c;
}

export function swiNutation(tjd: number, iflag: number, nutlo: number[], swed: SweData): number {
  let retc = OK;
  if (!swed.doInterpolateNut) {
    retc = calcNutation(tjd, iflag, nutlo, swed);
  } else {
    if (tjd < swed.interpol.tjdNut2 && tjd > swed.interpol.tjdNut0) {
      const dx = (tjd - swed.interpol.tjdNut0) - 1.0;
      nutlo[0] = quadraticIntp(swed.interpol.nutDpsi0, swed.interpol.nutDpsi1, swed.interpol.nutDpsi2, dx);
      nutlo[1] = quadraticIntp(swed.interpol.nutDeps0, swed.interpol.nutDeps1, swed.interpol.nutDeps2, dx);
    } else {
      swed.interpol.tjdNut0 = tjd - 1.0;
      swed.interpol.tjdNut2 = tjd + 1.0;
      const dnut = [0, 0];
      retc = calcNutation(swed.interpol.tjdNut0, iflag, dnut, swed);
      if (retc === ERR) return ERR;
      swed.interpol.nutDpsi0 = dnut[0];
      swed.interpol.nutDeps0 = dnut[1];
      retc = calcNutation(swed.interpol.tjdNut2, iflag, dnut, swed);
      if (retc === ERR) return ERR;
      swed.interpol.nutDpsi2 = dnut[0];
      swed.interpol.nutDeps2 = dnut[1];
      retc = calcNutation(tjd, iflag, nutlo, swed);
      if (retc === ERR) return ERR;
      swed.interpol.nutDpsi1 = nutlo[0];
      swed.interpol.nutDeps1 = nutlo[1];
    }
  }
  return retc;
}

/** Set nutation interpolation mode */
export function sweSetInterpolateNut(swed: SweData, doInterpolate: boolean): void {
  swed.doInterpolateNut = doInterpolate;
  swed.interpol.tjdNut0 = 0;
  swed.interpol.tjdNut2 = 0;
}

/* ================================================================
 * 19. Frame bias (GCRS ↔ J2000) and ICRS ↔ FK5
 * ================================================================ */

const OFFSET_JPLHORIZONS = -52.3;
const DCOR_RA_JPL_TJD0 = 2437846.5;
const NDCOR_RA_JPL = 51;

const dcorRaJpl = [
  -51.257, -51.103, -51.065, -51.503, -51.224, -50.796, -51.161, -51.181,
  -50.932, -51.064, -51.182, -51.386, -51.416, -51.428, -51.586, -51.766, -52.038, -52.370,
  -52.553, -52.397, -52.340, -52.676, -52.348, -51.964, -52.444, -52.364, -51.988, -52.212,
  -52.370, -52.523, -52.541, -52.496, -52.590, -52.629, -52.788, -53.014, -53.053, -52.902,
  -52.850, -53.087, -52.635, -52.185, -52.588, -52.292, -51.796, -51.961, -52.055, -52.134,
  -52.165, -52.141, -52.255,
];

function swiApproxJplhor(x: Float64Array | number[], tjd: number, iflag: number, backward: boolean, swed: SweData): void {
  const jplhoraModel = getJplHoraModel(swed);
  if (!(iflag & SEFLG_JPLHOR_APPROX)) return;
  if (jplhoraModel === SEMOD_JPLHORA_2) return;
  let t = (tjd - DCOR_RA_JPL_TJD0) / 365.25;
  let dofs = OFFSET_JPLHORIZONS;
  if (t < 0) {
    t = 0;
    dofs = dcorRaJpl[0];
  } else if (t >= NDCOR_RA_JPL - 1) {
    t = NDCOR_RA_JPL;
    dofs = dcorRaJpl[NDCOR_RA_JPL - 1];
  } else {
    const t0 = Math.trunc(t);
    dofs = (t - t0) * (dcorRaJpl[t0] - dcorRaJpl[t0 + 1]) + dcorRaJpl[t0];
  }
  dofs /= (1000.0 * 3600.0);
  swiCartpol(x, x);
  if (backward) x[0] -= dofs * DEGTORAD;
  else x[0] += dofs * DEGTORAD;
  swiPolcart(x, x);
}

/** GCRS to J2000 frame bias */
export function swiBias(x: Float64Array | number[], tjd: number, iflag: number, backward: boolean, swed: SweData): void {
  const biasModel = getBiasModel(swed);
  const jplhoraModel = getJplHoraModel(swed);
  if (biasModel === SEMOD_BIAS_NONE) return;
  if (iflag & SEFLG_JPLHOR_APPROX) {
    if (jplhoraModel === SEMOD_JPLHORA_2) return;
    if (jplhoraModel === SEMOD_JPLHORA_3 && tjd < DPSI_DEPS_IAU1980_TJD0_HORIZONS) return;
  }
  const rb = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  if (biasModel === SEMOD_BIAS_IAU2006) {
    rb[0][0] = +0.99999999999999412; rb[1][0] = -0.00000007078368961; rb[2][0] = +0.00000008056213978;
    rb[0][1] = +0.00000007078368695; rb[1][1] = +0.99999999999999700; rb[2][1] = +0.00000003306428553;
    rb[0][2] = -0.00000008056214212; rb[1][2] = -0.00000003306427981; rb[2][2] = +0.99999999999999634;
  } else {
    rb[0][0] = +0.9999999999999942; rb[1][0] = -0.0000000707827974; rb[2][0] = +0.0000000805621715;
    rb[0][1] = +0.0000000707827948; rb[1][1] = +0.9999999999999969; rb[2][1] = +0.0000000330604145;
    rb[0][2] = -0.0000000805621738; rb[1][2] = -0.0000000330604088; rb[2][2] = +0.9999999999999962;
  }
  const xx = [0, 0, 0, 0, 0, 0];
  if (backward) {
    swiApproxJplhor(x, tjd, iflag, true, swed);
    for (let i = 0; i <= 2; i++) {
      xx[i] = x[0] * rb[i][0] + x[1] * rb[i][1] + x[2] * rb[i][2];
      if (iflag & SEFLG_SPEED)
        xx[i + 3] = x[3] * rb[i][0] + x[4] * rb[i][1] + x[5] * rb[i][2];
    }
  } else {
    for (let i = 0; i <= 2; i++) {
      xx[i] = x[0] * rb[0][i] + x[1] * rb[1][i] + x[2] * rb[2][i];
      if (iflag & SEFLG_SPEED)
        xx[i + 3] = x[3] * rb[0][i] + x[4] * rb[1][i] + x[5] * rb[2][i];
    }
    swiApproxJplhor(xx, tjd, iflag, false, swed);
  }
  for (let i = 0; i <= 2; i++) x[i] = xx[i];
  if (iflag & SEFLG_SPEED)
    for (let i = 3; i <= 5; i++) x[i] = xx[i];
}

/** GCRS to FK5 */
export function swiIcrs2fk5(x: Float64Array | number[], iflag: number, backward: boolean): void {
  const rb = [
    [+0.9999999999999928, +0.0000001110223287, +0.0000000441180557],
    [-0.0000001110223330, +0.9999999999999891, +0.0000000964779176],
    [-0.0000000441180450, -0.0000000964779225, +0.9999999999999943],
  ];
  const xx = [0, 0, 0, 0, 0, 0];
  if (backward) {
    for (let i = 0; i <= 2; i++) {
      xx[i] = x[0] * rb[i][0] + x[1] * rb[i][1] + x[2] * rb[i][2];
      if (iflag & SEFLG_SPEED)
        xx[i + 3] = x[3] * rb[i][0] + x[4] * rb[i][1] + x[5] * rb[i][2];
    }
  } else {
    for (let i = 0; i <= 2; i++) {
      xx[i] = x[0] * rb[0][i] + x[1] * rb[1][i] + x[2] * rb[2][i];
      if (iflag & SEFLG_SPEED)
        xx[i + 3] = x[3] * rb[0][i] + x[4] * rb[1][i] + x[5] * rb[2][i];
    }
  }
  for (let i = 0; i <= 5; i++) x[i] = xx[i];
}

/* ================================================================
 * 20. Delta T tables and functions
 * ================================================================ */

const TABSTART = 1620;
const TABEND = 2028;
const TABSIZ = TABEND - TABSTART + 1;

// prettier-ignore
const dt = [
/* 1620 - 1659 */
124.00, 119.00, 115.00, 110.00, 106.00, 102.00, 98.00, 95.00, 91.00, 88.00,
85.00, 82.00, 79.00, 77.00, 74.00, 72.00, 70.00, 67.00, 65.00, 63.00,
62.00, 60.00, 58.00, 57.00, 55.00, 54.00, 53.00, 51.00, 50.00, 49.00,
48.00, 47.00, 46.00, 45.00, 44.00, 43.00, 42.00, 41.00, 40.00, 38.00,
/* 1660 - 1699 */
37.00, 36.00, 35.00, 34.00, 33.00, 32.00, 31.00, 30.00, 28.00, 27.00,
26.00, 25.00, 24.00, 23.00, 22.00, 21.00, 20.00, 19.00, 18.00, 17.00,
16.00, 15.00, 14.00, 14.00, 13.00, 12.00, 12.00, 11.00, 11.00, 10.00,
10.00, 10.00, 9.00, 9.00, 9.00, 9.00, 9.00, 9.00, 9.00, 9.00,
/* 1700 - 1739 */
9.00, 9.00, 9.00, 9.00, 9.00, 9.00, 9.00, 9.00, 10.00, 10.00,
10.00, 10.00, 10.00, 10.00, 10.00, 10.00, 10.00, 11.00, 11.00, 11.00,
11.00, 11.00, 11.00, 11.00, 11.00, 11.00, 11.00, 11.00, 11.00, 11.00,
11.00, 11.00, 11.00, 11.00, 12.00, 12.00, 12.00, 12.00, 12.00, 12.00,
/* 1740 - 1779 */
12.00, 12.00, 12.00, 12.00, 13.00, 13.00, 13.00, 13.00, 13.00, 13.00,
13.00, 14.00, 14.00, 14.00, 14.00, 14.00, 14.00, 14.00, 15.00, 15.00,
15.00, 15.00, 15.00, 15.00, 15.00, 16.00, 16.00, 16.00, 16.00, 16.00,
16.00, 16.00, 16.00, 16.00, 16.00, 17.00, 17.00, 17.00, 17.00, 17.00,
/* 1780 - 1799 */
17.00, 17.00, 17.00, 17.00, 17.00, 17.00, 17.00, 17.00, 17.00, 17.00,
17.00, 17.00, 16.00, 16.00, 16.00, 16.00, 15.00, 15.00, 14.00, 14.00,
/* 1800 - 1819 */
13.70, 13.40, 13.10, 12.90, 12.70, 12.60, 12.50, 12.50, 12.50, 12.50,
12.50, 12.50, 12.50, 12.50, 12.50, 12.50, 12.50, 12.40, 12.30, 12.20,
/* 1820 - 1859 */
12.00, 11.70, 11.40, 11.10, 10.60, 10.20, 9.60, 9.10, 8.60, 8.00,
7.50, 7.00, 6.60, 6.30, 6.00, 5.80, 5.70, 5.60, 5.60, 5.60,
5.70, 5.80, 5.90, 6.10, 6.20, 6.30, 6.50, 6.60, 6.80, 6.90,
7.10, 7.20, 7.30, 7.40, 7.50, 7.60, 7.70, 7.70, 7.80, 7.80,
/* 1860 - 1899 */
7.88, 7.82, 7.54, 6.97, 6.40, 6.02, 5.41, 4.10, 2.92, 1.82,
1.61, .10, -1.02, -1.28, -2.69, -3.24, -3.64, -4.54, -4.71, -5.11,
-5.40, -5.42, -5.20, -5.46, -5.46, -5.79, -5.63, -5.64, -5.80, -5.66,
-5.87, -6.01, -6.19, -6.64, -6.44, -6.47, -6.09, -5.76, -4.66, -3.74,
/* 1900 - 1939 */
-2.72, -1.54, -.02, 1.24, 2.64, 3.86, 5.37, 6.14, 7.75, 9.13,
10.46, 11.53, 13.36, 14.65, 16.01, 17.20, 18.24, 19.06, 20.25, 20.95,
21.16, 22.25, 22.41, 23.03, 23.49, 23.62, 23.86, 24.49, 24.34, 24.08,
24.02, 24.00, 23.87, 23.95, 23.86, 23.93, 23.73, 23.92, 23.96, 24.02,
/* 1940 - 1949 */
24.33, 24.83, 25.30, 25.70, 26.24, 26.77, 27.28, 27.78, 28.25, 28.71,
/* 1950 - 1959 */
29.15, 29.57, 29.97, 30.36, 30.72, 31.07, 31.35, 31.68, 32.18, 32.68,
/* 1960 - 1969 */
33.15, 33.59, 34.00, 34.47, 35.03, 35.73, 36.54, 37.43, 38.29, 39.20,
/* 1970 - 1979 */
40.18, 41.17, 42.23, 43.37, 44.4841, 45.4761, 46.4567, 47.5214, 48.5344, 49.5862,
/* 1980 - 1989 */
50.5387, 51.3808, 52.1668, 52.9565, 53.7882, 54.3427, 54.8713, 55.3222, 55.8197, 56.3000,
/* 1990 - 1999 */
56.8553, 57.5653, 58.3092, 59.1218, 59.9845, 60.7854, 61.6287, 62.2951, 62.9659, 63.4673,
/* 2000 - 2009 */
63.8285, 64.0908, 64.2998, 64.4734, 64.5736, 64.6876, 64.8452, 65.1464, 65.4574, 65.7768,
/* 2010 - 2019 */
66.0699, 66.3246, 66.6030, 66.9069, 67.2810, 67.6439, 68.1024, 68.5927, 68.9676, 69.2202,
/* 2020 - 2028 */
69.3612, 69.3593, 69.2945, 69.1833, 69.10, 69.00, 68.90, 68.80, 68.80,
];

const TAB2_SIZ = 27;
const TAB2_START = -1000;
const TAB2_END = 1600;
const TAB2_STEP = 100;
const LTERM_EQUATION_YSTART = 1820;
const LTERM_EQUATION_COEFF = 32;

// prettier-ignore
const dt2 = [
25400,23700,22000,21000,19040,17190,15530,14080,12790,11640,
10580, 9600, 8640, 7680, 6700, 5710, 4740, 3810, 2960, 2200,
 1570, 1090,  740,  490,  320,  200,  120,
];

const TAB97_SIZ = 43;
const TAB97_START = -500;
const TAB97_END = 1600;
const TAB97_STEP = 50;

// prettier-ignore
const dt97 = [
16800,16000,15300,14600,14000,13400,12800,12200,11600,11100,
10600,10100, 9600, 9100, 8600, 8200, 7700, 7200, 6700, 6200,
 5700, 5200, 4700, 4300, 3800, 3400, 3000, 2600, 2200, 1900,
 1600, 1350, 1100,  900,  750,  600,  470,  380,  300,  230,
  180,  140,  110,
];

function adjustForTidacc(ans: number, Y: number, tidAcc: number, tidAcc0: number, adjustAfter1955: boolean): number {
  if (Y < 1955.0 || adjustAfter1955) {
    const B = Y - 1955.0;
    return ans + (-0.000091 * (tidAcc - tidAcc0) * B * B);
  }
  return ans;
}

function deltatLongtermMorrisonStephenson(tjd: number): number {
  const Ygreg = 2000.0 + (tjd - J2000) / 365.2425;
  const u = (Ygreg - 1820) / 100.0;
  return -20 + 32 * u * u;
}

function deltatStephensonMorrison1997_1600(tjd: number, tidAcc: number): number {
  let ans = 0;
  const Y = 2000.0 + (tjd - J2000) / 365.25;
  if (Y < TAB97_START) {
    let B = (Y - 1735) * 0.01;
    ans = -20 + 35 * B * B;
    ans = adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false);
    if (Y >= TAB97_START - 100) {
      const ans2 = adjustForTidacc(dt97[0], TAB97_START, tidAcc, SE_TIDAL_26, false);
      B = (TAB97_START - 1735) * 0.01;
      let ans3 = -20 + 35 * B * B;
      ans3 = adjustForTidacc(ans3, Y, tidAcc, SE_TIDAL_26, false);
      const dd = ans3 - ans2;
      B = (Y - (TAB97_START - 100)) * 0.01;
      ans = ans - dd * B;
    }
  }
  if (Y >= TAB97_START && Y < TAB2_END) {
    const p = Math.floor(Y);
    const iy = Math.trunc((p - TAB97_START) / 50.0);
    const dd = (Y - (TAB97_START + 50 * iy)) / 50.0;
    ans = dt97[iy] + (dt97[iy + 1] - dt97[iy]) * dd;
    ans = adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false);
  }
  return ans / 86400.0;
}

function deltatStephensonMorrison2004_1600(tjd: number, tidAcc: number): number {
  let ans = 0;
  const Y = 2000.0 + (tjd - J2000) / 365.2425;
  if (Y < TAB2_START) {
    ans = deltatLongtermMorrisonStephenson(tjd);
    ans = adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false);
    if (Y >= TAB2_START - 100) {
      const ans2 = adjustForTidacc(dt2[0], TAB2_START, tidAcc, SE_TIDAL_26, false);
      const tjd0 = (TAB2_START - 2000) * 365.2425 + J2000;
      let ans3 = deltatLongtermMorrisonStephenson(tjd0);
      ans3 = adjustForTidacc(ans3, Y, tidAcc, SE_TIDAL_26, false);
      const dd = ans3 - ans2;
      const B = (Y - (TAB2_START - 100)) * 0.01;
      ans = ans - dd * B;
    }
  }
  if (Y >= TAB2_START && Y < TAB2_END) {
    const Yjul = 2000 + (tjd - 2451557.5) / 365.25;
    const p = Math.floor(Yjul);
    const iy = Math.trunc((p - TAB2_START) / TAB2_STEP);
    const dd = (Yjul - (TAB2_START + TAB2_STEP * iy)) / TAB2_STEP;
    ans = dt2[iy] + (dt2[iy + 1] - dt2[iy]) * dd;
    ans = adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false);
  }
  return ans / 86400.0;
}

const NDTCF16 = 54;
// prettier-ignore
const dtcf16 = [
 [1458085.5, 1867156.5, 20550.593,-21268.478, 11863.418, -4541.129],
 [1867156.5, 2086302.5,  6604.404, -5981.266,  -505.093,  1349.609],
 [2086302.5, 2268923.5,  1467.654, -2452.187,  2460.927, -1183.759],
 [2268923.5, 2305447.5,   292.635,  -216.322,   -43.614,    56.681],
 [2305447.5, 2323710.5,    89.380,   -66.754,    31.607,   -10.497],
 [2323710.5, 2349276.5,    43.736,   -49.043,     0.227,    15.811],
 [2349276.5, 2378496.5,    10.730,    -1.321,    62.250,   -52.946],
 [2378496.5, 2382148.5,    18.714,    -4.457,    -1.509,     2.507],
 [2382148.5, 2385800.5,    15.255,     0.046,     6.012,    -4.634],
 [2385800.5, 2389453.5,    16.679,    -1.831,    -7.889,     3.799],
 [2389453.5, 2393105.5,    10.758,    -6.211,     3.509,    -0.388],
 [2393105.5, 2396758.5,     7.668,    -0.357,     2.345,    -0.338],
 [2396758.5, 2398584.5,     9.317,     1.659,     0.332,    -0.932],
 [2398584.5, 2400410.5,    10.376,    -0.472,    -2.463,     1.596],
 [2400410.5, 2402237.5,     9.038,    -0.610,     2.325,    -2.497],
 [2402237.5, 2404063.5,     8.256,    -3.450,    -5.166,     2.729],
 [2404063.5, 2405889.5,     2.369,    -5.596,     3.020,    -0.919],
 [2405889.5, 2407715.5,    -1.126,    -2.312,     0.264,    -0.037],
 [2407715.5, 2409542.5,    -3.211,    -1.894,     0.154,     0.562],
 [2409542.5, 2411368.5,    -4.388,     0.101,     1.841,    -1.438],
 [2411368.5, 2413194.5,    -3.884,    -0.531,    -2.473,     1.870],
 [2413194.5, 2415020.5,    -5.017,     0.134,     3.138,    -0.232],
 [2415020.5, 2416846.5,    -1.977,     5.715,     2.443,    -1.257],
 [2416846.5, 2418672.5,     4.923,     6.828,    -1.329,     0.720],
 [2418672.5, 2420498.5,    11.142,     6.330,     0.831,    -0.825],
 [2420498.5, 2422324.5,    17.479,     5.518,    -1.643,     0.262],
 [2422324.5, 2424151.5,    21.617,     3.020,    -0.856,     0.008],
 [2424151.5, 2425977.5,    23.789,     1.333,    -0.831,     0.127],
 [2425977.5, 2427803.5,    24.418,     0.052,    -0.449,     0.142],
 [2427803.5, 2429629.5,    24.164,    -0.419,    -0.022,     0.702],
 [2429629.5, 2431456.5,    24.426,     1.645,     2.086,    -1.106],
 [2431456.5, 2433282.5,    27.050,     2.499,    -1.232,     0.614],
 [2433282.5, 2434378.5,    28.932,     1.127,     0.220,    -0.277],
 [2434378.5, 2435473.5,    30.002,     0.737,    -0.610,     0.631],
 [2435473.5, 2436569.5,    30.760,     1.409,     1.282,    -0.799],
 [2436569.5, 2437665.5,    32.652,     1.577,    -1.115,     0.507],
 [2437665.5, 2438761.5,    33.621,     0.868,     0.406,     0.199],
 [2438761.5, 2439856.5,    35.093,     2.275,     1.002,    -0.414],
 [2439856.5, 2440952.5,    37.956,     3.035,    -0.242,     0.202],
 [2440952.5, 2442048.5,    40.951,     3.157,     0.364,    -0.229],
 [2442048.5, 2443144.5,    44.244,     3.198,    -0.323,     0.172],
 [2443144.5, 2444239.5,    47.291,     3.069,     0.193,    -0.192],
 [2444239.5, 2445335.5,    50.361,     2.878,    -0.384,     0.081],
 [2445335.5, 2446431.5,    52.936,     2.354,    -0.140,    -0.166],
 [2446431.5, 2447527.5,    54.984,     1.577,    -0.637,     0.448],
 [2447527.5, 2448622.5,    56.373,     1.649,     0.709,    -0.277],
 [2448622.5, 2449718.5,    58.453,     2.235,    -0.122,     0.111],
 [2449718.5, 2450814.5,    60.677,     2.324,     0.212,    -0.315],
 [2450814.5, 2451910.5,    62.899,     1.804,    -0.732,     0.112],
 [2451910.5, 2453005.5,    64.082,     0.675,    -0.396,     0.193],
 [2453005.5, 2454101.5,    64.555,     0.463,     0.184,    -0.008],
 [2454101.5, 2455197.5,    65.194,     0.809,     0.161,    -0.101],
 [2455197.5, 2456293.5,    66.063,     0.828,    -0.142,     0.168],
 [2456293.5, 2457388.5,    66.917,     1.046,     0.360,    -0.282],
];

function deltatStephensonEtc2016(tjd: number, tidAcc: number): number {
  const Ygreg = 2000.0 + (tjd - J2000) / 365.2425;
  let dt2: number;
  let irec = -1;
  for (let i = 0; i < NDTCF16; i++) {
    if (tjd < dtcf16[i][0]) break;
    if (tjd < dtcf16[i][1]) { irec = i; break; }
  }
  if (irec >= 0) {
    const t = (tjd - dtcf16[irec][0]) / (dtcf16[irec][1] - dtcf16[irec][0]);
    dt2 = dtcf16[irec][2] + dtcf16[irec][3] * t + dtcf16[irec][4] * t * t + dtcf16[irec][5] * t * t * t;
  } else if (Ygreg < -720) {
    const t = (Ygreg - 1825) / 100.0;
    dt2 = -320 + 32.5 * t * t - 179.7337208;
  } else {
    const t = (Ygreg - 1825) / 100.0;
    dt2 = -320 + 32.5 * t * t + 269.4790417;
  }
  dt2 = adjustForTidacc(dt2, Ygreg, tidAcc, SE_TIDAL_STEPHENSON_2016, true);
  return dt2 / 86400.0;
}

function deltatEspenakMeeus1620(tjd: number, tidAcc: number): number {
  let ans: number;
  const Ygreg = 2000.0 + (tjd - J2000) / 365.2425;
  if (Ygreg < -500) {
    ans = deltatLongtermMorrisonStephenson(tjd);
  } else if (Ygreg < 500) {
    const u = Ygreg / 100.0;
    ans = (((((0.0090316521 * u + 0.022174192) * u - 0.1798452) * u - 5.952053) * u + 33.78311) * u - 1014.41) * u + 10583.6;
  } else if (Ygreg < 1600) {
    const u = (Ygreg - 1000) / 100.0;
    ans = (((((0.0083572073 * u - 0.005050998) * u - 0.8503463) * u + 0.319781) * u + 71.23472) * u - 556.01) * u + 1574.2;
  } else if (Ygreg < 1700) {
    const u = Ygreg - 1600;
    ans = 120 - 0.9808 * u - 0.01532 * u * u + u * u * u / 7129.0;
  } else if (Ygreg < 1800) {
    const u = Ygreg - 1700;
    ans = (((-u / 1174000.0 + 0.00013336) * u - 0.0059285) * u + 0.1603) * u + 8.83;
  } else if (Ygreg < 1860) {
    const u = Ygreg - 1800;
    ans = ((((((0.000000000875 * u - 0.0000001699) * u + 0.0000121272) * u - 0.00037436) * u + 0.0041116) * u + 0.0068612) * u - 0.332447) * u + 13.72;
  } else if (Ygreg < 1900) {
    const u = Ygreg - 1860;
    ans = ((((u / 233174.0 - 0.0004473624) * u + 0.01680668) * u - 0.251754) * u + 0.5737) * u + 7.62;
  } else if (Ygreg < 1920) {
    const u = Ygreg - 1900;
    ans = (((-0.000197 * u + 0.0061966) * u - 0.0598939) * u + 1.494119) * u - 2.79;
  } else if (Ygreg < 1941) {
    const u = Ygreg - 1920;
    ans = 21.20 + 0.84493 * u - 0.076100 * u * u + 0.0020936 * u * u * u;
  } else if (Ygreg < 1961) {
    const u = Ygreg - 1950;
    ans = 29.07 + 0.407 * u - u * u / 233.0 + u * u * u / 2547.0;
  } else if (Ygreg < 1986) {
    const u = Ygreg - 1975;
    ans = 45.45 + 1.067 * u - u * u / 260.0 - u * u * u / 718.0;
  } else {
    const u = Ygreg - 2000;
    ans = ((((0.00002373599 * u + 0.000651814) * u + 0.0017275) * u - 0.060374) * u + 0.3345) * u + 63.86;
  }
  ans = adjustForTidacc(ans, Ygreg, tidAcc, SE_TIDAL_26, false);
  return ans / 86400.0;
}

function deltatAa(tjd: number, tidAcc: number, swed: SweData): number {
  const tabsiz = TABSIZ;
  const tabend = TABSTART + tabsiz - 1;
  const deltatModel = getDeltatModel(swed);
  const Y = 2000.0 + (tjd - 2451544.5) / 365.25;
  if (Y <= tabend) {
    // Bessel interpolation from table
    const p0 = Math.floor(Y);
    const iy = Math.trunc(p0 - TABSTART);
    let ans = dt[iy];
    const k = iy + 1;
    if (k >= tabsiz) {
      return adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false) / 86400.0;
    }
    const p = Y - p0;
    ans += p * (dt[k] - dt[iy]);
    if (iy - 1 < 0 || iy + 2 >= tabsiz) {
      return adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false) / 86400.0;
    }
    const d = [0, 0, 0, 0, 0, 0];
    let kk = iy - 2;
    for (let i = 0; i < 5; i++) {
      d[i] = (kk < 0 || kk + 1 >= tabsiz) ? 0 : dt[kk + 1] - dt[kk];
      kk++;
    }
    for (let i = 0; i < 4; i++) d[i] = d[i + 1] - d[i];
    let B = 0.25 * p * (p - 1.0);
    ans += B * (d[1] + d[2]);
    if (iy + 2 >= tabsiz) {
      return adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false) / 86400.0;
    }
    for (let i = 0; i < 3; i++) d[i] = d[i + 1] - d[i];
    B = 2.0 * B / 3.0;
    ans += (p - 0.5) * B * d[1];
    if (iy - 2 < 0 || iy + 3 > tabsiz) {
      return adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false) / 86400.0;
    }
    for (let i = 0; i < 2; i++) d[i] = d[i + 1] - d[i];
    B = 0.125 * B * (p + 1.0) * (p - 2.0);
    ans += B * (d[0] + d[1]);
    return adjustForTidacc(ans, Y, tidAcc, SE_TIDAL_26, false) / 86400.0;
  }
  // future
  let ans: number, ans2: number;
  if (deltatModel === SEMOD_DELTAT_STEPHENSON_ETC_2016) {
    let B = Y - 2000;
    if (Y < 2500) {
      ans = B * B * B * 121.0 / 30000000.0 + B * B / 1250.0 + B * 521.0 / 3000.0 + 64.0;
      const B2 = tabend - 2000;
      ans2 = B2 * B2 * B2 * 121.0 / 30000000.0 + B2 * B2 / 1250.0 + B2 * 521.0 / 3000.0 + 64.0;
    } else {
      B = 0.01 * (Y - 2000);
      ans = B * B * 32.5 + 42.5;
      ans2 = 0; // won't be used
    }
  } else {
    const B = 0.01 * (Y - 1820);
    ans = -20 + 31 * B * B;
    const B2 = 0.01 * (tabend - 1820);
    ans2 = -20 + 31 * B2 * B2;
  }
  if (Y <= tabend + 100) {
    const ans3 = dt[tabsiz - 1];
    const dd = ans2 - ans3;
    ans += dd * (Y - (tabend + 100)) * 0.01;
  }
  return ans / 86400.0;
}

function calcDeltat(tjd: number, iflag: number, swed: SweData): { deltat: number; retflag: number } {
  const deltatModel = getDeltatModel(swed);
  const tidAcc = swed.tidAcc || SE_TIDAL_DEFAULT;
  const Y = 2000.0 + (tjd - J2000) / 365.25;
  const Ygreg = 2000.0 + (tjd - J2000) / 365.2425;

  if (deltatModel === SEMOD_DELTAT_STEPHENSON_ETC_2016 && tjd < 2435108.5) {
    let d = deltatStephensonEtc2016(tjd, tidAcc);
    if (tjd >= 2434108.5) {
      d += (1.0 - (2435108.5 - tjd) / 1000.0) * 0.6610218 / 86400.0;
    }
    return { deltat: d, retflag: iflag };
  }
  if (deltatModel === SEMOD_DELTAT_ESPENAK_MEEUS_2006 && tjd < 2317746.13090277789) {
    return { deltat: deltatEspenakMeeus1620(tjd, tidAcc), retflag: iflag };
  }
  if (deltatModel === SEMOD_DELTAT_STEPHENSON_MORRISON_2004 && Y < TABSTART) {
    if (Y < TAB2_END) {
      return { deltat: deltatStephensonMorrison2004_1600(tjd, tidAcc), retflag: iflag };
    } else {
      const B = TABSTART - TAB2_END;
      const iy = Math.trunc((TAB2_END - TAB2_START) / TAB2_STEP);
      const dd = (Y - TAB2_END) / B;
      let ans = dt2[iy] + dd * (dt[0] - dt2[iy]);
      ans = adjustForTidacc(ans, Ygreg, tidAcc, SE_TIDAL_26, false);
      return { deltat: ans / 86400.0, retflag: iflag };
    }
  }
  if (deltatModel === SEMOD_DELTAT_STEPHENSON_1997 && Y < TABSTART) {
    if (Y < TAB97_END) {
      return { deltat: deltatStephensonMorrison1997_1600(tjd, tidAcc), retflag: iflag };
    } else {
      const B = TABSTART - TAB97_END;
      const iy = Math.trunc((TAB97_END - TAB97_START) / TAB97_STEP);
      const dd = (Y - TAB97_END) / B;
      let ans = dt97[iy] + dd * (dt[0] - dt97[iy]);
      ans = adjustForTidacc(ans, Ygreg, tidAcc, SE_TIDAL_26, false);
      return { deltat: ans / 86400.0, retflag: iflag };
    }
  }
  if (deltatModel === SEMOD_DELTAT_STEPHENSON_MORRISON_1984 && Y < TABSTART) {
    let ans: number;
    if (Y >= 948.0) {
      const B = 0.01 * (Y - 2000.0);
      ans = (23.58 * B + 100.3) * B + 101.6;
    } else {
      const B = 0.01 * (Y - 2000.0) + 3.75;
      ans = 35.0 * B * B + 40.0;
    }
    return { deltat: ans / 86400.0, retflag: iflag };
  }
  if (Y >= TABSTART) {
    return { deltat: deltatAa(tjd, tidAcc, swed), retflag: iflag };
  }
  return { deltat: 0, retflag: iflag };
}

/** Delta T with explicit ephemeris flag */
export function sweDeltatEx(tjd: number, iflag: number, swed: SweData): number {
  if (swed.deltaTUserdefIsSet) return swed.deltaTUserdef;
  const { deltat } = calcDeltat(tjd, iflag, swed);
  return deltat;
}

/** Delta T with default ephemeris */
export function sweDeltat(tjd: number, swed: SweData): number {
  const iflag = swiGuessEpheFlag(swed);
  return sweDeltatEx(tjd, iflag, swed);
}

/* ================================================================
 * 21. Tidal acceleration
 * ================================================================ */

export function sweGetTidAcc(swed: SweData): number {
  return swed.tidAcc;
}

export function sweSetTidAcc(swed: SweData, tAcc: number): void {
  if (tAcc === SE_TIDAL_AUTOMATIC) {
    swed.tidAcc = SE_TIDAL_DEFAULT;
    swed.isTidAccManual = false;
    return;
  }
  swed.tidAcc = tAcc;
  swed.isTidAccManual = true;
}

export function sweSetDeltaTUserdef(swed: SweData, dtt: number): void {
  if (dtt === SE_DELTAT_AUTOMATIC) {
    swed.deltaTUserdefIsSet = false;
  } else {
    swed.deltaTUserdefIsSet = true;
    swed.deltaTUserdef = dtt;
  }
}

/* ================================================================
 * 22. Sidereal time
 * ================================================================ */

const SIDTNTERM = 33;
const SIDTNARG = 14;

/** Sidereal time non-polynomial coefficients C'_{s,j}, C'_{c,j} */
const stcf: readonly number[] = [
  2640.96,-0.39,
  63.52,-0.02,
  11.75,0.01,
  11.21,0.01,
  -4.55,0.00,
  2.02,0.00,
  1.98,0.00,
  -1.72,0.00,
  -1.41,-0.01,
  -1.26,-0.01,
  -0.63,0.00,
  -0.63,0.00,
  0.46,0.00,
  0.45,0.00,
  0.36,0.00,
  -0.24,-0.12,
  0.32,0.00,
  0.28,0.00,
  0.27,0.00,
  0.26,0.00,
  -0.21,0.00,
  0.19,0.00,
  0.18,0.00,
  -0.10,0.05,
  0.15,0.00,
  -0.14,0.00,
  0.14,0.00,
  -0.14,0.00,
  0.14,0.00,
  0.13,0.00,
  -0.11,0.00,
  0.11,0.00,
  0.11,0.00,
];

/** Sidereal time argument multipliers:
 *  l  l'  F  D  Om  L_Me L_Ve L_E L_Ma L_J L_Sa L_U L_Ne p_A */
const stfarg: readonly number[] = [
  0,  0,  0,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2, -2,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2, -2,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2, -2,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2,  0,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1,  0,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1,  0,  0, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0,  0,  0, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0,  0,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1,  2, -2,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1,  2, -2,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  4, -4,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  1, -1,  1,  0, -8, 12,  0,  0,  0,  0,  0,  0,
  0,  0,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2,  0,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0,  2,  0,  3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0,  2,  0,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2, -2,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1, -2,  2, -3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1, -2,  2, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  0,  0,  0,  0,  8,-13,  0,  0,  0,  0,  0, -1,
  0,  0,  0,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  2,  0, -2,  0, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0,  0, -2,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  1,  2, -2,  2,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0,  0, -2, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  4, -2,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  0,  0,  2, -2,  4,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0, -2,  0, -3,  0,  0,  0,  0,  0,  0,  0,  0,  0,
  1,  0, -2,  0, -1,  0,  0,  0,  0,  0,  0,  0,  0,  0,
];

/** Non-polynomial part of equation of the equinoxes (ERA-based) */
function sidtimeNonPolynomialPart(tt: number): number {
  const delm = new Array<number>(SIDTNARG);
  /* L: mean anomaly of the Moon */
  delm[0] = sweRadnorm(2.35555598 + 8328.6914269554 * tt);
  /* L': mean anomaly of the Sun */
  delm[1] = sweRadnorm(6.24006013 + 628.301955 * tt);
  /* F: mean argument of latitude of the Moon */
  delm[2] = sweRadnorm(1.627905234 + 8433.466158131 * tt);
  /* D: mean elongation of the Moon from the Sun */
  delm[3] = sweRadnorm(5.198466741 + 7771.3771468121 * tt);
  /* Om: mean longitude of ascending node of the Moon */
  delm[4] = sweRadnorm(2.18243920 - 33.757045 * tt);
  /* Planetary longitudes, Mercury through Neptune (Souchay et al. 1999) */
  delm[5] = sweRadnorm(4.402608842 + 2608.7903141574 * tt);
  delm[6] = sweRadnorm(3.176146697 + 1021.3285546211 * tt);
  delm[7] = sweRadnorm(1.753470314 + 628.3075849991 * tt);
  delm[8] = sweRadnorm(6.203480913 + 334.0612426700 * tt);
  delm[9] = sweRadnorm(0.599546497 + 52.9690962641 * tt);
  delm[10] = sweRadnorm(0.874016757 + 21.3299104960 * tt);
  delm[11] = sweRadnorm(5.481293871 + 7.4781598567 * tt);
  delm[12] = sweRadnorm(5.321159000 + 3.8127774000 * tt);
  /* PA: general accumulated precession in longitude */
  delm[13] = (0.02438175 + 0.00000538691 * tt) * tt;
  let dadd = -0.87 * Math.sin(delm[4]) * tt;
  for (let i = 0; i < SIDTNTERM; i++) {
    let darg = 0;
    for (let j = 0; j < SIDTNARG; j++) {
      darg += stfarg[i * SIDTNARG + j] * delm[j];
    }
    dadd += stcf[i * 2] * Math.sin(darg) + stcf[i * 2 + 1] * Math.cos(darg);
  }
  dadd /= (3600.0 * 1000000.0);
  return dadd;
}

/**
 * Long-term sidereal time based on Simon et al. mean earth longitude,
 * precessed to equinox of date. Gives exact agreement for epoch
 * 1 Jan 2003 with IERS 2010 definition.
 */
function sidtimeLongTerm(swed: SweData, tjdUt: number, eps: number, nut: number): number {
  const dlt = AUNIT / CLIGHT / 86400.0;
  const tjdEt = tjdUt + sweDeltatEx(tjdUt, -1, swed);
  const t = (tjdEt - J2000) / 365250.0;
  const t2 = t * t;
  const t3 = t * t2;
  /* mean longitude of earth J2000 */
  let dlon = 100.46645683 + (1295977422.83429 * t - 2.04411 * t2 - 0.00523 * t3) / 3600.0;
  /* light time sun-earth */
  dlon = sweDegnorm(dlon - dlt * 360.0 / 365.2425);
  const xs = [dlon * DEGTORAD, 0, 1, 0, 0, 0];
  /* to mean equator J2000, cartesian */
  const xoblJ2000 = swiEpsiln(J2000 + sweDeltatEx(J2000, -1, swed), 0, swed) * RADTODEG;
  swiPolcart(xs, xs);
  swiCoortrf(xs, xs, -xoblJ2000 * DEGTORAD);
  /* precess to mean equinox of date */
  swiPrecess(xs, tjdEt, 0, J2000_TO_J, swed);
  /* to mean equinox of date */
  const xoblDate = swiEpsiln(tjdEt, 0, swed) * RADTODEG;
  const nutlo = [0, 0];
  swiNutation(tjdEt, 0, nutlo, swed);
  const xoblTrue = xoblDate + nutlo[1] * RADTODEG;
  const nutLon = nutlo[0] * RADTODEG;
  swiCoortrf(xs, xs, xoblDate * DEGTORAD);
  swiCartpol(xs, xs);
  xs[0] *= RADTODEG;
  const dhour = ((tjdUt - 0.5) % 1) * 360;
  /* mean to true (if nut != 0) */
  if (eps === 0) {
    xs[0] += nutLon * Math.cos(xoblTrue * DEGTORAD);
  } else {
    xs[0] += nut * Math.cos(eps * DEGTORAD);
  }
  /* add hour */
  xs[0] = sweDegnorm(xs[0] + dhour);
  return xs[0] / 15;
}

/* sidtime_long_term is not used between these dates */
const SIDT_LTERM_T0 = 2396758.5;  /* 1 Jan 1850 */
const SIDT_LTERM_T1 = 2469807.5;  /* 1 Jan 2050 */
const SIDT_LTERM_OFS0 = 0.000378172 / 15.0;
const SIDT_LTERM_OFS1 = 0.001385646 / 15.0;

/**
 * Apparent Sidereal Time at Greenwich with equation of the equinoxes.
 * Returns sidereal time in hours.
 *
 * @param tjd  Julian day UT
 * @param eps  obliquity of ecliptic, degrees
 * @param nut  nutation in longitude, degrees
 */
export function sweSidtime0(swed: SweData, tjd: number, eps: number, nut: number): number {
  const precModelShort = swed.astroModels[SE_MODEL_PREC_SHORTTERM] || SEMOD_PREC_DEFAULT_SHORT;
  const sidtModel = swed.astroModels[SE_MODEL_SIDT] || SEMOD_SIDT_DEFAULT;
  let gmst: number;
  /* long-term sidereal time for dates outside 1850-2050 */
  if (sidtModel === SEMOD_SIDT_LONGTERM) {
    if (tjd <= SIDT_LTERM_T0 || tjd >= SIDT_LTERM_T1) {
      gmst = sidtimeLongTerm(swed, tjd, eps, nut);
      if (tjd <= SIDT_LTERM_T0) gmst -= SIDT_LTERM_OFS0;
      else if (tjd >= SIDT_LTERM_T1) gmst -= SIDT_LTERM_OFS1;
      if (gmst >= 24) gmst -= 24;
      if (gmst < 0) gmst += 24;
      return gmst;
    }
  }
  /* Julian day at given UT */
  let jd0 = Math.floor(tjd);
  let secs = tjd - jd0;
  if (secs < 0.5) {
    jd0 -= 0.5;
    secs += 0.5;
  } else {
    jd0 += 0.5;
    secs -= 0.5;
  }
  secs *= 86400.0;
  const tu = (jd0 - J2000) / 36525.0;  /* UT1 in centuries after J2000 */
  if (sidtModel === SEMOD_SIDT_IERS_CONV_2010 || sidtModel === SEMOD_SIDT_LONGTERM) {
    /* ERA-based expression for GST based on IAU 2006 precession */
    const jdrel = tjd - J2000;
    const tt = (tjd + sweDeltatEx(tjd, -1, swed) - J2000) / 36525.0;
    gmst = sweDegnorm((0.7790572732640 + 1.00273781191135448 * jdrel) * 360);
    gmst += (0.014506 + tt * (4612.156534 + tt * (1.3915817 + tt * (-0.00000044 + tt * (-0.000029956 + tt * -0.0000000368))))) / 3600.0;
    const dadd = sidtimeNonPolynomialPart(tt);
    gmst = sweDegnorm(gmst + dadd);
    gmst = gmst / 15.0 * 3600.0;
  } else if (sidtModel === SEMOD_SIDT_IAU_2006) {
    /* Capitaine, Wallace & Chapront 2003 */
    const tt = (jd0 + sweDeltatEx(jd0, -1, swed) - J2000) / 36525.0;
    gmst = (((-0.000000002454 * tt - 0.00000199708) * tt - 0.0000002926) * tt + 0.092772110) * tt * tt
      + 307.4771013 * (tt - tu) + 8640184.79447825 * tu + 24110.5493771;
    const msday = 1 + ((((-0.000000012270 * tt - 0.00000798832) * tt - 0.0000008778) * tt + 0.185544220) * tt + 8640184.79447825) / (86400.0 * 36525.0);
    gmst += msday * secs;
  } else {
    /* IAU 1976 formula */
    gmst = ((-6.2e-6 * tu + 9.3104e-2) * tu + 8640184.812866) * tu + 24110.54841;
    const msday = 1.0 + ((-1.86e-5 * tu + 0.186208) * tu + 8640184.812866) / (86400.0 * 36525.0);
    gmst += msday * secs;
  }
  /* equation of the equinoxes */
  const eqeq = 240.0 * nut * Math.cos(eps * DEGTORAD);
  gmst = gmst + eqeq;
  /* modulo 1 sidereal day */
  gmst = gmst - 86400.0 * Math.floor(gmst / 86400.0);
  /* return in hours */
  gmst /= 3600;
  return gmst;
}

/**
 * Sidereal time without explicit eps/nut parameters.
 * tjdUt must be UT!
 */
export function sweSidtime(swed: SweData, tjdUt: number): number {
  const tjde = tjdUt + sweDeltatEx(tjdUt, -1, swed);
  const eps = swiEpsiln(tjde, 0, swed) * RADTODEG;
  const nutlo = [0, 0];
  swiNutation(tjde, 0, nutlo, swed);
  nutlo[0] *= RADTODEG;
  nutlo[1] *= RADTODEG;
  return sweSidtime0(swed, tjdUt, eps + nutlo[1], nutlo[0]);
}

/* ================================================================
 * 23. Ephemeris filename generation
 * ================================================================ */

/**
 * Generate the name of a Swiss Ephemeris .se1 file for a given Julian day
 * and internal planet number.
 */
export function swiGenFilename(tjd: number, ipli: number): string {
  let fname: string;
  switch (ipli) {
    case SEI_MOON:
      fname = 'semo';
      break;
    case SEI_EMB:
    case SEI_MERCURY:
    case SEI_VENUS:
    case SEI_MARS:
    case SEI_JUPITER:
    case SEI_SATURN:
    case SEI_URANUS:
    case SEI_NEPTUNE:
    case SEI_PLUTO:
    case SEI_SUNBARY:
      fname = 'sepl';
      break;
    case SEI_CERES:
    case SEI_PALLAS:
    case SEI_JUNO:
    case SEI_VESTA:
    case SEI_CHIRON:
    case SEI_PHOLUS:
      fname = 'seas';
      break;
    default:
      /* asteroid or planetary moon */
      if (ipli > SE_PLMOON_OFFSET && ipli < SE_AST_OFFSET) {
        return `sepm${ipli}.${SE_FILE_SUFFIX}`;
      } else {
        const astNum = ipli - SE_AST_OFFSET;
        const dir = Math.trunc(astNum / 1000);
        if (astNum > 99999) {
          return `ast${dir}/s${String(astNum).padStart(6, '0')}.${SE_FILE_SUFFIX}`;
        } else {
          return `ast${dir}/se${String(astNum).padStart(5, '0')}.${SE_FILE_SUFFIX}`;
        }
      }
  }
  /* century of tjd */
  const gregflag = tjd >= 2305447.5;
  const { year: jyear } = revJulInternal(tjd, gregflag);
  /* start century of file containing tjd */
  const sgn = jyear < 0 ? -1 : 1;
  let icty = Math.trunc(jyear / 100);
  if (sgn < 0 && jyear % 100 !== 0) icty -= 1;
  const ncties = Math.trunc(NCTIES);
  while (icty % ncties !== 0) icty--;
  /* B.C. or A.D. */
  fname += icty < 0 ? 'm' : '_';
  const ictyAbs = Math.abs(icty);
  fname += String(ictyAbs).padStart(2, '0') + '.' + SE_FILE_SUFFIX;
  return fname;
}

/**
 * Internal revJul for filename generation (avoids circular dependency).
 * Returns year from Julian day number.
 */
function revJulInternal(tjd: number, gregflag: boolean): { year: number; month: number; day: number } {
  let b: number, c: number, d: number, e: number;
  const jd0 = tjd + 0.5;
  const z = Math.trunc(jd0);
  if (gregflag) {
    const a = Math.trunc((z - 1867216.25) / 36524.25);
    const aa = Math.trunc(a / 4);
    b = z + 1 + a - aa;
  } else {
    b = z;
  }
  c = b + 1524;
  d = Math.trunc((c - 122.1) / 365.25);
  e = Math.trunc(365.25 * d);
  const g = Math.trunc((c - e) / 30.6001);
  const day = c - e - Math.trunc(30.6001 * g);
  const month = g < 14 ? g - 1 : g - 13;
  const year = month > 2 ? d - 4716 : d - 4715;
  return { year, month, day };
}

/* ==================================================================
 * Additional formatting / centisecond utilities
 * C: swe_difdegn, swe_difcs2n, swe_csroundsec,
 *    swe_cs2timestr, swe_cs2lonlatstr, swe_cs2degstr
 * ================================================================== */

/** Distance in degrees normalized to [0, 360°). C: swe_difdegn */
export function sweDifdegn(p1: number, p2: number): number {
  return sweDegnorm(p1 - p2);
}

/** Distance in centiseconds normalized to [-180°, 180°). C: swe_difcs2n */
export function sweDifcs2n(p1: number, p2: number): number {
  const dif = sweCsnorm(p1 - p2);
  if (dif >= 180 * 360000) return dif - 360 * 360000;
  return dif;
}

/** Round centiseconds to whole seconds, avoiding rounding up to next sign. C: swe_csroundsec */
export function sweCsroundsec(x: number): number {
  x = Math.trunc(x);
  let t = Math.trunc((x + 50) / 100) * 100;
  if (t > x && t % (30 * 360000) === 0)
    t = Math.trunc(x / 100) * 100;
  return t;
}

/**
 * Centiseconds to time string "HH:MM:SS".
 * C: swe_cs2timestr (swephlib.c:3864-3886)
 */
export function sweCs2timestr(t: number, sep: string, suppressZero: boolean): string {
  t = Math.trunc((Math.trunc(t) + 50) / 100) % (24 * 3600);
  const s = t % 60;
  const m = Math.trunc(t / 60) % 60;
  const h = Math.trunc(t / 3600) % 100;
  const hStr = String(h).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  if (s === 0 && suppressZero)
    return `${hStr}${sep}${mStr}`;
  const sStr = String(s).padStart(2, '0');
  return `${hStr}${sep}${mStr}${sep}${sStr}`;
}

/**
 * Centiseconds to longitude/latitude string "ddd°mm'ss".
 * C: swe_cs2lonlatstr (swephlib.c:3888-3916)
 */
export function sweCs2lonlatstr(t: number, pchar: string, mchar: string): string {
  const sign = t < 0 ? mchar : pchar;
  t = Math.trunc((Math.abs(Math.trunc(t)) + 50) / 100);
  const s = t % 60;
  const m = Math.trunc(t / 60) % 60;
  const h = Math.trunc(t / 3600) % 1000;
  let result = `${h}${sign}${String(m).padStart(2, '0')}'`;
  if (s !== 0)
    result += String(s).padStart(2, '0');
  return result;
}

/**
 * Centiseconds to degree string "dd°mm'ss".
 * C: swe_cs2degstr (swephlib.c:3918-3929)
 */
export function sweCs2degstr(t: number): string {
  t = Math.trunc(Math.trunc(t) / 100) % (30 * 3600);
  const s = t % 60;
  const m = Math.trunc(t / 60) % 60;
  const h = Math.trunc(t / 3600) % 100;
  return `${String(h).padStart(2, ' ')}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}`;
}

/* ================================================================
 * String utilities (from swephlib.c)
 * ================================================================ */

/**
 * Cut string at any character in cutlist; return array of partial strings.
 * Multiple consecutive separators count as one.
 * Newline/CR treated as end of string.
 * C: swi_cutstr (swephlib.c:3693-3722)
 */
export function swiCutstr(s: string, cutlist: string, nmax: number = Infinity): string[] {
  const end = s.search(/[\r\n]/);
  if (end >= 0) s = s.substring(0, end);
  const re = new RegExp(`[${cutlist.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&')}]+`);
  const parts = s.split(re);
  if (nmax !== Infinity && parts.length > nmax) {
    const head = parts.slice(0, nmax - 1);
    const rest = parts.slice(nmax - 1).join(cutlist[0]);
    head.push(rest);
    return head;
  }
  return parts;
}

/**
 * Right-trim whitespace from string.
 * C: swi_right_trim (swephlib.c:3724-3731)
 */
export function swiRightTrim(s: string): string {
  return s.trimEnd();
}

/**
 * Safe string copy (handles overlapping source/dest in C).
 * In JS strings are immutable values, so this is identity.
 * C: swi_strcpy (swephlib.c:4539-4559)
 */
export function swiStrcpy(from: string): string {
  return from;
}

/**
 * Open trace files for debugging.
 * No-op in TypeScript (C uses #ifdef TRACE with file I/O).
 * C: swi_open_trace (swephlib.c:4562-4633)
 */
export function swiOpenTrace(_serr?: string): void {
  // In the C library this opens trace log files when compiled with TRACE.
  // Not applicable in TypeScript — use console.log for debugging.
}
