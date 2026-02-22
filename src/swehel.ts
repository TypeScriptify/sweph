/*************************************************************
 * Swiss Ephemeris — Heliacal risings and related calculations
 * Translated from swehel.c
 *
 * Author: Victor Reijs
 * Translation from VB into C by Dieter Koch
 * Translation from C to TypeScript
 *
 * Copyright (c) Victor Reijs, 2008
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.
 * All rights reserved. (AGPL)
 *************************************************************/

import {
  PI, DEGTORAD, RADTODEG,
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO,
  SE_AST_OFFSET, SE_GREG_CAL,
  SE_CALC_RISE, SE_CALC_SET, SE_BIT_DISC_CENTER, SE_EQU2HOR,
  SEFLG_JPLEPH, SEFLG_SWIEPH, SEFLG_MOSEPH,
  SEFLG_EQUATORIAL, SEFLG_TOPOCTR, SEFLG_NONUT, SEFLG_TRUEPOS, SEFLG_SPEED,
  OK, ERR, TJD_INVALID,
  SE_HELFLAG_HIGH_PRECISION, SE_HELFLAG_OPTICAL_PARAMS,
  SE_HELFLAG_NO_DETAILS, SE_HELFLAG_LONG_SEARCH,
  SE_HELFLAG_SEARCH_1_PERIOD,
  SE_HELFLAG_VISLIM_DARK, SE_HELFLAG_VISLIM_NOMOON,
  SE_HELFLAG_VISLIM_PHOTOPIC, SE_HELFLAG_VISLIM_SCOTOPIC,
  SE_HELFLAG_AVKIND, SE_HELFLAG_AVKIND_VR,
  SE_HELFLAG_AVKIND_PTO, SE_HELFLAG_AVKIND_MIN7, SE_HELFLAG_AVKIND_MIN9,
  SE_SCOTOPIC_FLAG, SE_MIXEDOPIC_FLAG,
  SE_MORNING_FIRST, SE_EVENING_LAST, SE_EVENING_FIRST, SE_MORNING_LAST,
  SE_ACRONYCHAL_RISING, SE_ACRONYCHAL_SETTING,
  SEI_ECL_GEOALT_MIN, SEI_ECL_GEOALT_MAX,
} from './constants';
import { sweDegnorm } from './swephlib';
import { sweDeltatEx } from './swephlib';
import { swiPolcart } from './swephlib';
import { revJul } from './swedate';
import { sweCalc, sweCalcUt, sweFixstar, sweFixstarMag, sweSetTopo, sweGetPlanetName } from './sweph';
import { sweRiseTrans, sweAzalt, swePhenoUt } from './swecl';
import type { SweData } from './types';

/* ---- Module-level constants ---- */
const PLSV = 0;
const criticalangle = 0.0;
const BNIGHT = 1479.0;
const BNIGHT_FACTOR = 1.0;
const Min2Deg = 1.0 / 60.0;
const MaxTryHours = 4;
const TimeStepDefault = 1;
const LocalMinStep = 8;

/* time constants */
const D2H = 24.0;
const H2S = 3600.0;
const D2S = D2H * H2S;

/* refraction algorithm choice */
const REFR_SINCLAIR = 0;
const FormAstroRefrac = REFR_SINCLAIR;
const GravitySource = 2;
const REarthSource = 1;

const MAX_COUNT_SYNPER = 5;
const MAX_COUNT_SYNPER_MAX = 1000000;
const AvgRadiusMoon = 15.541 / 60;

/* WGS84 */
const Ra = 6378136.6;

/* Schaefer model */
const nL2erg = 1.02e-15;
const erg2nL = 1 / nL2erg;
const scaleHwater = 3000.0;
const scaleHrayleigh = 8515.0;
const scaleHaerosol = 3745.0;
const scaleHozone = 20000.0;
const astr2tau = 0.921034037197618;
const tau2astr = 1 / astr2tau;

/* meteorological */
const C2K = 273.15;
const LapseSA = 0.0065;

const LowestAppAlt = -3.5;
const epsilon = 0.001;
const staticAirmass = 0;

/* optic defaults */
const GOpticMag = 1;
const GOpticTrans = 0.8;
const GBinocular = 1;
const GOpticDia = 50;

/* conjunction reference table */
const tcon = [
  0, 0,
  2451550, 2451550,  /* Moon */
  2451604, 2451670,  /* Mercury */
  2451980, 2452280,  /* Venus */
  2451727, 2452074,  /* Mars */
  2451673, 2451877,  /* Jupiter */
  2451675, 2451868,  /* Saturn */
  2451581, 2451768,  /* Uranus */
  2451568, 2451753,  /* Neptune */
];

/* ---- Module-level caches (replacing C static TLS) ---- */
let sunRA_tjdlast = 0;
let sunRA_ralast = 0;
let kOZ_alts_last = -99999;
let kOZ_sunra_last = -99999;
let kOZ_last = 0;
let ka_alts_last = -99999;
let ka_sunra_last = -99999;
let ka_last = 0;
let deltam_alts_last = -99999;
let deltam_alto_last = -99999;
let deltam_sunra_last = -99999;
let deltam_last = 0;
let fixstarMag_star_save = '';
let fixstarMag_dmag = 0;

/* ================================================================
 * A. Pure math functions (no swed)
 * ================================================================ */

function Sgn(x: number): number {
  if (x < 0) return -1;
  return 1;
}

function Kelvin(Temp: number): number {
  return Temp + C2K;
}

function HourAngle(TopoAlt: number, TopoDecl: number, Lat: number): number {
  const Alti = TopoAlt * DEGTORAD;
  const decli = TopoDecl * DEGTORAD;
  const Lati = Lat * DEGTORAD;
  let ha = (Math.sin(Alti) - Math.sin(Lati) * Math.sin(decli)) / Math.cos(Lati) / Math.cos(decli);
  if (ha < -1) ha = -1;
  if (ha > 1) ha = 1;
  return Math.acos(ha) / DEGTORAD / 15.0;
}

function DistanceAngle(LatA: number, LongA: number, LatB: number, LongB: number): number {
  const dlon = LongB - LongA;
  const dlat = LatB - LatA;
  const sindlat2 = Math.sin(dlat / 2);
  const sindlon2 = Math.sin(dlon / 2);
  let corde = sindlat2 * sindlat2 + Math.cos(LatA) * Math.cos(LatB) * sindlon2 * sindlon2;
  if (corde > 1) corde = 1;
  return 2 * Math.asin(Math.sqrt(corde));
}

function TopoAltfromAppAlt(AppAlt: number, TempE: number, PresE: number): number {
  let R = 0;
  let retalt = 0;
  if (AppAlt >= LowestAppAlt) {
    if (AppAlt > 17.904104638432)
      R = 0.97 / Math.tan(AppAlt * DEGTORAD);
    else
      R = (34.46 + 4.23 * AppAlt + 0.004 * AppAlt * AppAlt) / (1 + 0.505 * AppAlt + 0.0845 * AppAlt * AppAlt);
    R = (PresE - 80) / 930 / (1 + 0.00008 * (R + 39) * (TempE - 10)) * R;
    retalt = AppAlt - R * Min2Deg;
  } else {
    retalt = AppAlt;
  }
  return retalt;
}

function AppAltfromTopoAlt(TopoAlt: number, TempE: number, PresE: number, helflag: number): number {
  let nloop = 2;
  let newAppAlt = TopoAlt;
  let newTopoAlt = 0.0;
  let oudAppAlt = newAppAlt;
  let oudTopoAlt = newTopoAlt;
  let verschil: number;
  if (helflag & SE_HELFLAG_HIGH_PRECISION)
    nloop = 5;
  for (let i = 0; i <= nloop; i++) {
    newTopoAlt = newAppAlt - TopoAltfromAppAlt(newAppAlt, TempE, PresE);
    verschil = newAppAlt - oudAppAlt;
    oudAppAlt = newTopoAlt - oudTopoAlt - verschil;
    if (verschil !== 0 && oudAppAlt !== 0)
      verschil = newAppAlt - verschil * (TopoAlt + newTopoAlt - newAppAlt) / oudAppAlt;
    else
      verschil = TopoAlt + newTopoAlt;
    oudAppAlt = newAppAlt;
    oudTopoAlt = newTopoAlt;
    newAppAlt = verschil;
  }
  const retalt = TopoAlt + newTopoAlt;
  if (retalt < LowestAppAlt)
    return TopoAlt;
  return retalt;
}

function TempEfromTempS(TempS: number, HeightEye: number, Lapse: number): number {
  return TempS - Lapse * HeightEye;
}

function PresEfromPresS(TempS: number, Press: number, HeightEye: number): number {
  return Press * Math.exp(-9.80665 * 0.0289644 / (Kelvin(TempS) + 3.25 * HeightEye / 1000) / 8.31441 * HeightEye);
}

function Airmass(AppAltO: number, Press: number): number {
  let zend = (90 - AppAltO) * DEGTORAD;
  if (zend > PI / 2) zend = PI / 2;
  const airm = 1 / (Math.cos(zend) + 0.025 * Math.exp(-11 * Math.cos(zend)));
  return Press / 1013 * airm;
}

function Xext(scaleH: number, zend: number, Press: number): number {
  return Press / 1013.0 / (Math.cos(zend) + 0.01 * Math.sqrt(scaleH / 1000.0) * Math.exp(-30.0 / Math.sqrt(scaleH / 1000.0) * Math.cos(zend)));
}

function Xlay(scaleH: number, zend: number, Press: number): number {
  const a = Math.sin(zend) / (1.0 + scaleH / Ra);
  return Press / 1013.0 / Math.sqrt(1.0 - a * a);
}

function MoonsBrightness(dist: number, phasemoon: number): number {
  const log10 = 2.302585092994;
  return -21.62 + 5 * Math.log(dist / (Ra / 1000)) / log10 + 0.026 * Math.abs(phasemoon) + 0.000000004 * Math.pow(phasemoon, 4);
}

function MoonPhase(AltM: number, AziM: number, AltS: number, AziS: number): number {
  const AltMi = AltM * DEGTORAD;
  const AltSi = AltS * DEGTORAD;
  const AziMi = AziM * DEGTORAD;
  const AziSi = AziS * DEGTORAD;
  const MoonAvgPar = 0.95;
  return 180 - Math.acos(Math.cos(AziSi - AziMi - MoonAvgPar * DEGTORAD) * Math.cos(AltMi + MoonAvgPar * DEGTORAD) * Math.cos(AltSi) + Math.sin(AltSi) * Math.sin(AltMi + MoonAvgPar * DEGTORAD)) / DEGTORAD;
}

function WidthMoon(AltO: number, AziO: number, AltS: number, AziS: number, parallax: number): number {
  const GeoAltO = AltO + parallax;
  return 0.27245 * parallax * (1 + Math.sin(GeoAltO * DEGTORAD) * Math.sin(parallax * DEGTORAD)) * (1 - Math.cos((AltS - GeoAltO) * DEGTORAD) * Math.cos((AziS - AziO) * DEGTORAD));
}

function LengthMoon(W: number, Diamoon: number): number {
  let D = Diamoon;
  if (D === 0) D = AvgRadiusMoon * 2;
  const Wi = W * 60;
  D = D * 60;
  return (D - 0.3 * (D + Wi) / 2.0 / Wi) / 60.0;
}

function qYallop(W: number, GeoARCVact: number): number {
  const Wi = W * 60;
  return (GeoARCVact - (11.8371 - 6.3226 * Wi + 0.7319 * Wi * Wi - 0.1018 * Wi * Wi * Wi)) / 10;
}

function crossing(A: number, B: number, C: number, D: number): number {
  return (C - A) / ((B - A) - (D - C));
}

function x2min(A: number, B: number, C: number): number {
  const term = A + C - 2 * B;
  if (term === 0) return 0;
  return -(A - C) / 2.0 / term;
}

function funct2(A: number, B: number, C: number, x: number): number {
  return (A + C - 2 * B) / 2.0 * x * x + (A - C) / 2.0 * x + B;
}

function CVA(B: number, SN: number, helflag: number): number {
  let is_scotopic = false;
  if (B < 1394) is_scotopic = true;
  if (helflag & SE_HELFLAG_VISLIM_PHOTOPIC) is_scotopic = false;
  if (helflag & SE_HELFLAG_VISLIM_SCOTOPIC) is_scotopic = true;
  if (is_scotopic)
    return Math.min(900, 380 / SN * Math.pow(10, 0.3 * Math.pow(B, -0.29))) / 60.0 / 60.0;
  else
    return (40.0 / SN) * Math.pow(10, 8.28 * Math.pow(B, -0.29)) / 60.0 / 60.0;
}

function PupilDia(Age: number, B: number): number {
  return (0.534 - 0.00211 * Age - (0.236 - 0.00127 * Age) * Math.tanh(0.4 * Math.log(B) / Math.log(10) - 2.2)) * 10;
}

function getSynodicPeriod(Planet: number): number {
  switch (Planet) {
    case SE_MOON: return 29.530588853;
    case SE_MERCURY: return 115.8775;
    case SE_VENUS: return 583.9214;
    case SE_MARS: return 779.9361;
    case SE_JUPITER: return 398.8840;
    case SE_SATURN: return 378.0919;
    case SE_URANUS: return 369.6560;
    case SE_NEPTUNE: return 367.4867;
    case SE_PLUTO: return 366.7207;
  }
  return 366;
}

function DeterObject(ObjectName: string): number {
  const s = ObjectName.toLowerCase();
  if (s.startsWith('sun')) return SE_SUN;
  if (s.startsWith('venus')) return SE_VENUS;
  if (s.startsWith('mars')) return SE_MARS;
  if (s.startsWith('mercur')) return SE_MERCURY;
  if (s.startsWith('jupiter')) return SE_JUPITER;
  if (s.startsWith('saturn')) return SE_SATURN;
  if (s.startsWith('uranus')) return SE_URANUS;
  if (s.startsWith('neptun')) return SE_NEPTUNE;
  if (s.startsWith('moon')) return SE_MOON;
  const ipl = parseInt(s, 10);
  if (ipl > 0) return ipl + SE_AST_OFFSET;
  return -1;
}

function strcpyVBsafe(sin: string): string {
  let out = '';
  for (let i = 0; i < sin.length && out.length < 30; i++) {
    const c = sin[i];
    if (/[a-zA-Z0-9 ,\-]/.test(c)) out += c;
    else break;
  }
  return out;
}

function tolowerStringStar(str: string): string {
  const commaIdx = str.indexOf(',');
  if (commaIdx === -1) return str.toLowerCase();
  return str.substring(0, commaIdx).toLowerCase() + str.substring(commaIdx);
}

function defaultHeliacalParameters(datm: number[], dgeo: number[], dobs: number[], helflag: number): void {
  if (datm[0] <= 0) {
    datm[0] = 1013.25 * Math.pow(1 - 0.0065 * dgeo[2] / 288, 5.255);
    if (datm[1] === 0) datm[1] = 15 - 0.0065 * dgeo[2];
    if (datm[2] === 0) datm[2] = 40;
  } else {
    if (datm[2] <= 0.00000001) datm[2] = 0.00000001;
    if (datm[2] >= 99.99999999) datm[2] = 99.99999999;
  }
  if (dobs[0] === 0) dobs[0] = 36;
  if (dobs[1] === 0) dobs[1] = 1;
  if (!(helflag & SE_HELFLAG_OPTICAL_PARAMS)) {
    for (let i = 2; i <= 5; i++) dobs[i] = 0;
  }
  if (dobs[3] === 0) {
    dobs[2] = 1;
    dobs[3] = 1;
  }
}

/* ================================================================
 * B. Atmospheric extinction (with caches)
 * ================================================================ */

function kW(HeightEye: number, TempS: number, RH: number): number {
  let WT = 0.031;
  WT *= 0.94 * (RH / 100.0) * Math.exp(TempS / 15) * Math.exp(-1 * HeightEye / scaleHwater);
  return WT;
}

function kR(AltS: number, HeightEye: number): number {
  let val = -AltS - 12;
  if (val < 0) val = 0;
  if (val > 6) val = 6;
  const CHANGEK = 1 - 0.166667 * val;
  const LAMBDA = 0.55 + (CHANGEK - 1) * 0.04;
  return 0.1066 * Math.exp(-1 * HeightEye / scaleHrayleigh) * Math.pow(LAMBDA / 0.55, -4);
}

function kOZ(AltS: number, sunra: number, Lat: number): number {
  if (AltS === kOZ_alts_last && sunra === kOZ_sunra_last) return kOZ_last;
  kOZ_alts_last = AltS;
  kOZ_sunra_last = sunra;
  const OZ = 0.031;
  const LT = Lat * DEGTORAD;
  let kOZret = OZ * (3.0 + 0.4 * (LT * Math.cos(sunra * DEGTORAD) - Math.cos(3 * LT))) / 3.0;
  let altslim = -AltS - 12;
  if (altslim < 0) altslim = 0;
  const CHANGEKO = (100 - 11.6 * Math.min(6, altslim)) / 100;
  kOZ_last = kOZret * CHANGEKO;
  return kOZ_last;
}

function ka(AltS: number, sunra: number, Lat: number, HeightEye: number, TempS: number, RH: number, VR: number, serrRef: { value: string }): number {
  const SL = Sgn(Lat);
  if (AltS === ka_alts_last && sunra === ka_sunra_last) return ka_last;
  ka_alts_last = AltS;
  ka_sunra_last = sunra;
  const CHANGEKA = 1 - 0.166667 * Math.min(6, Math.max(-AltS - 12, 0));
  const LAMBDA = 0.55 + (CHANGEKA - 1) * 0.04;
  let kaact: number;
  if (VR !== 0) {
    if (VR >= 1) {
      const BetaVr = 3.912 / VR;
      const Betaa = BetaVr - (kW(HeightEye, TempS, RH) / scaleHwater + kR(AltS, HeightEye) / scaleHrayleigh) * 1000 * astr2tau;
      kaact = Betaa * scaleHaerosol / 1000 * tau2astr;
      if (kaact < 0) {
        serrRef.value = 'The provided Meteorological range is too long, when taking into acount other atmospheric parameters';
      }
    } else {
      kaact = VR - kW(HeightEye, TempS, RH) - kR(AltS, HeightEye) - kOZ(AltS, sunra, Lat);
      if (kaact < 0) {
        serrRef.value = 'The provided atmosphic coeefficent (ktot) is too low, when taking into acount other atmospheric parameters';
      }
    }
  } else {
    kaact = 0.1 * Math.exp(-1 * HeightEye / scaleHaerosol) * Math.pow(1 - 0.32 / Math.log(RH / 100.0), 1.33) * (1 + 0.33 * SL * Math.sin(sunra * DEGTORAD));
    kaact = kaact * Math.pow(LAMBDA / 0.55, -1.3);
  }
  ka_last = kaact;
  return kaact;
}

function kt(AltS: number, sunra: number, Lat: number, HeightEye: number, TempS: number, RH: number, VR: number, ExtType: number, serrRef: { value: string }): number {
  let kRact = 0, kWact = 0, kOZact = 0, kaact = 0;
  if (ExtType === 2 || ExtType === 4) kRact = kR(AltS, HeightEye);
  if (ExtType === 1 || ExtType === 4) kWact = kW(HeightEye, TempS, RH);
  if (ExtType === 3 || ExtType === 4) kOZact = kOZ(AltS, sunra, Lat);
  if (ExtType === 0 || ExtType === 4) kaact = ka(AltS, sunra, Lat, HeightEye, TempS, RH, VR, serrRef);
  if (kaact < 0) kaact = 0;
  return kWact + kRact + kOZact + kaact;
}

function Deltam(AltO: number, AltS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, serrRef: { value: string }): number {
  if (AltS === deltam_alts_last && AltO === deltam_alto_last && sunra === deltam_sunra_last) return deltam_last;
  deltam_alts_last = AltS;
  deltam_alto_last = AltO;
  deltam_sunra_last = sunra;
  const PresE = PresEfromPresS(datm[1], datm[0], HeightEye);
  const TempE = TempEfromTempS(datm[1], HeightEye, LapseSA);
  const AppAltO = AppAltfromTopoAlt(AltO, TempE, PresE, helflag);
  let deltam: number;
  if (staticAirmass === 0) {
    let zend = (90 - AppAltO) * DEGTORAD;
    if (zend > PI / 2) zend = PI / 2;
    const xR = Xext(scaleHrayleigh, zend, datm[0]);
    const XW = Xext(scaleHwater, zend, datm[0]);
    const Xa = Xext(scaleHaerosol, zend, datm[0]);
    const XOZ = Xlay(scaleHozone, zend, datm[0]);
    deltam = kR(AltS, HeightEye) * xR + kt(AltS, sunra, Lat, HeightEye, datm[1], datm[2], datm[3], 0, serrRef) * Xa + kOZ(AltS, sunra, Lat) * XOZ + kW(HeightEye, datm[1], datm[2]) * XW;
  } else {
    deltam = kt(AltS, sunra, Lat, HeightEye, datm[1], datm[2], datm[3], 4, serrRef) * Airmass(AppAltO, datm[0]);
  }
  deltam_last = deltam;
  return deltam;
}

/* ================================================================
 * C. Sky brightness
 * ================================================================ */

function Bn(AltO: number, JDNDayUT: number, AltS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, serrRef: { value: string }): number {
  const PresE = PresEfromPresS(datm[1], datm[0], HeightEye);
  const TempE = TempEfromTempS(datm[1], HeightEye, LapseSA);
  let AppAltO = AppAltfromTopoAlt(AltO, TempE, PresE, helflag);
  const B0 = 0.0000000000001;
  if (AppAltO < 10) AppAltO = 10;
  const zend = (90 - AppAltO) * DEGTORAD;
  const r = revJul(JDNDayUT, SE_GREG_CAL);
  const YearB = r.year;
  const MonthB = r.month;
  const DayB = r.day;
  const Bna = B0 * (1 + 0.3 * Math.cos(6.283 * (YearB + ((DayB - 1) / 30.4 + MonthB - 1) / 12 - 1990.33) / 11.1));
  const kX = Deltam(AltO, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  const Bnb = Bna * (0.4 + 0.6 / Math.sqrt(1 - 0.96 * Math.pow(Math.sin(zend), 2))) * Math.pow(10, -0.4 * kX);
  return Math.max(Bnb, 0) * erg2nL;
}

function Bm(AltO: number, AziO: number, AltM: number, AziM: number, AltS: number, AziS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, serrRef: { value: string }): number {
  const M0 = -11.05;
  let BmVal = 0;
  const lunar_radius = 0.25 * DEGTORAD;
  const object_is_moon = (AltO === AltM && AziO === AziM);
  if (AltM > -0.26 && !object_is_moon) {
    let RM = DistanceAngle(AltO * DEGTORAD, AziO * DEGTORAD, AltM * DEGTORAD, AziM * DEGTORAD) / DEGTORAD;
    if (RM <= lunar_radius / DEGTORAD) RM = lunar_radius / DEGTORAD;
    const kXM = Deltam(AltM, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
    const kX = Deltam(AltO, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
    const C3 = Math.pow(10, -0.4 * kXM);
    const FM = 62000000.0 / RM / RM + Math.pow(10, 6.15 - RM / 40) + Math.pow(10, 5.36) * (1.06 + Math.pow(Math.cos(RM * DEGTORAD), 2));
    BmVal = FM * C3 + 440000 * (1 - C3);
    const phasemoon = MoonPhase(AltM, AziM, AltS, AziS);
    const MM = MoonsBrightness(384410.4978, phasemoon);
    BmVal = BmVal * Math.pow(10, -0.4 * (MM - M0 + 43.27));
    BmVal = BmVal * (1 - Math.pow(10, -0.4 * kX));
  }
  BmVal = Math.max(BmVal, 0) * erg2nL;
  return BmVal;
}

function Btwi(AltO: number, AziO: number, AltS: number, AziS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, serrRef: { value: string }): number {
  const M0 = -11.05;
  const MS = -26.74;
  const PresE = PresEfromPresS(datm[1], datm[0], HeightEye);
  const TempE = TempEfromTempS(datm[1], HeightEye, LapseSA);
  const AppAltO = AppAltfromTopoAlt(AltO, TempE, PresE, helflag);
  const ZendO = 90 - AppAltO;
  const RS = DistanceAngle(AltO * DEGTORAD, AziO * DEGTORAD, AltS * DEGTORAD, AziS * DEGTORAD) / DEGTORAD;
  const kX = Deltam(AltO, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  const k = kt(AltS, sunra, Lat, HeightEye, datm[1], datm[2], datm[3], 4, serrRef);
  let BtwiVal = Math.pow(10, -0.4 * (MS - M0 + 32.5 - AltS - (ZendO / (360 * k))));
  BtwiVal = BtwiVal * (100 / RS) * (1 - Math.pow(10, -0.4 * kX));
  BtwiVal = Math.max(BtwiVal, 0) * erg2nL;
  return BtwiVal;
}

function Bday(AltO: number, AziO: number, AltS: number, AziS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, serrRef: { value: string }): number {
  const M0 = -11.05;
  const MS = -26.74;
  const RS = DistanceAngle(AltO * DEGTORAD, AziO * DEGTORAD, AltS * DEGTORAD, AziS * DEGTORAD) / DEGTORAD;
  const kXS = Deltam(AltS, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  const kX = Deltam(AltO, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  const C4 = Math.pow(10, -0.4 * kXS);
  const FS = 62000000.0 / RS / RS + Math.pow(10, 6.15 - RS / 40) + Math.pow(10, 5.36) * (1.06 + Math.pow(Math.cos(RS * DEGTORAD), 2));
  let BdayVal = FS * C4 + 440000.0 * (1 - C4);
  BdayVal = BdayVal * Math.pow(10, -0.4 * (MS - M0 + 43.27));
  BdayVal = BdayVal * (1 - Math.pow(10, -0.4 * kX));
  BdayVal = Math.max(BdayVal, 0) * erg2nL;
  return BdayVal;
}

function Bcity(Value: number, _Press: number): number {
  return Math.max(Value, 0);
}

function Bsky(AltO: number, AziO: number, AltM: number, AziM: number, JDNDaysUT: number, AltS: number, AziS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, serrRef: { value: string }): number {
  let BskyVal = 0;
  if (AltS < -3) {
    BskyVal += Btwi(AltO, AziO, AltS, AziS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  } else {
    if (AltS > 4) {
      BskyVal += Bday(AltO, AziO, AltS, AziS, sunra, Lat, HeightEye, datm, helflag, serrRef);
    } else {
      BskyVal += Math.min(Bday(AltO, AziO, AltS, AziS, sunra, Lat, HeightEye, datm, helflag, serrRef), Btwi(AltO, AziO, AltS, AziS, sunra, Lat, HeightEye, datm, helflag, serrRef));
    }
  }
  if (BskyVal < 200000000.0)
    BskyVal += Bm(AltO, AziO, AltM, AziM, AltS, AziS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  if (AltS <= 0)
    BskyVal += Bcity(0, datm[0]);
  if (BskyVal < 5000)
    BskyVal += Bn(AltO, JDNDaysUT, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  return BskyVal;
}

/* ================================================================
 * D. Optic factor and visual limit magnitude
 * ================================================================ */

function OpticFactor(Bback: number, kX: number, dobs: number[], JDNDaysUT: number, ObjectName: string, TypeFactor: number, helflag: number): number {
  const Age = dobs[0];
  const SN = dobs[1];
  let SNi = SN;
  const Binocular = dobs[2];
  let OpticMag = dobs[3];
  let OpticDia = dobs[4];
  let OpticTrans = dobs[5];
  let is_scotopic = false;
  if (SNi <= 0.00000001) SNi = 0.00000001;
  const Pst = PupilDia(23, Bback);
  if (OpticMag === 1) {
    OpticTrans = 1;
    OpticDia = Pst;
  }
  const CIb = 0.7;
  const CIi = 0.5;
  const ObjectSize = 0;
  let Fb = 1;
  if (Binocular === 0) Fb = 1.41;
  if (Bback < 1645) is_scotopic = true;
  if (helflag & SE_HELFLAG_VISLIM_PHOTOPIC) is_scotopic = false;
  if (helflag & SE_HELFLAG_VISLIM_SCOTOPIC) is_scotopic = true;
  let Fe: number, Fsc: number, Fci: number, Fcb: number;
  if (is_scotopic) {
    Fe = Math.pow(10, 0.48 * kX);
    Fsc = Math.min(1, (1 - Math.pow(Pst / 124.4, 4)) / (1 - Math.pow(OpticDia / OpticMag / 124.4, 4)));
    Fci = Math.pow(10, -0.4 * (1 - CIi / 2.0));
    Fcb = Math.pow(10, -0.4 * (1 - CIb / 2.0));
  } else {
    Fe = Math.pow(10, 0.4 * kX);
    Fsc = Math.min(1, Math.pow(OpticDia / OpticMag / Pst, 2) * (1 - Math.exp(-Math.pow(Pst / 6.2, 2))) / (1 - Math.exp(-Math.pow(OpticDia / OpticMag / 6.2, 2))));
    Fci = 1;
    Fcb = 1;
  }
  const Ft = 1 / OpticTrans;
  const Fp = Math.max(1, Math.pow(Pst / (OpticMag * PupilDia(Age, Bback)), 2));
  const Fa = Math.pow(Pst / OpticDia, 2);
  const Fr = (1 + 0.03 * Math.pow(OpticMag * ObjectSize / CVA(Bback, SNi, helflag), 2)) / Math.pow(SNi, 2);
  const Fm = Math.pow(OpticMag, 2);
  if (TypeFactor === 0)
    return Fb * Fe * Ft * Fp * Fa * Fr * Fsc * Fci;
  else
    return Fb * Ft * Fp * Fa * Fm * Fsc * Fcb;
}

function VisLimMagn(dobs: number[], AltO: number, AziO: number, AltM: number, AziM: number, JDNDaysUT: number, AltS: number, AziS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number, scotopic_flag: { value: number } | null, serrRef: { value: string }): number {
  const log10 = 2.302585092994;
  let is_scotopic = false;
  let Bsk = Bsky(AltO, AziO, AltM, AziM, JDNDaysUT, AltS, AziS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  const kX = Deltam(AltO, AltS, sunra, Lat, HeightEye, datm, helflag, serrRef);
  const CorrFactor1 = OpticFactor(Bsk, kX, dobs, JDNDaysUT, '', 1, helflag);
  const CorrFactor2 = OpticFactor(Bsk, kX, dobs, JDNDaysUT, '', 0, helflag);
  if (Bsk < 1645) is_scotopic = true;
  if (helflag & SE_HELFLAG_VISLIM_PHOTOPIC) is_scotopic = false;
  if (helflag & SE_HELFLAG_VISLIM_SCOTOPIC) is_scotopic = true;
  let C1: number, C2: number;
  if (is_scotopic) {
    C1 = 1.5848931924611e-10;
    C2 = 0.012589254117942;
    if (scotopic_flag !== null) scotopic_flag.value = 1;
  } else {
    C1 = 4.4668359215096e-9;
    C2 = 1.2589254117942e-6;
    if (scotopic_flag !== null) scotopic_flag.value = 0;
  }
  if (scotopic_flag !== null) {
    if (BNIGHT * BNIGHT_FACTOR > Bsk && BNIGHT / BNIGHT_FACTOR < Bsk)
      scotopic_flag.value |= 2;
  }
  Bsk = Bsk * CorrFactor1;
  const Th = C1 * Math.pow(1 + Math.sqrt(C2 * Bsk), 2) * CorrFactor2;
  return -16.57 - 2.5 * (Math.log(Th) / log10);
}

/* ================================================================
 * E. Swiss Ephemeris wrappers (need swed)
 * ================================================================ */

function callSweFixstar(swed: SweData, star: string, tjd: number, iflag: number): { retval: number; xx: Float64Array; serr: string } {
  const r = sweFixstar(swed, star, tjd, iflag);
  return { retval: r.flags === ERR ? ERR : OK, xx: r.xx, serr: r.serr };
}

function callSweFixstarMag(swed: SweData, star: string): { retval: number; mag: number; serr: string } {
  if (star === fixstarMag_star_save) {
    return { retval: OK, mag: fixstarMag_dmag, serr: '' };
  }
  fixstarMag_star_save = star;
  const r = sweFixstarMag(swed, star);
  fixstarMag_dmag = r.mag;
  return { retval: r.serr ? ERR : OK, mag: r.mag, serr: r.serr };
}

function callSweRiseTrans(swed: SweData, tjd: number, ipl: number, star: string, helflag: number, eventtype: number, dgeo: number[], atpress: number, attemp: number): { retval: number; tret: number; serr: string } {
  const iflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  const serrRef = { value: '' };
  const r = sweRiseTrans(swed, tjd, ipl, star || null, iflag, eventtype, dgeo, atpress, attemp, serrRef);
  return { retval: r.retval, tret: r.tret, serr: serrRef.value };
}

function SunRA(swed: SweData, JDNDaysUT: number, helflag: number): { ra: number; serr: string } {
  let serr = '';
  if (JDNDaysUT === sunRA_tjdlast) return { ra: sunRA_ralast, serr: '' };
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  const iflag = epheflag | SEFLG_EQUATORIAL | SEFLG_NONUT | SEFLG_TRUEPOS;
  const tjd_tt = JDNDaysUT + sweDeltatEx(JDNDaysUT, epheflag, swed);
  const r = sweCalc(swed, tjd_tt, SE_SUN, iflag);
  if (r.flags !== ERR) {
    sunRA_ralast = r.xx[0];
    sunRA_tjdlast = JDNDaysUT;
    return { ra: sunRA_ralast, serr: r.serr };
  }
  /* fallback approximation */
  const rv = revJul(JDNDaysUT, SE_GREG_CAL);
  sunRA_tjdlast = JDNDaysUT;
  sunRA_ralast = sweDegnorm((rv.month + (rv.day - 1) / 30.4 - 3.69) * 30);
  return { ra: sunRA_ralast, serr };
}

function Magnitude(swed: SweData, JDNDaysUT: number, dgeo: number[], ObjectName: string, helflag: number): { retval: number; dmag: number; serr: string } {
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let dmag = -99.0;
  const Planet = DeterObject(ObjectName);
  let iflag = SEFLG_TOPOCTR | SEFLG_EQUATORIAL | epheflag;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag |= SEFLG_NONUT | SEFLG_TRUEPOS;
  if (Planet !== -1) {
    sweSetTopo(swed, dgeo[0], dgeo[1], dgeo[2]);
    const serrRef = { value: '' };
    const r = swePhenoUt(swed, JDNDaysUT, Planet, iflag, serrRef);
    if (r.retval === ERR) return { retval: ERR, dmag, serr: serrRef.value };
    dmag = r.attr[4];
    return { retval: OK, dmag, serr: serrRef.value };
  } else {
    const r = callSweFixstarMag(swed, ObjectName);
    if (r.retval === ERR) return { retval: ERR, dmag, serr: r.serr };
    dmag = r.mag;
    return { retval: OK, dmag, serr: r.serr };
  }
}

function ObjectLoc(swed: SweData, JDNDaysUT: number, dgeo: number[], datm: number[], ObjectName: string, Angle: number, helflag: number): { retval: number; dret: number; serr: string } {
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let iflag = SEFLG_EQUATORIAL | epheflag;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag |= SEFLG_NONUT | SEFLG_TRUEPOS;
  let AngleAdj = Angle;
  if (AngleAdj < 5) iflag |= SEFLG_TOPOCTR;
  if (AngleAdj === 7) AngleAdj = 0;
  const tjd_tt = JDNDaysUT + sweDeltatEx(JDNDaysUT, epheflag, swed);
  const Planet = DeterObject(ObjectName);
  let x: Float64Array;
  let serr = '';
  if (Planet !== -1) {
    const r = sweCalc(swed, tjd_tt, Planet, iflag);
    if (r.flags === ERR) return { retval: ERR, dret: 0, serr: r.serr };
    x = r.xx;
    serr = r.serr;
  } else {
    const r = callSweFixstar(swed, ObjectName, tjd_tt, iflag);
    if (r.retval === ERR) return { retval: ERR, dret: 0, serr: r.serr };
    x = r.xx;
    serr = r.serr;
  }
  if (AngleAdj === 2 || AngleAdj === 5) {
    return { retval: OK, dret: x[1], serr };
  } else if (AngleAdj === 3 || AngleAdj === 6) {
    return { retval: OK, dret: x[0], serr };
  } else {
    const xin = [x[0], x[1]];
    const xaz = [0, 0, 0];
    sweAzalt(swed, JDNDaysUT, SE_EQU2HOR, dgeo, datm[0], datm[1], xin, xaz);
    if (AngleAdj === 0) return { retval: OK, dret: xaz[1], serr };
    if (AngleAdj === 4) return { retval: OK, dret: AppAltfromTopoAlt(xaz[1], datm[0], datm[1], helflag), serr };
    if (AngleAdj === 1) {
      let azi = xaz[0] + 180;
      if (azi >= 360) azi -= 360;
      return { retval: OK, dret: azi, serr };
    }
    return { retval: OK, dret: xaz[1], serr };
  }
}

function azaltCart(swed: SweData, JDNDaysUT: number, dgeo: number[], datm: number[], ObjectName: string, helflag: number): { retval: number; dret: number[]; serr: string } {
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let iflag = SEFLG_EQUATORIAL | epheflag;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag |= SEFLG_NONUT | SEFLG_TRUEPOS;
  iflag |= SEFLG_TOPOCTR;
  const tjd_tt = JDNDaysUT + sweDeltatEx(JDNDaysUT, epheflag, swed);
  const Planet = DeterObject(ObjectName);
  let x: Float64Array;
  let serr = '';
  if (Planet !== -1) {
    const r = sweCalc(swed, tjd_tt, Planet, iflag);
    if (r.flags === ERR) return { retval: ERR, dret: [0, 0, 0, 0, 0, 0], serr: r.serr };
    x = r.xx; serr = r.serr;
  } else {
    const r = callSweFixstar(swed, ObjectName, tjd_tt, iflag);
    if (r.retval === ERR) return { retval: ERR, dret: [0, 0, 0, 0, 0, 0], serr: r.serr };
    x = r.xx; serr = r.serr;
  }
  const xin = [x[0], x[1]];
  const xaz = [0, 0, 0];
  sweAzalt(swed, JDNDaysUT, SE_EQU2HOR, dgeo, datm[0], datm[1], xin, xaz);
  const dret = [xaz[0], xaz[1], xaz[2], 0, 0, 0];
  const xazCart = [xaz[0], xaz[2], 1];
  const cart = [0, 0, 0];
  swiPolcart(xazCart, cart);
  dret[3] = cart[0]; dret[4] = cart[1]; dret[5] = cart[2];
  return { retval: OK, dret, serr };
}

function calcRiseAndSet(swed: SweData, tjd_start: number, ipl: number, dgeo: number[], datm: number[], eventflag: number, helflag: number): { retval: number; tret: number; serr: string } {
  const dfac = 1 / 365.25;
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let iflag = epheflag | SEFLG_EQUATORIAL;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag |= SEFLG_NONUT | SEFLG_TRUEPOS;
  const rs = sweCalcUt(swed, tjd_start, SE_SUN, iflag);
  if (rs.flags === ERR) return { retval: ERR, tret: 0, serr: 'error in calc_rise_and_set(): calc(sun) failed' };
  const xs = rs.xx;
  const rx = sweCalcUt(swed, tjd_start, ipl, iflag);
  if (rx.flags === ERR) return { retval: ERR, tret: 0, serr: 'error in calc_rise_and_set(): calc failed' };
  const xx = rx.xx;
  let tjdnoon = Math.trunc(tjd_start) - dgeo[0] / 15.0 / 24.0;
  tjdnoon -= sweDegnorm(xs[0] - xx[0]) / 360.0;
  const xaz = [0, 0, 0];
  sweAzalt(swed, tjd_start, SE_EQU2HOR, dgeo, datm[0], datm[1], [xx[0], xx[1]], xaz);
  if (eventflag & SE_CALC_RISE) {
    if (xaz[2] > 0) {
      while (tjdnoon - tjd_start < 0.5) tjdnoon += 1;
      while (tjdnoon - tjd_start > 1.5) tjdnoon -= 1;
    } else {
      while (tjdnoon - tjd_start < 0.0) tjdnoon += 1;
      while (tjdnoon - tjd_start > 1.0) tjdnoon -= 1;
    }
  } else {
    if (xaz[2] > 0) {
      while (tjd_start - tjdnoon > 0.5) tjdnoon += 1;
      while (tjd_start - tjdnoon < -0.5) tjdnoon -= 1;
    } else {
      while (tjd_start - tjdnoon > 0.0) tjdnoon += 1;
      while (tjd_start - tjdnoon < -1.0) tjdnoon -= 1;
    }
  }
  let iflag2 = epheflag | SEFLG_EQUATORIAL;
  const rn = sweCalcUt(swed, tjdnoon, ipl, iflag2);
  if (rn.flags === ERR) return { retval: ERR, tret: 0, serr: 'error in calc_rise_and_set(): calc failed' };
  const xxn = rn.xx;
  let rdi = 0;
  if (ipl === SE_SUN)
    rdi = Math.asin(696000000.0 / 1.49597870691e+11 / xxn[2]) / DEGTORAD;
  else if (ipl === SE_MOON)
    rdi = Math.asin(1737000.0 / 1.49597870691e+11 / xxn[2]) / DEGTORAD;
  if (eventflag & SE_BIT_DISC_CENTER) rdi = 0;
  const rh = -(34.5 / 60.0 + rdi);
  const sda = Math.acos(-Math.tan(dgeo[1] * DEGTORAD) * Math.tan(xxn[1] * DEGTORAD)) * RADTODEG;
  let tjdrise: number;
  if (eventflag & SE_CALC_RISE)
    tjdrise = tjdnoon - sda / 360.0;
  else
    tjdrise = tjdnoon + sda / 360.0;
  iflag2 = epheflag | SEFLG_SPEED | SEFLG_EQUATORIAL;
  if (ipl === SE_MOON) iflag2 |= SEFLG_TOPOCTR;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag2 |= SEFLG_NONUT | SEFLG_TRUEPOS;
  for (let i = 0; i < 2; i++) {
    const rc = sweCalcUt(swed, tjdrise, ipl, iflag2);
    if (rc.flags === ERR) return { retval: ERR, tret: 0, serr: rc.serr };
    const xxi = rc.xx;
    const xazi = [0, 0, 0];
    sweAzalt(swed, tjdrise, SE_EQU2HOR, dgeo, datm[0], datm[1], [xxi[0], xxi[1]], xazi);
    const xxPrev = [xxi[0] - xxi[3] * dfac, xxi[1] - xxi[4] * dfac];
    const xaz2 = [0, 0, 0];
    sweAzalt(swed, tjdrise - dfac, SE_EQU2HOR, dgeo, datm[0], datm[1], xxPrev, xaz2);
    tjdrise -= (xazi[1] - rh) / (xazi[1] - xaz2[1]) * dfac;
  }
  return { retval: OK, tret: tjdrise, serr: '' };
}

function myRiseTrans(swed: SweData, tjd: number, ipl: number, starname: string, eventtype: number, helflag: number, dgeo: number[], datm: number[]): { retval: number; tret: number; serr: string } {
  let iplAdj = ipl;
  if (starname !== '' && starname !== null) iplAdj = DeterObject(starname);
  if (iplAdj !== -1 && Math.abs(dgeo[1]) < 63) {
    return calcRiseAndSet(swed, tjd, iplAdj, dgeo, datm, eventtype, helflag);
  } else {
    return callSweRiseTrans(swed, tjd, ipl, starname, helflag, eventtype, dgeo, datm[0], datm[1]);
  }
}

function RiseSet(swed: SweData, JDNDaysUT: number, dgeo: number[], datm: number[], ObjectName: string, RSEvent: number, helflag: number, Rim: number): { retval: number; tret: number; serr: string } {
  let eventtype = RSEvent;
  if (Rim === 0) eventtype |= SE_BIT_DISC_CENTER;
  const Planet = DeterObject(ObjectName);
  if (Planet !== -1)
    return myRiseTrans(swed, JDNDaysUT, Planet, '', eventtype, helflag, dgeo, datm);
  else
    return myRiseTrans(swed, JDNDaysUT, -1, ObjectName, eventtype, helflag, dgeo, datm);
}

function TopoArcVisionis(swed: SweData, Magn: number, dobs: number[], AltO: number, AziO: number, AltM: number, AziM: number, JDNDaysUT: number, AziS: number, sunra: number, Lat: number, HeightEye: number, datm: number[], helflag: number): { retval: number; dret: number; serr: string } {
  const serrRef = { value: '' };
  let xR = 0;
  let Xl = 45;
  const Yl = Magn - VisLimMagn(dobs, AltO, AziO, AltM, AziM, JDNDaysUT, AltO - Xl, AziS, sunra, Lat, HeightEye, datm, helflag, null, serrRef);
  let Yr = Magn - VisLimMagn(dobs, AltO, AziO, AltM, AziM, JDNDaysUT, AltO - xR, AziS, sunra, Lat, HeightEye, datm, helflag, null, serrRef);
  let Xm: number;
  if (Yl * Yr <= 0) {
    let YlMut = Yl;
    while (Math.abs(xR - Xl) > epsilon) {
      Xm = (xR + Xl) / 2.0;
      const AltSi = AltO - Xm;
      const Ym = Magn - VisLimMagn(dobs, AltO, AziO, AltM, AziM, JDNDaysUT, AltSi, AziS, sunra, Lat, HeightEye, datm, helflag, null, serrRef);
      if (YlMut * Ym > 0) { Xl = Xm; YlMut = Ym; }
      else { xR = Xm; Yr = Ym; }
    }
    Xm = (xR + Xl) / 2.0;
  } else {
    Xm = 99;
  }
  if (Xm < AltO) Xm = AltO;
  return { retval: OK, dret: Xm, serr: serrRef.value };
}

function HeliacalAngle(swed: SweData, Magn: number, dobs: number[], AziO: number, AltM: number, AziM: number, JDNDaysUT: number, AziS: number, dgeo: number[], datm: number[], helflag: number): { retval: number; dangret: number[]; serr: string } {
  const serrRef = { value: '' };
  const sunra = SunRA(swed, JDNDaysUT, helflag).ra;
  const Lat = dgeo[1];
  const HeightEye = dgeo[2];
  const dangret = [0, 0, 0];
  if (PLSV as number === 1) {
    dangret[0] = criticalangle;
    dangret[1] = criticalangle + Magn * 2.492 + 13.447;
    dangret[2] = -(Magn * 2.492 + 13.447);
    return { retval: OK, dangret, serr: '' };
  }
  const minx = 2, maxx = 20;
  let xmin = 0, ymin = 10000;
  for (let x = minx; x <= maxx; x++) {
    const r = TopoArcVisionis(swed, Magn, dobs, x, AziO, AltM, AziM, JDNDaysUT, AziS, sunra, Lat, HeightEye, datm, helflag);
    if (r.retval === ERR) return { retval: ERR, dangret, serr: r.serr };
    if (r.dret < ymin) { ymin = r.dret; xmin = x; }
  }
  let XlH = xmin - 1;
  let xRH = xmin + 1;
  let rr = TopoArcVisionis(swed, Magn, dobs, xRH, AziO, AltM, AziM, JDNDaysUT, AziS, sunra, Lat, HeightEye, datm, helflag);
  if (rr.retval === ERR) return { retval: ERR, dangret, serr: rr.serr };
  let Yr = rr.dret;
  let rl = TopoArcVisionis(swed, Magn, dobs, XlH, AziO, AltM, AziM, JDNDaysUT, AziS, sunra, Lat, HeightEye, datm, helflag);
  if (rl.retval === ERR) return { retval: ERR, dangret, serr: rl.serr };
  let Yl = rl.dret;
  while (Math.abs(xRH - XlH) > 0.1) {
    const Xm = (xRH + XlH) / 2.0;
    const DELTAx = 0.025;
    const rm = TopoArcVisionis(swed, Magn, dobs, Xm, AziO, AltM, AziM, JDNDaysUT, AziS, sunra, Lat, HeightEye, datm, helflag);
    if (rm.retval === ERR) return { retval: ERR, dangret, serr: rm.serr };
    const Ym = rm.dret;
    const rmd = TopoArcVisionis(swed, Magn, dobs, Xm + DELTAx, AziO, AltM, AziM, JDNDaysUT, AziS, sunra, Lat, HeightEye, datm, helflag);
    if (rmd.retval === ERR) return { retval: ERR, dangret, serr: rmd.serr };
    if (Ym >= rmd.dret) { XlH = Xm; Yl = Ym; }
    else { xRH = Xm; Yr = Ym; }
  }
  const XmF = (xRH + XlH) / 2.0;
  const YmF = (Yr + Yl) / 2.0;
  dangret[1] = YmF;
  dangret[2] = XmF - YmF;
  dangret[0] = XmF;
  return { retval: OK, dangret, serr: serrRef.value };
}

function DeterTAV(swed: SweData, dobs: number[], JDNDaysUT: number, dgeo: number[], datm: number[], ObjectName: string, helflag: number): { retval: number; dret: number; serr: string } {
  const sunra = SunRA(swed, JDNDaysUT, helflag).ra;
  const mr = Magnitude(swed, JDNDaysUT, dgeo, ObjectName, helflag);
  if (mr.retval === ERR) return { retval: ERR, dret: 0, serr: mr.serr };
  const altO = ObjectLoc(swed, JDNDaysUT, dgeo, datm, ObjectName, 0, helflag);
  if (altO.retval === ERR) return { retval: ERR, dret: 0, serr: altO.serr };
  const aziO = ObjectLoc(swed, JDNDaysUT, dgeo, datm, ObjectName, 1, helflag);
  if (aziO.retval === ERR) return { retval: ERR, dret: 0, serr: aziO.serr };
  let AltM: number, AziM: number;
  if (ObjectName.startsWith('moon')) {
    AltM = -90; AziM = 0;
  } else {
    const rm = ObjectLoc(swed, JDNDaysUT, dgeo, datm, 'moon', 0, helflag);
    if (rm.retval === ERR) return { retval: ERR, dret: 0, serr: rm.serr };
    AltM = rm.dret;
    const rma = ObjectLoc(swed, JDNDaysUT, dgeo, datm, 'moon', 1, helflag);
    if (rma.retval === ERR) return { retval: ERR, dret: 0, serr: rma.serr };
    AziM = rma.dret;
  }
  const aziS = ObjectLoc(swed, JDNDaysUT, dgeo, datm, 'sun', 1, helflag);
  if (aziS.retval === ERR) return { retval: ERR, dret: 0, serr: aziS.serr };
  return TopoArcVisionis(swed, mr.dmag, dobs, altO.dret, aziO.dret, AltM, AziM, JDNDaysUT, aziS.dret, sunra, dgeo[1], dgeo[2], datm, helflag);
}

/* ================================================================
 * F. Event search functions
 * ================================================================ */

function getAscObl(swed: SweData, tjd: number, ipl: number, star: string, iflag: number, dgeo: number[], desc_obl: boolean): { retval: number; daop: number; serr: string } {
  const epheflag = iflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let x: Float64Array;
  let serr = '';
  if (ipl === -1) {
    const star2 = star;
    const r = sweFixstar(swed, star2, tjd, epheflag | SEFLG_EQUATORIAL);
    if (r.flags === ERR) return { retval: ERR, daop: 0, serr: r.serr };
    x = r.xx; serr = r.serr;
  } else {
    const r = sweCalc(swed, tjd, ipl, epheflag | SEFLG_EQUATORIAL);
    if (r.flags === ERR) return { retval: ERR, daop: 0, serr: r.serr };
    x = r.xx; serr = r.serr;
  }
  const adpRaw = Math.tan(dgeo[1] * DEGTORAD) * Math.tan(x[1] * DEGTORAD);
  if (Math.abs(adpRaw) > 1) {
    let s: string;
    if (star !== '') s = star;
    else s = sweGetPlanetName(ipl, swed);
    return { retval: -2, daop: 0, serr: `${s} is circumpolar, cannot calculate heliacal event` };
  }
  const adp = Math.asin(adpRaw) / DEGTORAD;
  let daop: number;
  if (desc_obl) daop = x[0] + adp;
  else daop = x[0] - adp;
  daop = sweDegnorm(daop);
  return { retval: OK, daop, serr };
}

function getAscOblDiff(swed: SweData, tjd: number, ipl: number, star: string, iflag: number, dgeo: number[], desc_obl: boolean, is_acronychal: boolean): { retval: number; dsunpl: number; serr: string } {
  const r1 = getAscObl(swed, tjd, SE_SUN, '', iflag, dgeo, desc_obl);
  if (r1.retval !== OK) return { retval: r1.retval, dsunpl: 0, serr: r1.serr };
  let desc_obl2 = desc_obl;
  if (is_acronychal) desc_obl2 = !desc_obl2;
  const r2 = getAscObl(swed, tjd, ipl, star, iflag, dgeo, desc_obl2);
  if (r2.retval !== OK) return { retval: r2.retval, dsunpl: 0, serr: r2.serr };
  let dsunpl = sweDegnorm(r1.daop - r2.daop);
  if (is_acronychal) dsunpl = sweDegnorm(dsunpl - 180);
  if (dsunpl > 180) dsunpl -= 360;
  return { retval: OK, dsunpl, serr: '' };
}

function getAscOblWithSun(swed: SweData, tjd_start: number, ipl: number, star: string, helflag: number, evtyp: number, dperiod: number, dgeo: number[]): { retval: number; tjdret: number; serr: string } {
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let is_acronychal = false;
  let desc_obl = false;
  let retro = false;
  if (evtyp === SE_EVENING_LAST || evtyp === SE_EVENING_FIRST) desc_obl = true;
  if (evtyp === SE_MORNING_FIRST || evtyp === SE_EVENING_LAST) retro = true;
  if (evtyp === SE_ACRONYCHAL_RISING) desc_obl = true;
  if (evtyp === SE_ACRONYCHAL_RISING || evtyp === SE_ACRONYCHAL_SETTING) {
    is_acronychal = true;
    if (ipl !== SE_MOON) retro = true;
  }
  let tjd = tjd_start;
  let dsunpl_save = -999999999;
  let r = getAscOblDiff(swed, tjd, ipl, star, epheflag, dgeo, desc_obl, is_acronychal);
  if (r.retval !== OK) return { retval: r.retval, tjdret: 0, serr: r.serr };
  let dsunpl = r.dsunpl;
  let daystep = 20;
  let i = 0;
  while (dsunpl_save === -999999999 ||
    Math.abs(dsunpl) + Math.abs(dsunpl_save) > 180 ||
    (retro && !(dsunpl_save < 0 && dsunpl >= 0)) ||
    (!retro && !(dsunpl_save >= 0 && dsunpl < 0))) {
    i++;
    if (i > 5000) return { retval: ERR, tjdret: 0, serr: 'loop in get_asc_obl_with_sun() (1)' };
    dsunpl_save = dsunpl;
    tjd += 10.0;
    if (dperiod > 0 && tjd - tjd_start > dperiod) return { retval: -2, tjdret: 0, serr: '' };
    r = getAscOblDiff(swed, tjd, ipl, star, epheflag, dgeo, desc_obl, is_acronychal);
    if (r.retval !== OK) return { retval: r.retval, tjdret: 0, serr: r.serr };
    dsunpl = r.dsunpl;
  }
  let tjd_s = tjd - daystep;
  daystep /= 2.0;
  tjd = tjd_s + daystep;
  let rt = getAscOblDiff(swed, tjd, ipl, star, epheflag, dgeo, desc_obl, is_acronychal);
  if (rt.retval !== OK) return { retval: rt.retval, tjdret: 0, serr: rt.serr };
  let dsunpl_test = rt.dsunpl;
  i = 0;
  while (Math.abs(dsunpl) > 0.00001) {
    i++;
    if (i > 5000) return { retval: ERR, tjdret: 0, serr: 'loop in get_asc_obl_with_sun() (2)' };
    if (dsunpl_save * dsunpl_test >= 0) {
      dsunpl_save = dsunpl_test;
      tjd_s = tjd;
    } else {
      dsunpl = dsunpl_test;
    }
    daystep /= 2.0;
    tjd = tjd_s + daystep;
    rt = getAscOblDiff(swed, tjd, ipl, star, epheflag, dgeo, desc_obl, is_acronychal);
    if (rt.retval !== OK) return { retval: rt.retval, tjdret: 0, serr: rt.serr };
    dsunpl_test = rt.dsunpl;
  }
  return { retval: OK, tjdret: tjd, serr: '' };
}

function findConjunctSun(swed: SweData, tjd_start: number, ipl: number, helflag: number, TypeEvent: number): { retval: number; tjd: number; serr: string } {
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let daspect = 0;
  if (ipl >= SE_MARS && TypeEvent >= 3) daspect = 180;
  const i = Math.trunc((TypeEvent - 1) / 2) + ipl * 2;
  const tjd0 = tcon[i];
  const dsynperiod = getSynodicPeriod(ipl);
  let tjdcon = tjd0 + (Math.floor((tjd_start - tjd0) / dsynperiod) + 1) * dsynperiod;
  let ds = 100;
  while (ds > 0.5) {
    const rx = sweCalc(swed, tjdcon, ipl, epheflag | SEFLG_SPEED);
    if (rx.flags === ERR) return { retval: ERR, tjd: 0, serr: rx.serr };
    const rs = sweCalc(swed, tjdcon, SE_SUN, epheflag | SEFLG_SPEED);
    if (rs.flags === ERR) return { retval: ERR, tjd: 0, serr: rs.serr };
    ds = sweDegnorm(rx.xx[0] - rs.xx[0] - daspect);
    if (ds > 180) ds -= 360;
    tjdcon -= ds / (rx.xx[3] - rs.xx[3]);
  }
  return { retval: OK, tjd: tjdcon, serr: '' };
}

function moonEventArcVis(swed: SweData, JDNDaysUTStart: number, dgeo: number[], datm: number[], dobs: number[], TypeEventIn: number, helflag: number): { retval: number; dret: number; serr: string } {
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  const avkind = helflag & SE_HELFLAG_AVKIND;
  if (avkind === 0 || avkind !== SE_HELFLAG_AVKIND_VR)
    return { retval: ERR, dret: JDNDaysUTStart, serr: 'error: in valid AV kind for the moon' };
  if (TypeEventIn === 1 || TypeEventIn === 2)
    return { retval: ERR, dret: JDNDaysUTStart, serr: 'error: the moon has no morning first or evening last' };
  const ObjectName = 'moon';
  const Planet = SE_MOON;
  let iflag = SEFLG_TOPOCTR | SEFLG_EQUATORIAL | epheflag;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag |= SEFLG_NONUT | SEFLG_TRUEPOS;
  let Daystep = 1;
  let TypeEvent: number;
  if (TypeEventIn === 3) { TypeEvent = 2; }
  else { TypeEvent = 1; Daystep = -Daystep; }
  let JDNDaysUT = JDNDaysUTStart;
  if (TypeEvent === 1) JDNDaysUT += 30;
  const serrObj = { value: '' };
  let pr = swePhenoUt(swed, JDNDaysUT, Planet, iflag, serrObj);
  let phase2 = pr.attr[0];
  let goingup = 0;
  let phase1: number;
  do {
    JDNDaysUT += Daystep;
    phase1 = phase2;
    pr = swePhenoUt(swed, JDNDaysUT, Planet, iflag, serrObj);
    phase2 = pr.attr[0];
    if (phase2 > phase1) goingup = 1;
  } while (goingup === 0 || (goingup === 1 && phase2 > phase1));
  JDNDaysUT -= Daystep;
  const JDNDaysUTi = JDNDaysUT;
  JDNDaysUT -= Daystep;
  let MinTAVoud = 199;
  let MinTAV: number, OldestMinTAV: number;
  let DeltaAlt = 90;
  let DeltaAltoud = 0;
  let tjd_moonevent = 0;
  do {
    JDNDaysUT += Daystep;
    const rrs = RiseSet(swed, JDNDaysUT, dgeo, datm, ObjectName, TypeEvent, helflag, 0);
    if (rrs.retval !== OK) return { retval: rrs.retval, dret: JDNDaysUTStart, serr: rrs.serr };
    tjd_moonevent = rrs.tret;
    const tjd_moonevent_start = tjd_moonevent;
    MinTAV = 199;
    OldestMinTAV = MinTAV;
    let LocalminCheck = 0;
    do {
      OldestMinTAV = MinTAVoud;
      MinTAVoud = MinTAV;
      DeltaAltoud = DeltaAlt;
      tjd_moonevent -= 1.0 / 60.0 / 24.0 * Sgn(Daystep);
      const rAltS = ObjectLoc(swed, tjd_moonevent, dgeo, datm, 'sun', 0, helflag);
      if (rAltS.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rAltS.serr };
      const rAltO = ObjectLoc(swed, tjd_moonevent, dgeo, datm, ObjectName, 0, helflag);
      if (rAltO.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rAltO.serr };
      DeltaAlt = rAltO.dret - rAltS.dret;
      const rTAV = DeterTAV(swed, dobs, tjd_moonevent, dgeo, datm, ObjectName, helflag);
      if (rTAV.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rTAV.serr };
      MinTAV = rTAV.dret;
      const TimeCheck = tjd_moonevent - LocalMinStep / 60.0 / 24.0 * Sgn(Daystep);
      const rLC = DeterTAV(swed, dobs, TimeCheck, dgeo, datm, ObjectName, helflag);
      if (rLC.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rLC.serr };
      LocalminCheck = rLC.dret;
    } while ((MinTAV <= MinTAVoud || LocalminCheck < MinTAV) && Math.abs(tjd_moonevent - tjd_moonevent_start) < 120.0 / 60.0 / 24.0);
  } while (DeltaAltoud < MinTAVoud && Math.abs(JDNDaysUT - JDNDaysUTi) < 15);
  if (Math.abs(JDNDaysUT - JDNDaysUTi) < 15) {
    tjd_moonevent += (1 - x2min(MinTAV, MinTAVoud, OldestMinTAV)) * Sgn(Daystep) / 60.0 / 24.0;
  } else {
    return { retval: ERR, dret: JDNDaysUTStart, serr: 'no date found for lunar event' };
  }
  return { retval: OK, dret: tjd_moonevent, serr: '' };
}

function heliacalUtArcVis(swed: SweData, JDNDaysUTStart: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, TypeEventIn: number, helflag: number): { retval: number; dret: number; serr: string } {
  let serr = '';
  let retval: number = OK;
  const Planet = DeterObject(ObjectName);
  const Pressure = datm[0];
  const Temperature = datm[1];
  let objectmagn = 0;
  const mr = Magnitude(swed, JDNDaysUTStart, dgeo, ObjectName, helflag);
  if (mr.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: mr.serr };
  objectmagn = mr.dmag;
  const epheflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let iflag = SEFLG_TOPOCTR | SEFLG_EQUATORIAL | epheflag;
  if (!(helflag & SE_HELFLAG_HIGH_PRECISION))
    iflag |= SEFLG_NONUT | SEFLG_TRUEPOS;
  let DayStep: number, maxlength: number;
  switch (Planet) {
    case SE_MERCURY: DayStep = 1; maxlength = 100; break;
    case SE_VENUS: DayStep = 64; maxlength = 384; break;
    case SE_MARS: DayStep = 128; maxlength = 640; break;
    case SE_JUPITER: DayStep = 64; maxlength = 384; break;
    case SE_SATURN: DayStep = 64; maxlength = 256; break;
    default: DayStep = 64; maxlength = 256; break;
  }
  let TypeEvent = TypeEventIn;
  let eventtype = TypeEvent;
  if (eventtype === 2) DayStep = -DayStep;
  if (eventtype === 4) { eventtype = 1; DayStep = -DayStep; }
  if (eventtype === 3) eventtype = 2;
  eventtype |= SE_BIT_DISC_CENTER;
  let JDNDaysUT = JDNDaysUTStart;
  let JDNDaysUTfinal = JDNDaysUT + maxlength;
  JDNDaysUT -= 1;
  if (DayStep < 0) {
    const tmp = JDNDaysUT; JDNDaysUT = JDNDaysUTfinal; JDNDaysUTfinal = tmp;
  }
  let JDNDaysUTstep = JDNDaysUT - DayStep;
  let doneoneday = 0;
  let ArcusVisDelta = 199;
  let ArcusVisPto = -5.55;
  let JDNarcvisUT = 0;
  let JDNDaysUTstepoud: number, ArcusVisDeltaoud: number;
  do {
    if (Math.abs(DayStep) === 1) doneoneday = 1;
    do {
      JDNDaysUTstepoud = JDNDaysUTstep;
      ArcusVisDeltaoud = ArcusVisDelta;
      JDNDaysUTstep += DayStep;
      const rrt = myRiseTrans(swed, JDNDaysUTstep, SE_SUN, '', eventtype, helflag, dgeo, datm);
      if (rrt.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rrt.serr };
      const tret = rrt.tret;
      const tjd_tt = tret + sweDeltatEx(tret, epheflag, swed);
      let rc = sweCalc(swed, tjd_tt, SE_SUN, iflag);
      if (rc.flags === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rc.serr };
      const xin = [rc.xx[0], rc.xx[1]];
      const xaz = [0, 0, 0];
      sweAzalt(swed, tret, SE_EQU2HOR, dgeo, Pressure, Temperature, xin, xaz);
      const Trise = HourAngle(xaz[1], rc.xx[1], dgeo[1]);
      let sunsangle = ArcusVisPto;
      if (helflag & SE_HELFLAG_AVKIND_MIN7) sunsangle = -7;
      if (helflag & SE_HELFLAG_AVKIND_MIN9) sunsangle = -9;
      const Theliacal = HourAngle(sunsangle, rc.xx[1], dgeo[1]);
      let Tdelta = Theliacal - Trise;
      if (TypeEvent === 2 || TypeEvent === 3) Tdelta = -Tdelta;
      JDNarcvisUT = tret - Tdelta / 24;
      const tjd_tt2 = JDNarcvisUT + sweDeltatEx(JDNarcvisUT, epheflag, swed);
      rc = sweCalc(swed, tjd_tt2, SE_SUN, iflag);
      if (rc.flags === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rc.serr };
      const xin2 = [rc.xx[0], rc.xx[1]];
      const xaz2 = [0, 0, 0];
      sweAzalt(swed, JDNarcvisUT, SE_EQU2HOR, dgeo, Pressure, Temperature, xin2, xaz2);
      let AziS = xaz2[0] + 180; if (AziS >= 360) AziS -= 360;
      const AltS = xaz2[1];
      let x: Float64Array;
      if (Planet !== -1) {
        const rp = sweCalc(swed, tjd_tt2, Planet, iflag);
        if (rp.flags === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rp.serr };
        x = rp.xx;
        const mm = Magnitude(swed, JDNarcvisUT, dgeo, ObjectName, helflag);
        if (mm.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: mm.serr };
        objectmagn = mm.dmag;
      } else {
        const rf = callSweFixstar(swed, ObjectName, tjd_tt2, iflag);
        if (rf.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rf.serr };
        x = rf.xx;
      }
      const xin3 = [x[0], x[1]];
      const xaz3 = [0, 0, 0];
      sweAzalt(swed, JDNarcvisUT, SE_EQU2HOR, dgeo, Pressure, Temperature, xin3, xaz3);
      let AziO = xaz3[0] + 180; if (AziO >= 360) AziO -= 360;
      const AltO = xaz3[1];
      const DeltaAlt = AltO - AltS;
      const rha = HeliacalAngle(swed, objectmagn, dobs, AziO, -1, 0, JDNarcvisUT, AziS, dgeo, datm, helflag);
      if (rha.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rha.serr };
      ArcusVisPto = rha.dangret[2];
      ArcusVisDelta = DeltaAlt - rha.dangret[1];
    } while ((ArcusVisDeltaoud > 0 || ArcusVisDelta < 0) && (JDNDaysUTfinal - JDNDaysUTstep) * Sgn(DayStep) > 0);
    if (doneoneday === 0 && (JDNDaysUTfinal - JDNDaysUTstep) * Sgn(DayStep) > 0) {
      ArcusVisDelta = ArcusVisDeltaoud;
      DayStep = Math.trunc(Math.abs(DayStep) / 2.0) * Sgn(DayStep);
      JDNDaysUTstep = JDNDaysUTstepoud;
    }
  } while (doneoneday === 0 && (JDNDaysUTfinal - JDNDaysUTstep) * Sgn(DayStep) > 0);
  const d = (JDNDaysUTfinal - JDNDaysUTstep) * Sgn(DayStep);
  if (d <= 0 || d >= maxlength) {
    return { retval: -2, dret: JDNDaysUTStart, serr: `heliacal event not found within maxlength ${maxlength}` };
  }
  const direct = DayStep < 0 ? -TimeStepDefault / 24.0 / 60.0 : TimeStepDefault / 24.0 / 60.0;
  if (helflag & SE_HELFLAG_AVKIND_VR) {
    let TimeStep = direct;
    let TbVR = 0;
    let TimePointer = JDNarcvisUT;
    let rOld = DeterTAV(swed, dobs, TimePointer, dgeo, datm, ObjectName, helflag);
    if (rOld.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rOld.serr };
    let OldestMinTAV = rOld.dret;
    TimePointer += TimeStep;
    let rNew = DeterTAV(swed, dobs, TimePointer, dgeo, datm, ObjectName, helflag);
    if (rNew.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rNew.serr };
    let MinTAVoud: number, MinTAVact: number;
    if (rNew.dret > OldestMinTAV) {
      TimePointer = JDNarcvisUT; TimeStep = -TimeStep;
      MinTAVact = OldestMinTAV;
    } else {
      MinTAVact = rNew.dret; MinTAVoud = OldestMinTAV;
    }
    MinTAVoud = OldestMinTAV;
    do {
      TimePointer += TimeStep;
      OldestMinTAV = MinTAVoud;
      MinTAVoud = MinTAVact;
      const rr = DeterTAV(swed, dobs, TimePointer, dgeo, datm, ObjectName, helflag);
      if (rr.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rr.serr };
      MinTAVact = rr.dret;
      if (MinTAVoud < MinTAVact) {
        const extrax = x2min(MinTAVact, MinTAVoud, OldestMinTAV);
        TbVR = TimePointer - (1 - extrax) * TimeStep;
      }
    } while (TbVR === 0);
    JDNarcvisUT = TbVR;
  }
  if (helflag & SE_HELFLAG_AVKIND_PTO) {
    let OudeDatum: number;
    do {
      OudeDatum = JDNarcvisUT;
      JDNarcvisUT -= direct;
      const tjd_tt = JDNarcvisUT + sweDeltatEx(JDNarcvisUT, epheflag, swed);
      let x: Float64Array;
      if (Planet !== -1) {
        const rp = sweCalc(swed, tjd_tt, Planet, iflag);
        if (rp.flags === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rp.serr };
        x = rp.xx;
      } else {
        const rf = callSweFixstar(swed, ObjectName, tjd_tt, iflag);
        if (rf.retval === ERR) return { retval: ERR, dret: JDNDaysUTStart, serr: rf.serr };
        x = rf.xx;
      }
      const xin = [x[0], x[1]];
      const xaz = [0, 0, 0];
      sweAzalt(swed, JDNarcvisUT, SE_EQU2HOR, dgeo, Pressure, Temperature, xin, xaz);
      if (xaz[1] <= 0) break;
    } while (true);
    JDNarcvisUT = (JDNarcvisUT + OudeDatum!) / 2.0;
  }
  if (JDNarcvisUT < -9999999 || JDNarcvisUT > 9999999) {
    return { retval: ERR, dret: JDNDaysUT, serr: 'no heliacal date found' };
  }
  return { retval: OK, dret: JDNarcvisUT, serr };
}

function getHeliacalDay(swed: SweData, tjd: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, helflag: number, TypeEvent: number): { retval: number; thel: number; serr: string } {
  let is_rise_or_set = 0, direct_day = 0, direct_time = 0;
  const ipl = DeterObject(ObjectName);
  switch (TypeEvent) {
    case 1: is_rise_or_set = SE_CALC_RISE; direct_day = 1; direct_time = -1; break;
    case 2: is_rise_or_set = SE_CALC_SET; direct_day = -1; direct_time = 1; break;
    case 3: is_rise_or_set = SE_CALC_SET; direct_day = 1; direct_time = 1; break;
    case 4: is_rise_or_set = SE_CALC_RISE; direct_day = -1; direct_time = -1; break;
  }
  let tfac = 1;
  let ndays: number, daystep: number;
  let dmag: number;
  switch (ipl) {
    case SE_MOON: ndays = 16; daystep = 1; break;
    case SE_MERCURY: ndays = 60; daystep = 5; tfac = 5; break;
    case SE_VENUS: ndays = 300; tjd -= 30 * direct_day; daystep = 5;
      if (TypeEvent >= 3) { daystep = 15; tfac = 3; } break;
    case SE_MARS: ndays = 400; daystep = 15; tfac = 5; break;
    case SE_SATURN: ndays = 300; daystep = 20; tfac = 5; break;
    case -1:
      ndays = 300; daystep = 15; tfac = 10;
      const rmag = callSweFixstarMag(swed, ObjectName);
      if (rmag.retval === ERR) return { retval: ERR, thel: 0, serr: rmag.serr };
      dmag = rmag.mag;
      if (dmag > 2) daystep = 15;
      if (dmag < 0) tfac = 3;
      break;
    default: ndays = 300; daystep = 15; tfac = 3; break;
  }
  const tend = tjd + ndays * direct_day;
  let retval_old = -2;
  for (let tday = tjd, i = 0;
    (direct_day > 0 && tday < tend) || (direct_day < 0 && tday > tend);
    tday += daystep * direct_day, i++) {
    if (i > 0) tday -= 0.3 * direct_day;
    const rrt = myRiseTrans(swed, tday, SE_SUN, '', is_rise_or_set, helflag, dgeo, datm);
    if (rrt.retval === ERR) return { retval: ERR, thel: 0, serr: rrt.serr };
    if (rrt.retval === -2) { retval_old = -2; continue; }
    let tret = rrt.tret;
    let rv = sweVisLimitMag(swed, tret, dgeo, datm, dobs, ObjectName, helflag);
    if (rv.retval === ERR) return { retval: ERR, thel: 0, serr: rv.serr };
    if (retval_old === -2 && rv.retval >= 0 && daystep > 1) {
      retval_old = rv.retval;
      tday -= daystep * direct_day;
      daystep = 1;
      if (ipl >= SE_MARS || ipl === -1) daystep = 5;
      continue;
    }
    retval_old = rv.retval;
    if (rv.retval === -2) continue;
    const div = 1440.0;
    let vd = -1;
    let visible_at_sunsetrise = 1;
    while (rv.retval !== -2 && (vd = rv.dret[0] - rv.dret[7]) < 0) {
      visible_at_sunsetrise = 0;
      if (vd < -1.0) tret += 5.0 / div * direct_time * tfac;
      else if (vd < -0.5) tret += 2.0 / div * direct_time * tfac;
      else if (vd < -0.1) tret += 1.0 / div * direct_time * tfac;
      else tret += 1.0 / div * direct_time;
      rv = sweVisLimitMag(swed, tret, dgeo, datm, dobs, ObjectName, helflag);
      if (rv.retval === ERR) return { retval: ERR, thel: 0, serr: rv.serr };
    }
    if (visible_at_sunsetrise) {
      for (let j = 0; j < 10; j++) {
        const rvn = sweVisLimitMag(swed, tret + 1.0 / div * direct_time, dgeo, datm, dobs, ObjectName, helflag);
        if (rvn.retval >= 0 && rvn.dret[0] - rvn.dret[7] > vd) {
          vd = rvn.dret[0] - rvn.dret[7];
          tret += 1.0 / div * direct_time;
        }
      }
    }
    const vdelta = rv.dret[0] - rv.dret[7];
    if (vdelta > 0) {
      if ((ipl >= SE_MARS || ipl === -1) && daystep > 1) {
        tday -= daystep * direct_day;
        daystep = 1;
      } else {
        return { retval: OK, thel: tret, serr: '' };
      }
    }
  }
  return { retval: -2, thel: 0, serr: 'heliacal event does not happen' };
}

function timeOptimumVisibility(swed: SweData, tjd: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, helflag: number): { retval: number; tret: number; serr: string } {
  let rv = sweVisLimitMag(swed, tjd, dgeo, datm, dobs, ObjectName, helflag);
  if (rv.retval === ERR) return { retval: ERR, tret: tjd, serr: rv.serr };
  let retval_sv = rv.retval;
  let t1 = tjd, t2 = tjd, vl1 = -1, vl2 = -1;
  let phot_scot_opic_sv = retval_sv & SE_SCOTOPIC_FLAG;
  for (let i = 0, d = 100.0 / 86400.0; i < 3; i++, d /= 10.0) {
    t1 += d;
    let t_has_changed = 0;
    while (true) {
      rv = sweVisLimitMag(swed, t1 - d, dgeo, datm, dobs, ObjectName, helflag);
      if (rv.retval < 0 || rv.dret[0] <= rv.dret[7] || rv.dret[0] - rv.dret[7] <= vl1) break;
      t1 -= d; vl1 = rv.dret[0] - rv.dret[7]; t_has_changed = 1;
      retval_sv = rv.retval;
      phot_scot_opic_sv = rv.retval & SE_SCOTOPIC_FLAG;
    }
    if (t_has_changed === 0) t1 -= d;
    if (rv.retval === ERR) return { retval: ERR, tret: tjd, serr: rv.serr };
  }
  for (let i = 0, d = 100.0 / 86400.0; i < 3; i++, d /= 10.0) {
    t2 -= d;
    let t_has_changed = 0;
    while (true) {
      rv = sweVisLimitMag(swed, t2 + d, dgeo, datm, dobs, ObjectName, helflag);
      if (rv.retval < 0 || rv.dret[0] <= rv.dret[7] || rv.dret[0] - rv.dret[7] <= vl2) break;
      t2 += d; vl2 = rv.dret[0] - rv.dret[7]; t_has_changed = 1;
      retval_sv = rv.retval;
      phot_scot_opic_sv = rv.retval & SE_SCOTOPIC_FLAG;
    }
    if (t_has_changed === 0) t2 += d;
    if (rv.retval === ERR) return { retval: ERR, tret: tjd, serr: rv.serr };
  }
  const tret = vl2 > vl1 ? t2 : t1;
  if (rv.retval >= 0) {
    const phot_scot_opic = rv.retval & SE_SCOTOPIC_FLAG;
    if (phot_scot_opic_sv !== phot_scot_opic) return { retval: -2, tret, serr: '' };
    if (retval_sv & SE_MIXEDOPIC_FLAG) return { retval: -2, tret, serr: '' };
  }
  return { retval: OK, tret, serr: '' };
}

function timeLimitInvisible(swed: SweData, tjd: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, helflag: number, direct: number): { retval: number; tret: number; serr: string } {
  let ncnt = 3;
  let d0 = 100.0 / 86400.0;
  let tjdAdj = tjd;
  if (ObjectName === 'moon') { d0 *= 10; ncnt = 4; }
  let rv = sweVisLimitMag(swed, tjdAdj, dgeo, datm, dobs, ObjectName, helflag);
  if (rv.retval === ERR) return { retval: ERR, tret: tjd, serr: rv.serr };
  let retval_sv = rv.retval;
  let phot_scot_opic_sv = rv.retval & SE_SCOTOPIC_FLAG;
  for (let i = 0, d = d0; i < ncnt; i++, d /= 10.0) {
    while (true) {
      rv = sweVisLimitMag(swed, tjdAdj + d * direct, dgeo, datm, dobs, ObjectName, helflag);
      if (rv.retval < 0 || rv.dret[0] <= rv.dret[7]) break;
      tjdAdj += d * direct;
      retval_sv = rv.retval;
      phot_scot_opic_sv = rv.retval & SE_SCOTOPIC_FLAG;
    }
  }
  if (rv.retval >= 0) {
    const phot_scot_opic = rv.retval & SE_SCOTOPIC_FLAG;
    if (phot_scot_opic_sv !== phot_scot_opic) return { retval: -2, tret: tjdAdj, serr: '' };
    if (retval_sv & SE_MIXEDOPIC_FLAG) return { retval: -2, tret: tjdAdj, serr: '' };
  }
  return { retval: OK, tret: tjdAdj, serr: '' };
}

function getAcronchalDay(swed: SweData, tjd: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, helflag: number, TypeEvent: number): { retval: number; thel: number; serr: string } {
  const ipl = DeterObject(ObjectName);
  const helflagP = helflag | SE_HELFLAG_VISLIM_PHOTOPIC;
  let is_rise_or_set: number, direct: number;
  if (TypeEvent === 3 || TypeEvent === 5) { is_rise_or_set = SE_CALC_RISE; direct = -1; }
  else { is_rise_or_set = SE_CALC_SET; direct = 1; }
  let dtret = 999;
  let tjdAdj = tjd;
  while (Math.abs(dtret) > 0.5 / 1440.0) {
    tjdAdj += 0.7 * direct;
    if (direct < 0) tjdAdj -= 1;
    const rrt = myRiseTrans(swed, tjdAdj, ipl, ObjectName, is_rise_or_set, helflagP, dgeo, datm);
    if (rrt.retval === ERR) return { retval: ERR, thel: 0, serr: rrt.serr };
    tjdAdj = rrt.tret;
    let rv = sweVisLimitMag(swed, tjdAdj, dgeo, datm, dobs, ObjectName, helflagP);
    if (rv.retval === ERR) return { retval: ERR, thel: 0, serr: rv.serr };
    while (rv.dret[0] < rv.dret[7]) {
      tjdAdj += 10.0 / 1440.0 * -direct;
      rv = sweVisLimitMag(swed, tjdAdj, dgeo, datm, dobs, ObjectName, helflagP);
      if (rv.retval === ERR) return { retval: ERR, thel: 0, serr: rv.serr };
    }
    const rd = timeLimitInvisible(swed, tjdAdj, dgeo, datm, dobs, ObjectName, helflagP | SE_HELFLAG_VISLIM_DARK, direct);
    if (rd.retval === ERR) return { retval: ERR, thel: 0, serr: rd.serr };
    const tret_dark = rd.tret;
    const rn = timeLimitInvisible(swed, tjdAdj, dgeo, datm, dobs, ObjectName, helflagP | SE_HELFLAG_VISLIM_NOMOON, direct);
    if (rn.retval === ERR) return { retval: ERR, thel: 0, serr: rn.serr };
    const tret = rn.tret;
    dtret = Math.abs(tret - tret_dark);
  }
  const rsun = azaltCart(swed, tjdAdj, dgeo, datm, 'sun', helflag);
  if (rsun.retval === ERR) return { retval: ERR, thel: 0, serr: rsun.serr };
  let serr = '';
  if (rsun.dret[1] < -12) serr = `acronychal rising/setting not available, ${rsun.dret[1]}`;
  else serr = `solar altitude, ${rsun.dret[1]}`;
  return { retval: OK, thel: tjdAdj, serr };
}

function getHeliacalDetails(swed: SweData, tday: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, TypeEvent: number, helflag: number): { retval: number; dret: number[]; serr: string } {
  const dret = [0, 0, 0];
  let optimum_undefined = false, limit_1_undefined = false, limit_2_undefined = false;
  let r = timeOptimumVisibility(swed, tday, dgeo, datm, dobs, ObjectName, helflag);
  if (r.retval === ERR) return { retval: ERR, dret, serr: r.serr };
  if (r.retval === -2) optimum_undefined = true;
  dret[1] = r.tret;
  let direct = 1;
  if (TypeEvent === 1 || TypeEvent === 4) direct = -1;
  r = timeLimitInvisible(swed, tday, dgeo, datm, dobs, ObjectName, helflag, direct);
  if (r.retval === ERR) return { retval: ERR, dret, serr: r.serr };
  if (r.retval === -2) limit_1_undefined = true;
  dret[0] = r.tret;
  direct *= -1;
  r = timeLimitInvisible(swed, dret[1], dgeo, datm, dobs, ObjectName, helflag, direct);
  if (r.retval === ERR) return { retval: ERR, dret, serr: r.serr };
  if (r.retval === -2) limit_2_undefined = true;
  dret[2] = r.tret;
  if (TypeEvent === 2 || TypeEvent === 3) {
    const tmp = dret[2]; dret[2] = dret[0]; dret[0] = tmp;
    const tmpB = limit_1_undefined; limit_1_undefined = limit_2_undefined; limit_2_undefined = tmpB;
  }
  let serr = '';
  if (optimum_undefined || limit_1_undefined || limit_2_undefined) {
    serr = 'return values [';
    if (limit_1_undefined) serr += '0,';
    if (optimum_undefined) serr += '1,';
    if (limit_2_undefined) serr += '2,';
    serr += '] are uncertain due to change between photopic and scotopic vision';
  }
  return { retval: OK, dret, serr };
}

function heliacalUtVisLim(swed: SweData, tjd_start: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, TypeEventIn: number, helflag: number): { retval: number; dret: number[]; serr: string } {
  const dret = new Array(10).fill(0);
  dret[0] = tjd_start;
  let serr = '';
  const ipl = DeterObject(ObjectName);
  let tjd = ipl === SE_MERCURY ? tjd_start - 30 : tjd_start - 50;
  const helflag2 = helflag;
  let retval: number;
  const TypeEvent = TypeEventIn;
  if (ipl === SE_MERCURY || ipl === SE_VENUS || TypeEvent <= 2) {
    if (ipl === -1) {
      const r = getAscOblWithSun(swed, tjd, ipl, ObjectName, helflag, TypeEvent, 0, dgeo);
      if (r.retval !== OK) return { retval: r.retval, dret, serr: r.serr };
      tjd = r.tjdret;
    } else {
      const r = findConjunctSun(swed, tjd, ipl, helflag, TypeEvent);
      if (r.retval === ERR) return { retval: ERR, dret, serr: r.serr };
      tjd = r.tjd;
    }
    const r = getHeliacalDay(swed, tjd, dgeo, datm, dobs, ObjectName, helflag2, TypeEvent);
    if (r.retval !== OK) return { retval: r.retval, dret, serr: r.serr };
    dret[0] = r.thel;
  } else {
    const r = getAscOblWithSun(swed, tjd, ipl, ObjectName, helflag, TypeEvent, 0, dgeo);
    if (r.retval !== OK) return { retval: r.retval, dret, serr: r.serr };
    tjd = r.tjdret;
    const ra = getAcronchalDay(swed, tjd, dgeo, datm, dobs, ObjectName, helflag2, TypeEvent);
    if (ra.retval !== OK) return { retval: ra.retval, dret, serr: ra.serr };
    dret[0] = ra.thel;
    serr = ra.serr;
  }
  if (!(helflag & SE_HELFLAG_NO_DETAILS)) {
    if (ipl === SE_MERCURY || ipl === SE_VENUS || TypeEvent <= 2) {
      const r = getHeliacalDetails(swed, dret[0], dgeo, datm, dobs, ObjectName, TypeEvent, helflag2);
      if (r.retval === ERR) return { retval: ERR, dret, serr: r.serr };
      dret[0] = r.dret[0]; dret[1] = r.dret[1]; dret[2] = r.dret[2];
      if (r.serr) serr = r.serr;
    }
  }
  return { retval: OK, dret, serr };
}

function moonEventVisLim(swed: SweData, tjdstart: number, dgeo: number[], datm: number[], dobs: number[], TypeEvent: number, helflag: number): { retval: number; dret: number[]; serr: string } {
  const dret = [tjdstart, 0, 0];
  if (TypeEvent === 1 || TypeEvent === 2)
    return { retval: ERR, dret, serr: 'error: the moon has no morning first or evening last' };
  const ObjectName = 'moon';
  const ipl = SE_MOON;
  const helflag2 = helflag & ~SE_HELFLAG_HIGH_PRECISION;
  let tjd = tjdstart - 30;
  const rc = findConjunctSun(swed, tjd, ipl, helflag, TypeEvent);
  if (rc.retval === ERR) return { retval: ERR, dret, serr: rc.serr };
  tjd = rc.tjd;
  const rh = getHeliacalDay(swed, tjd, dgeo, datm, dobs, ObjectName, helflag2, TypeEvent);
  if (rh.retval !== OK) return { retval: rh.retval, dret, serr: rh.serr };
  tjd = rh.thel;
  dret[0] = tjd;
  const ro = timeOptimumVisibility(swed, tjd, dgeo, datm, dobs, ObjectName, helflag);
  if (ro.retval === ERR) return { retval: ERR, dret, serr: ro.serr };
  dret[1] = ro.tret;
  tjd = ro.tret;
  let direct = 1;
  if (TypeEvent === 4) direct = -1;
  const rl = timeLimitInvisible(swed, tjd, dgeo, datm, dobs, ObjectName, helflag, direct);
  if (rl.retval === ERR) return { retval: ERR, dret, serr: rl.serr };
  dret[2] = rl.tret;
  const rl2 = timeLimitInvisible(swed, dret[1], dgeo, datm, dobs, ObjectName, helflag, -direct);
  if (rl2.retval === ERR) return { retval: ERR, dret, serr: rl2.serr };
  dret[0] = rl2.tret;
  if (TypeEvent === 3) {
    const rs = myRiseTrans(swed, rl2.tret, SE_SUN, '', SE_CALC_SET, helflag, dgeo, datm);
    if (rs.retval === ERR) return { retval: ERR, dret, serr: rs.serr };
    if (rs.tret < dret[1]) dret[0] = rs.tret;
  } else {
    const rs = myRiseTrans(swed, dret[1], SE_SUN, '', SE_CALC_RISE, helflag, dgeo, datm);
    if (rs.retval === ERR) return { retval: ERR, dret, serr: rs.serr };
    if (dret[0] > rs.tret) dret[0] = rs.tret;
  }
  if (TypeEvent === 4) {
    const tmp = dret[0]; dret[0] = dret[2]; dret[2] = tmp;
  }
  return { retval: OK, dret, serr: '' };
}

function MoonEventJDut(swed: SweData, JDNDaysUTStart: number, dgeo: number[], datm: number[], dobs: number[], TypeEvent: number, helflag: number): { retval: number; dret: number[]; serr: string } {
  const avkind = helflag & SE_HELFLAG_AVKIND;
  if (avkind) {
    const r = moonEventArcVis(swed, JDNDaysUTStart, dgeo, datm, dobs, TypeEvent, helflag);
    return { retval: r.retval, dret: [r.dret], serr: r.serr };
  } else {
    return moonEventVisLim(swed, JDNDaysUTStart, dgeo, datm, dobs, TypeEvent, helflag);
  }
}

function heliacalUt(swed: SweData, JDNDaysUTStart: number, dgeo: number[], datm: number[], dobs: number[], ObjectName: string, TypeEventIn: number, helflag: number): { retval: number; dret: number[]; serr: string } {
  const avkind = helflag & SE_HELFLAG_AVKIND;
  if (avkind) {
    const r = heliacalUtArcVis(swed, JDNDaysUTStart, dgeo, datm, dobs, ObjectName, TypeEventIn, helflag);
    return { retval: r.retval, dret: [r.dret], serr: r.serr };
  } else {
    return heliacalUtVisLim(swed, JDNDaysUTStart, dgeo, datm, dobs, ObjectName, TypeEventIn, helflag);
  }
}

/* ================================================================
 * G. Public API functions
 * ================================================================ */

export function sweVisLimitMag(
  swed: SweData, tjdut: number, dgeo: number[], datm: number[], dobs: number[],
  ObjectName: string, helflag: number,
): { retval: number; dret: number[]; serr: string } {
  const dret = new Array(8).fill(0);
  const datmC = [...datm];
  const dobsC = [...dobs];
  let objectName = tolowerStringStar(ObjectName);
  if (DeterObject(objectName) === SE_SUN)
    return { retval: ERR, dret, serr: 'it makes no sense to call swe_vis_limit_mag() for the Sun' };
  const sunra = SunRA(swed, tjdut, helflag).ra;
  defaultHeliacalParameters(datmC, dgeo, dobsC, helflag);
  sweSetTopo(swed, dgeo[0], dgeo[1], dgeo[2]);
  const rAltO = ObjectLoc(swed, tjdut, dgeo, datmC, objectName, 0, helflag);
  if (rAltO.retval === ERR) return { retval: ERR, dret, serr: rAltO.serr };
  if (rAltO.dret < 0) { dret[0] = -100; return { retval: -2, dret, serr: 'object is below local horizon' }; }
  const rAziO = ObjectLoc(swed, tjdut, dgeo, datmC, objectName, 1, helflag);
  if (rAziO.retval === ERR) return { retval: ERR, dret, serr: rAziO.serr };
  let AltS: number, AziS: number;
  if (helflag & SE_HELFLAG_VISLIM_DARK) { AltS = -90; AziS = 0; }
  else {
    const rs = ObjectLoc(swed, tjdut, dgeo, datmC, 'sun', 0, helflag);
    if (rs.retval === ERR) return { retval: ERR, dret, serr: rs.serr };
    AltS = rs.dret;
    const rsa = ObjectLoc(swed, tjdut, dgeo, datmC, 'sun', 1, helflag);
    if (rsa.retval === ERR) return { retval: ERR, dret, serr: rsa.serr };
    AziS = rsa.dret;
  }
  let AltM: number, AziM: number;
  if (objectName.startsWith('moon') || (helflag & SE_HELFLAG_VISLIM_DARK) || (helflag & SE_HELFLAG_VISLIM_NOMOON)) {
    AltM = -90; AziM = 0;
  } else {
    const rm = ObjectLoc(swed, tjdut, dgeo, datmC, 'moon', 0, helflag);
    if (rm.retval === ERR) return { retval: ERR, dret, serr: rm.serr };
    AltM = rm.dret;
    const rma = ObjectLoc(swed, tjdut, dgeo, datmC, 'moon', 1, helflag);
    if (rma.retval === ERR) return { retval: ERR, dret, serr: rma.serr };
    AziM = rma.dret;
  }
  const scotopic_flag = { value: 0 };
  const serrRef = { value: '' };
  dret[0] = VisLimMagn(dobsC, rAltO.dret, rAziO.dret, AltM, AziM, tjdut, AltS, AziS, sunra, dgeo[1], dgeo[2], datmC, helflag, scotopic_flag, serrRef);
  dret[1] = rAltO.dret; dret[2] = rAziO.dret;
  dret[3] = AltS; dret[4] = AziS; dret[5] = AltM; dret[6] = AziM;
  const rm = Magnitude(swed, tjdut, dgeo, objectName, helflag);
  if (rm.retval === ERR) return { retval: ERR, dret, serr: rm.serr };
  dret[7] = rm.dmag;
  return { retval: scotopic_flag.value, dret, serr: serrRef.value };
}

export function sweTopoArcusVisionis(
  swed: SweData, tjdut: number, dgeo: number[], datm: number[], dobs: number[],
  helflag: number, mag: number, azi_obj: number, alt_obj: number,
  azi_sun: number, azi_moon: number, alt_moon: number,
): { retval: number; dret: number; serr: string } {
  const datmC = [...datm]; const dobsC = [...dobs];
  const sunra = SunRA(swed, tjdut, helflag).ra;
  defaultHeliacalParameters(datmC, dgeo, dobsC, helflag);
  return TopoArcVisionis(swed, mag, dobsC, alt_obj, azi_obj, alt_moon, azi_moon, tjdut, azi_sun, sunra, dgeo[1], dgeo[2], datmC, helflag);
}

export function sweHeliacalAngle(
  swed: SweData, tjdut: number, dgeo: number[], datm: number[], dobs: number[],
  helflag: number, mag: number, azi_obj: number, azi_sun: number,
  azi_moon: number, alt_moon: number,
): { retval: number; dret: number[]; serr: string } {
  if (dgeo[2] < SEI_ECL_GEOALT_MIN || dgeo[2] > SEI_ECL_GEOALT_MAX)
    return { retval: ERR, dret: [0, 0, 0], serr: `location for heliacal events must be between ${SEI_ECL_GEOALT_MIN} and ${SEI_ECL_GEOALT_MAX} m above sea` };
  const datmC = [...datm]; const dobsC = [...dobs];
  defaultHeliacalParameters(datmC, dgeo, dobsC, helflag);
  const r = HeliacalAngle(swed, mag, dobsC, azi_obj, alt_moon, azi_moon, tjdut, azi_sun, dgeo, datmC, helflag);
  return { retval: r.retval, dret: r.dangret, serr: r.serr };
}

export function sweHeliacalPhenoUt(
  swed: SweData, JDNDaysUT: number, dgeo: number[], datm: number[], dobs: number[],
  ObjectNameIn: string, TypeEvent: number, helflag: number,
): { retval: number; darr: number[]; serr: string } {
  const darr = new Array(30).fill(0);
  if (dgeo[2] < SEI_ECL_GEOALT_MIN || dgeo[2] > SEI_ECL_GEOALT_MAX)
    return { retval: ERR, darr, serr: `location for heliacal events must be between ${SEI_ECL_GEOALT_MIN} and ${SEI_ECL_GEOALT_MAX} m above sea` };
  const datmC = [...datm]; const dobsC = [...dobs];
  const ObjectName = tolowerStringStar(strcpyVBsafe(ObjectNameIn));
  const sunra = SunRA(swed, JDNDaysUT, helflag).ra;
  defaultHeliacalParameters(datmC, dgeo, dobsC, helflag);
  sweSetTopo(swed, dgeo[0], dgeo[1], dgeo[2]);
  const iflag = helflag & (SEFLG_JPLEPH | SEFLG_SWIEPH | SEFLG_MOSEPH);
  let r = ObjectLoc(swed, JDNDaysUT, dgeo, datmC, 'sun', 1, helflag);
  if (r.retval === ERR) return { retval: ERR, darr, serr: r.serr };
  const AziS = r.dret;
  r = ObjectLoc(swed, JDNDaysUT, dgeo, datmC, 'sun', 0, helflag);
  if (r.retval === ERR) return { retval: ERR, darr, serr: r.serr };
  const AltS = r.dret;
  r = ObjectLoc(swed, JDNDaysUT, dgeo, datmC, ObjectName, 1, helflag);
  if (r.retval === ERR) return { retval: ERR, darr, serr: r.serr };
  const AziO = r.dret;
  r = ObjectLoc(swed, JDNDaysUT, dgeo, datmC, ObjectName, 0, helflag);
  if (r.retval === ERR) return { retval: ERR, darr, serr: r.serr };
  const AltO = r.dret;
  r = ObjectLoc(swed, JDNDaysUT, dgeo, datmC, ObjectName, 7, helflag);
  if (r.retval === ERR) return { retval: ERR, darr, serr: r.serr };
  const GeoAltO = r.dret;
  const AppAltO = AppAltfromTopoAlt(AltO, datmC[1], datmC[0], helflag);
  const DAZact = AziS - AziO;
  const TAVact = AltO - AltS;
  const ParO = GeoAltO - AltO;
  const mr = Magnitude(swed, JDNDaysUT, dgeo, ObjectName, helflag);
  if (mr.retval === ERR) return { retval: ERR, darr, serr: mr.serr };
  const MagnO = mr.dmag;
  const ARCVact = TAVact + ParO;
  const ARCLact = Math.acos(Math.cos(ARCVact * DEGTORAD) * Math.cos(DAZact * DEGTORAD)) / DEGTORAD;
  const Planet = DeterObject(ObjectName);
  let elong: number, illum: number;
  if (Planet === -1) { elong = ARCLact; illum = 100; }
  else {
    const serrRef = { value: '' };
    const rp = swePhenoUt(swed, JDNDaysUT, Planet, iflag | SEFLG_TOPOCTR | SEFLG_EQUATORIAL, serrRef);
    if (rp.retval === ERR) return { retval: ERR, darr, serr: serrRef.value };
    elong = rp.attr[2]; illum = rp.attr[1] * 100;
  }
  const serrRef2 = { value: '' };
  const kact = kt(AltS, sunra, dgeo[1], dgeo[2], datmC[1], datmC[2], datmC[3], 4, serrRef2);
  let WMoon = 0, qYal = 0, qCrit = 0, LMoon = 0;
  if (Planet === SE_MOON) {
    WMoon = WidthMoon(AltO, AziO, AltS, AziS, ParO);
    LMoon = LengthMoon(WMoon, 0);
    qYal = qYallop(WMoon, ARCVact);
    if (qYal > 0.216) qCrit = 1;
    if (qYal < 0.216 && qYal > -0.014) qCrit = 2;
    if (qYal < -0.014 && qYal > -0.16) qCrit = 3;
    if (qYal < -0.16 && qYal > -0.232) qCrit = 4;
    if (qYal < -0.232 && qYal > -0.293) qCrit = 5;
    if (qYal < -0.293) qCrit = 6;
  }
  let RS = 2;
  if (TypeEvent === 1 || TypeEvent === 4) RS = 1;
  const rrs = RiseSet(swed, JDNDaysUT - 4.0 / 24.0, dgeo, datmC, 'sun', RS, helflag, 0);
  if (rrs.retval === ERR) return { retval: ERR, darr, serr: rrs.serr };
  const RiseSetS = rrs.tret;
  const rro = RiseSet(swed, JDNDaysUT - 4.0 / 24.0, dgeo, datmC, ObjectName, RS, helflag, 0);
  if (rro.retval === ERR) return { retval: ERR, darr, serr: rro.serr };
  const RiseSetO = rro.tret;
  let noriseO = false;
  let Lag: number;
  let TbYallop = TJD_INVALID;
  if (rro.retval === -2) { Lag = 0; noriseO = true; }
  else {
    Lag = RiseSetO - RiseSetS;
    if (Planet === SE_MOON) TbYallop = (RiseSetO * 4 + RiseSetS * 5) / 9.0;
  }
  let TfirstVR = TJD_INVALID, TbVR = TJD_INVALID, TlastVR = TJD_INVALID, TvisVR = 0, MinTAV = 0;
  if (!((TypeEvent === 3 || TypeEvent === 4) && (Planet === -1 || Planet >= SE_MARS))) {
    let MinTAVact = 199, DeltaAlt = 0, OldestMinTAV = 0, Ta = 0, Tc = 0;
    let MinTAVoud = 0, DeltaAltoud = 0;
    TbVR = 0;
    let TimeStep = -TimeStepDefault / 24.0 / 60.0;
    if (RS === 2) TimeStep = -TimeStep;
    let TimePointer = RiseSetS - TimeStep;
    do {
      TimePointer += TimeStep;
      OldestMinTAV = MinTAVoud;
      MinTAVoud = MinTAVact;
      DeltaAltoud = DeltaAlt;
      const rs2 = ObjectLoc(swed, TimePointer, dgeo, datmC, 'sun', 0, helflag);
      if (rs2.retval !== OK) return { retval: ERR, darr, serr: rs2.serr };
      const ro2 = ObjectLoc(swed, TimePointer, dgeo, datmC, ObjectName, 0, helflag);
      if (ro2.retval !== OK) return { retval: ERR, darr, serr: ro2.serr };
      DeltaAlt = ro2.dret - rs2.dret;
      const rt = DeterTAV(swed, dobsC, TimePointer, dgeo, datmC, ObjectName, helflag);
      if (rt.retval === ERR) return { retval: ERR, darr, serr: rt.serr };
      MinTAVact = rt.dret;
      if (MinTAVoud < MinTAVact && TbVR === 0) {
        let TimeCheck = TimePointer + Sgn(TimeStep) * LocalMinStep / 24.0 / 60.0;
        if (RiseSetO !== 0) {
          if (TimeStep > 0) TimeCheck = Math.min(TimeCheck, RiseSetO);
          else TimeCheck = Math.max(TimeCheck, RiseSetO);
        }
        const rlc = DeterTAV(swed, dobsC, TimeCheck, dgeo, datmC, ObjectName, helflag);
        if (rlc.retval === ERR) return { retval: ERR, darr, serr: rlc.serr };
        if (rlc.dret > MinTAVact) {
          const extrax = x2min(MinTAVact, MinTAVoud, OldestMinTAV);
          TbVR = TimePointer - (1 - extrax) * TimeStep;
          MinTAV = funct2(MinTAVact, MinTAVoud, OldestMinTAV, extrax);
        }
      }
      if (DeltaAlt > MinTAVact && Tc === 0 && TbVR === 0) {
        const cp = crossing(DeltaAltoud, DeltaAlt, MinTAVoud, MinTAVact);
        Tc = TimePointer - TimeStep * (1 - cp);
      }
      if (DeltaAlt < MinTAVact && Ta === 0 && Tc !== 0) {
        const cp = crossing(DeltaAltoud, DeltaAlt, MinTAVoud, MinTAVact);
        Ta = TimePointer - TimeStep * (1 - cp);
      }
    } while (Math.abs(TimePointer - RiseSetS) <= MaxTryHours / 24.0 && Ta === 0 &&
      !((TbVR !== 0 && (TypeEvent === 3 || TypeEvent === 4) && !ObjectName.startsWith('moon') && !ObjectName.startsWith('venus') && !ObjectName.startsWith('mercury'))));
    if (RS === 2) { TfirstVR = Tc; TlastVR = Ta; }
    else { TfirstVR = Ta; TlastVR = Tc; }
    if (TfirstVR === 0 && TlastVR === 0) {
      if (RS === 1) TfirstVR = TbVR - 0.000001;
      else TlastVR = TbVR + 0.000001;
    }
    if (!noriseO) {
      if (RS === 1) TfirstVR = Math.max(TfirstVR, RiseSetO);
      else TlastVR = Math.min(TlastVR, RiseSetO);
    }
    TvisVR = TJD_INVALID;
    if (TlastVR !== 0 && TfirstVR !== 0) TvisVR = TlastVR - TfirstVR;
    if (TlastVR === 0) TlastVR = TJD_INVALID;
    if (TbVR === 0) TbVR = TJD_INVALID;
    if (TfirstVR === 0) TfirstVR = TJD_INVALID;
  }
  darr[0] = AltO; darr[1] = AppAltO; darr[2] = GeoAltO; darr[3] = AziO;
  darr[4] = AltS; darr[5] = AziS; darr[6] = TAVact; darr[7] = ARCVact;
  darr[8] = DAZact; darr[9] = ARCLact; darr[10] = kact; darr[11] = MinTAV;
  darr[12] = TfirstVR; darr[13] = TbVR; darr[14] = TlastVR; darr[15] = TbYallop;
  darr[16] = WMoon; darr[17] = qYal; darr[18] = qCrit; darr[19] = ParO;
  darr[20] = MagnO; darr[21] = RiseSetO; darr[22] = RiseSetS; darr[23] = Lag;
  darr[24] = TvisVR; darr[25] = LMoon; darr[26] = elong; darr[27] = illum;
  return { retval: OK, darr, serr: '' };
}

export function sweHeliacalUt(
  swed: SweData, JDNDaysUTStart: number, dgeo: number[], datm: number[], dobs: number[],
  ObjectNameIn: string, TypeEvent: number, helflag: number,
): { retval: number; dret: number[]; serr: string } {
  const dret = [0, 0, 0];
  if (dgeo[2] < SEI_ECL_GEOALT_MIN || dgeo[2] > SEI_ECL_GEOALT_MAX)
    return { retval: ERR, dret, serr: `location for heliacal events must be between ${SEI_ECL_GEOALT_MIN} and ${SEI_ECL_GEOALT_MAX} m above sea` };
  const datmC = [...datm]; const dobsC = [...dobs];
  const ObjectName = tolowerStringStar(strcpyVBsafe(ObjectNameIn));
  defaultHeliacalParameters(datmC, dgeo, dobsC, helflag);
  sweSetTopo(swed, dgeo[0], dgeo[1], dgeo[2]);
  const Planet = DeterObject(ObjectName);
  if (Planet === SE_SUN)
    return { retval: ERR, dret, serr: 'the sun has no heliacal rising or setting' };
  let MaxCountSynodicPeriod = MAX_COUNT_SYNPER;
  if (helflag & SE_HELFLAG_LONG_SEARCH) MaxCountSynodicPeriod = MAX_COUNT_SYNPER_MAX;
  const sevent = ['', 'morning first', 'evening last', 'evening first', 'morning last', 'acronychal rising', 'acronychal setting'];
  let TypeEventAdj = TypeEvent;
  /* Moon events */
  if (Planet === SE_MOON) {
    if (TypeEvent === 1 || TypeEvent === 2)
      return { retval: ERR, dret, serr: `${sevent[TypeEvent]} (event type ${TypeEvent}) does not exist for the moon` };
    let tjd = JDNDaysUTStart;
    let r = MoonEventJDut(swed, tjd, dgeo, datmC, dobsC, TypeEvent, helflag);
    while (r.retval !== -2 && r.dret[0] < JDNDaysUTStart) {
      tjd += 15;
      r = MoonEventJDut(swed, tjd, dgeo, datmC, dobsC, TypeEvent, helflag);
    }
    dret[0] = r.dret[0]; if (r.dret.length > 1) dret[1] = r.dret[1]; if (r.dret.length > 2) dret[2] = r.dret[2];
    return { retval: r.retval, dret, serr: r.serr };
  }
  /* planets and fixed stars */
  if (!(helflag & SE_HELFLAG_AVKIND)) {
    if (Planet === -1 || Planet >= SE_MARS) {
      if (TypeEvent === 3 || TypeEvent === 4) {
        const s = Planet === -1 ? ObjectName : sweGetPlanetName(Planet, swed);
        return { retval: ERR, dret, serr: `${sevent[TypeEvent]} (event type ${TypeEvent}) does not exist for ${s}` };
      }
    }
  }
  if (helflag & SE_HELFLAG_AVKIND) {
    if (Planet === -1 || Planet >= SE_MARS) {
      if (TypeEventAdj === SE_ACRONYCHAL_RISING) TypeEventAdj = 3;
      if (TypeEventAdj === SE_ACRONYCHAL_SETTING) TypeEventAdj = 4;
    }
  } else {
    if (TypeEventAdj === SE_ACRONYCHAL_RISING || TypeEventAdj === SE_ACRONYCHAL_SETTING) {
      const s = Planet === -1 ? ObjectName : sweGetPlanetName(Planet, swed);
      return { retval: ERR, dret, serr: `${sevent[TypeEvent]} (event type ${TypeEvent}) is not provided for ${s}` };
    }
  }
  const dsynperiod = getSynodicPeriod(Planet);
  const tjdmax = JDNDaysUTStart + dsynperiod * MaxCountSynodicPeriod;
  let tadd = dsynperiod * 0.6;
  if (Planet === SE_MERCURY) tadd = 30;
  let retval = -2;
  for (let tjd = JDNDaysUTStart; tjd < tjdmax && retval === -2; tjd += tadd) {
    let r = heliacalUt(swed, tjd, dgeo, datmC, dobsC, ObjectName, TypeEventAdj, helflag);
    retval = r.retval;
    dret[0] = r.dret[0]; if (r.dret.length > 1) dret[1] = r.dret[1]; if (r.dret.length > 2) dret[2] = r.dret[2];
    while (retval !== -2 && dret[0] < JDNDaysUTStart) {
      tjd += tadd;
      r = heliacalUt(swed, tjd, dgeo, datmC, dobsC, ObjectName, TypeEventAdj, helflag);
      retval = r.retval; dret[0] = r.dret[0];
      if (r.dret.length > 1) dret[1] = r.dret[1]; if (r.dret.length > 2) dret[2] = r.dret[2];
    }
  }
  let serr = '';
  if ((helflag & SE_HELFLAG_SEARCH_1_PERIOD) && (retval === -2 || dret[0] > JDNDaysUTStart + dsynperiod * 1.5)) {
    serr = 'no heliacal date found within this synodic period';
    retval = -2;
  } else if (retval === -2) {
    serr = `no heliacal date found within ${MaxCountSynodicPeriod} synodic periods`;
    retval = ERR;
  }
  return { retval, dret, serr };
}
