/*************************************************************
 * sweph.ts — Main Swiss Ephemeris calculation engine
 * Translated from sweph.c
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

import {
  SE_VERSION, PI, TWOPI, DEGTORAD, RADTODEG,
  J2000, B1950, J1900, B1850, STR,
  SE_ECL_NUT,
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO,
  SE_MEAN_NODE, SE_TRUE_NODE, SE_MEAN_APOG, SE_OSCU_APOG,
  SE_EARTH, SE_CHIRON, SE_PHOLUS,
  SE_CERES, SE_PALLAS, SE_JUNO, SE_VESTA,
  SE_INTP_APOG, SE_INTP_PERG,
  SE_NPLANETS, SE_AST_OFFSET, SE_PLMOON_OFFSET,
  SE_FICT_OFFSET, SE_FICT_OFFSET_1, SE_FICT_MAX, SE_NFICT_ELEM,
  SE_COMET_OFFSET,
  SE_NALL_NAT_POINTS,
  SEFLG_JPLEPH, SEFLG_SWIEPH, SEFLG_MOSEPH,
  SEFLG_HELCTR, SEFLG_TRUEPOS, SEFLG_J2000, SEFLG_NONUT,
  SEFLG_SPEED3, SEFLG_SPEED, SEFLG_NOGDEFL, SEFLG_NOABERR,
  SEFLG_EQUATORIAL, SEFLG_XYZ, SEFLG_RADIANS,
  SEFLG_BARYCTR, SEFLG_TOPOCTR,
  SEFLG_SIDEREAL, SEFLG_ICRS,
  SEFLG_DPSIDEPS_1980, SEFLG_JPLHOR, SEFLG_JPLHOR_APPROX,
  SEFLG_CENTER_BODY, SEFLG_TEST_PLMOON,
  SEFLG_EPHMASK, SEFLG_DEFAULTEPH,
  SE_SIDBITS, SE_SIDBIT_ECL_T0, SE_SIDBIT_SSY_PLANE,
  SE_SIDBIT_USER_UT, SE_SIDBIT_ECL_DATE,
  SE_SIDBIT_NO_PREC_OFFSET, SE_SIDBIT_PREC_ORIG,
  SE_SIDM_FAGAN_BRADLEY, SE_SIDM_LAHIRI,
  SE_SIDM_TRUE_CITRA, SE_SIDM_TRUE_REVATI, SE_SIDM_TRUE_PUSHYA,
  SE_SIDM_TRUE_SHEORAN, SE_SIDM_TRUE_MULA,
  SE_SIDM_GALCENT_0SAG, SE_SIDM_GALCENT_RGILBRAND,
  SE_SIDM_GALEQU_IAU1958, SE_SIDM_GALEQU_TRUE,
  SE_SIDM_GALEQU_MULA, SE_SIDM_GALALIGN_MARDYKS,
  SE_SIDM_GALCENT_MULA_WILHELM, SE_SIDM_GALCENT_COCHRANE,
  SE_SIDM_GALEQU_FIORENZA, SE_SIDM_VALENS_MOON,
  SE_SIDM_J2000, SE_SIDM_J1900, SE_SIDM_B1950,
  SE_SIDM_SURYASIDDHANTA, SE_SIDM_SURYASIDDHANTA_MSUN,
  SE_SIDM_ARYABHATA, SE_SIDM_ARYABHATA_MSUN,
  SE_SIDM_SS_REVATI, SE_SIDM_SS_CITRA,
  SE_SIDM_ARYABHATA_522,
  SE_SIDM_BABYL_BRITTON, SE_SIDM_BABYL_KUGLER1,
  SE_SIDM_BABYL_KUGLER2, SE_SIDM_BABYL_KUGLER3,
  SE_SIDM_BABYL_HUBER, SE_SIDM_BABYL_ETPSC,
  SE_SIDM_ALDEBARAN_15TAU, SE_SIDM_HIPPARCHOS, SE_SIDM_SASSANIAN,
  SE_SIDM_LAHIRI_1940, SE_SIDM_LAHIRI_VP285,
  SE_SIDM_KRISHNAMURTI_VP291, SE_SIDM_LAHIRI_ICRC,
  SE_SIDM_USER, SE_NSIDM_PREDEF,
  SE_PLANET_NAMES, SE_FICTITIOUS_NAMES,
  SEI_EPSILON, SEI_NUTATION,
  SEI_EMB, SEI_EARTH, SEI_SUN, SEI_MOON, SEI_MERCURY, SEI_VENUS,
  SEI_MARS, SEI_JUPITER, SEI_SATURN, SEI_URANUS, SEI_NEPTUNE, SEI_PLUTO,
  SEI_SUNBARY, SEI_ANYBODY,
  SEI_CHIRON, SEI_PHOLUS, SEI_CERES, SEI_PALLAS, SEI_JUNO, SEI_VESTA,
  SEI_NPLANETS,
  SEI_MEAN_NODE, SEI_TRUE_NODE, SEI_MEAN_APOG, SEI_OSCU_APOG,
  SEI_INTP_APOG, SEI_INTP_PERG,
  SEI_NNODE_ETC,
  SEI_FLG_HELIO, SEI_FLG_ROTATE, SEI_FLG_ELLIPSE, SEI_FLG_EMBHEL,
  SEI_FILE_PLANET, SEI_FILE_MOON, SEI_FILE_MAIN_AST, SEI_FILE_ANY_AST,
  OK, ERR, NOT_AVAILABLE, BEYOND_EPH_LIMITS,
  J_TO_J2000, J2000_TO_J,
  AUNIT, CLIGHT, HELGRAVCONST, GEOGCONST,
  SUN_EARTH_MRAT, EARTH_MOON_MRAT, KGAUSS,
  EARTH_RADIUS, EARTH_OBLATENESS, EARTH_ROT_SPEED,
  LIGHTTIME_AUNIT, SUN_RADIUS, PARSEC_TO_AUNIT, KM_S_TO_AU_CTY,
  SSY_PLANE_NODE_E2000, SSY_PLANE_NODE, SSY_PLANE_INCL,
  MOON_SPEED_INTV, PLAN_SPEED_INTV,
  MEAN_NODE_SPEED_INTV, NODE_CALC_INTV, NODE_CALC_INTV_MOSH,
  NUT_SPEED_INTV, DEFL_SPEED_INTV,
  MOSHPLEPH_START, MOSHPLEPH_END,
  MOSHLUEPH_START, MOSHLUEPH_END,
  MOSHNDEPH_START, MOSHNDEPH_END,
  CHIRON_START, CHIRON_END, PHOLUS_START, PHOLUS_END,
  SE_TIDAL_DEFAULT, SE_TIDAL_MOSEPH,
  SE_TIDAL_DE200, SE_TIDAL_DE403, SE_TIDAL_DE404, SE_TIDAL_DE405,
  SE_TIDAL_DE406, SE_TIDAL_DE421, SE_TIDAL_DE422, SE_TIDAL_DE430,
  SE_TIDAL_DE431, SE_TIDAL_DE441,
  SE_DE_NUMBER,
  SEMOD_PREC_NEWCOMB,
  AYANAMSA, AyaInit,
  PLA_DIAM,
  AS_MAXCH,
  MAXORD,
  SEI_FILE_TEST_ENDIAN,
  SEI_FILE_NMAXPLAN,
  SEI_NEPHFILES,
  SEI_CURR_FPOS,
  J_EARTH, J_MOON, J_SUN, J_SBARY,
  PNOINT2JPL,
} from './constants';

import type {
  SweData, PlanData, FileData, Epsilon, Nut, SavePositions, SidData,
  NodeData,
} from './types';

import {
  createPlanData, createEpsilon, createNut, createSavePositions,
  createDefaultSweData,
} from './types';

import {
  squareSum, sweDegnorm, sweRadnorm, sweDifrad2n,
  swiPrecess, swiNutation, swiEpsiln,
  swiCoortrf, swiCoortrf2,
  swiCartpol, swiPolcart, swiCartpolSp, swiPolcartSp,
  swiCrossProd, swiMod2PI,
  swiBias, swiIcrs2fk5, swiFK4_FK5,
  sweDeltatEx, sweDeltat,
  sweSetTidAcc, sweGetTidAcc,
  sweSidtime0, sweSidtime,
  swiGuessEpheFlag,
  swiLdpPeps,
  swiGenFilename,
  swiDotProdUnit,
  swiEcheb, swiEdcheb,
  swiCrc32,
} from './swephlib';

import { SE1FileReader } from './file-reader';

import {
  swiOpenJplFile, swiCloseJplFile, swiPleph, swiGetJplDenum,
} from './swejpl';

import {
  swiMoshplan, swiOscElPlan, swiGetFictName,
} from './swemplan';

import {
  swiMoshmoon, swiMeanNode, swiMeanApog, swiIntpApsides,
} from './swemmoon';

/* ================================================================
 * Internal constants
 * ================================================================ */

const IS_PLANET = 0;
const IS_MOON = 1;
const IS_ANY_BODY = 2;
const IS_MAIN_ASTEROID = 3;

const SEFLG_COORDSYS = SEFLG_EQUATORIAL | SEFLG_XYZ | SEFLG_RADIANS;

const DO_SAVE = true;
const NO_SAVE = false;

/* ================================================================
 * PNOEXT2INT: external planet number → internal planet number
 * ================================================================ */
const PNOEXT2INT: readonly number[] = [
  SEI_SUN,       // 0 = SE_SUN → SEI_SUN (=0=SEI_EARTH)
  SEI_MOON,      // 1 = SE_MOON
  SEI_MERCURY,   // 2 = SE_MERCURY
  SEI_VENUS,     // 3 = SE_VENUS
  SEI_MARS,      // 4 = SE_MARS
  SEI_JUPITER,   // 5 = SE_JUPITER
  SEI_SATURN,    // 6 = SE_SATURN
  SEI_URANUS,    // 7 = SE_URANUS
  SEI_NEPTUNE,   // 8 = SE_NEPTUNE
  SEI_PLUTO,     // 9 = SE_PLUTO
  SEI_MEAN_NODE, // 10 = SE_MEAN_NODE
  SEI_TRUE_NODE, // 11 = SE_TRUE_NODE
  SEI_MEAN_APOG, // 12 = SE_MEAN_APOG
  SEI_OSCU_APOG, // 13 = SE_OSCU_APOG
  SEI_EARTH,     // 14 = SE_EARTH
  SEI_CHIRON,    // 15 = SE_CHIRON
  SEI_PHOLUS,    // 16 = SE_PHOLUS
  SEI_CERES,     // 17 = SE_CERES
  SEI_PALLAS,    // 18 = SE_PALLAS
  SEI_JUNO,      // 19 = SE_JUNO
  SEI_VESTA,     // 20 = SE_VESTA
  SEI_INTP_APOG, // 21 = SE_INTP_APOG
  SEI_INTP_PERG, // 22 = SE_INTP_PERG
];

/* ================================================================
 * Ayanamsa names table
 * ================================================================ */
const AYANAMSA_NAME: readonly string[] = [
  "Fagan/Bradley",                     /*  0 */
  "Lahiri",                            /*  1 */
  "De Luce",                           /*  2 */
  "Raman",                             /*  3 */
  "Usha/Shashi",                       /*  4 */
  "Krishnamurti",                      /*  5 */
  "Djwhal Khul",                       /*  6 */
  "Yukteshwar",                        /*  7 */
  "J.N. Bhasin",                       /*  8 */
  "Babylonian/Kugler 1",               /*  9 */
  "Babylonian/Kugler 2",               /* 10 */
  "Babylonian/Kugler 3",               /* 11 */
  "Babylonian/Huber",                  /* 12 */
  "Babylonian/Eta Piscium",            /* 13 */
  "Babylonian/Aldebaran = 15 Tau",     /* 14 */
  "Hipparchos",                        /* 15 */
  "Sassanian",                         /* 16 */
  "Galact. Center = 0 Sag",            /* 17 */
  "J2000",                             /* 18 */
  "J1900",                             /* 19 */
  "B1950",                             /* 20 */
  "Suryasiddhanta",                    /* 21 */
  "Suryasiddhanta, mean Sun",          /* 22 */
  "Aryabhata",                         /* 23 */
  "Aryabhata, mean Sun",               /* 24 */
  "SS Revati",                         /* 25 */
  "SS Citra",                          /* 26 */
  "True Citra",                        /* 27 */
  "True Revati",                       /* 28 */
  "True Pushya",                       /* 29 */
  "Galactic Center (Gil Brand)",       /* 30 */
  "Gal. Equator (IAU1958)",            /* 31 */
  "Gal. Equator",                      /* 32 */
  "Gal. Equator mid-Mula",             /* 33 */
  "Skydram (Mardyks)",                 /* 34 */
  "True Mula (Chandra Hari)",          /* 35 */
  "Dhruva/Gal.Center/Mula (Wilhelm)", /* 36 */
  "Aryabhata 522",                     /* 37 */
  "Babylonian/Britton",                /* 38 */
  "True Sheoran",                      /* 39 */
  "Galactic Center (Cochrane)",        /* 40 */
  "Galactic Equator (Fiorenza)",       /* 41 */
  "Valens (Moon)",                     /* 42 */
  "Lahiri 1940",                       /* 43 */
  "Lahiri VP285",                      /* 44 */
  "Krishnamurti VP291",                /* 45 */
  "Lahiri ICRC",                       /* 46 */
];

/* ================================================================
 * EFF_ARR: effective mass factor for light deflection near sun
 * r = min distance of photon from sun center (fraction of Rsun)
 * m = effective mass factor
 * ================================================================ */
const EFF_ARR: readonly { r: number; m: number }[] = [
  {r: 1.000, m: 1.000000}, {r: 0.990, m: 0.999979}, {r: 0.980, m: 0.999940},
  {r: 0.970, m: 0.999881}, {r: 0.960, m: 0.999811}, {r: 0.950, m: 0.999724},
  {r: 0.940, m: 0.999622}, {r: 0.930, m: 0.999497}, {r: 0.920, m: 0.999354},
  {r: 0.910, m: 0.999192}, {r: 0.900, m: 0.999000}, {r: 0.890, m: 0.998786},
  {r: 0.880, m: 0.998535}, {r: 0.870, m: 0.998242}, {r: 0.860, m: 0.997919},
  {r: 0.850, m: 0.997571}, {r: 0.840, m: 0.997198}, {r: 0.830, m: 0.996792},
  {r: 0.820, m: 0.996316}, {r: 0.810, m: 0.995791}, {r: 0.800, m: 0.995226},
  {r: 0.790, m: 0.994625}, {r: 0.780, m: 0.993991}, {r: 0.770, m: 0.993326},
  {r: 0.760, m: 0.992598}, {r: 0.750, m: 0.991770}, {r: 0.740, m: 0.990873},
  {r: 0.730, m: 0.989919}, {r: 0.720, m: 0.988912}, {r: 0.710, m: 0.987856},
  {r: 0.700, m: 0.986755}, {r: 0.690, m: 0.985610}, {r: 0.680, m: 0.984398},
  {r: 0.670, m: 0.982986}, {r: 0.660, m: 0.981437}, {r: 0.650, m: 0.979779},
  {r: 0.640, m: 0.978024}, {r: 0.630, m: 0.976182}, {r: 0.620, m: 0.974256},
  {r: 0.610, m: 0.972253}, {r: 0.600, m: 0.970174}, {r: 0.590, m: 0.968024},
  {r: 0.580, m: 0.965594}, {r: 0.570, m: 0.962797}, {r: 0.560, m: 0.959758},
  {r: 0.550, m: 0.956515}, {r: 0.540, m: 0.953088}, {r: 0.530, m: 0.949495},
  {r: 0.520, m: 0.945741}, {r: 0.510, m: 0.941838}, {r: 0.500, m: 0.937790},
  {r: 0.490, m: 0.933563}, {r: 0.480, m: 0.928668}, {r: 0.470, m: 0.923288},
  {r: 0.460, m: 0.917527}, {r: 0.450, m: 0.911432}, {r: 0.440, m: 0.905035},
  {r: 0.430, m: 0.898353}, {r: 0.420, m: 0.891022}, {r: 0.410, m: 0.882940},
  {r: 0.400, m: 0.874312}, {r: 0.390, m: 0.865206}, {r: 0.380, m: 0.855423},
  {r: 0.370, m: 0.844619}, {r: 0.360, m: 0.833074}, {r: 0.350, m: 0.820876},
  {r: 0.340, m: 0.808031}, {r: 0.330, m: 0.793962}, {r: 0.320, m: 0.778931},
  {r: 0.310, m: 0.763021}, {r: 0.300, m: 0.745815}, {r: 0.290, m: 0.727557},
  {r: 0.280, m: 0.708234}, {r: 0.270, m: 0.687583}, {r: 0.260, m: 0.665741},
  {r: 0.250, m: 0.642597}, {r: 0.240, m: 0.618252}, {r: 0.230, m: 0.592586},
  {r: 0.220, m: 0.565747}, {r: 0.210, m: 0.537697}, {r: 0.200, m: 0.508554},
  {r: 0.190, m: 0.478420}, {r: 0.180, m: 0.447322}, {r: 0.170, m: 0.415454},
  {r: 0.160, m: 0.382892}, {r: 0.150, m: 0.349955}, {r: 0.140, m: 0.316691},
  {r: 0.130, m: 0.283565}, {r: 0.120, m: 0.250431}, {r: 0.110, m: 0.218327},
  {r: 0.100, m: 0.186794}, {r: 0.090, m: 0.156287}, {r: 0.080, m: 0.128421},
  {r: 0.070, m: 0.102237}, {r: 0.060, m: 0.077393}, {r: 0.050, m: 0.054833},
  {r: 0.040, m: 0.036361}, {r: 0.030, m: 0.020953}, {r: 0.020, m: 0.009645},
  {r: 0.010, m: 0.002767}, {r: 0.000, m: 0.000000},
];

/* ================================================================
 * Part 1: Initialization, utility, and configuration functions
 * ================================================================ */

/** Return library version string */
export function sweVersion(): string {
  return SE_VERSION;
}

/** Free planet data arrays (clear computed positions) */
export function freePlanets(swed: SweData): void {
  for (let i = 0; i < SEI_NPLANETS; i++) {
    const pd = swed.pldat[i];
    pd.segp = null;
    pd.refep = null;
    pd.neval = 0;
    pd.tseg0 = 0;
    pd.tseg1 = 0;
  }
  for (let i = 0; i < SEI_NNODE_ETC; i++) {
    const nd = swed.nddat[i];
    nd.segp = null;
    nd.refep = null;
    nd.neval = 0;
    nd.tseg0 = 0;
    nd.tseg1 = 0;
  }
}

/** Initialize swed if not yet done */
export function swiInitSwedIfStart(swed: SweData): void {
  if (!swed.swedIsInitialised) {
    /* Initialize with default state values */
    swed.ephePathIsSet = false;
    swed.jplFileIsOpen = false;
    swed.lastEpheflag = SEFLG_MOSEPH;
    swed.geoposIsSet = false;
    swed.ayanaIsSet = false;
    swed.swedIsInitialised = true;
  }
}

/** Close but keep topocentric settings */
function swiCloseKeepTopoEtc(swed: SweData): void {
  freePlanets(swed);
  /* Clear file data */
  for (const fd of swed.fidat) {
    fd.fnam = '';
    fd.fversion = 0;
    fd.reader = null;
  }
  /* Clear computed planet data */
  for (const pd of swed.pldat) {
    pd.teval = 0;
    pd.xflgs = 0;
    pd.iephe = 0;
    pd.x.fill(0);
    pd.xreturn.fill(0);
  }
  for (const nd of swed.nddat) {
    nd.teval = 0;
    nd.xflgs = 0;
    nd.iephe = 0;
    nd.x.fill(0);
    nd.xreturn.fill(0);
  }
  /* Clear saved positions */
  for (const sp of swed.savedat) {
    sp.tsave = 0;
    sp.iflgsave = 0;
    sp.ipl = 0;
    sp.xsaves.fill(0);
  }
  /* Clear epsilon/nutation cache */
  swed.oec.teps = 0;
  swed.oec2000.teps = 0;
  swed.nut.tnut = 0;
  swed.nut2000.tnut = 0;
  swed.nutv.tnut = 0;
  swed.initDtDone = false;
}

/** Full close: reset everything */
export function sweClose(swed: SweData): void {
  swiCloseKeepTopoEtc(swed);
  swiCloseJplFile(swed);
  swed.ephePathIsSet = false;
  swed.jplFileIsOpen = false;
  swed.geoposIsSet = false;
  swed.ayanaIsSet = false;
  swed.sidd.sidMode = 0;
  swed.sidd.ayanT0 = 0;
  swed.sidd.t0 = 0;
  swed.sidd.t0IsUT = false;
  swed.topd.geolon = 0;
  swed.topd.geolat = 0;
  swed.topd.geoalt = 0;
  swed.topd.teval = 0;
  swed.topd.tjdUt = 0;
  swed.topd.xobs.fill(0);
  swed.isTidAccManual = false;
  swed.tidAcc = 0;
  swed.astroModels.fill(0);
  swed.dpsi = null;
  swed.deps = null;
  swed.swedIsInitialised = false;
}

/** Set ephemeris file path */
export function sweSetEphePath(swed: SweData, path: string): void {
  swiInitSwedIfStart(swed);
  swed.ephepath = path || '.';
  swed.ephePathIsSet = true;
}

/** Set JPL file name */
export function sweSetJplFile(swed: SweData, fname: string): void {
  swiInitSwedIfStart(swed);
  swed.jplfnam = fname;
}

/* ================================================================
 * Obliquity and Nutation helpers
 * ================================================================ */

/** Compute obliquity of ecliptic */
export function calcEpsilon(tjd: number, iflag: number, e: Epsilon, swed: SweData): void {
  e.teps = tjd;
  e.eps = swiEpsiln(tjd, iflag, swed);
  e.seps = Math.sin(e.eps);
  e.ceps = Math.cos(e.eps);
}

/** Ensure oec and oec2000 are computed for the given tjd */
export function swiCheckEcliptic(tjd: number, iflag: number, swed: SweData): void {
  if (swed.oec2000.teps !== J2000) {
    calcEpsilon(J2000, iflag, swed.oec2000, swed);
  }
  if (tjd === J2000) {
    swed.oec.teps = swed.oec2000.teps;
    swed.oec.eps = swed.oec2000.eps;
    swed.oec.seps = swed.oec2000.seps;
    swed.oec.ceps = swed.oec2000.ceps;
  } else if (swed.oec.teps !== tjd || tjd === 0) {
    calcEpsilon(tjd, iflag, swed.oec, swed);
  }
}

/** Ensure nut and nutv are computed for the given tjd */
export function swiCheckNutation(tjd: number, iflag: number, swed: SweData): void {
  if (swed.nut.tnut !== tjd || tjd === 0) {
    const nutlo: [number, number] = [0, 0];
    swiNutation(tjd, iflag, nutlo, swed);
    swed.nut.tnut = tjd;
    swed.nut.nutlo[0] = nutlo[0];
    swed.nut.nutlo[1] = nutlo[1];
    swed.nut.snut = Math.sin(nutlo[1]);
    swed.nut.cnut = Math.cos(nutlo[1]);
    nutMatrix(swed.nut, swed.oec);
  }
  if (swed.nutv.tnut !== tjd || tjd === 0) {
    /* nutation at slightly different time for speed computation */
    const nutlo: [number, number] = [0, 0];
    const tjdv = tjd + NUT_SPEED_INTV;
    swiNutation(tjdv, iflag, nutlo, swed);
    swed.nutv.tnut = tjdv;
    swed.nutv.nutlo[0] = nutlo[0];
    swed.nutv.nutlo[1] = nutlo[1];
    swed.nutv.snut = Math.sin(nutlo[1]);
    swed.nutv.cnut = Math.cos(nutlo[1]);
    nutMatrix(swed.nutv, swed.oec);
  }
}

/** Compute 3x3 nutation matrix */
export function nutMatrix(nu: Nut, oe: Epsilon): void {
  const psi = nu.nutlo[0];
  const eps = oe.eps;
  const epsMod = eps + nu.nutlo[1];
  const sinpsi = Math.sin(psi);
  const cospsi = Math.cos(psi);
  const sineps0 = oe.seps;
  const coseps0 = oe.ceps;
  const sinepsM = Math.sin(epsMod);
  const cosepsM = Math.cos(epsMod);
  nu.matrix[0][0] = cospsi;
  nu.matrix[0][1] = sinpsi * coseps0;
  nu.matrix[0][2] = sinpsi * sineps0;
  nu.matrix[1][0] = -sinpsi * cosepsM;
  nu.matrix[1][1] = cospsi * cosepsM * coseps0 + sinepsM * sineps0;
  nu.matrix[1][2] = cospsi * cosepsM * sineps0 - sinepsM * coseps0;
  nu.matrix[2][0] = -sinpsi * sinepsM;
  nu.matrix[2][1] = cospsi * sinepsM * coseps0 - cosepsM * sineps0;
  nu.matrix[2][2] = cospsi * sinepsM * sineps0 + cosepsM * coseps0;
}

/* ================================================================
 * plausIflag: sanitize iflag
 * ================================================================ */
function plausIflag(iflag: number, ipl: number, tjd: number, swed: SweData): number {
  let epheflag = iflag & SEFLG_EPHMASK;
  if (epheflag === 0) {
    epheflag = SEFLG_DEFAULTEPH;
    iflag |= SEFLG_DEFAULTEPH;
  }
  /* JPL: allow if file is open, otherwise fall back to SWIEPH */
  if (epheflag & SEFLG_JPLEPH) {
    if (!swed.jplFileIsOpen) {
      iflag &= ~SEFLG_JPLEPH;
      iflag |= SEFLG_SWIEPH;
      epheflag = SEFLG_SWIEPH;
    }
  }
  /* SWIEPH is allowed — if files aren't loaded, individual functions fall back to MOSEPH */
  /* Speed flag: SPEED3 implies SPEED */
  if (iflag & SEFLG_SPEED3) {
    iflag |= SEFLG_SPEED;
  }
  /* SPEED is always needed internally */
  iflag |= SEFLG_SPEED;
  /* If heliocentric and BARYCTR both set, clear BARYCTR */
  if ((iflag & SEFLG_HELCTR) && (iflag & SEFLG_BARYCTR)) {
    iflag &= ~SEFLG_BARYCTR;
  }
  /* Heliocentric: clear topocentric */
  if (iflag & SEFLG_HELCTR) {
    iflag &= ~SEFLG_TOPOCTR;
  }
  /* Sun/barycentre combination: clear barycentric for Sun */
  if (ipl === SE_SUN && (iflag & SEFLG_BARYCTR)) {
    /* nothing special needed */
  }
  /* If sidereal, add NONUT */
  if (iflag & SEFLG_SIDEREAL) {
    /* do NOT add NONUT for sidereal mode; nutation handled by ayanamsa */
  }
  return iflag;
}

/* ================================================================
 * Planet name
 * ================================================================ */
export function sweGetPlanetName(ipl: number, swed: SweData): string {
  if (ipl !== 0 && ipl === swed.iSavedPlanetName) {
    return swed.savedPlanetName;
  }
  let s: string;
  if (ipl >= 0 && ipl < SE_NPLANETS) {
    s = SE_PLANET_NAMES[ipl];
  } else if (ipl >= SE_FICT_OFFSET && ipl <= SE_FICT_MAX) {
    s = swiGetFictName(ipl - SE_FICT_OFFSET);
  } else if (ipl >= SE_AST_OFFSET) {
    const iast = ipl - SE_AST_OFFSET;
    s = `asteroid ${iast}`;
  } else {
    s = `body ${ipl}`;
  }
  swed.iSavedPlanetName = ipl;
  swed.savedPlanetName = s;
  return s;
}

export function sweGetAyanamsaName(isidm: number): string {
  if (isidm < SE_NSIDM_PREDEF) {
    return AYANAMSA_NAME[isidm];
  }
  return "unknown";
}

/* ================================================================
 * Topocentric setup
 * ================================================================ */
export function sweSetTopo(swed: SweData, geolon: number, geolat: number, geoalt: number): void {
  swiInitSwedIfStart(swed);
  if (swed.topd.geolon !== geolon || swed.topd.geolat !== geolat || swed.topd.geoalt !== geoalt) {
    swed.topd.geolon = geolon;
    swed.topd.geolat = geolat;
    swed.topd.geoalt = geoalt;
    swed.topd.teval = 0;
    swed.topd.tjdUt = 0;
    swed.topd.xobs.fill(0);
    swed.geoposIsSet = true;
    /* invalidate saved planet positions */
    for (const sp of swed.savedat) {
      sp.tsave = 0;
    }
  }
}

/* ================================================================
 * swiForceAppPosEtc: invalidate saved positions
 * ================================================================ */
export function swiForceAppPosEtc(swed: SweData): void {
  for (const sp of swed.savedat) {
    sp.tsave = 0;
  }
}

/* ================================================================
 * Time equation helpers
 * ================================================================ */
export function sweTimeEqu(swed: SweData, tjdUt: number): { retc: number; e: number; serr: string } {
  const dt = sweDeltatEx(tjdUt, -1, swed);
  const tjdEt = tjdUt + dt;
  const res = sweCalc(swed, tjdEt, SE_SUN, SEFLG_EQUATORIAL);
  if (res.flags < 0) {
    return { retc: ERR, e: 0, serr: res.serr };
  }
  const ra = res.xx[0]; /* right ascension of sun in degrees */
  const sidt = sweSidtime(swed, tjdUt); /* sidereal time in hours */
  let e = sidt * 15 - ra; /* equation of time */
  /* normalize to [-180, 180) degrees */
  e = sweDegnorm(e + 180) - 180;
  /* convert to fraction of day */
  e /= 360.0;
  return { retc: OK, e, serr: '' };
}

export function sweLmtToLat(swed: SweData, tjdLmt: number, geolon: number): { retc: number; tjdLat: number; serr: string } {
  const diffLon = geolon / 360.0;
  let tjdLat = tjdLmt - diffLon;
  const eqRes = sweTimeEqu(swed, tjdLat);
  if (eqRes.retc === ERR) return { retc: ERR, tjdLat: 0, serr: eqRes.serr };
  tjdLat = tjdLmt - diffLon - eqRes.e;
  const eqRes2 = sweTimeEqu(swed, tjdLat);
  if (eqRes2.retc === ERR) return { retc: ERR, tjdLat: 0, serr: eqRes2.serr };
  tjdLat = tjdLmt - diffLon - eqRes2.e;
  const eqRes3 = sweTimeEqu(swed, tjdLat);
  if (eqRes3.retc === ERR) return { retc: ERR, tjdLat: 0, serr: eqRes3.serr };
  tjdLat = tjdLmt - diffLon - eqRes3.e;
  return { retc: OK, tjdLat, serr: '' };
}

export function sweLatToLmt(swed: SweData, tjdLat: number, geolon: number): { retc: number; tjdLmt: number; serr: string } {
  const diffLon = geolon / 360.0;
  let tjdLmt = tjdLat + diffLon;
  const eqRes = sweTimeEqu(swed, tjdLat);
  if (eqRes.retc === ERR) return { retc: ERR, tjdLmt: 0, serr: eqRes.serr };
  tjdLmt = tjdLat + diffLon + eqRes.e;
  const eqRes2 = sweTimeEqu(swed, tjdLmt - diffLon);
  if (eqRes2.retc === ERR) return { retc: ERR, tjdLmt: 0, serr: eqRes2.serr };
  tjdLmt = tjdLat + diffLon + eqRes2.e;
  const eqRes3 = sweTimeEqu(swed, tjdLmt - diffLon);
  if (eqRes3.retc === ERR) return { retc: ERR, tjdLmt: 0, serr: eqRes3.serr };
  tjdLmt = tjdLat + diffLon + eqRes3.e;
  return { retc: OK, tjdLmt, serr: '' };
}

/* ================================================================
 * Part 2: Precession speed, nutation, aberration, deflection,
 *         embofs, denormalize, calcSpeed, meff, observer, denum
 * ================================================================ */

/** Apply precession speed correction */
export function swiPrecessSpeed(x: Float64Array | number[], t: number, iflag: number, direction: number, swed: SweData): void {
  /* compute precessed position at t + dt */
  const dt = PLAN_SPEED_INTV;
  const xx = [x[0], x[1], x[2]];
  const x2 = [x[0] - x[3] * dt, x[1] - x[4] * dt, x[2] - x[5] * dt];
  swiPrecess(xx, t, iflag, direction, swed);
  swiPrecess(x2, t - dt, iflag, direction, swed);
  for (let i = 0; i <= 2; i++) {
    x[i] = xx[i];
    x[i + 3] = (xx[i] - x2[i]) / dt;
  }
}

/** Apply nutation to position + speed */
export function swiNutate(x: Float64Array | number[], iflag: number, backward: boolean, swed: SweData): void {
  const mat = swed.nut.matrix;
  const matv = swed.nutv.matrix;
  const xx = [0, 0, 0, 0, 0, 0];
  if (!backward) {
    /* true equator → mean equator */
    for (let i = 0; i <= 2; i++) {
      xx[i] = mat[i][0] * x[0] + mat[i][1] * x[1] + mat[i][2] * x[2];
    }
    /* speed: apply nutv matrix to speed part */
    for (let i = 0; i <= 2; i++) {
      xx[i + 3] = mat[i][0] * x[3] + mat[i][1] * x[4] + mat[i][2] * x[5];
    }
    /* nutation speed correction */
    if (iflag & SEFLG_SPEED) {
      for (let i = 0; i <= 2; i++) {
        xx[i + 3] += (matv[i][0] - mat[i][0]) * x[0] / NUT_SPEED_INTV
                   + (matv[i][1] - mat[i][1]) * x[1] / NUT_SPEED_INTV
                   + (matv[i][2] - mat[i][2]) * x[2] / NUT_SPEED_INTV;
      }
    }
  } else {
    /* mean equator → true equator (transpose) */
    for (let i = 0; i <= 2; i++) {
      xx[i] = mat[0][i] * x[0] + mat[1][i] * x[1] + mat[2][i] * x[2];
    }
    for (let i = 0; i <= 2; i++) {
      xx[i + 3] = mat[0][i] * x[3] + mat[1][i] * x[4] + mat[2][i] * x[5];
    }
    if (iflag & SEFLG_SPEED) {
      for (let i = 0; i <= 2; i++) {
        xx[i + 3] += (matv[0][i] - mat[0][i]) * x[0] / NUT_SPEED_INTV
                   + (matv[1][i] - mat[1][i]) * x[1] / NUT_SPEED_INTV
                   + (matv[2][i] - mat[2][i]) * x[2] / NUT_SPEED_INTV;
      }
    }
  }
  for (let i = 0; i <= 5; i++) x[i] = xx[i];
}

/** Aberration of light (private, relativistic formula from Meeus) */
function aberrLight(xx: Float64Array | number[], xe: Float64Array | number[]): void {
  const u = [xx[0], xx[1], xx[2]];
  const ru = Math.sqrt(squareSum(u));
  if (ru === 0) return;
  /* Earth velocity in AU/d → fraction of speed of light */
  const v = [
    xe[3] / 24.0 / 3600.0 / CLIGHT * AUNIT,
    xe[4] / 24.0 / 3600.0 / CLIGHT * AUNIT,
    xe[5] / 24.0 / 3600.0 / CLIGHT * AUNIT,
  ];
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const b_1 = Math.sqrt(1 - v2);
  const f1 = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / ru;
  const f2 = 1.0 + f1 / (1.0 + b_1);
  for (let i = 0; i <= 2; i++) {
    xx[i] = (b_1 * xx[i] + f2 * ru * v[i]) / (1.0 + f1);
  }
}

/** Aberration of light, external version with speed correction */
export function swiAberrLightEx(
  xx: Float64Array | number[], xe: Float64Array | number[],
  xedt: Float64Array | number[], dt: number, iflag: number,
): void {
  const xxs = [xx[0], xx[1], xx[2], xx[3], xx[4], xx[5]];
  aberrLight(xx, xe);
  if (iflag & SEFLG_SPEED) {
    const xx2 = [xxs[0] - dt * xxs[3], xxs[1] - dt * xxs[4], xxs[2] - dt * xxs[5]];
    aberrLight(xx2, xedt);
    for (let i = 0; i <= 2; i++) {
      xx[i + 3] = (xx[i] - xx2[i]) / dt;
    }
  }
}

/** Aberration of light with speed correction using finite differences */
export function swiAberrLight(xx: Float64Array | number[], xe: Float64Array | number[], iflag: number): void {
  const xxs = [xx[0], xx[1], xx[2], xx[3], xx[4], xx[5]];
  const u = [xx[0], xx[1], xx[2]];
  const ru = Math.sqrt(squareSum(u));
  if (ru === 0) return;
  const v = [
    xe[3] / 24.0 / 3600.0 / CLIGHT * AUNIT,
    xe[4] / 24.0 / 3600.0 / CLIGHT * AUNIT,
    xe[5] / 24.0 / 3600.0 / CLIGHT * AUNIT,
  ];
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const b_1 = Math.sqrt(1 - v2);
  let f1 = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / ru;
  let f2 = 1.0 + f1 / (1.0 + b_1);
  for (let i = 0; i <= 2; i++) {
    xx[i] = (b_1 * xx[i] + f2 * ru * v[i]) / (1.0 + f1);
  }
  if (iflag & SEFLG_SPEED) {
    const intv = PLAN_SPEED_INTV;
    const u2 = [xxs[0] - intv * xxs[3], xxs[1] - intv * xxs[4], xxs[2] - intv * xxs[5]];
    const ru2 = Math.sqrt(u2[0] * u2[0] + u2[1] * u2[1] + u2[2] * u2[2]);
    f1 = (u2[0] * v[0] + u2[1] * v[1] + u2[2] * v[2]) / ru2;
    f2 = 1.0 + f1 / (1.0 + b_1);
    const xx2 = [0, 0, 0];
    for (let i = 0; i <= 2; i++) {
      xx2[i] = (b_1 * u2[i] + f2 * ru2 * v[i]) / (1.0 + f1);
    }
    for (let i = 0; i <= 2; i++) {
      const dx1 = xx[i] - xxs[i];
      const dx2 = xx2[i] - u2[i];
      xx[i + 3] += (dx1 - dx2) / intv;
    }
  }
}

/** Gravitational deflection of light by Sun */
export function swiDeflectLight(
  xx: Float64Array | number[],
  dt: number,
  iflag: number,
  swed: SweData,
): void {
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  const iephe = pedp.iephe;
  const xearth = [pedp.x[0], pedp.x[1], pedp.x[2], pedp.x[3], pedp.x[4], pedp.x[5]];
  if (iflag & SEFLG_TOPOCTR) {
    for (let i = 0; i <= 5; i++) xearth[i] += swed.topd.xobs[i];
  }
  /* U = planetgeo */
  const u = [xx[0], xx[1], xx[2]];
  /* Eh = earthhel (for Moshier: earth position IS heliocentric) */
  const e = [0, 0, 0];
  if (iephe === SEFLG_JPLEPH || iephe === SEFLG_SWIEPH) {
    for (let i = 0; i <= 2; i++) e[i] = xearth[i] - psdp.x[i];
  } else {
    for (let i = 0; i <= 2; i++) e[i] = xearth[i];
  }
  /* Q = planethel = xx + earth - sun(t-tau) */
  const xsun = [0, 0, 0, 0, 0, 0];
  if (iephe === SEFLG_JPLEPH || iephe === SEFLG_SWIEPH) {
    for (let i = 0; i <= 2; i++) xsun[i] = psdp.x[i] - dt * psdp.x[i + 3];
    for (let i = 3; i <= 5; i++) xsun[i] = psdp.x[i];
  } else {
    for (let i = 0; i <= 5; i++) xsun[i] = psdp.x[i];
  }
  const q = [
    xx[0] + xearth[0] - xsun[0],
    xx[1] + xearth[1] - xsun[1],
    xx[2] + xearth[2] - xsun[2],
  ];
  let ru = Math.sqrt(u[0] * u[0] + u[1] * u[1] + u[2] * u[2]);
  let rq = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]);
  let re = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]);
  if (ru === 0 || rq === 0 || re === 0) return;
  for (let i = 0; i <= 2; i++) { u[i] /= ru; q[i] /= rq; e[i] /= re; }
  let uq = u[0] * q[0] + u[1] * q[1] + u[2] * q[2];
  let ue = u[0] * e[0] + u[1] * e[1] + u[2] * e[2];
  let qe = q[0] * e[0] + q[1] * e[1] + q[2] * e[2];
  /* meff: effective mass factor when body passes through solar disc */
  let sina = Math.sqrt(1 - ue * ue);
  let sinSunr = SUN_RADIUS / re;
  let meffFact = (sina < sinSunr) ? meff(sina / sinSunr) : 1;
  let g1 = 2.0 * HELGRAVCONST * meffFact / CLIGHT / CLIGHT / AUNIT / re;
  let g2 = 1.0 + qe;
  /* deflected position */
  const xx2 = [0, 0, 0];
  for (let i = 0; i <= 2; i++) {
    xx2[i] = ru * (u[i] + g1 / g2 * (uq * e[i] - ue * q[i]));
  }
  if (iflag & SEFLG_SPEED) {
    const dtsp = -DEFL_SPEED_INTV;
    const u2 = [xx[0] - dtsp * xx[3], xx[1] - dtsp * xx[4], xx[2] - dtsp * xx[5]];
    const e2 = [0, 0, 0];
    if (iephe === SEFLG_JPLEPH || iephe === SEFLG_SWIEPH) {
      for (let i = 0; i <= 2; i++)
        e2[i] = xearth[i] - psdp.x[i] - dtsp * (xearth[i + 3] - psdp.x[i + 3]);
    } else {
      for (let i = 0; i <= 2; i++) e2[i] = xearth[i] - dtsp * xearth[i + 3];
    }
    const q2 = [
      u2[0] + xearth[0] - xsun[0] - dtsp * (xearth[3] - xsun[3]),
      u2[1] + xearth[1] - xsun[1] - dtsp * (xearth[4] - xsun[4]),
      u2[2] + xearth[2] - xsun[2] - dtsp * (xearth[5] - xsun[5]),
    ];
    ru = Math.sqrt(u2[0] * u2[0] + u2[1] * u2[1] + u2[2] * u2[2]);
    rq = Math.sqrt(q2[0] * q2[0] + q2[1] * q2[1] + q2[2] * q2[2]);
    re = Math.sqrt(e2[0] * e2[0] + e2[1] * e2[1] + e2[2] * e2[2]);
    if (ru > 0 && rq > 0 && re > 0) {
      for (let i = 0; i <= 2; i++) { u2[i] /= ru; q2[i] /= rq; e2[i] /= re; }
      uq = u2[0] * q2[0] + u2[1] * q2[1] + u2[2] * q2[2];
      ue = u2[0] * e2[0] + u2[1] * e2[1] + u2[2] * e2[2];
      qe = q2[0] * e2[0] + q2[1] * e2[1] + q2[2] * e2[2];
      sina = Math.sqrt(1 - ue * ue);
      sinSunr = SUN_RADIUS / re;
      meffFact = (sina < sinSunr) ? meff(sina / sinSunr) : 1;
      g1 = 2.0 * HELGRAVCONST * meffFact / CLIGHT / CLIGHT / AUNIT / re;
      g2 = 1.0 + qe;
      const xx3 = [0, 0, 0];
      for (let i = 0; i <= 2; i++) {
        xx3[i] = ru * (u2[i] + g1 / g2 * (uq * e2[i] - ue * q2[i]));
      }
      for (let i = 0; i <= 2; i++) {
        const dx1 = xx2[i] - xx[i];
        const dx2 = xx3[i] - u2[i] * ru;
        xx[i + 3] += (dx1 - dx2) / dtsp;
      }
    }
  }
  /* set deflected position */
  for (let i = 0; i <= 2; i++) xx[i] = xx2[i];
}

/** meff: effective mass factor for light deflection (interpolation from table) */
function meff(r: number): number {
  /* r = fraction of sun radius at which photon passes */
  if (r <= 0) return 0.0;
  if (r >= 1) return 1.0;
  let i: number;
  for (i = 0; EFF_ARR[i].r > r; i++) { /* find bracket */ }
  const f = (r - EFF_ARR[i - 1].r) / (EFF_ARR[i].r - EFF_ARR[i - 1].r);
  return EFF_ARR[i - 1].m + f * (EFF_ARR[i].m - EFF_ARR[i - 1].m);
}

/** Earth-Moon barycentre → Earth offset */
function embofs(xemb: Float64Array | number[], xmoon: Float64Array | number[]): void {
  for (let i = 0; i <= 5; i++) {
    xemb[i] -= xmoon[i] / (EARTH_MOON_MRAT + 1.0);
  }
}

/** Denormalize positions from barycentric/heliocentric to geocentric */
function denormalizePositions(
  x: Float64Array | number[],
  xearth: Float64Array | number[],
  xsun: Float64Array | number[],
  iflag: number,
): void {
  if (iflag & SEFLG_HELCTR) {
    /* heliocentric: subtract sun from body */
    for (let i = 0; i <= 5; i++) x[i] -= xsun[i];
  } else if (iflag & SEFLG_BARYCTR) {
    /* barycentric: do nothing, positions are already barycentric */
  } else {
    /* geocentric: subtract earth from body */
    for (let i = 0; i <= 5; i++) x[i] -= xearth[i];
  }
}

/** Compute speed from 3 positions */
function calcSpeed(x0: Float64Array | number[], x1: Float64Array | number[], x2: Float64Array | number[], dt: number): void {
  for (let i = 0; i <= 2; i++) {
    const b = (x0[i] - x2[i]) / 2;
    const a = (x0[i] + x2[i]) / 2 - x1[i];
    x1[i + 3] = (2 * a + b) / dt;
  }
}

/* ================================================================
 * swiGetObserver: compute observer position (topocentric)
 * ================================================================ */
export function swiGetObserver(tjdUt: number, iflag: number, doSave: boolean, xobs: Float64Array | number[], swed: SweData): void {
  if (doSave && swed.topd.teval === tjdUt && swed.topd.tjdUt === tjdUt) {
    for (let i = 0; i <= 5; i++) xobs[i] = swed.topd.xobs[i];
    return;
  }
  const ell = swed.topd;
  const phi = ell.geolat * DEGTORAD;
  const lam = ell.geolon * DEGTORAD;
  const alt = ell.geoalt;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  /* Compute geocentric observer position */
  const fl = 1.0 - EARTH_OBLATENESS;
  const fl2 = fl * fl;
  const cc2 = 1 / (cosPhi * cosPhi + fl2 * sinPhi * sinPhi);
  const cc3 = Math.sqrt(cc2);
  const ss = fl2 * cc2;
  const ss2 = Math.sqrt(ss);
  /* cartesian coordinates of observer */
  const rr = (EARTH_RADIUS * cc3 + alt) * cosPhi;
  const zz = (EARTH_RADIUS * ss2 + alt) * sinPhi;
  /* Convert to AU */
  const re = rr / AUNIT;
  const ze = zz / AUNIT;
  /* Sidereal time at observer */
  const st = sweSidtime(swed, tjdUt) * 15 * DEGTORAD + lam;
  xobs[0] = re * Math.cos(st);
  xobs[1] = re * Math.sin(st);
  xobs[2] = ze;
  /* Speed: observer rotates with Earth */
  const dt = 1.0 / 86400.0;
  const st2 = st + EARTH_ROT_SPEED * DEGTORAD * dt;
  const xobs2 = [
    re * Math.cos(st2),
    re * Math.sin(st2),
    ze,
  ];
  xobs[3] = (xobs2[0] - xobs[0]) / dt;
  xobs[4] = (xobs2[1] - xobs[1]) / dt;
  xobs[5] = 0; /* no radial speed change */
  if (doSave) {
    swed.topd.teval = tjdUt;
    swed.topd.tjdUt = tjdUt;
    for (let i = 0; i <= 5; i++) swed.topd.xobs[i] = xobs[i];
  }
}

/** Get DE number for given ephemeris */
export function swiGetDenum(ipl: number, iflag: number, swed: SweData): number {
  const epheflag = iflag & SEFLG_EPHMASK;
  if (epheflag === SEFLG_JPLEPH && swed.jpldenum !== 0) {
    return swed.jpldenum;
  }
  if (epheflag === SEFLG_SWIEPH) {
    const fdp = swed.fidat[SEI_FILE_PLANET];
    if (fdp.reader !== null && fdp.swephDenum !== 0) {
      return fdp.swephDenum;
    }
  }
  /* Moshier ephemeris: return DE404 */
  return 404;
}

/** Compute centre body for SE_CENTER_BODY flag */
function calcCenterBody(ipl: number, iflag: number, swed: SweData): number {
  /* Not relevant for Moshier, return 0 */
  return 0;
}

/* ================================================================
 * Part 3: appPosRest and appPosEtc* functions
 * ================================================================ */

/**
 * appPosRest: rest of apparent position computation.
 * Converts equatorial J2000 geocentric to requested coord system.
 */
function appPosRest(
  pdp: PlanData, iflag: number,
  xx: Float64Array | number[],
  xxSaved: Float64Array | number[],
  swed: SweData,
): number {
  let serr = '';
  /* For SEFLG_SPEED flag, we always compute speed (already done) */
  /* ---- If J2000 requested, skip precession/nutation ---- */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    /* precess from J2000 to equinox of date */
    swiPrecessSpeed(xx, pdp.teval, iflag, J2000_TO_J, swed);
    /* nutation */
    if ((iflag & SEFLG_NONUT) === 0) {
      swiNutate(xx, iflag, false, swed);
    }
  }
  if (iflag & SEFLG_ICRS) {
    swiIcrs2fk5(xx, iflag, true);
  }
  /* ---- To ecliptic ---- */
  /* Save equatorial position first */
  for (let i = 0; i <= 5; i++) xxSaved[i + 18] = xx[i];
  /* Convert equatorial → ecliptic */
  const oe = ((iflag & SEFLG_J2000) !== 0 || (iflag & SEFLG_ICRS) !== 0) ? swed.oec2000 : swed.oec;
  swiCoortrf2(xx, xx, oe.seps, oe.ceps);
  if (iflag & SEFLG_SPEED) {
    swiCoortrf2(xx, xx, oe.seps, oe.ceps, 3, 3);
  }
  if ((iflag & SEFLG_NONUT) === 0 && (iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    swiCoortrf2(xx, xx, swed.nut.snut, swed.nut.cnut);
    if (iflag & SEFLG_SPEED) {
      swiCoortrf2(xx, xx, swed.nut.snut, swed.nut.cnut, 3, 3);
    }
  }
  /* Save ecliptic cartesian */
  for (let i = 0; i <= 5; i++) xxSaved[i + 6] = xx[i];
  /* ---- Convert to polar if not XYZ ---- */
  /* ecliptic polar */
  swiCartpolSp(xx, xxSaved);
  /* equatorial cartesian already saved at offset 18 */
  /* equatorial polar */
  const xeq = [xxSaved[18], xxSaved[19], xxSaved[20], xxSaved[21], xxSaved[22], xxSaved[23]];
  swiCartpolSp(xeq, new Float64Array(6));
  /* Re-compute equatorial polar from the saved equatorial cartesian */
  const xeqPol = new Float64Array(6);
  swiCartpolSp(
    [xxSaved[18], xxSaved[19], xxSaved[20], xxSaved[21], xxSaved[22], xxSaved[23]],
    xeqPol,
  );
  for (let i = 0; i <= 5; i++) xxSaved[i + 12] = xeqPol[i];
  return OK;
}

/**
 * appPosEtcPlan: apparent position for major planets (not Sun, Moon, nodes/apsides).
 * Assumes equatorial J2000 geocentric position+speed is in pdp.x[0..5].
 */
function appPosEtcPlan(ipl: number, iflag: number, swed: SweData): number {
  let serr = '';
  const epheflag = iflag & SEFLG_EPHMASK;
  let ipli: number;
  if (ipl >= SE_SUN && ipl < SE_NPLANETS) {
    ipli = PNOEXT2INT[ipl];
  } else {
    ipli = ipl;
  }
  const pdp = swed.pldat[ipli];
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  const xx = new Float64Array(6);
  /* Start from stored heliocentric equatorial J2000 position */
  for (let i = 0; i <= 5; i++) xx[i] = pdp.x[i];
  /* Geocentric: subtract earth */
  if ((iflag & SEFLG_HELCTR) === 0 && (iflag & SEFLG_BARYCTR) === 0) {
    for (let i = 0; i <= 5; i++) xx[i] -= pedp.x[i];
  }
  if (iflag & SEFLG_HELCTR) {
    /* Already heliocentric: subtract sun barycentre */
    if (pdp.iflg & SEI_FLG_HELIO) {
      /* Already heliocentric, nothing to do */
    } else {
      for (let i = 0; i <= 5; i++) xx[i] -= psdp.x[i];
    }
  }
  /* Light-time correction */
  if ((iflag & SEFLG_TRUEPOS) === 0) {
    const dt = Math.sqrt(squareSum(xx)) * LIGHTTIME_AUNIT;
    if (pedp.iephe === SEFLG_JPLEPH || pedp.iephe === SEFLG_SWIEPH) {
      /* For JPL/SWIEPH: re-read sun/earth at t-dt for proper light-time */
      const t = pedp.teval - dt;
      const dx = new Float64Array(6);
      const xearth = new Float64Array(6);
      const xsun = new Float64Array(6);
      let retcLt = OK;
      if (pedp.iephe === SEFLG_JPLEPH) {
        const jplSerr: string[] = [''];
        if ((iflag & SEFLG_HELCTR) || (iflag & SEFLG_BARYCTR)) {
          retcLt = swiPleph(swed, t, J_EARTH, J_SBARY, xearth, jplSerr);
        } else {
          retcLt = swiPleph(swed, t, J_SUN, J_SBARY, xsun, jplSerr);
        }
        if (retcLt !== OK) {
          swiCloseJplFile(swed); swed.jplFileIsOpen = false;
        }
      }
      if (retcLt === OK && (pedp.iephe === SEFLG_SWIEPH)) {
        if ((iflag & SEFLG_HELCTR) || (iflag & SEFLG_BARYCTR)) {
          const rc = sweplanSwieph(swed, t, SEI_EARTH, SEI_FILE_PLANET, iflag,
            NO_SAVE, null, xearth, xsun, null);
          retcLt = rc.retc;
        } else {
          const rc = sweph(swed, t, SEI_SUNBARY, SEI_FILE_PLANET, iflag, null, NO_SAVE, xsun);
          retcLt = rc.retc;
        }
      }
      if (retcLt === OK) {
        if ((iflag & SEFLG_HELCTR) || (iflag & SEFLG_BARYCTR)) {
          for (let i = 0; i <= 5; i++) dx[i] = xearth[i];
          if (!(iflag & SEFLG_BARYCTR)) for (let i = 0; i <= 5; i++) dx[i] -= xsun[i];
        } else {
          for (let i = 0; i <= 5; i++) dx[i] = pedp.x[i] - xsun[i];
        }
        /* recompute geocentric: pdp.x - (new observer) */
        for (let i = 0; i <= 2; i++) {
          xx[i] = pdp.x[i] - dx[i];
        }
        /* keep speed from stored */
        for (let i = 3; i <= 5; i++) {
          xx[i] = pdp.x[i] - dx[i];
        }
      } else {
        /* fallback: velocity extrapolation */
        for (let i = 0; i <= 2; i++) xx[i] -= dt * xx[i + 3];
      }
    } else {
      /* Moshier: velocity extrapolation */
      for (let i = 0; i <= 2; i++) xx[i] -= dt * xx[i + 3];
    }
  }
  /* Gravitational deflection of light */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOGDEFL) === 0) {
    swiDeflectLight(xx, 0, iflag, swed);
  }
  /* Aberration */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOABERR) === 0) {
    swiAberrLight(xx, pedp.x, iflag);
  }
  /* Frame bias */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    swiBias(xx, pdp.teval, iflag, false, swed);
  }
  /* Precession, nutation, and final coordinate system */
  return appPosRest(pdp, iflag, xx, pdp.xreturn, swed);
}

/** appPosEtcPlanOsc: apparent position for osculating element bodies */
function appPosEtcPlanOsc(ipl: number, ipli: number, iflag: number, swed: SweData): number {
  const pdp = swed.pldat[ipli];
  const pedp = swed.pldat[SEI_EARTH];
  const xx = new Float64Array(6);
  for (let i = 0; i <= 5; i++) xx[i] = pdp.x[i];
  /* Geocentric */
  if ((iflag & SEFLG_HELCTR) === 0 && (iflag & SEFLG_BARYCTR) === 0) {
    for (let i = 0; i <= 5; i++) xx[i] -= pedp.x[i];
  }
  /* Light-time */
  if ((iflag & SEFLG_TRUEPOS) === 0) {
    const dt = Math.sqrt(squareSum(xx)) * LIGHTTIME_AUNIT;
    for (let i = 0; i <= 2; i++) xx[i] -= dt * xx[i + 3];
  }
  /* Deflection */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOGDEFL) === 0) {
    swiDeflectLight(xx, 0, iflag, swed);
  }
  /* Aberration */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOABERR) === 0) {
    swiAberrLight(xx, pedp.x, iflag);
  }
  /* Frame bias */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    swiBias(xx, pdp.teval, iflag, false, swed);
  }
  return appPosRest(pdp, iflag, xx, pdp.xreturn, swed);
}

/** appPosEtcSun: apparent position for the Sun */
function appPosEtcSun(iflag: number, swed: SweData): number {
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  const xx = new Float64Array(6);
  /* Sun position = -Earth geocentric (sun is at centre in heliocentric) */
  if (iflag & SEFLG_HELCTR) {
    /* Heliocentric sun: always 0 */
    xx.fill(0);
  } else if (iflag & SEFLG_BARYCTR) {
    /* Barycentric sun: SSB → Sun */
    for (let i = 0; i <= 5; i++) xx[i] = psdp.x[i];
  } else {
    /* Geocentric sun = sunBary - earth */
    for (let i = 0; i <= 5; i++) xx[i] = psdp.x[i] - pedp.x[i];
  }
  /* Light-time */
  if ((iflag & SEFLG_TRUEPOS) === 0) {
    const dt = Math.sqrt(squareSum(xx)) * LIGHTTIME_AUNIT;
    for (let i = 0; i <= 2; i++) xx[i] -= dt * xx[i + 3];
  }
  /* Gravitational deflection: not for sun itself */
  /* Aberration */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOABERR) === 0) {
    swiAberrLight(xx, pedp.x, iflag);
  }
  /* Frame bias */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    swiBias(xx, pedp.teval, iflag, false, swed);
  }
  /* Use pedp for xreturn storage for Sun */
  /* Store in a temporary PlanData-like structure: we reuse psdp */
  /* Actually, we'll store sun's xreturn in the savedat slot */
  return appPosRest(psdp, iflag, xx, psdp.xreturn, swed);
}

/** appPosEtcMoon: apparent position for the Moon */
function appPosEtcMoon(iflag: number, swed: SweData): number {
  const pdp = swed.pldat[SEI_MOON];
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  const xx = new Float64Array(6);
  const xxm = new Float64Array(6);
  const xobs = new Float64Array(6);
  const xobs2 = new Float64Array(6);
  const xe = new Float64Array(6);
  /* For Moshier, Moon is already geocentric equatorial J2000 */
  for (let i = 0; i <= 5; i++) { xx[i] = pdp.x[i]; xxm[i] = xx[i]; }
  /* to solar system barycentric */
  for (let i = 0; i <= 5; i++) xx[i] += pedp.x[i];
  /*******************************
   * observer
   *******************************/
  if (iflag & SEFLG_TOPOCTR) {
    if (swed.topd.teval !== pdp.teval || swed.topd.teval === 0) {
      swiGetObserver(pdp.teval, iflag | SEFLG_NONUT, DO_SAVE, xobs, swed);
    } else {
      for (let i = 0; i <= 5; i++) xobs[i] = swed.topd.xobs[i];
    }
    for (let i = 0; i <= 5; i++) xxm[i] -= xobs[i];
    for (let i = 0; i <= 5; i++) xobs[i] += pedp.x[i];
  } else if (iflag & SEFLG_BARYCTR) {
    for (let i = 0; i <= 5; i++) xobs[i] = 0;
    for (let i = 0; i <= 5; i++) xxm[i] += pedp.x[i];
  } else if (iflag & SEFLG_HELCTR) {
    for (let i = 0; i <= 5; i++) xobs[i] = psdp.x[i];
    for (let i = 0; i <= 5; i++) xxm[i] += pedp.x[i] - psdp.x[i];
  } else {
    for (let i = 0; i <= 5; i++) xobs[i] = pedp.x[i];
  }
  /*******************************
   * light-time
   *******************************/
  if ((iflag & SEFLG_TRUEPOS) === 0) {
    const dt = Math.sqrt(squareSum(xxm)) * LIGHTTIME_AUNIT;
    const t = pdp.teval - dt;
    let ltDone = false;
    /* JPL/SWIEPH: recompute Moon, Earth (and Sun if helio) at t-dt */
    if (pdp.iephe === SEFLG_JPLEPH) {
      const jplSerr: string[] = [''];
      const xxJpl = new Float64Array(6);
      let retcLt = swiPleph(swed, t, J_MOON, J_EARTH, xxJpl, jplSerr);
      if (retcLt === OK) {
        retcLt = swiPleph(swed, t, J_EARTH, J_SBARY, xe, jplSerr);
      }
      const xs = new Float64Array(6);
      if (retcLt === OK && (iflag & SEFLG_HELCTR)) {
        retcLt = swiPleph(swed, t, J_SUN, J_SBARY, xs, jplSerr);
      }
      if (retcLt === OK) {
        /* moon position barycentric = moon_geocentric + earth */
        for (let i = 0; i <= 5; i++) xx[i] = xxJpl[i] + xe[i];
        ltDone = true;
      } else {
        swiCloseJplFile(swed); swed.jplFileIsOpen = false;
      }
    } else if (pdp.iephe === SEFLG_SWIEPH) {
      const xxSw = new Float64Array(6);
      const xeSw = new Float64Array(6);
      const xsSw = new Float64Array(6);
      const rc = sweplanSwieph(swed, t, SEI_MOON, SEI_FILE_MOON, iflag,
        NO_SAVE, xxSw, xeSw, xsSw, null);
      if (rc.retc === OK) {
        for (let i = 0; i <= 5; i++) { xx[i] = xxSw[i] + xeSw[i]; xe[i] = xeSw[i]; }
        ltDone = true;
      }
    }
    if (!ltDone) {
      /* Moshier path: approximate light-time correction */
      for (let i = 0; i <= 2; i++) {
        xx[i] -= dt * xx[i + 3];
        xe[i] = pedp.x[i] - dt * pedp.x[i + 3];
        xe[i + 3] = pedp.x[i + 3];
      }
    }
    if (iflag & SEFLG_TOPOCTR) {
      swiGetObserver(t, iflag | SEFLG_NONUT, NO_SAVE, xobs2, swed);
      for (let i = 0; i <= 5; i++) xobs2[i] += xe[i];
    } else if (iflag & SEFLG_BARYCTR) {
      for (let i = 0; i <= 5; i++) xobs2[i] = 0;
    } else if (iflag & SEFLG_HELCTR) {
      for (let i = 0; i <= 5; i++) xobs2[i] = 0;
    } else {
      for (let i = 0; i <= 5; i++) xobs2[i] = xe[i];
    }
  }
  /* to correct center: subtract observer */
  for (let i = 0; i <= 5; i++) xx[i] -= xobs[i];
  /* Aberration */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOABERR) === 0) {
    swiAberrLight(xx, xobs, iflag);
    if (iflag & SEFLG_SPEED) {
      for (let i = 3; i <= 5; i++) xx[i] += xobs[i] - xobs2[i];
    }
  }
  /* if !speedflag, speed = 0 */
  if (!(iflag & SEFLG_SPEED)) {
    for (let i = 3; i <= 5; i++) xx[i] = 0;
  }
  /* Frame bias */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    swiBias(xx, pdp.teval, iflag, false, swed);
  }
  return appPosRest(pdp, iflag, xx, pdp.xreturn, swed);
}

/** appPosEtcSbar: apparent position for solar system barycentre */
function appPosEtcSbar(iflag: number, swed: SweData): number {
  /* SSB from geocentric perspective = -Earth */
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  const xx = new Float64Array(6);
  for (let i = 0; i <= 5; i++) xx[i] = -pedp.x[i];
  return appPosRest(psdp, iflag, xx, psdp.xreturn, swed);
}

/** appPosEtcMean: apparent position for mean node/apogee */
function appPosEtcMean(ipl: number, iflag: number, swed: SweData): number {
  let ipli: number;
  if (ipl === SE_MEAN_NODE) ipli = SEI_MEAN_NODE;
  else if (ipl === SE_MEAN_APOG) ipli = SEI_MEAN_APOG;
  else if (ipl === SE_INTP_APOG) ipli = SEI_INTP_APOG;
  else if (ipl === SE_INTP_PERG) ipli = SEI_INTP_PERG;
  else ipli = SEI_MEAN_NODE;
  const pdp = swed.nddat[ipli];
  const xx = new Float64Array(6);
  for (let i = 0; i <= 5; i++) xx[i] = pdp.x[i];
  /* These are ecliptic of date; convert to equatorial J2000 */
  /* First to cartesian */
  swiPolcart(xx, xx);
  swiPolcartSp(xx, xx);
  /* Ecliptic of date → equatorial of date */
  swiCoortrf(xx, xx, -swed.oec.eps);
  swiCoortrf(xx, xx, -swed.oec.eps, 3, 3);
  /* If not J2000 and not NONUT, add nutation (backward: true equinox → mean) */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_NONUT) === 0) {
    swiNutate(xx, iflag, true, swed);
  }
  /* Precess to J2000 */
  if ((iflag & SEFLG_J2000) === 0) {
    swiPrecessSpeed(xx, pdp.teval, iflag, J_TO_J2000, swed);
  }
  /* Now in equatorial J2000; frame bias */
  if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
    swiBias(xx, pdp.teval, iflag, true, swed);
  }
  /* Now do the forward part: J2000 → requested system */
  /* But wait, appPosRest expects equatorial J2000 as input */
  return appPosRest(pdp, iflag, xx, pdp.xreturn, swed);
}

/* ================================================================
 * Part 4: mainPlanet, mainPlanetBary, sweMoonInt, swePlanInt
 * ================================================================ */

/** Compute a main planet (SWIEPH with MOSEPH fallback) */
function mainPlanet(
  tjd: number, ipli: number, epheflag: number, iflag: number,
  swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  let retc: number;
  /* Ensure oec2000 is computed */
  swiCheckEcliptic(J2000, iflag, swed);
  let useEphe = epheflag;
  /* ---- JPLEPH path ---- */
  if (useEphe === SEFLG_JPLEPH) {
    const jplSerr: string[] = [''];
    const pedp = swed.pldat[SEI_EARTH];
    const psdp = swed.pldat[SEI_SUNBARY];
    const pdp = swed.pldat[ipli];
    const ictr = (ipli === SEI_MOON) ? J_EARTH : J_SBARY;
    /* earth (barycentric) */
    if (tjd !== pedp.teval || tjd === 0) {
      const xpe = new Float64Array(6);
      retc = swiPleph(swed, tjd, J_EARTH, J_SBARY, xpe, jplSerr);
      if (retc !== OK) {
        swiCloseJplFile(swed); swed.jplFileIsOpen = false;
        if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \nusing Swiss Eph; '; useEphe = SEFLG_SWIEPH; }
        else return { retc, serr: jplSerr[0] };
      } else {
        for (let i = 0; i <= 5; i++) pedp.x[i] = xpe[i];
        pedp.teval = tjd; pedp.xflgs = -1; pedp.iephe = SEFLG_JPLEPH;
      }
    }
    if (useEphe === SEFLG_JPLEPH) {
      /* sun (barycentric) */
      if (tjd !== psdp.teval || tjd === 0) {
        const xps = new Float64Array(6);
        retc = swiPleph(swed, tjd, J_SUN, J_SBARY, xps, jplSerr);
        if (retc !== OK) {
          swiCloseJplFile(swed); swed.jplFileIsOpen = false;
          if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \nusing Swiss Eph; '; useEphe = SEFLG_SWIEPH; }
          else return { retc, serr: jplSerr[0] };
        } else {
          for (let i = 0; i <= 5; i++) psdp.x[i] = xps[i];
          psdp.teval = tjd; psdp.xflgs = -1; psdp.iephe = SEFLG_JPLEPH;
        }
      }
    }
    if (useEphe === SEFLG_JPLEPH) {
      if (ipli === SEI_EARTH) {
        /* already got earth above */
      } else if (ipli === SEI_SUNBARY) {
        /* already got sun above */
      } else {
        if (tjd !== pdp.teval || pdp.iephe !== SEFLG_JPLEPH) {
          const xp = new Float64Array(6);
          retc = swiPleph(swed, tjd, PNOINT2JPL[ipli], ictr, xp, jplSerr);
          if (retc !== OK) {
            swiCloseJplFile(swed); swed.jplFileIsOpen = false;
            if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \nusing Swiss Eph; '; useEphe = SEFLG_SWIEPH; }
            else return { retc, serr: jplSerr[0] };
          } else {
            for (let i = 0; i <= 5; i++) pdp.x[i] = xp[i];
            pdp.teval = tjd; pdp.xflgs = -1; pdp.iephe = SEFLG_JPLEPH;
          }
        }
      }
    }
    if (useEphe === SEFLG_JPLEPH) return { retc: OK, serr };
    /* fall through to SWIEPH on NOT_AVAILABLE */
  }
  /* ---- SWIEPH path ---- */
  if (useEphe === SEFLG_SWIEPH) {
    const rc = sweplanSwieph(swed, tjd, ipli, SEI_FILE_PLANET, iflag,
      DO_SAVE, null, null, null, null);
    if (rc.retc === OK) {
      /* geocentric, lighttime etc. done by caller */
      return { retc: OK, serr: serr + rc.serr };
    }
    if (rc.retc === ERR) return rc;
    /* NOT_AVAILABLE: fall back to Moshier */
    serr = serr + rc.serr + ' \nusing Moshier eph.; ';
    useEphe = SEFLG_MOSEPH;
  }
  /* ---- MOSEPH path ---- */
  retc = swiMoshplan(swed, tjd, ipli, DO_SAVE, null, null);
  if (retc === ERR) {
    return { retc: ERR, serr: serr + `Moshier ephemeris error for planet ${ipli}` };
  }
  /* For Moshier: sunBary = 0 (heliocentric frame) */
  const psdpM = swed.pldat[SEI_SUNBARY];
  for (let i = 0; i <= 5; i++) psdpM.x[i] = 0;
  psdpM.teval = tjd;
  psdpM.iephe = SEFLG_MOSEPH;
  return { retc: OK, serr };
}

/** Compute a main planet in barycentric coords */
function mainPlanetBary(
  tjd: number, ipli: number, epheflag: number, iflag: number,
  doSave: boolean,
  xp: Float64Array | null, xe: Float64Array | null,
  xs: Float64Array | null, xm: Float64Array | null,
  swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  let retc: number;
  let useEphe = epheflag;
  swiCheckEcliptic(J2000, iflag, swed);
  /* ---- JPLEPH path ---- */
  if (useEphe === SEFLG_JPLEPH) {
    const jplSerr: string[] = [''];
    const pedp = swed.pldat[SEI_EARTH];
    const psdp = swed.pldat[SEI_SUNBARY];
    const pdp = swed.pldat[ipli];
    const ictr = (ipli === SEI_MOON) ? J_EARTH : J_SBARY;
    /* earth */
    const xpe = new Float64Array(6);
    retc = swiPleph(swed, tjd, J_EARTH, J_SBARY, xpe, jplSerr);
    if (retc !== OK) {
      swiCloseJplFile(swed); swed.jplFileIsOpen = false;
      if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \nusing Swiss Eph; '; useEphe = SEFLG_SWIEPH; }
      else return { retc, serr: jplSerr[0] };
    }
    if (useEphe === SEFLG_JPLEPH) {
      if (doSave) { for (let i = 0; i <= 5; i++) pedp.x[i] = xpe[i]; pedp.teval = tjd; pedp.iephe = SEFLG_JPLEPH; }
      if (xe !== null) for (let i = 0; i <= 5; i++) xe[i] = xpe[i];
      /* sun */
      const xps = new Float64Array(6);
      retc = swiPleph(swed, tjd, J_SUN, J_SBARY, xps, jplSerr);
      if (retc !== OK) {
        swiCloseJplFile(swed); swed.jplFileIsOpen = false;
        if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \nusing Swiss Eph; '; useEphe = SEFLG_SWIEPH; }
        else return { retc, serr: jplSerr[0] };
      }
    }
    if (useEphe === SEFLG_JPLEPH) {
      const xps = new Float64Array(6);
      swiPleph(swed, tjd, J_SUN, J_SBARY, xps, jplSerr);
      if (doSave) { for (let i = 0; i <= 5; i++) psdp.x[i] = xps[i]; psdp.teval = tjd; psdp.iephe = SEFLG_JPLEPH; }
      if (xs !== null) for (let i = 0; i <= 5; i++) xs[i] = xps[i];
      /* target planet */
      if (ipli !== SEI_EARTH && ipli !== SEI_SUNBARY) {
        const xpp = new Float64Array(6);
        retc = swiPleph(swed, tjd, PNOINT2JPL[ipli], ictr, xpp, jplSerr);
        if (retc !== OK) {
          swiCloseJplFile(swed); swed.jplFileIsOpen = false;
          if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \nusing Swiss Eph; '; useEphe = SEFLG_SWIEPH; }
          else return { retc, serr: jplSerr[0] };
        } else {
          if (doSave) { for (let i = 0; i <= 5; i++) pdp.x[i] = xpp[i]; pdp.teval = tjd; pdp.iephe = SEFLG_JPLEPH; }
          if (xp !== null) for (let i = 0; i <= 5; i++) xp[i] = xpp[i];
        }
      } else if (ipli === SEI_EARTH) {
        if (xp !== null) for (let i = 0; i <= 5; i++) xp[i] = (xe !== null ? xe[i] : pedp.x[i]);
      }
      if (useEphe === SEFLG_JPLEPH) return { retc: OK, serr };
    }
  }
  /* ---- SWIEPH path ---- */
  if (useEphe === SEFLG_SWIEPH) {
    const rc = sweplanSwieph(swed, tjd, ipli, SEI_FILE_PLANET, iflag,
      doSave, xp, xe, xs, xm);
    if (rc.retc === OK) return { retc: OK, serr: serr + rc.serr };
    if (rc.retc === ERR || rc.retc === BEYOND_EPH_LIMITS) return rc;
    /* NOT_AVAILABLE: fall back to Moshier */
    serr = serr + rc.serr + ' \nusing Moshier eph.; ';
    useEphe = SEFLG_MOSEPH;
  }
  /* ---- MOSEPH path ---- */
  retc = swiMoshplan(swed, tjd, ipli, doSave, xp, xe);
  if (retc === ERR) {
    return { retc: ERR, serr: serr + `Moshier ephemeris error for planet ${ipli}` };
  }
  if (xs !== null) for (let i = 0; i <= 5; i++) xs[i] = 0;
  return { retc: OK, serr };
}

/** Compute Moon (SWIEPH with MOSEPH fallback) */
function sweMoonInt(
  tjd: number, iflag: number, swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  swiCheckEcliptic(J2000, iflag, swed);
  let epheflag = iflag & SEFLG_EPHMASK;
  /* ---- JPLEPH path ---- */
  if (epheflag === SEFLG_JPLEPH) {
    const jplSerr: string[] = [''];
    const pdpMoon = swed.pldat[SEI_MOON];
    const pedp = swed.pldat[SEI_EARTH];
    const psdp = swed.pldat[SEI_SUNBARY];
    /* Moon relative to Earth */
    const xxm = new Float64Array(6);
    let retc = swiPleph(swed, tjd, J_MOON, J_EARTH, xxm, jplSerr);
    if (retc !== OK) {
      swiCloseJplFile(swed); swed.jplFileIsOpen = false;
      if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \ntrying Swiss Eph; '; epheflag = SEFLG_SWIEPH; }
      else return { retc, serr: jplSerr[0] };
    }
    if (epheflag === SEFLG_JPLEPH) {
      /* Earth barycentric */
      const xe = new Float64Array(6);
      retc = swiPleph(swed, tjd, J_EARTH, J_SBARY, xe, jplSerr);
      if (retc !== OK) {
        swiCloseJplFile(swed); swed.jplFileIsOpen = false;
        if (retc === NOT_AVAILABLE) { serr = jplSerr[0] + ' \ntrying Swiss Eph; '; epheflag = SEFLG_SWIEPH; }
        else return { retc, serr: jplSerr[0] };
      } else {
        for (let i = 0; i <= 5; i++) pedp.x[i] = xe[i];
        pedp.teval = tjd; pedp.xflgs = -1; pedp.iephe = SEFLG_JPLEPH;
        /* Moon stored geocentric like Moshier */
        for (let i = 0; i <= 5; i++) pdpMoon.x[i] = xxm[i];
        pdpMoon.teval = tjd; pdpMoon.xflgs = -1; pdpMoon.iephe = SEFLG_JPLEPH;
        /* Sun */
        const xs = new Float64Array(6);
        retc = swiPleph(swed, tjd, J_SUN, J_SBARY, xs, jplSerr);
        if (retc === OK) {
          for (let i = 0; i <= 5; i++) psdp.x[i] = xs[i];
          psdp.teval = tjd; psdp.iephe = SEFLG_JPLEPH;
        }
        return { retc: OK, serr };
      }
    }
    /* fall through to SWIEPH */
  }
  /* ---- SWIEPH path ---- */
  if (epheflag === SEFLG_SWIEPH) {
    const rc = swemoonSwieph(swed, tjd, iflag, DO_SAVE, null);
    if (rc.retc === OK) return { retc: OK, serr: serr + rc.serr };
    if (rc.retc === ERR) return rc;
    /* NOT_AVAILABLE: fall back to Moshier */
    serr = serr + rc.serr + ' \nusing Moshier eph. for moon; ';
  }
  /* ---- MOSEPH path ---- */
  const serrArr: string[] = [''];
  const retc = swiMoshmoon(swed, tjd, DO_SAVE, null, serrArr);
  if (retc === ERR) {
    return { retc: ERR, serr: serr + (serrArr[0] || 'Moshier moon error') };
  }
  return { retc: OK, serr };
}

/**
 * swePlanInt: compute planet positions (internal).
 * This is the main dispatch function (SWIEPH with MOSEPH fallback).
 */
function swePlanInt(
  tjd: number, ipl: number, ipli: number, iflag: number,
  doSave: boolean,
  xpret: Float64Array | null,
  xeret: Float64Array | null,
  xsret: Float64Array | null,
  swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  const epheflag = iflag & SEFLG_EPHMASK;
  /* ---- SWIEPH path ---- */
  if (epheflag === SEFLG_SWIEPH) {
    const rc = sweplanSwieph(swed, tjd, ipli, SEI_FILE_PLANET, iflag,
      doSave, xpret, xeret, xsret, null);
    if (rc.retc === OK) return rc;
    if (rc.retc === ERR) return rc;
    /* NOT_AVAILABLE: fall back to Moshier */
    serr = rc.serr + ' \nusing Moshier eph.; ';
  }
  /* ---- MOSEPH path ---- */
  swiCheckEcliptic(J2000, iflag, swed);
  const retc = swiMoshplan(swed, tjd, ipli, doSave, xpret, xeret);
  if (retc === ERR) {
    return { retc: ERR, serr: serr + `Moshier ephemeris error for planet ${ipli}` };
  }
  /* sunbary = 0 for Moshier */
  if (xsret !== null) {
    xsret.fill(0);
  }
  const psdp = swed.pldat[SEI_SUNBARY];
  for (let i = 0; i <= 5; i++) psdp.x[i] = 0;
  psdp.teval = tjd;
  psdp.iephe = SEFLG_MOSEPH;
  return { retc: OK, serr };
}

/* ================================================================
 * Part 5: sweCalc, sweCalcUt, sweCalcInt, lunarOscElem, etc.
 * ================================================================ */

/** Compute osculating elements for Moon nodes/apsides */
function lunarOscElem(
  tjd: number, ipl: number, iflag: number, swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  const ipli = SEI_OSCU_APOG; /* for both true node and osc apogee */
  const pdp = (ipl === SE_TRUE_NODE) ? swed.nddat[SEI_TRUE_NODE] : swed.nddat[SEI_OSCU_APOG];
  /* We need the Moon first */
  const moonRes = sweMoonInt(tjd, iflag, swed);
  if (moonRes.retc === ERR) return moonRes;
  const pdpMoon = swed.pldat[SEI_MOON];
  /* For true node: compute osculating orbital elements from moon position+speed */
  /* Get moon geocentric position */
  const pedp = swed.pldat[SEI_EARTH];
  const xm = new Float64Array(6);
  for (let i = 0; i <= 5; i++) xm[i] = pdpMoon.x[i] - pedp.x[i];
  /* Convert to ecliptic of date */
  swiCoortrf2(xm, xm, swed.oec.seps, swed.oec.ceps);
  swiCoortrf2(xm, xm, swed.oec.seps, swed.oec.ceps, 3, 3);
  /* Compute osculating elements */
  swiCartpol(xm, xm);
  /* Node longitude (simplified: ascending node ≈ lon - 180 when lat=0 crossing) */
  /* This is a significant simplification. For better accuracy, we'd need
     the full orbital element computation. For now, use mean elements as fallback. */
  if (ipl === SE_TRUE_NODE) {
    /* Compute true node using 3 positions and interpolation */
    const speed_intv = NODE_CALC_INTV_MOSH;
    const xpos = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
    const xnorm = [0, 0, 0, 0, 0, 0];
    const xx = [0, 0, 0, 0, 0, 0];
    /* Compute moon at 3 times */
    for (let ipos = 0; ipos < 3; ipos++) {
      const t = tjd + (ipos - 1) * speed_intv;
      if (ipos === 1) {
        /* Use already computed moon */
        for (let i = 0; i <= 5; i++) xpos[ipos][i] = pdpMoon.x[i] - pedp.x[i];
      } else {
        /* Compute moon at offset time */
        const xxm = new Float64Array(6);
        swiMoshmoon(swed, t, NO_SAVE, xxm);
        /* Also need earth at that time */
        const xxe = new Float64Array(6);
        swiMoshplan(swed, t, SEI_EARTH, NO_SAVE, null, xxe);
        for (let i = 0; i <= 5; i++) xpos[ipos][i] = xxm[i] - xxe[i];
      }
    }
    /* Compute the ascending node from the cross product of position vectors */
    /* Cross product of positions at t-dt and t+dt gives normal to orbital plane */
    swiCrossProd(xpos[0], xpos[2], new Float64Array(6));
    /* Node = cross product of orbital plane normal with ecliptic normal */
    /* The ecliptic normal in equatorial J2000 coords is (0, -sin(eps), cos(eps)) */
    const eclNorm = [0, -swed.oec2000.seps, swed.oec2000.ceps];
    const orbNorm = new Float64Array(6);
    swiCrossProd(xpos[0], xpos[2], orbNorm);
    /* Node direction = eclNorm x orbNorm */
    const nodeVec = new Float64Array(6);
    swiCrossProd(
      new Float64Array([eclNorm[0], eclNorm[1], eclNorm[2]]),
      orbNorm,
      nodeVec,
    );
    const rNode = Math.sqrt(squareSum(nodeVec));
    if (rNode > 0) {
      for (let i = 0; i <= 2; i++) nodeVec[i] /= rNode;
    }
    /* Convert to polar */
    swiCartpol(nodeVec, nodeVec);
    /* Set distance to mean distance */
    const ndp = swed.nddat[SEI_TRUE_NODE];
    ndp.x[0] = nodeVec[0];
    ndp.x[1] = 0;
    ndp.x[2] = pdpMoon.x[2]; /* approximate distance */
    /* Convert back to cartesian equatorial J2000 for storage */
    swiPolcart(ndp.x, ndp.x);
    /* Speed: difference of two nodes */
    const xpos2 = [new Float64Array(6), new Float64Array(6), new Float64Array(6)];
    /* Simplified: compute speed from finite difference */
    ndp.x[3] = 0;
    ndp.x[4] = 0;
    ndp.x[5] = 0;
    ndp.teval = tjd;
    ndp.iephe = SEFLG_MOSEPH;
    return { retc: OK, serr };
  }
  /* Osculating apogee */
  if (ipl === SE_OSCU_APOG) {
    /* Simplified: use mean apogee as approximation */
    const pol = new Float64Array(6);
    const serrArr: string[] = [''];
    const retc = swiMeanApog(tjd, pol, serrArr);
    if (retc === ERR) return { retc: ERR, serr: serrArr[0] };
    const ndp = swed.nddat[SEI_OSCU_APOG];
    /* pol is in ecliptic of date, convert to equatorial J2000 */
    swiPolcart(pol, pol);
    swiCoortrf(pol, pol, -swed.oec.eps);
    swiPrecess(pol, tjd, iflag, J_TO_J2000, swed);
    for (let i = 0; i <= 2; i++) ndp.x[i] = pol[i];
    ndp.x[3] = 0;
    ndp.x[4] = 0;
    ndp.x[5] = 0;
    ndp.teval = tjd;
    ndp.iephe = SEFLG_MOSEPH;
    return { retc: OK, serr };
  }
  return { retc: OK, serr };
}

/** Plan for osculating elements (fictitious planets) */
function swiPlanForOscElem(
  iflag: number, tjd: number, ipl: number, swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  const iplFict = ipl - SE_FICT_OFFSET;
  const ipli = SEI_ANYBODY;
  const pdp = swed.pldat[ipli];
  /* Need Earth and Sun */
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  /* Compute Earth if needed */
  if (pedp.teval !== tjd) {
    const res = mainPlanet(tjd, SEI_EARTH, SEFLG_MOSEPH, iflag, swed);
    if (res.retc === ERR) return res;
  }
  /* Compute fictitious planet */
  const xp = pdp.x;
  const retc = swiOscElPlan(swed, tjd, xp, iplFict, ipli, pedp.x, psdp.x);
  if (retc === ERR) {
    serr = `error computing fictitious planet ${ipl}`;
    return { retc: ERR, serr };
  }
  pdp.teval = tjd;
  pdp.iephe = SEFLG_MOSEPH;
  return { retc: OK, serr };
}

/** Compute interpolated apsides (Lilith, Priapus) */
function intpApsides(
  tjd: number, ipl: number, iflag: number, swed: SweData,
): { retc: number; serr: string } {
  let serr = '';
  const ipli = (ipl === SE_INTP_APOG) ? SEI_INTP_APOG : SEI_INTP_PERG;
  const ndp = swed.nddat[ipli];
  const pol = new Float64Array(6);
  swiIntpApsides(tjd, pol, ipli);
  /* pol is in ecliptic of date (polar) */
  /* Convert to equatorial J2000 cartesian */
  swiPolcart(pol, pol);
  swiCoortrf(pol, pol, -swed.oec.eps);
  swiPrecess(pol, tjd, iflag, J_TO_J2000, swed);
  for (let i = 0; i <= 2; i++) ndp.x[i] = pol[i];
  /* Speed: compute at t +/- dt */
  const dt = MEAN_NODE_SPEED_INTV;
  const pol2 = new Float64Array(6);
  swiIntpApsides(tjd - dt, pol2, ipli);
  swiPolcart(pol2, pol2);
  swiCoortrf(pol2, pol2, -swed.oec.eps);
  swiPrecess(pol2, tjd - dt, iflag, J_TO_J2000, swed);
  for (let i = 0; i <= 2; i++) {
    ndp.x[i + 3] = (ndp.x[i] - pol2[i]) / dt;
  }
  ndp.teval = tjd;
  ndp.iephe = SEFLG_MOSEPH;
  return { retc: OK, serr };
}

/* ================================================================
 * sweCalcInt: the internal calc dispatcher
 * ================================================================ */
function sweCalcInt(
  swed: SweData, tjd: number, ipl: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string } {
  const xx = new Float64Array(24);
  let serr = '';
  let retc = OK;
  let iflgRet = iflag;
  swiInitSwedIfStart(swed);
  /* Check ecliptic/nutation */
  const epheflag = iflag & SEFLG_EPHMASK;
  const tjdEt = tjd;
  swiCheckEcliptic(tjdEt, iflag, swed);
  if ((iflag & SEFLG_NONUT) === 0) {
    swiCheckNutation(tjdEt, iflag, swed);
  }
  /* ---- Ecliptic & Nutation special case ---- */
  /* Returns degrees directly; sweCalc must skip conversion for SE_ECL_NUT */
  if (ipl === SE_ECL_NUT) {
    xx[0] = swed.oec.eps * RADTODEG;
    xx[1] = swed.oec2000.eps * RADTODEG;
    if (swed.nut.tnut === tjdEt) {
      xx[2] = swed.nut.nutlo[0] * RADTODEG;
      xx[3] = swed.nut.nutlo[1] * RADTODEG;
    }
    xx[4] = 0; xx[5] = 0;
    return { flags: iflag, xx, serr };
  }
  /* ---- Sun ---- */
  if (ipl === SE_SUN) {
    /* Compute Earth (which gives us Sun) */
    const res = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (res.retc === ERR) {
      return { flags: ERR, xx, serr: res.serr };
    }
    retc = appPosEtcSun(iflag, swed);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: 'error in appPosEtcSun' };
    }
    const psdp = swed.pldat[SEI_SUNBARY];
    for (let i = 0; i <= 23; i++) xx[i] = psdp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Moon ---- */
  if (ipl === SE_MOON) {
    const res = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (res.retc === ERR) {
      return { flags: ERR, xx, serr: res.serr };
    }
    const moonRes = sweMoonInt(tjdEt, iflag, swed);
    if (moonRes.retc === ERR) {
      return { flags: ERR, xx, serr: moonRes.serr };
    }
    retc = appPosEtcMoon(iflag, swed);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: 'error in appPosEtcMoon' };
    }
    const pdp = swed.pldat[SEI_MOON];
    for (let i = 0; i <= 23; i++) xx[i] = pdp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Earth ---- */
  if (ipl === SE_EARTH) {
    const res = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (res.retc === ERR) {
      return { flags: ERR, xx, serr: res.serr };
    }
    /* Geocentric Earth is always 0,0,0 */
    if ((iflag & SEFLG_HELCTR) !== 0 || (iflag & SEFLG_BARYCTR) !== 0) {
      const pedp = swed.pldat[SEI_EARTH];
      /* pedp.x is equatorial J2000 heliocentric cartesian + speed */
      for (let i = 0; i <= 5; i++) xx[i] = pedp.x[i];
      /* Frame bias (only if not J2000/ICRS) */
      if ((iflag & SEFLG_J2000) === 0 && (iflag & SEFLG_ICRS) === 0) {
        swiBias(xx, tjdEt, iflag, false, swed);
      }
      /* Fill all 24 xreturn slots (precession, nutation, eq→ecl, polar) */
      appPosRest(pedp, iflag, xx, xx, swed);
    } else {
      /* Geocentric earth = 0 */
      xx.fill(0);
    }
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Mercury..Pluto (major planets) ---- */
  if (ipl >= SE_MERCURY && ipl <= SE_PLUTO) {
    const ipli = PNOEXT2INT[ipl];
    /* Need Earth first */
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    /* Now the planet */
    const planRes = swePlanInt(tjdEt, ipl, ipli, iflag, DO_SAVE, null, null, null, swed);
    if (planRes.retc === ERR || planRes.retc === NOT_AVAILABLE) {
      return { flags: ERR, xx, serr: planRes.serr };
    }
    retc = appPosEtcPlan(ipl, iflag, swed);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: 'error in appPosEtcPlan' };
    }
    const pdp = swed.pldat[ipli];
    for (let i = 0; i <= 23; i++) xx[i] = pdp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Chiron, Pholus, Ceres, Pallas, Juno, Vesta ---- */
  if (ipl >= SE_CHIRON && ipl <= SE_VESTA) {
    const ipli = PNOEXT2INT[ipl];
    /* Need Earth first */
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const planRes = swePlanInt(tjdEt, ipl, ipli, iflag, DO_SAVE, null, null, null, swed);
    if (planRes.retc === ERR || planRes.retc === NOT_AVAILABLE) {
      return { flags: ERR, xx, serr: planRes.serr };
    }
    retc = appPosEtcPlan(ipl, iflag, swed);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: 'error in appPosEtcPlan' };
    }
    const pdp = swed.pldat[ipli];
    for (let i = 0; i <= 23; i++) xx[i] = pdp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Mean Node ---- */
  if (ipl === SE_MEAN_NODE) {
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const ndp = swed.nddat[SEI_MEAN_NODE];
    const pol = new Float64Array(6);
    const serrArr: string[] = [''];
    retc = swiMeanNode(tjdEt, pol, serrArr);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: serrArr[0] };
    }
    /* pol is ecliptic of date polar */
    /* Compute speed: compute at t - dt */
    const dt = MEAN_NODE_SPEED_INTV;
    const pol2 = new Float64Array(6);
    swiMeanNode(tjdEt - dt, pol2);
    pol[3] = sweDifrad2n(pol[0], pol2[0]) / dt;
    pol[4] = (pol[1] - pol2[1]) / dt;
    pol[5] = (pol[2] - pol2[2]) / dt;
    /* Convert to equatorial J2000 cartesian */
    const xEcl = new Float64Array(6);
    swiPolcartSp(pol, xEcl);
    /* Ecliptic of date → equatorial of date */
    swiCoortrf(xEcl, xEcl, -swed.oec.eps);
    swiCoortrf(xEcl, xEcl, -swed.oec.eps, 3, 3);
    /* Nutation: true → mean (if not NONUT) */
    if ((iflag & SEFLG_NONUT) === 0) {
      swiNutate(xEcl, iflag, true, swed);
    }
    /* Precess to J2000 */
    swiPrecessSpeed(xEcl, tjdEt, iflag, J_TO_J2000, swed);
    /* Store */
    for (let i = 0; i <= 5; i++) ndp.x[i] = xEcl[i];
    ndp.teval = tjdEt;
    ndp.iephe = SEFLG_MOSEPH;
    /* Now apply forward transformations through appPosRest */
    const xxTemp = new Float64Array(6);
    for (let i = 0; i <= 5; i++) xxTemp[i] = ndp.x[i];
    retc = appPosRest(ndp, iflag, xxTemp, ndp.xreturn, swed);
    for (let i = 0; i <= 23; i++) xx[i] = ndp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- True Node ---- */
  if (ipl === SE_TRUE_NODE) {
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const moonRes2 = sweMoonInt(tjdEt, iflag, swed);
    if (moonRes2.retc === ERR) {
      return { flags: ERR, xx, serr: moonRes2.serr };
    }
    const oscRes = lunarOscElem(tjdEt, ipl, iflag, swed);
    if (oscRes.retc === ERR) {
      return { flags: ERR, xx, serr: oscRes.serr };
    }
    const ndp = swed.nddat[SEI_TRUE_NODE];
    const xxTemp = new Float64Array(6);
    for (let i = 0; i <= 5; i++) xxTemp[i] = ndp.x[i];
    retc = appPosRest(ndp, iflag, xxTemp, ndp.xreturn, swed);
    for (let i = 0; i <= 23; i++) xx[i] = ndp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Mean Apogee (Lilith) ---- */
  if (ipl === SE_MEAN_APOG) {
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const ndp = swed.nddat[SEI_MEAN_APOG];
    const pol = new Float64Array(6);
    const serrArr: string[] = [''];
    retc = swiMeanApog(tjdEt, pol, serrArr);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: serrArr[0] };
    }
    /* Speed */
    const dt = MEAN_NODE_SPEED_INTV;
    const pol2 = new Float64Array(6);
    swiMeanApog(tjdEt - dt, pol2);
    pol[3] = sweDifrad2n(pol[0], pol2[0]) / dt;
    pol[4] = (pol[1] - pol2[1]) / dt;
    pol[5] = (pol[2] - pol2[2]) / dt;
    /* Convert to equatorial J2000 cartesian */
    const xEcl = new Float64Array(6);
    swiPolcartSp(pol, xEcl);
    swiCoortrf(xEcl, xEcl, -swed.oec.eps);
    swiCoortrf(xEcl, xEcl, -swed.oec.eps, 3, 3);
    if ((iflag & SEFLG_NONUT) === 0) {
      swiNutate(xEcl, iflag, true, swed);
    }
    swiPrecessSpeed(xEcl, tjdEt, iflag, J_TO_J2000, swed);
    for (let i = 0; i <= 5; i++) ndp.x[i] = xEcl[i];
    ndp.teval = tjdEt;
    ndp.iephe = SEFLG_MOSEPH;
    const xxTemp = new Float64Array(6);
    for (let i = 0; i <= 5; i++) xxTemp[i] = ndp.x[i];
    retc = appPosRest(ndp, iflag, xxTemp, ndp.xreturn, swed);
    for (let i = 0; i <= 23; i++) xx[i] = ndp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Osculating Apogee ---- */
  if (ipl === SE_OSCU_APOG) {
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const moonRes3 = sweMoonInt(tjdEt, iflag, swed);
    if (moonRes3.retc === ERR) {
      return { flags: ERR, xx, serr: moonRes3.serr };
    }
    const oscRes = lunarOscElem(tjdEt, ipl, iflag, swed);
    if (oscRes.retc === ERR) {
      return { flags: ERR, xx, serr: oscRes.serr };
    }
    const ndp = swed.nddat[SEI_OSCU_APOG];
    const xxTemp = new Float64Array(6);
    for (let i = 0; i <= 5; i++) xxTemp[i] = ndp.x[i];
    retc = appPosRest(ndp, iflag, xxTemp, ndp.xreturn, swed);
    for (let i = 0; i <= 23; i++) xx[i] = ndp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Interpolated Apogee (Lilith) / Perigee ---- */
  if (ipl === SE_INTP_APOG || ipl === SE_INTP_PERG) {
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const intpRes = intpApsides(tjdEt, ipl, iflag, swed);
    if (intpRes.retc === ERR) {
      return { flags: ERR, xx, serr: intpRes.serr };
    }
    const ipli2 = (ipl === SE_INTP_APOG) ? SEI_INTP_APOG : SEI_INTP_PERG;
    const ndp = swed.nddat[ipli2];
    const xxTemp = new Float64Array(6);
    for (let i = 0; i <= 5; i++) xxTemp[i] = ndp.x[i];
    retc = appPosRest(ndp, iflag, xxTemp, ndp.xreturn, swed);
    for (let i = 0; i <= 23; i++) xx[i] = ndp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Fictitious planets ---- */
  if (ipl >= SE_FICT_OFFSET && ipl <= SE_FICT_MAX) {
    const earthRes = mainPlanet(tjdEt, SEI_EARTH, epheflag, iflag, swed);
    if (earthRes.retc === ERR) {
      return { flags: ERR, xx, serr: earthRes.serr };
    }
    const fictRes = swiPlanForOscElem(iflag, tjdEt, ipl, swed);
    if (fictRes.retc === ERR) {
      return { flags: ERR, xx, serr: fictRes.serr };
    }
    const pdp = swed.pldat[SEI_ANYBODY];
    retc = appPosEtcPlanOsc(ipl, SEI_ANYBODY, iflag, swed);
    if (retc === ERR) {
      return { flags: ERR, xx, serr: 'error in appPosEtcPlanOsc' };
    }
    for (let i = 0; i <= 23; i++) xx[i] = pdp.xreturn[i];
    return { flags: iflgRet, xx, serr };
  }
  /* ---- Asteroids (> SE_AST_OFFSET) ---- */
  if (ipl >= SE_AST_OFFSET) {
    serr = `Asteroid ${ipl - SE_AST_OFFSET} not available in Moshier ephemeris`;
    return { flags: ERR, xx, serr };
  }
  serr = `unknown planet number ${ipl}`;
  return { flags: ERR, xx, serr };
}

/* ================================================================
 * sweCalc: main public calculation function (ET input)
 * ================================================================ */
export function sweCalc(
  swed: SweData, tjdEt: number, ipl: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string } {
  swiInitSwedIfStart(swed);
  iflag = plausIflag(iflag, ipl, tjdEt, swed);
  const result = sweCalcInt(swed, tjdEt, ipl, iflag);
  /* Build the 6-element return array from the 24-element xreturn */
  const xxOut = new Float64Array(6);
  if (result.flags !== ERR) {
    /* SE_ECL_NUT returns degrees directly from sweCalcInt; no conversion needed */
    if (ipl === SE_ECL_NUT) {
      for (let i = 0; i < 6; i++) xxOut[i] = result.xx[i];
    } else {
      /* Select which 6 values to return based on flags */
      let offset = 0;
      if (iflag & SEFLG_EQUATORIAL) {
        if (iflag & SEFLG_XYZ) {
          offset = 18; /* equatorial cartesian */
        } else {
          offset = 12; /* equatorial polar */
        }
      } else {
        if (iflag & SEFLG_XYZ) {
          offset = 6; /* ecliptic cartesian */
        } else {
          offset = 0; /* ecliptic polar */
        }
      }
      for (let i = 0; i < 6; i++) xxOut[i] = result.xx[offset + i];
      /* Radians to degrees: if SEFLG_RADIANS NOT set, convert */
      if ((iflag & SEFLG_RADIANS) === 0 && (iflag & SEFLG_XYZ) === 0) {
        xxOut[0] *= RADTODEG;
        xxOut[1] *= RADTODEG;
        xxOut[3] *= RADTODEG;
        xxOut[4] *= RADTODEG;
      }
      /* Normalize longitude */
      if ((iflag & SEFLG_XYZ) === 0 && (iflag & SEFLG_RADIANS) === 0) {
        xxOut[0] = sweDegnorm(xxOut[0]);
      } else if ((iflag & SEFLG_XYZ) === 0 && (iflag & SEFLG_RADIANS) !== 0) {
        xxOut[0] = sweRadnorm(xxOut[0]);
      }
    }
  }
  /* Apply sidereal correction */
  if (result.flags !== ERR && (iflag & SEFLG_SIDEREAL) !== 0 && ipl !== SE_ECL_NUT) {
    const ayaRes = swiGetAyanamsaEx(swed, tjdEt, iflag);
    if (ayaRes.retc === ERR) {
      return { flags: ERR, xx: xxOut, serr: ayaRes.serr };
    }
    const aya = ayaRes.daya;
    if ((iflag & SEFLG_XYZ) === 0) {
      if ((iflag & SEFLG_RADIANS) !== 0) {
        xxOut[0] -= aya * DEGTORAD;
        xxOut[0] = sweRadnorm(xxOut[0]);
      } else {
        xxOut[0] -= aya;
        xxOut[0] = sweDegnorm(xxOut[0]);
      }
    }
  }
  return { flags: result.flags, xx: xxOut, serr: result.serr };
}

/** sweCalcUt: main public calculation function (UT input) */
export function sweCalcUt(
  swed: SweData, tjdUt: number, ipl: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string } {
  const dt = sweDeltatEx(tjdUt, iflag, swed);
  return sweCalc(swed, tjdUt + dt, ipl, iflag);
}

/* ================================================================
 * Part 6: Ayanamsa (sidereal mode)
 * ================================================================ */

/** Set sidereal mode */
export function sweSetSidMode(swed: SweData, sidMode: number, t0: number, ayanT0: number): void {
  swiInitSwedIfStart(swed);
  const sidBits = sidMode & SE_SIDBITS;
  const sidModeBase = sidMode & 0xFF;
  swed.sidd.sidMode = sidMode;
  if (sidModeBase === SE_SIDM_USER) {
    swed.sidd.ayanT0 = ayanT0;
    swed.sidd.t0 = t0;
  } else if (sidModeBase < SE_NSIDM_PREDEF) {
    const ayaInit = AYANAMSA[sidModeBase];
    swed.sidd.ayanT0 = ayaInit.ayanT0;
    swed.sidd.t0 = ayaInit.t0;
    swed.sidd.t0IsUT = ayaInit.t0IsUT;
  }
  swed.ayanaIsSet = true;
  swiForceAppPosEtc(swed);
}

/** Get ayanamsa for a given tjd (ET), with ephemeris flag */
export function sweGetAyanamsaEx(
  swed: SweData, tjdEt: number, iflag: number,
): { retc: number; daya: number; serr: string } {
  const res = swiGetAyanamsaEx(swed, tjdEt, iflag);
  return res;
}

/** Get ayanamsa for a given tjd (UT), with ephemeris flag */
export function sweGetAyanamsaExUt(
  swed: SweData, tjdUt: number, iflag: number,
): { retc: number; daya: number; serr: string } {
  const dt = sweDeltatEx(tjdUt, iflag, swed);
  return swiGetAyanamsaEx(swed, tjdUt + dt, iflag);
}

/** Get ayanamsa (simple, ET) */
export function sweGetAyanamsa(swed: SweData, tjdEt: number): number {
  const res = swiGetAyanamsaEx(swed, tjdEt, 0);
  return res.daya;
}

/** Get ayanamsa (simple, UT) */
export function sweGetAyanamsaUt(swed: SweData, tjdUt: number): number {
  const dt = sweDeltat(tjdUt, swed);
  return sweGetAyanamsa(swed, tjdUt + dt);
}

/** Internal ayanamsa computation */
function swiGetAyanamsaEx(
  swed: SweData, tjdEt: number, iflag: number,
): { retc: number; daya: number; serr: string } {
  let serr = '';
  if (!swed.ayanaIsSet) {
    sweSetSidMode(swed, SE_SIDM_FAGAN_BRADLEY, 0, 0);
  }
  const sidMode = swed.sidd.sidMode;
  const sidBits = sidMode & SE_SIDBITS;
  const sidModeBase = sidMode & 0xFF;
  let t0 = swed.sidd.t0;
  const ayanT0 = swed.sidd.ayanT0;
  const t0IsUT = swed.sidd.t0IsUT;
  /* Star-based ayanamsas */
  iflag = plausIflag(iflag, -1, tjdEt, swed);
  const epheflag = iflag & SEFLG_EPHMASK;
  const otherflag = iflag & ~SEFLG_EPHMASK;
  iflag &= SEFLG_EPHMASK;
  iflag |= SEFLG_NONUT;
  const iflagGalequ = iflag | SEFLG_TRUEPOS;
  let iflagTrue = iflag;
  if (otherflag & SEFLG_TRUEPOS) iflagTrue |= SEFLG_TRUEPOS;
  if (otherflag & SEFLG_NOABERR) iflagTrue |= SEFLG_NOABERR;
  if (otherflag & SEFLG_NOGDEFL) iflagTrue |= SEFLG_NOGDEFL;
  if (sidModeBase === SE_SIDM_TRUE_CITRA) {
    const res = sweFixstar(swed, 'Spica', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 180), serr: '' };
  }
  if (sidModeBase === SE_SIDM_TRUE_REVATI) {
    const res = sweFixstar(swed, ',zePsc', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 359.8333333333), serr: '' };
  }
  if (sidModeBase === SE_SIDM_TRUE_PUSHYA) {
    const res = sweFixstar(swed, ',deCnc', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 106), serr: '' };
  }
  if (sidModeBase === SE_SIDM_TRUE_SHEORAN) {
    const res = sweFixstar(swed, ',deCnc', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 103.49264221625), serr: '' };
  }
  if (sidModeBase === SE_SIDM_TRUE_MULA) {
    const res = sweFixstar(swed, ',laSco', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 240), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALCENT_0SAG) {
    const res = sweFixstar(swed, ',SgrA*', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 240.0), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALCENT_COCHRANE) {
    const res = sweFixstar(swed, ',SgrA*', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 270.0), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALCENT_RGILBRAND) {
    const res = sweFixstar(swed, ',SgrA*', tjdEt, iflagTrue);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 210.0 - 90.0 * 0.3819660113), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALCENT_MULA_WILHELM) {
    const res = sweFixstar(swed, ',SgrA*', tjdEt, iflagTrue | SEFLG_EQUATORIAL);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    const eps = swiEpsiln(tjdEt, iflag, swed) * RADTODEG;
    const mc = swiArmcToMc(res.xx[0], eps);
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(mc - 246.6666666667), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALEQU_IAU1958) {
    const res = sweFixstar(swed, ',GP1958', tjdEt, iflagGalequ);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 150), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALEQU_TRUE) {
    const res = sweFixstar(swed, ',GPol', tjdEt, iflagGalequ);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 150), serr: '' };
  }
  if (sidModeBase === SE_SIDM_GALEQU_MULA) {
    const res = sweFixstar(swed, ',GPol', tjdEt, iflagGalequ);
    if (res.flags === ERR) return { retc: ERR, daya: 0, serr: res.serr };
    return { retc: res.flags & SEFLG_EPHMASK, daya: sweDegnorm(res.xx[0] - 150 - 6.6666666667), serr: '' };
  }
  /* Get the reference date t0 */
  let tjd0 = t0;
  if (t0IsUT) {
    tjd0 = t0 + sweDeltatEx(t0, iflag, swed);
  }
  /* General precession since t0 */
  const { dpre: dPreJ, deps: dOblJ } = swiLdpPeps(tjdEt);
  const { dpre: dPre0, deps: dObl0 } = swiLdpPeps(tjd0);
  /* Precession correction for ayanamsa */
  let precCorr = 0;
  if (sidModeBase < SE_NSIDM_PREDEF && AYANAMSA[sidModeBase].precOffset !== 0 &&
      AYANAMSA[sidModeBase].precOffset !== -1 &&
      (sidBits & SE_SIDBIT_NO_PREC_OFFSET) === 0 &&
      (sidBits & SE_SIDBIT_PREC_ORIG) === 0) {
    /* Apply precession offset correction */
    /* For now, simplified: no precession model switching */
  }
  /* Ayanamsa = initial offset + precession from t0 to tjd */
  let daya = (dPreJ - dPre0) * RADTODEG + ayanT0;
  /* SSY_PLANE correction */
  if (sidBits & SE_SIDBIT_SSY_PLANE) {
    /* project onto solar system invariable plane */
    /* not yet supported - skip */
  }
  /* ECL_T0 and ECL_DATE modes */
  /* These are not supported in simplified mode */
  return { retc: OK, daya: sweDegnorm(daya), serr };
}

/** Get ayanamsa with speed */
export function swiGetAyanamsaWithSpeed(
  swed: SweData, tjdEt: number, iflag: number,
): { retc: number; daya: number; dayaSpeed: number; serr: string } {
  const res = swiGetAyanamsaEx(swed, tjdEt, iflag);
  if (res.retc === ERR) {
    return { retc: ERR, daya: 0, dayaSpeed: 0, serr: res.serr };
  }
  /* Compute speed as finite difference */
  const dt = 0.01;
  const res2 = swiGetAyanamsaEx(swed, tjdEt + dt, iflag);
  let dayaSpeed = 0;
  if (res2.retc === OK) {
    dayaSpeed = sweDifrad2n(res2.daya * DEGTORAD, res.daya * DEGTORAD) * RADTODEG / dt;
  }
  return { retc: OK, daya: res.daya, dayaSpeed, serr: res.serr };
}

/** Tropical RA → sidereal longitude */
export function swiTropRa2SidLon(
  xin: Float64Array | number[],
  xout: Float64Array | number[],
  xoutr: Float64Array | number[],
  iflag: number,
  swed: SweData,
): void {
  /* Not yet implemented for this simplified port */
  for (let i = 0; i < 6; i++) xout[i] = xin[i];
  for (let i = 0; i < 6; i++) xoutr[i] = xin[i];
}

/** Tropical RA → sidereal longitude (Sosy method) */
export function swiTropRa2SidLonSosy(
  xin: Float64Array | number[],
  xout: Float64Array | number[],
  iflag: number,
  swed: SweData,
): void {
  /* Not yet implemented for this simplified port */
  for (let i = 0; i < 6; i++) xout[i] = xin[i];
}

/* ================================================================
 * Part 7: SE1 file reading — readConst, getNewSegment, rotBack, sweph
 * ================================================================ */

/**
 * Load an SE1 ephemeris file into memory for later use by sweph().
 * The filename should be the base name (e.g. "sepl_18.se1", "semo_18.se1").
 */
export function sweSetEphemerisFile(
  filename: string, buffer: ArrayBuffer, swed: SweData,
): void {
  if (!swed.ephemerisFiles) swed.ephemerisFiles = new Map();
  swed.ephemerisFiles.set(filename.toLowerCase(), buffer);
}

/** Look up a pre-loaded ephemeris file buffer by filename */
function findEphemerisFile(fname: string, swed: SweData): ArrayBuffer | null {
  if (!swed.ephemerisFiles) return null;
  /* Try exact name first, then basename (strip directory prefix) */
  const key = fname.toLowerCase();
  let buf = swed.ephemerisFiles.get(key) ?? null;
  if (!buf) {
    /* Try without directory prefix */
    const slash = key.lastIndexOf('/');
    if (slash >= 0) {
      buf = swed.ephemerisFiles.get(key.substring(slash + 1)) ?? null;
    }
  }
  return buf;
}

/**
 * readConst: read constants from an SE1 ephemeris file header.
 * Translated from sweph.c read_const() (lines 4509-4887).
 */
function readConst(
  ifno: number, swed: SweData,
): { retc: number; serr: string } {
  const fdp = swed.fidat[ifno];
  const reader = fdp.reader;
  if (!reader) return { retc: ERR, serr: 'no reader' };
  let serr = '';
  /* ---- version string ---- */
  const versionLine = reader.readLine();
  if (versionLine === null) {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0a).`);
  }
  /* extract version number */
  let sp = 0;
  while (sp < versionLine.length && (versionLine.charCodeAt(sp) < 48 || versionLine.charCodeAt(sp) > 57)) sp++;
  fdp.fversion = sp < versionLine.length ? parseInt(versionLine.substring(sp), 10) : 0;
  /* ---- filename check ---- */
  const fnameLine = reader.readLine();
  if (fnameLine === null) {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0b).`);
  }
  const fnamFromFile = fnameLine.trim().toLowerCase();
  const fnamActual = fdp.fnam.toLowerCase().replace(/^.*\//, '');
  if (fnamFromFile !== fnamActual) {
    return closeAndError(fdp, swed, `Ephemeris file name '${fnamActual}' wrong; rename '${fnamFromFile}'.`);
  }
  /* ---- copyright ---- */
  const copyrightLine = reader.readLine();
  if (copyrightLine === null) {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0c).`);
  }
  /* ---- asteroid orbital elements (if single asteroid file) ---- */
  if (ifno === SEI_FILE_ANY_AST) {
    const elemLine = reader.readLine(AS_MAXCH * 2);
    if (elemLine === null) {
      return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0d).`);
    }
    swed.astelem = elemLine;
    /* Parse H, G, diameter from element line */
    /* Skip MPC number and name portion */
    let si = 0;
    while (si < elemLine.length && elemLine[si] === ' ') si++;
    while (si < elemLine.length && elemLine[si] >= '0' && elemLine[si] <= '9') si++;
    if (si < elemLine.length) si++; // skip space after number
    const nameOffset = si;
    const lastnam = 19;
    fdp.astnam = elemLine.substring(nameOffset, nameOffset + lastnam + nameOffset).trim();
    swed.astH = parseFloat(elemLine.substring(35 + nameOffset) || '0');
    swed.astG = parseFloat(elemLine.substring(42 + nameOffset) || '0');
    if (swed.astG === 0) swed.astG = 0.15;
    const diamStr = elemLine.substring(51 + nameOffset, 58 + nameOffset);
    swed.astDiam = parseFloat(diamStr) || 0;
    if (swed.astDiam === 0) {
      swed.astDiam = 1329 / Math.sqrt(0.15) * Math.pow(10, -0.2 * swed.astH);
    }
  }
  /* ---- endianness test ---- */
  /* Read 4 raw bytes to detect endianness */
  const testBytes = reader.readBytes(4);
  const testLE = testBytes[0] | (testBytes[1] << 8) | (testBytes[2] << 16) | (testBytes[3] << 24);
  const testBE = (testBytes[0] << 24) | (testBytes[1] << 16) | (testBytes[2] << 8) | testBytes[3];
  let isLittleEndian: boolean;
  if ((testLE >>> 0) === SEI_FILE_TEST_ENDIAN) {
    isLittleEndian = true;
  } else if ((testBE >>> 0) === SEI_FILE_TEST_ENDIAN) {
    isLittleEndian = false;
  } else {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0f).`);
  }
  reader.setLittleEndian(isLittleEndian);
  fdp.iflg = isLittleEndian ? 1 : 0; // store endianness in iflg (1=LE, 0=BE)
  /* ---- file length check ---- */
  const storedLen = reader.readInt32();
  if (storedLen !== reader.length) {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0h).`);
  }
  /* ---- DE number ---- */
  fdp.swephDenum = reader.readInt32();
  /* ---- start and end epoch ---- */
  fdp.tfstart = reader.readFloat64();
  fdp.tfend = reader.readFloat64();
  /* ---- number of planets ---- */
  let nplan = reader.readUint16();
  let nbytesIpl = 2;
  if (nplan > 256) {
    nbytesIpl = 4;
    nplan = nplan % 256;
  }
  if (nplan < 1 || nplan > 20) {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0i).`);
  }
  fdp.npl = nplan;
  /* ---- which planets ---- */
  for (let i = 0; i < nplan; i++) {
    fdp.ipl[i] = nbytesIpl === 4 ? reader.readInt32() : reader.readUintN(nbytesIpl);
  }
  /* ---- asteroid name (if applicable) ---- */
  if (ifno === SEI_FILE_ANY_AST) {
    /* Read 30-byte name field (may contain old-style name or be overridden) */
    reader.readBytes(30); // skip old name field
    /* Name was already parsed from orbital elements above */
  }
  /* ---- CRC check ---- */
  const crcPos = reader.position;
  const storedCrc = reader.readUint32();
  /* Read header area from start to CRC position */
  reader.seekSet(0);
  const headerBuf = reader.readBytes(crcPos);
  const computedCrc = swiCrc32(headerBuf, crcPos);
  if (computedCrc !== storedCrc) {
    return closeAndError(fdp, swed, `Ephemeris file ${fdp.fnam} is damaged (0n). CRC mismatch.`);
  }
  reader.seekSet(crcPos + 4);
  /* ---- general constants ---- */
  swed.gcdat.clight = reader.readFloat64();
  swed.gcdat.aunit = reader.readFloat64();
  swed.gcdat.helgravconst = reader.readFloat64();
  swed.gcdat.ratme = reader.readFloat64();
  swed.gcdat.sunradius = reader.readFloat64();
  /* ---- per-planet constants ---- */
  for (let kpl = 0; kpl < fdp.npl; kpl++) {
    const iplFile = fdp.ipl[kpl];
    let pdp;
    if (iplFile >= SE_AST_OFFSET || iplFile >= SE_PLMOON_OFFSET) {
      pdp = swed.pldat[SEI_ANYBODY];
    } else {
      pdp = swed.pldat[iplFile];
    }
    pdp.ibdy = iplFile;
    pdp.lndx0 = reader.readInt32();
    /* flags: 1 byte → int32 */
    pdp.iflg = reader.readUint8();
    /* ncoe: 1 byte → int */
    pdp.ncoe = reader.readUint8();
    /* rmax */
    const lng = reader.readInt32();
    pdp.rmax = lng / 1000.0;
    if (iplFile >= SE_PLMOON_OFFSET && iplFile < SE_AST_OFFSET) {
      if ((iplFile % 100) === 99 || Math.floor((iplFile - 9000) / 100) === SE_MARS) {
        pdp.rmax = lng / 1000000.0;
      }
    }
    /* 10 doubles: tfstart, tfend, dseg, telem, prot, dprot, qrot, dqrot, peri, dperi */
    pdp.tfstart = reader.readFloat64();
    pdp.tfend = reader.readFloat64();
    pdp.dseg = reader.readFloat64();
    pdp.nndx = Math.floor((pdp.tfend - pdp.tfstart + 0.1) / pdp.dseg);
    pdp.telem = reader.readFloat64();
    pdp.prot = reader.readFloat64();
    pdp.dprot = reader.readFloat64();
    pdp.qrot = reader.readFloat64();
    pdp.dqrot = reader.readFloat64();
    pdp.peri = reader.readFloat64();
    pdp.dperi = reader.readFloat64();
    /* reference ellipse coefficients */
    if (pdp.iflg & SEI_FLG_ELLIPSE) {
      pdp.refep = new Float64Array(pdp.ncoe * 2);
      for (let i = 0; i < pdp.ncoe * 2; i++) {
        pdp.refep[i] = reader.readFloat64();
      }
      pdp.segp = null;
    }
  }
  return { retc: OK, serr };
}

/** Close file and return error */
function closeAndError(fdp: FileData, swed: SweData, serr: string): { retc: number; serr: string } {
  fdp.reader = null;
  freePlanets(swed);
  return { retc: ERR, serr };
}

/**
 * getNewSegment: read and unpack a segment of Chebyshev coefficients.
 * Translated from sweph.c get_new_segment() (lines 4366-4502).
 */
function getNewSegment(
  tjd: number, ipli: number, ifno: number, swed: SweData,
): { retc: number; serr: string } {
  const pdp = swed.pldat[ipli];
  const fdp = swed.fidat[ifno];
  const reader = fdp.reader;
  if (!reader) return { retc: ERR, serr: 'no reader' };
  /* compute segment number */
  const iseg = Math.floor((tjd - pdp.tfstart) / pdp.dseg);
  pdp.tseg0 = pdp.tfstart + iseg * pdp.dseg;
  pdp.tseg1 = pdp.tseg0 + pdp.dseg;
  /* get file position of coefficients from segment index */
  const indexPos = pdp.lndx0 + iseg * 3;
  reader.seekSet(indexPos);
  const fpos = reader.readUintN(3);
  reader.seekSet(fpos);
  /* allocate/clear coefficient buffer */
  if (pdp.segp === null) {
    pdp.segp = new Float64Array(pdp.ncoe * 3);
  }
  pdp.segp.fill(0);
  /* read coefficients for 3 coordinates */
  for (let icoord = 0; icoord < 3; icoord++) {
    let idbl = icoord * pdp.ncoe;
    /* read header: determines packing sizes */
    const c0 = reader.readUint8();
    const c1 = reader.readUint8();
    let nsizes: number;
    const nsize = [0, 0, 0, 0, 0, 0];
    let nco: number;
    if (c0 & 128) {
      nsizes = 6;
      const c2 = reader.readUint8();
      const c3 = reader.readUint8();
      nsize[0] = Math.floor(c1 / 16);
      nsize[1] = c1 % 16;
      nsize[2] = Math.floor(c2 / 16);
      nsize[3] = c2 % 16;
      nsize[4] = Math.floor(c3 / 16);
      nsize[5] = c3 % 16;
      nco = nsize[0] + nsize[1] + nsize[2] + nsize[3] + nsize[4] + nsize[5];
    } else {
      nsizes = 4;
      nsize[0] = Math.floor(c0 / 16);
      nsize[1] = c0 % 16;
      nsize[2] = Math.floor(c1 / 16);
      nsize[3] = c1 % 16;
      nco = nsize[0] + nsize[1] + nsize[2] + nsize[3];
    }
    if (nco > pdp.ncoe) {
      pdp.segp = null;
      return { retc: ERR, serr: `error in ephemeris file ${fdp.fnam}: ${nco} coefficients instead of ${pdp.ncoe}.` };
    }
    /* unpack coefficients */
    for (let i = 0; i < nsizes; i++) {
      if (nsize[i] === 0) continue;
      if (i < 4) {
        /* size groups 0..3: (4-i) bytes per coefficient */
        const bytesPerCoef = 4 - i;
        const count = nsize[i];
        for (let m = 0; m < count; m++, idbl++) {
          const val = reader.readUintN(bytesPerCoef);
          if (val & 1) {
            pdp.segp[idbl] = -(((val + 1) / 2) / 1e+9 * pdp.rmax / 2);
          } else {
            pdp.segp[idbl] = (val / 2) / 1e+9 * pdp.rmax / 2;
          }
        }
      } else if (i === 4) {
        /* half-byte packing: 2 coefficients per byte */
        const count = nsize[i];
        const nBytes = Math.floor((count + 1) / 2);
        let j = 0;
        for (let m = 0; m < nBytes && j < count; m++) {
          let val = reader.readUint8();
          for (let n = 0, o = 16; n < 2 && j < count; n++, j++, idbl++) {
            if (val & o) {
              pdp.segp[idbl] = -(((val + o) / o / 2) * pdp.rmax / 2 / 1e+9);
            } else {
              pdp.segp[idbl] = (val / o / 2) * pdp.rmax / 2 / 1e+9;
            }
            val = val % o;
            o = Math.floor(o / 16);
          }
        }
      } else if (i === 5) {
        /* quarter-byte packing: 4 coefficients per byte */
        const count = nsize[i];
        const nBytes = Math.floor((count + 3) / 4);
        let j = 0;
        for (let m = 0; m < nBytes && j < count; m++) {
          let val = reader.readUint8();
          for (let n = 0, o = 64; n < 4 && j < count; n++, j++, idbl++) {
            if (val & o) {
              pdp.segp[idbl] = -(((val + o) / o / 2) * pdp.rmax / 2 / 1e+9);
            } else {
              pdp.segp[idbl] = (val / o / 2) * pdp.rmax / 2 / 1e+9;
            }
            val = val % o;
            o = Math.floor(o / 4);
          }
        }
      }
    }
  }
  return { retc: OK, serr: '' };
}

/**
 * rotBack: rotate Chebyshev coefficients from orbital plane back to equatorial J2000.
 * Translated from sweph.c rot_back() (lines 4962-5053).
 */
function rotBack(ipli: number, swed: SweData): void {
  const seps2000 = 0.39777715572793088;  // sin(J2000 obliquity)
  const ceps2000 = 0.91748206215761929;  // cos(J2000 obliquity)
  const pdp = swed.pldat[ipli];
  const nco = pdp.ncoe;
  const segp = pdp.segp!;
  const t = pdp.tseg0 + pdp.dseg / 2;
  const tdiff = (t - pdp.telem) / 365250.0;
  let qav: number, pav: number;
  if (ipli === SEI_MOON) {
    let dn = pdp.prot + tdiff * pdp.dprot;
    const nWrap = Math.floor(dn / TWOPI);
    dn -= nWrap * TWOPI;
    qav = (pdp.qrot + tdiff * pdp.dqrot) * Math.cos(dn);
    pav = (pdp.qrot + tdiff * pdp.dqrot) * Math.sin(dn);
  } else {
    qav = pdp.qrot + tdiff * pdp.dqrot;
    pav = pdp.prot + tdiff * pdp.dprot;
  }
  /* Copy coefficients to local array x[i][3] */
  const x: number[][] = [];
  for (let i = 0; i < nco; i++) {
    x.push([segp[i], segp[nco + i], segp[2 * nco + i]]);
  }
  /* Add reference ellipse if flagged */
  if (pdp.iflg & SEI_FLG_ELLIPSE) {
    const refep = pdp.refep!;
    let omtild = pdp.peri + tdiff * pdp.dperi;
    const nWrap = Math.floor(omtild / TWOPI);
    omtild -= nWrap * TWOPI;
    const com = Math.cos(omtild);
    const som = Math.sin(omtild);
    for (let i = 0; i < nco; i++) {
      x[i][0] = segp[i] + com * refep[i] - som * refep[nco + i];
      x[i][1] = segp[nco + i] + com * refep[nco + i] + som * refep[i];
    }
  }
  /* Construct right-handed orthonormal system (equinoctal variables) */
  const cosih2 = 1.0 / (1.0 + qav * qav + pav * pav);
  /* orbit pole */
  const uiz = [2.0 * pav * cosih2, -2.0 * qav * cosih2, (1.0 - qav * qav - pav * pav) * cosih2];
  /* origin of longitudes */
  const uix = [(1.0 + qav * qav - pav * pav) * cosih2, 2.0 * qav * pav * cosih2, -2.0 * pav * cosih2];
  /* orthogonal in orbital plane */
  const uiy = [2.0 * qav * pav * cosih2, (1.0 - qav * qav + pav * pav) * cosih2, 2.0 * qav * cosih2];
  /* Rotate to actual orientation in space */
  pdp.neval = pdp.ncoe;
  for (let i = 0; i < nco; i++) {
    const xrot = x[i][0] * uix[0] + x[i][1] * uiy[0] + x[i][2] * uiz[0];
    let yrot = x[i][0] * uix[1] + x[i][1] * uiy[1] + x[i][2] * uiz[1];
    let zrot = x[i][0] * uix[2] + x[i][1] * uiy[2] + x[i][2] * uiz[2];
    if (Math.abs(xrot) + Math.abs(yrot) + Math.abs(zrot) >= 1e-14) {
      pdp.neval = i;
    }
    x[i][0] = xrot;
    x[i][1] = yrot;
    x[i][2] = zrot;
    if (ipli === SEI_MOON) {
      /* rotate from ecliptic to J2000 equator */
      x[i][1] = ceps2000 * yrot - seps2000 * zrot;
      x[i][2] = seps2000 * yrot + ceps2000 * zrot;
    }
  }
  pdp.neval++;
  /* Write back */
  for (let i = 0; i < nco; i++) {
    segp[i] = x[i][0];
    segp[nco + i] = x[i][1];
    segp[2 * nco + i] = x[i][2];
  }
}

/**
 * sweph: core SE1 file reader. Opens file if needed, reads segment, evaluates Chebyshev.
 * Translated from sweph.c sweph() (lines 2124-2357).
 */
function sweph(
  swed: SweData, tjd: number, ipli: number, ifno: number,
  iflag: number, xsunb: Float64Array | number[] | null,
  doSave: boolean,
  xpret: Float64Array | null,
): { retc: number; serr: string } {
  let ipl = ipli;
  if (ipli > SE_AST_OFFSET) ipl = SEI_ANYBODY;
  if (ipli > SE_PLMOON_OFFSET && ipli < SE_AST_OFFSET) ipl = SEI_ANYBODY;
  const pdp = swed.pldat[ipl];
  const pedp = swed.pldat[SEI_EARTH];
  const psdp = swed.pldat[SEI_SUNBARY];
  const fdp = swed.fidat[ifno];
  const xp = doSave ? pdp.x : new Float64Array(6);
  /* ---- cache check ---- */
  const speedf1 = pdp.xflgs & SEFLG_SPEED;
  const speedf2 = iflag & SEFLG_SPEED;
  if (tjd === pdp.teval
    && pdp.iephe === SEFLG_SWIEPH
    && (!speedf2 || speedf1)
    && ipl < SEI_ANYBODY) {
    if (xpret !== null) {
      for (let i = 0; i <= 5; i++) xpret[i] = pdp.x[i];
    }
    return { retc: OK, serr: '' };
  }
  /* ---- get correct ephemeris file ---- */
  if (fdp.reader !== null) {
    /* if tjd is beyond file range, or new body needed, close old file */
    if (tjd < fdp.tfstart || tjd > fdp.tfend
      || (ipl === SEI_ANYBODY && ipli !== pdp.ibdy)) {
      fdp.reader = null;
      pdp.refep = null;
      pdp.segp = null;
    }
  }
  if (fdp.reader === null) {
    const fname = swiGenFilename(tjd, ipli);
    const buffer = findEphemerisFile(fname, swed);
    if (!buffer) {
      return { retc: NOT_AVAILABLE, serr: '' };
    }
    fdp.reader = new SE1FileReader(buffer);
    fdp.fnam = fname.replace(/^.*\//, ''); // basename
    const rc = readConst(ifno, swed);
    if (rc.retc !== OK) return rc;
  }
  /* ---- range check ---- */
  if (tjd < fdp.tfstart || tjd > fdp.tfend) {
    let msg: string;
    if (ipli > SE_AST_OFFSET) {
      msg = `asteroid No. ${ipli - SE_AST_OFFSET} (${fdp.fnam}): `;
    } else if (ipli !== SEI_MOON) {
      msg = `planets eph. file (${fdp.fnam}): `;
    } else {
      msg = `moon eph. file (${fdp.fnam}): `;
    }
    if (tjd < fdp.tfstart) {
      msg += `jd ${tjd} < lower limit ${fdp.tfstart};`;
    } else {
      msg += `jd ${tjd} > upper limit ${fdp.tfend};`;
    }
    return { retc: NOT_AVAILABLE, serr: msg };
  }
  /* ---- get planet position ---- */
  if (pdp.segp === null || tjd < pdp.tseg0 || tjd > pdp.tseg1) {
    const rc = getNewSegment(tjd, ipl, ifno, swed);
    if (rc.retc !== OK) return rc;
    if (pdp.iflg & SEI_FLG_ROTATE) {
      rotBack(ipl, swed);
    } else {
      pdp.neval = pdp.ncoe;
    }
  }
  /* evaluate Chebyshev polynomial */
  let t = (tjd - pdp.tseg0) / pdp.dseg;
  t = t * 2 - 1;
  const needSpeed = doSave || !!(iflag & SEFLG_SPEED);
  const segp = pdp.segp!;
  for (let i = 0; i <= 2; i++) {
    xp[i] = swiEcheb(t, segp.subarray(i * pdp.ncoe), pdp.neval);
    if (needSpeed) {
      xp[i + 3] = swiEdcheb(t, segp.subarray(i * pdp.ncoe), pdp.neval) / pdp.dseg * 2;
    } else {
      xp[i + 3] = 0;
    }
  }
  /* ---- barycentric Sun special case ---- */
  if (ipl === SEI_SUNBARY && (pdp.iflg & SEI_FLG_EMBHEL)) {
    /* File has heliocentric Earth, not barycentric Sun.
     * Compute: sunBary = EMB - helioEarth */
    const tsv = pedp.teval;
    pedp.teval = 0; // force recomputation
    const xemb = new Float64Array(6);
    const rc = sweph(swed, tjd, SEI_EMB, ifno, iflag | SEFLG_SPEED, null, NO_SAVE, xemb);
    if (rc.retc !== OK) return rc;
    pedp.teval = tsv;
    for (let i = 0; i <= 2; i++) xp[i] = xemb[i] - xp[i];
    if (needSpeed) {
      for (let i = 3; i <= 5; i++) xp[i] = xemb[i] - xp[i];
    }
  }
  /* ---- asteroid helio → bary conversion ---- */
  if (xsunb !== null && (iflag & SEFLG_SWIEPH)) {
    if (ipl >= SEI_ANYBODY) {
      for (let i = 0; i <= 2; i++) xp[i] += xsunb[i];
      if (needSpeed) {
        for (let i = 3; i <= 5; i++) xp[i] += xsunb[i];
      }
    }
  }
  /* ---- save results ---- */
  if (doSave) {
    pdp.teval = tjd;
    pdp.xflgs = -1; // force new light-time computation
    if (ifno === SEI_FILE_PLANET || ifno === SEI_FILE_MOON) {
      pdp.iephe = SEFLG_SWIEPH;
    } else {
      pdp.iephe = psdp.iephe;
    }
  }
  if (xpret !== null) {
    for (let i = 0; i <= 5; i++) xpret[i] = xp[i];
  }
  return { retc: OK, serr: '' };
}

/**
 * swemoonSwieph: compute geocentric Moon from SE1 file.
 * Translated from sweph.c swemoon() (lines 1759-1793).
 */
function swemoonSwieph(
  swed: SweData, tjd: number, iflag: number,
  doSave: boolean, xpret: Float64Array | null,
): { retc: number; serr: string } {
  const pdp = swed.pldat[SEI_MOON];
  const xp = doSave ? pdp.x : new Float64Array(6);
  /* cache check */
  const speedf1 = pdp.xflgs & SEFLG_SPEED;
  const speedf2 = iflag & SEFLG_SPEED;
  if (tjd === pdp.teval
    && pdp.iephe === SEFLG_SWIEPH
    && (!speedf2 || speedf1)) {
    /* already computed */
  } else {
    const rc = sweph(swed, tjd, SEI_MOON, SEI_FILE_MOON, iflag, null, doSave, xp);
    if (rc.retc !== OK) return rc;
    if (doSave) {
      pdp.teval = tjd;
      pdp.xflgs = -1;
      pdp.iephe = SEFLG_SWIEPH;
    }
  }
  if (xpret !== null) {
    for (let i = 0; i <= 5; i++) xpret[i] = pdp.x[i];
  }
  return { retc: OK, serr: '' };
}

/**
 * sweplanSwieph: compute planet positions from SE1 files (Swiss Ephemeris).
 * Computes barycentric Sun, Moon, Earth, and target planet.
 * Translated from sweph.c sweplan() (lines 1819-1967).
 */
function sweplanSwieph(
  swed: SweData, tjd: number, ipli: number, ifno: number, iflag: number,
  doSave: boolean,
  xpret: Float64Array | null,
  xperet: Float64Array | null,
  xpsret: Float64Array | null,
  xpmret: Float64Array | null,
): { retc: number; serr: string } {
  const pdp = swed.pldat[ipli];
  const pebdp = swed.pldat[SEI_EMB];
  const psbdp = swed.pldat[SEI_SUNBARY];
  const pmdp = swed.pldat[SEI_MOON];
  let doEarth = false, doMoon = false, doSunBary = false;
  const xxp = new Float64Array(6);
  const xxm = new Float64Array(6);
  const xxs = new Float64Array(6);
  const xxe = new Float64Array(6);
  /* Determine what needs computing */
  if (doSave || ipli === SEI_SUNBARY || (pdp.iflg & SEI_FLG_HELIO)
    || xpsret !== null || (iflag & SEFLG_HELCTR))
    doSunBary = true;
  if (doSave || ipli === SEI_EARTH || xperet !== null)
    doEarth = true;
  if (ipli === SEI_MOON) {
    doEarth = true;
    doSunBary = true;
  }
  if (doSave || ipli === SEI_MOON || ipli === SEI_EARTH || xperet !== null || xpmret !== null)
    doMoon = true;
  const xp = doSave ? pdp.x : xxp;
  const xpe = doSave ? pebdp.x : xxe;
  const xps = doSave ? psbdp.x : xxs;
  const xpm = doSave ? pmdp.x : xxm;
  const speedf2 = iflag & SEFLG_SPEED;
  /* ---- barycentric Sun ---- */
  if (doSunBary) {
    const speedf1 = psbdp.xflgs & SEFLG_SPEED;
    if (tjd === psbdp.teval && psbdp.iephe === SEFLG_SWIEPH && (!speedf2 || speedf1)) {
      for (let i = 0; i <= 5; i++) xps[i] = psbdp.x[i];
    } else {
      const rc = sweph(swed, tjd, SEI_SUNBARY, SEI_FILE_PLANET, iflag, null, doSave, xps);
      if (rc.retc !== OK) return rc;
    }
    if (xpsret !== null) for (let i = 0; i <= 5; i++) xpsret[i] = xps[i];
  }
  /* ---- Moon ---- */
  if (doMoon) {
    const speedf1 = pmdp.xflgs & SEFLG_SPEED;
    if (tjd === pmdp.teval && pmdp.iephe === SEFLG_SWIEPH && (!speedf2 || speedf1)) {
      for (let i = 0; i <= 5; i++) xpm[i] = pmdp.x[i];
    } else {
      const rc = sweph(swed, tjd, SEI_MOON, SEI_FILE_MOON, iflag, null, doSave, xpm);
      if (rc.retc === ERR) return rc;
      /* If moon file not available, fall back to Moshier moon */
      if (swed.fidat[SEI_FILE_MOON].reader === null) {
        const serrArr: string[] = [''];
        const retc = swiMoshmoon(swed, tjd, doSave, xpm, serrArr);
        if (retc !== OK) return { retc, serr: serrArr[0] };
      }
    }
    if (xpmret !== null) for (let i = 0; i <= 5; i++) xpmret[i] = xpm[i];
  }
  /* ---- barycentric Earth ---- */
  if (doEarth) {
    const speedf1 = pebdp.xflgs & SEFLG_SPEED;
    if (tjd === pebdp.teval && pebdp.iephe === SEFLG_SWIEPH && (!speedf2 || speedf1)) {
      for (let i = 0; i <= 5; i++) xpe[i] = pebdp.x[i];
    } else {
      const rc = sweph(swed, tjd, SEI_EMB, SEI_FILE_PLANET, iflag, null, doSave, xpe);
      if (rc.retc !== OK) return rc;
      /* Earth from EMB and Moon */
      embofs(xpe, xpm);
      if (xpe === pebdp.x || (iflag & SEFLG_SPEED)) {
        const xpeSpeed = new Float64Array(xpe.buffer, xpe.byteOffset + 24, 3);
        const xpmSpeed = new Float64Array(xpm.buffer, xpm.byteOffset + 24, 3);
        embofs(xpeSpeed, xpmSpeed);
      }
    }
    if (xperet !== null) for (let i = 0; i <= 5; i++) xperet[i] = xpe[i];
  }
  /* ---- target planet ---- */
  if (ipli === SEI_MOON) {
    for (let i = 0; i <= 5; i++) xp[i] = xpm[i];
  } else if (ipli === SEI_EARTH) {
    for (let i = 0; i <= 5; i++) xp[i] = xpe[i];
  } else if (ipli === SEI_SUN || ipli === SEI_SUNBARY) {
    for (let i = 0; i <= 5; i++) xp[i] = xps[i];
  } else {
    /* planet */
    const speedf1 = pdp.xflgs & SEFLG_SPEED;
    if (tjd === pdp.teval && pdp.iephe === SEFLG_SWIEPH && (!speedf2 || speedf1)) {
      for (let i = 0; i <= 5; i++) xp[i] = pdp.x[i];
    } else {
      const rc = sweph(swed, tjd, ipli, ifno, iflag, null, doSave, xp);
      if (rc.retc !== OK) return rc;
      /* If planet is heliocentric in file, convert to barycentric */
      if (pdp.iflg & SEI_FLG_HELIO) {
        for (let i = 0; i <= 2; i++) xp[i] += xps[i];
        if (doSave || (iflag & SEFLG_SPEED))
          for (let i = 3; i <= 5; i++) xp[i] += xps[i];
      }
    }
  }
  if (xpret !== null) for (let i = 0; i <= 5; i++) xpret[i] = xp[i];
  return { retc: OK, serr: '' };
}

/* ================================================================
 * Part 8: Fixed stars (builtin catalog for ayanamsa)
 * ================================================================ */

/** Parsed fixed star data */
interface FixedStar {
  starname: string;
  starbayer: string;
  epoch: number;       // 0=ICRS, 1950=B1950, 2000=J2000
  ra: number;          // radians
  de: number;          // radians
  ramot: number;       // RA proper motion, radians/century
  demot: number;       // Dec proper motion, radians/century
  radvel: number;      // radial velocity, AU/century
  parall: number;      // parallax, radians
  mag: number;         // visual magnitude
}

/** Builtin star records — required for star-based ayanamsas */
const BUILTIN_STARS: Array<{ names: string[]; record: string }> = [
  { names: ['spica', 'Spica'],
    record: 'Spica,alVir,ICRS,13,25,11.57937,-11,09,40.7501,-42.35,-30.67,1,13.06,0.97,-10,3672' },
  { names: [',zePsc', 'revati', 'Revati'],
    record: 'Revati,zePsc,ICRS,01,13,43.88735,+07,34,31.2745,145,-55.69,15,18.76,5.187,06,174' },
  { names: [',deCnc', 'pushya', 'Pushya'],
    record: 'Pushya,deCnc,ICRS,08,44,41.09921,+18,09,15.5034,-17.67,-229.26,17.14,24.98,3.94,18,2027' },
  { names: [',laSco', 'mula', 'Mula'],
    record: 'Mula,laSco,ICRS,17,33,36.52012,-37,06,13.7648,-8.53,-30.8,-3,5.71,1.62,-37,11673' },
  { names: [',SgrA*'],
    record: 'Gal. Center,SgrA*,2000,17,45,40.03599,-29,00,28.1699,-2.755718425,-5.547,0.0,0.125,999.99,0,0' },
  { names: [',GP1958'],
    record: 'Gal. Pole IAU1958,GP1958,1950,12,49,0.0,27,24,0.0,0.0,0.0,0.0,0.0,0.0,0,0' },
  { names: [',GPol'],
    record: 'Gal. Pole,GPol,ICRS,12,51,36.7151981,27,06,11.193172,0.0,0.0,0.0,0.0,0.0,0,0' },
];

/** Parse a comma-separated star record string into FixedStar data */
function fixstarCutString(srecord: string): { star: FixedStar; starOut: string; serr: string } | null {
  const cpos = srecord.split(',');
  if (cpos.length < 14) {
    return null;
  }
  const starname = cpos[0].trim();
  const starbayer = cpos[1].trim();
  const starOut = starname ? `${starname},${starbayer}` : starbayer;
  const epochStr = cpos[2].trim();
  let epoch: number;
  if (epochStr === 'ICRS' || epochStr === '0') {
    epoch = 0;
  } else {
    epoch = parseFloat(epochStr);
  }
  const ra_h = parseFloat(cpos[3]);
  const ra_m = parseFloat(cpos[4]);
  const ra_s = parseFloat(cpos[5]);
  const de_d = parseFloat(cpos[6]);
  const sde_d = cpos[6];
  const de_m = parseFloat(cpos[7]);
  const de_s = parseFloat(cpos[8]);
  let ra_pm = parseFloat(cpos[9]);
  let de_pm = parseFloat(cpos[10]);
  let radv = parseFloat(cpos[11]);
  let parall = parseFloat(cpos[12]);
  if (parall < 0) parall = -parall;
  const mag = parseFloat(cpos[13]);
  /* RA and Dec in degrees */
  let ra = (ra_s / 3600.0 + ra_m / 60.0 + ra_h) * 15.0;
  let de: number;
  if (!sde_d.includes('-')) {
    de = de_s / 3600.0 + de_m / 60.0 + de_d;
  } else {
    de = -de_s / 3600.0 - de_m / 60.0 + de_d;
  }
  /* proper motion in degrees/century (new format: units of 0.1 arcsec) */
  ra_pm = ra_pm / 10.0 / 3600.0;
  de_pm = de_pm / 10.0 / 3600.0;
  parall /= 1000.0;
  /* parallax in degrees */
  if (parall > 1) {
    parall = 1 / parall / 3600.0;
  } else {
    parall /= 3600;
  }
  /* radial velocity in AU per century */
  radv *= KM_S_TO_AU_CTY;
  /* convert to radians */
  ra *= DEGTORAD;
  de *= DEGTORAD;
  ra_pm *= DEGTORAD;
  de_pm *= DEGTORAD;
  ra_pm /= Math.cos(de); // catalogues give proper motion in RA as great circle
  parall *= DEGTORAD;
  return {
    star: { starname, starbayer, epoch, ra, de, ramot: ra_pm, demot: de_pm, radvel: radv, parall, mag },
    starOut,
    serr: '',
  };
}

/** Look up a star name in the builtin catalog */
function getBuiltinStar(star: string): { record: string; sstar: string } | null {
  for (const entry of BUILTIN_STARS) {
    for (const name of entry.names) {
      if (name.startsWith(',')) {
        // Bayer designation: check if star contains it
        if (star.includes(name)) {
          return { record: entry.record, sstar: name };
        }
      } else {
        // Traditional name: check prefix match (case insensitive)
        if (star.toLowerCase().startsWith(name.toLowerCase())) {
          return { record: entry.record, sstar: name.toLowerCase() };
        }
      }
    }
  }
  return null;
}

/** ARMC to MC conversion (from swehouse.c) */
export function swiArmcToMc(armc: number, eps: number): number {
  const VERY_SMALL = 1e-10;
  if (Math.abs(armc - 90) > VERY_SMALL && Math.abs(armc - 270) > VERY_SMALL) {
    const tant = Math.tan(armc * DEGTORAD);
    let mc = Math.atan(tant / Math.cos(eps * DEGTORAD)) * RADTODEG;
    if (armc > 90 && armc <= 270) {
      mc = sweDegnorm(mc + 180);
    }
    return mc;
  } else {
    return Math.abs(armc - 90) <= VERY_SMALL ? 90 : 270;
  }
}

/** Calculate fixed star position from parsed star data */
function fixstarCalcFromStruct(
  stardata: FixedStar, tjd: number, iflag: number, swed: SweData,
): { flags: number; xx: Float64Array; serr: string; starOut: string } {
  let serr = '';
  const iflgsave = iflag;
  iflag |= SEFLG_SPEED;
  iflag = plausIflag(iflag, -1, tjd, swed);
  const epheflag = iflag & SEFLG_EPHMASK;
  if (swed.lastEpheflag !== epheflag) {
    freePlanets(swed);
    for (let i = 0; i < SEI_NEPHFILES; i++) {
      swed.fidat[i].reader = null;
    }
    swed.lastEpheflag = epheflag;
  }
  if ((iflag & SEFLG_SIDEREAL) && !swed.ayanaIsSet) {
    sweSetSidMode(swed, SE_SIDM_FAGAN_BRADLEY, 0, 0);
  }
  /* obliquity and nutation */
  swiCheckEcliptic(tjd, iflag, swed);
  swiCheckNutation(tjd, iflag, swed);
  const starOut = `${stardata.starname},${stardata.starbayer}`;
  const { epoch, ramot: ra_pm, demot: de_pm, radvel: radv, parall, ra, de } = stardata;
  let t: number;
  if (epoch === 1950) {
    t = tjd - B1950;
  } else {
    t = tjd - J2000;
  }
  const x = new Float64Array(6);
  x[0] = ra;
  x[1] = de;
  /* distance from parallax */
  let rdist: number;
  if (parall === 0) {
    rdist = 1000000000;
  } else {
    rdist = 1.0 / (parall * RADTODEG * 3600) * PARSEC_TO_AUNIT;
  }
  x[2] = rdist;
  x[3] = ra_pm / 36525.0;
  x[4] = de_pm / 36525.0;
  x[5] = radv / 36525.0;
  /* Cartesian space motion vector */
  swiPolcartSp(x, x);
  /* FK5 */
  if (epoch === 1950) {
    swiFK4_FK5(x, B1950);
    swiPrecess(x, B1950, 0, J_TO_J2000, swed);
    const x3 = new Float64Array(x.buffer, x.byteOffset + 24, 3);
    swiPrecess(x3, B1950, 0, J_TO_J2000, swed);
  }
  /* FK5 to ICRF, if epoch != 0 (ICRS data is already in ICRF) */
  if (epoch !== 0) {
    swiIcrs2fk5(x, iflag, true); // backward, i.e. to ICRF
    if (swiGetDenum(SEI_SUN, iflag, swed) >= 403) {
      swiBias(x, J2000, SEFLG_SPEED, false, swed);
    }
  }
  /* Earth/Sun for parallax, light deflection, aberration */
  const xearth = new Float64Array(6);
  const xearth_dt = new Float64Array(6);
  const xsun = new Float64Array(6);
  const xsun_dt = new Float64Array(6);
  const dt = PLAN_SPEED_INTV * 0.1;
  if (!(iflag & SEFLG_BARYCTR) && (!(iflag & SEFLG_HELCTR) || !(iflag & SEFLG_MOSEPH))) {
    const ret1 = mainPlanetBary(tjd - dt, SEI_EARTH, epheflag, iflag, false, xearth_dt, xearth_dt, xsun_dt, null, swed);
    if (ret1.retc !== OK) return { flags: ERR, xx: new Float64Array(6), serr: ret1.serr, starOut };
    const ret2 = mainPlanetBary(tjd, SEI_EARTH, epheflag, iflag, true, xearth, xearth, xsun, null, swed);
    if (ret2.retc !== OK) return { flags: ERR, xx: new Float64Array(6), serr: ret2.serr, starOut };
  }
  /* observer: geocenter or topocenter */
  const xobs = new Float64Array(6);
  const xobs_dt = new Float64Array(6);
  let xpo: Float64Array | null = null;
  let xpo_dt: Float64Array | null = null;
  if (iflag & SEFLG_TOPOCTR) {
    swiGetObserver(tjd - dt, iflag | SEFLG_NONUT, false, xobs_dt, swed);
    swiGetObserver(tjd, iflag | SEFLG_NONUT, false, xobs, swed);
    for (let i = 0; i <= 5; i++) {
      xobs[i] += xearth[i];
      xobs_dt[i] += xearth_dt[i];
    }
  } else if (!(iflag & SEFLG_BARYCTR) && (!(iflag & SEFLG_HELCTR) || !(iflag & SEFLG_MOSEPH))) {
    for (let i = 0; i <= 5; i++) {
      xobs[i] = xearth[i];
      xobs_dt[i] = xearth_dt[i];
    }
  }
  /* determine parallax reference point */
  if ((iflag & SEFLG_HELCTR) && (iflag & SEFLG_MOSEPH)) {
    xpo = null;
    xpo_dt = null;
  } else if (iflag & SEFLG_HELCTR) {
    xpo = xsun;
    xpo_dt = xsun_dt;
  } else if (iflag & SEFLG_BARYCTR) {
    xpo = null;
    xpo_dt = null;
  } else {
    xpo = xobs;
    xpo_dt = xobs_dt;
  }
  /* position and speed at tjd */
  if (xpo === null) {
    for (let i = 0; i <= 2; i++) {
      x[i] += t * x[i + 3];
    }
  } else {
    for (let i = 0; i <= 2; i++) {
      x[i] += t * x[i + 3];
      x[i] -= xpo[i];
      x[i + 3] -= xpo[i + 3];
    }
  }
  /* relativistic deflection of light */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOGDEFL) === 0) {
    swiDeflectLight(x, 0, iflag & SEFLG_SPEED, swed);
  }
  /* annual aberration of light */
  if ((iflag & SEFLG_TRUEPOS) === 0 && (iflag & SEFLG_NOABERR) === 0) {
    swiAberrLightEx(x, xpo!, xpo_dt!, dt, iflag & SEFLG_SPEED);
  }
  /* ICRS to J2000 */
  if (!(iflag & SEFLG_ICRS) && (swiGetDenum(SEI_SUN, iflag, swed) >= 403 || (iflag & SEFLG_BARYCTR))) {
    swiBias(x, tjd, iflag, false, swed);
  }
  /* save J2000 coordinates for sidereal positions */
  const xxsv = new Float64Array(6);
  for (let i = 0; i <= 5; i++) xxsv[i] = x[i];
  /* precession, equator 2000 → equator of date */
  let oe = swed.oec2000;
  if ((iflag & SEFLG_J2000) === 0) {
    swiPrecess(x, tjd, iflag, J2000_TO_J, swed);
    if (iflag & SEFLG_SPEED) {
      swiPrecessSpeed(x, tjd, iflag, J2000_TO_J, swed);
    }
    oe = swed.oec;
  }
  /* nutation */
  if (!(iflag & SEFLG_NONUT)) {
    swiNutate(x, iflag, false, swed);
  }
  /* transformation to ecliptic */
  if ((iflag & SEFLG_EQUATORIAL) === 0) {
    swiCoortrf2(x, x, oe.seps, oe.ceps);
    if (iflag & SEFLG_SPEED) {
      const x3 = new Float64Array(x.buffer, x.byteOffset + 24, 3);
      swiCoortrf2(x3, x3, oe.seps, oe.ceps);
    }
    if (!(iflag & SEFLG_NONUT)) {
      swiCoortrf2(x, x, swed.nut.snut, swed.nut.cnut);
      if (iflag & SEFLG_SPEED) {
        const x3 = new Float64Array(x.buffer, x.byteOffset + 24, 3);
        swiCoortrf2(x3, x3, swed.nut.snut, swed.nut.cnut);
      }
    }
  }
  /* sidereal positions */
  if (iflag & SEFLG_SIDEREAL) {
    if (swed.sidd.sidMode & SE_SIDBIT_ECL_T0) {
      swiTropRa2SidLon(xxsv, x, xxsv, iflag, swed);
      if (iflag & SEFLG_EQUATORIAL) {
        for (let i = 0; i <= 5; i++) x[i] = xxsv[i];
      }
    } else if (swed.sidd.sidMode & SE_SIDBIT_SSY_PLANE) {
      swiTropRa2SidLonSosy(xxsv, x, iflag, swed);
      if (iflag & SEFLG_EQUATORIAL) {
        for (let i = 0; i <= 5; i++) x[i] = xxsv[i];
      }
    } else {
      swiCartpolSp(x, x);
      const dayaRes = swiGetAyanamsaWithSpeed(swed, tjd, iflag);
      if (dayaRes.retc === ERR) {
        return { flags: ERR, xx: new Float64Array(6), serr: dayaRes.serr, starOut };
      }
      x[0] -= dayaRes.daya * DEGTORAD;
      x[3] -= dayaRes.dayaSpeed * DEGTORAD;
      swiPolcartSp(x, x);
    }
  }
  /* transformation to polar coordinates */
  if ((iflag & SEFLG_XYZ) === 0) {
    swiCartpolSp(x, x);
  }
  /* radians to degrees */
  if ((iflag & SEFLG_RADIANS) === 0 && (iflag & SEFLG_XYZ) === 0) {
    for (let i = 0; i < 2; i++) {
      x[i] *= RADTODEG;
      x[i + 3] *= RADTODEG;
    }
  }
  const xx = new Float64Array(6);
  for (let i = 0; i <= 5; i++) xx[i] = x[i];
  if (!(iflgsave & SEFLG_SPEED)) {
    for (let i = 3; i <= 5; i++) xx[i] = 0;
  }
  /* clean up ephemeris flag */
  if ((iflgsave & SEFLG_EPHMASK) === 0) {
    iflag = iflag & ~SEFLG_DEFAULTEPH;
  }
  iflag = iflag & ~SEFLG_SPEED;
  return { flags: iflag, xx, serr, starOut };
}

/** Fixed star position (ET) */
export function sweFixstar(
  swed: SweData, star: string, tjd: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string; starOut: string } {
  /* Try builtin star catalog first */
  const builtin = getBuiltinStar(star);
  if (builtin) {
    const parsed = fixstarCutString(builtin.record);
    if (!parsed) {
      return { flags: ERR, xx: new Float64Array(6), serr: 'error parsing builtin star data', starOut: star };
    }
    return fixstarCalcFromStruct(parsed.star, tjd, iflag, swed);
  }
  return {
    flags: ERR,
    xx: new Float64Array(6),
    serr: `star '${star}' not found in builtin catalog`,
    starOut: star,
  };
}

/** Fixed star position (UT) */
export function sweFixstarUt(
  swed: SweData, star: string, tjdUt: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string; starOut: string } {
  iflag = plausIflag(iflag, -1, tjdUt, swed);
  let epheflag = iflag & SEFLG_EPHMASK;
  if (epheflag === 0) {
    epheflag = SEFLG_SWIEPH;
    iflag |= SEFLG_SWIEPH;
  }
  const deltat = sweDeltatEx(tjdUt, iflag, swed);
  let ret = sweFixstar(swed, star, tjdUt + deltat, iflag);
  if (ret.flags !== ERR && (ret.flags & SEFLG_EPHMASK) !== epheflag) {
    const deltat2 = sweDeltatEx(tjdUt, ret.flags, swed);
    ret = sweFixstar(swed, star, tjdUt + deltat2, iflag);
  }
  return ret;
}

/** Fixed star magnitude */
export function sweFixstarMag(
  swed: SweData, star: string,
): { mag: number; serr: string; starOut: string } {
  const builtin = getBuiltinStar(star);
  if (builtin) {
    const parsed = fixstarCutString(builtin.record);
    if (!parsed) {
      return { mag: 0, serr: 'error parsing builtin star data', starOut: star };
    }
    return { mag: parsed.star.mag, serr: '', starOut: parsed.starOut };
  }
  return { mag: 0, serr: `star '${star}' not found in builtin catalog`, starOut: star };
}

/**
 * Fixed star position (hash-optimized variant, ET).
 * In this implementation, identical to sweFixstar (no external star catalog).
 * C: swe_fixstar2 (sweph.c:6817-6875)
 */
export function sweFixstar2(
  swed: SweData, star: string, tjd: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string; starOut: string } {
  return sweFixstar(swed, star, tjd, iflag);
}

/**
 * Fixed star position (hash-optimized variant, UT).
 * C: swe_fixstar2_ut (sweph.c:6877-6897)
 */
export function sweFixstar2Ut(
  swed: SweData, star: string, tjdUt: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string; starOut: string } {
  return sweFixstarUt(swed, star, tjdUt, iflag);
}

/**
 * Fixed star magnitude (hash-optimized variant).
 * C: swe_fixstar2_mag (sweph.c:6910-6943)
 */
export function sweFixstar2Mag(
  swed: SweData, star: string,
): { mag: number; serr: string; starOut: string } {
  return sweFixstarMag(swed, star);
}

/* ==================================================================
 * Cross functions — longitude/node crossings
 * C: swe_solcross, swe_mooncross, swe_mooncross_node, swe_helio_cross
 * ================================================================== */

const CROSS_PRECISION = 1 / 3600000.0; // one milliarcsecond

/** Normalize degree difference to [-180, 180). C: swe_difdeg2n */
export function sweDifdeg2n(p1: number, p2: number): number {
  const dif = sweDegnorm(p1 - p2);
  if (dif >= 180.0) return dif - 360.0;
  return dif;
}

/**
 * Find when Sun crosses a given ecliptic longitude (ET).
 * Returns JD of next crossing after jdEt. Error: returns jdEt - 1.
 * C: swe_solcross (sweph.c:8320-8342)
 */
export function sweSolcross(
  swed: SweData, x2cross: number, jdEt: number, iflag: number,
): { jd: number; serr: string } {
  const flag = iflag | SEFLG_SPEED;
  let res = sweCalc(swed, jdEt, SE_SUN, flag);
  if (res.flags < 0) return { jd: jdEt - 1, serr: res.serr };
  const xlp = 360.0 / 365.24;
  let dist = sweDegnorm(x2cross - res.xx[0]);
  let jd = jdEt + dist / xlp;
  for (;;) {
    res = sweCalc(swed, jd, SE_SUN, flag);
    if (res.flags < 0) return { jd: jdEt - 1, serr: res.serr };
    dist = sweDifdeg2n(x2cross, res.xx[0]);
    jd += dist / res.xx[3];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { jd, serr: res.serr };
}

/**
 * Find when Sun crosses a given ecliptic longitude (UT).
 * C: swe_solcross_ut (sweph.c:8354-8376)
 */
export function sweSolcrossUt(
  swed: SweData, x2cross: number, jdUt: number, iflag: number,
): { jd: number; serr: string } {
  const flag = iflag | SEFLG_SPEED;
  let res = sweCalcUt(swed, jdUt, SE_SUN, flag);
  if (res.flags < 0) return { jd: jdUt - 1, serr: res.serr };
  const xlp = 360.0 / 365.24;
  let dist = sweDegnorm(x2cross - res.xx[0]);
  let jd = jdUt + dist / xlp;
  for (;;) {
    res = sweCalcUt(swed, jd, SE_SUN, flag);
    if (res.flags < 0) return { jd: jdUt - 1, serr: res.serr };
    dist = sweDifdeg2n(x2cross, res.xx[0]);
    jd += dist / res.xx[3];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { jd, serr: res.serr };
}

/**
 * Find when Moon crosses a given ecliptic longitude (ET).
 * C: swe_mooncross (sweph.c:8388-8410)
 */
export function sweMooncross(
  swed: SweData, x2cross: number, jdEt: number, iflag: number,
): { jd: number; serr: string } {
  const flag = iflag | SEFLG_SPEED;
  let res = sweCalc(swed, jdEt, SE_MOON, flag);
  if (res.flags < 0) return { jd: jdEt - 1, serr: res.serr };
  const xlp = 360.0 / 27.32;
  let dist = sweDegnorm(x2cross - res.xx[0]);
  let jd = jdEt + dist / xlp;
  for (;;) {
    res = sweCalc(swed, jd, SE_MOON, flag);
    if (res.flags < 0) return { jd: jdEt - 1, serr: res.serr };
    dist = sweDifdeg2n(x2cross, res.xx[0]);
    jd += dist / res.xx[3];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { jd, serr: res.serr };
}

/**
 * Find when Moon crosses a given ecliptic longitude (UT).
 * C: swe_mooncross_ut (sweph.c:8424-8446)
 */
export function sweMooncrossUt(
  swed: SweData, x2cross: number, jdUt: number, iflag: number,
): { jd: number; serr: string } {
  const flag = iflag | SEFLG_SPEED;
  let res = sweCalcUt(swed, jdUt, SE_MOON, flag);
  if (res.flags < 0) return { jd: jdUt - 1, serr: res.serr };
  const xlp = 360.0 / 27.32;
  let dist = sweDegnorm(x2cross - res.xx[0]);
  let jd = jdUt + dist / xlp;
  for (;;) {
    res = sweCalcUt(swed, jd, SE_MOON, flag);
    if (res.flags < 0) return { jd: jdUt - 1, serr: res.serr };
    dist = sweDifdeg2n(x2cross, res.xx[0]);
    jd += dist / res.xx[3];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { jd, serr: res.serr };
}

/**
 * Find next Moon crossing over its node (zero latitude), ET.
 * C: swe_mooncross_node (sweph.c:8455-8485)
 */
export function sweMooncrossNode(
  swed: SweData, jdEt: number, iflag: number,
): { jd: number; xlon: number; xlat: number; serr: string } {
  const flag = iflag | SEFLG_SPEED;
  let res = sweCalc(swed, jdEt, SE_MOON, flag);
  if (res.flags < 0) return { jd: jdEt - 1, xlon: 0, xlat: 0, serr: res.serr };
  let xlat = res.xx[1];
  let jd = jdEt + 1;
  /* advance day-by-day until sign change in latitude */
  for (;;) {
    res = sweCalc(swed, jd, SE_MOON, flag);
    if (res.flags < 0) return { jd: jdEt - 1, xlon: 0, xlat: 0, serr: res.serr };
    if ((res.xx[1] >= 0 && xlat < 0) || (res.xx[1] < 0 && xlat > 0)) break;
    jd += 1;
  }
  /* Newton iteration on latitude */
  let dist = res.xx[1];
  for (;;) {
    jd -= dist / res.xx[4];
    res = sweCalc(swed, jd, SE_MOON, flag);
    if (res.flags < 0) return { jd: jdEt - 1, xlon: 0, xlat: 0, serr: res.serr };
    dist = res.xx[1];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { jd, xlon: res.xx[0], xlat: res.xx[1], serr: res.serr };
}

/**
 * Find next Moon crossing over its node (zero latitude), UT.
 * C: swe_mooncross_node_ut (sweph.c:8492-8522)
 */
export function sweMooncrossNodeUt(
  swed: SweData, jdUt: number, iflag: number,
): { jd: number; xlon: number; xlat: number; serr: string } {
  const flag = iflag | SEFLG_SPEED;
  let res = sweCalcUt(swed, jdUt, SE_MOON, flag);
  if (res.flags < 0) return { jd: jdUt - 1, xlon: 0, xlat: 0, serr: res.serr };
  let xlat = res.xx[1];
  let jd = jdUt + 1;
  for (;;) {
    res = sweCalcUt(swed, jd, SE_MOON, flag);
    if (res.flags < 0) return { jd: jdUt - 1, xlon: 0, xlat: 0, serr: res.serr };
    if ((res.xx[1] >= 0 && xlat < 0) || (res.xx[1] < 0 && xlat > 0)) break;
    jd += 1;
  }
  let dist = res.xx[1];
  for (;;) {
    jd -= dist / res.xx[4];
    res = sweCalcUt(swed, jd, SE_MOON, flag);
    if (res.flags < 0) return { jd: jdUt - 1, xlon: 0, xlat: 0, serr: res.serr };
    dist = res.xx[1];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { jd, xlon: res.xx[0], xlat: res.xx[1], serr: res.serr };
}

/**
 * Find when a planet crosses a heliocentric longitude (ET).
 * dir >= 0: next crossing; dir < 0: previous crossing.
 * C: swe_helio_cross (sweph.c:8532-8568)
 */
export function sweHelioCross(
  swed: SweData, ipl: number, x2cross: number, jdEt: number, iflag: number, dir: number,
): { retval: number; jdCross: number; serr: string } {
  const flag = iflag | SEFLG_SPEED | SEFLG_HELCTR;
  if (ipl === SE_SUN || ipl === SE_MOON ||
      (ipl >= SE_MEAN_NODE && ipl <= SE_OSCU_APOG) ||
      (ipl >= SE_INTP_APOG && ipl < SE_NPLANETS)) {
    return { retval: ERR, jdCross: 0, serr: `swe_helio_cross: not possible for object ${ipl}` };
  }
  let res = sweCalc(swed, jdEt, ipl, flag);
  if (res.flags < 0) return { retval: ERR, jdCross: 0, serr: res.serr };
  let xlp = res.xx[3];
  if (ipl === SE_CHIRON) xlp = 0.01971; // mean speed
  let dist = sweDegnorm(x2cross - res.xx[0]);
  let jd: number;
  if (dir >= 0) {
    jd = jdEt + dist / xlp;
  } else {
    dist = 360.0 - dist;
    jd = jdEt - dist / xlp;
  }
  for (;;) {
    res = sweCalc(swed, jd, ipl, flag);
    if (res.flags < 0) return { retval: ERR, jdCross: 0, serr: res.serr };
    dist = sweDifdeg2n(x2cross, res.xx[0]);
    jd += dist / res.xx[3];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { retval: OK, jdCross: jd, serr: res.serr };
}

/**
 * Find when a planet crosses a heliocentric longitude (UT).
 * C: swe_helio_cross_ut (sweph.c:8578-8614)
 */
export function sweHelioCrossUt(
  swed: SweData, ipl: number, x2cross: number, jdUt: number, iflag: number, dir: number,
): { retval: number; jdCross: number; serr: string } {
  const flag = iflag | SEFLG_SPEED | SEFLG_HELCTR;
  if (ipl === SE_SUN || ipl === SE_MOON ||
      (ipl >= SE_MEAN_NODE && ipl <= SE_OSCU_APOG) ||
      (ipl >= SE_INTP_APOG && ipl < SE_NPLANETS)) {
    return { retval: ERR, jdCross: 0, serr: `swe_helio_cross: not possible for object ${ipl}` };
  }
  let res = sweCalcUt(swed, jdUt, ipl, flag);
  if (res.flags < 0) return { retval: ERR, jdCross: 0, serr: res.serr };
  let xlp = res.xx[3];
  if (ipl === SE_CHIRON) xlp = 0.01971;
  let dist = sweDegnorm(x2cross - res.xx[0]);
  let jd: number;
  if (dir >= 0) {
    jd = jdUt + dist / xlp;
  } else {
    dist = 360.0 - dist;
    jd = jdUt - dist / xlp;
  }
  for (;;) {
    res = sweCalcUt(swed, jd, ipl, flag);
    if (res.flags < 0) return { retval: ERR, jdCross: 0, serr: res.serr };
    dist = sweDifdeg2n(x2cross, res.xx[0]);
    jd += dist / res.xx[3];
    if (Math.abs(dist) < CROSS_PRECISION) break;
  }
  return { retval: OK, jdCross: jd, serr: res.serr };
}

/* ==================================================================
 * Planetocentric calculations
 * C: swe_calc_pctr (sweph.c:8041-8282)
 * ================================================================== */

/**
 * Compute position of ipl as seen from iplctr (planetocentric).
 * E.g. ipl=SE_MARS, iplctr=SE_JUPITER gives Mars as seen from Jupiter.
 * C: swe_calc_pctr (sweph.c:8041-8282)
 */
export function sweCalcPctr(
  swed: SweData, tjd: number, ipl: number, iplctr: number, iflag: number,
): { flags: number; xx: Float64Array; serr: string } {
  const xxret = new Float64Array(6);
  let serr = '';
  if (ipl === iplctr) {
    return { flags: ERR, xx: xxret, serr: `ipl and iplctr (= ${ipl}) must not be identical\n` };
  }
  iflag = plausIflag(iflag, ipl, tjd, swed);
  const epheflag = iflag & SEFLG_EPHMASK;
  /* initialize obliquity and nutation */
  const dt0 = sweDeltatEx(tjd, epheflag, swed);
  sweCalc(swed, tjd + dt0, SE_ECL_NUT, iflag);
  iflag &= ~(SEFLG_HELCTR | SEFLG_BARYCTR);
  let iflag2 = epheflag;
  iflag2 |= (SEFLG_BARYCTR | SEFLG_J2000 | SEFLG_ICRS | SEFLG_TRUEPOS | SEFLG_EQUATORIAL | SEFLG_XYZ | SEFLG_SPEED);
  iflag2 |= (SEFLG_NOABERR | SEFLG_NOGDEFL);
  /* center body position */
  let res = sweCalc(swed, tjd, iplctr, iflag2);
  if (res.flags < 0) return { flags: ERR, xx: xxret, serr: res.serr };
  serr = res.serr;
  const xxctr = [res.xx[0], res.xx[1], res.xx[2], res.xx[3], res.xx[4], res.xx[5]];
  /* target body position */
  res = sweCalc(swed, tjd, ipl, iflag2);
  if (res.flags < 0) return { flags: ERR, xx: xxret, serr: res.serr };
  if (res.serr) serr = res.serr;
  const xx = [res.xx[0], res.xx[1], res.xx[2], res.xx[3], res.xx[4], res.xx[5]];
  const xx0 = [xx[0], xx[1], xx[2], xx[3], xx[4], xx[5]];
  /* light-time correction */
  let dtsaveForDefl = 0;
  const xxctr2 = [0, 0, 0, 0, 0, 0];
  const xxsp = [0, 0, 0, 0, 0, 0];
  if (!(iflag & SEFLG_TRUEPOS)) {
    const niter = 1;
    if (iflag & SEFLG_SPEED) {
      const xxsv0 = [0, 0, 0];
      for (let i = 0; i <= 2; i++) {
        xxsv0[i] = xx[i] - xx[i + 3];
        xxsp[i] = xxsv0[i];
      }
      for (let j = 0; j <= niter; j++) {
        const dx = [0, 0, 0];
        for (let i = 0; i <= 2; i++) {
          dx[i] = xxsp[i] - (xxctr[i] - xxctr[i + 3]);
        }
        const dt = Math.sqrt(squareSum(dx)) * AUNIT / CLIGHT / 86400.0;
        for (let i = 0; i <= 2; i++)
          xxsp[i] = xxsv0[i] - dt * xx0[i + 3];
      }
      for (let i = 0; i <= 2; i++)
        xxsp[i] = xxsv0[i] - xxsp[i];
    }
    /* dt and t(apparent) */
    let t = tjd;
    for (let j = 0; j <= niter; j++) {
      const dx = [0, 0, 0];
      for (let i = 0; i <= 2; i++) {
        dx[i] = xx[i] - xxctr[i];
      }
      const dt = Math.sqrt(squareSum(dx)) * AUNIT / CLIGHT / 86400.0;
      t = tjd - dt;
      dtsaveForDefl = dt;
      for (let i = 0; i <= 2; i++)
        xx[i] = xx0[i] - dt * xx0[i + 3];
    }
    /* part of daily motion from change of dt */
    if (iflag & SEFLG_SPEED) {
      for (let i = 0; i <= 2; i++)
        xxsp[i] = xx0[i] - xx[i] - xxsp[i];
    }
    res = sweCalc(swed, t, iplctr, iflag2);
    if (res.flags < 0) return { flags: ERR, xx: xxret, serr: res.serr };
    for (let i = 0; i <= 5; i++) xxctr2[i] = res.xx[i];
    res = sweCalc(swed, t, ipl, iflag2);
    if (res.flags < 0) return { flags: ERR, xx: xxret, serr: res.serr };
    for (let i = 0; i <= 5; i++) xx[i] = res.xx[i];
  }
  /* conversion to planetocenter */
  for (let i = 0; i <= 5; i++)
    xx[i] -= xxctr[i];
  if (!(iflag & SEFLG_TRUEPOS)) {
    if (iflag & SEFLG_SPEED)
      for (let i = 3; i <= 5; i++)
        xx[i] -= xxsp[i - 3];
  }
  if (!(iflag & SEFLG_SPEED))
    for (let i = 3; i <= 5; i++) xx[i] = 0;
  /* relativistic deflection of light */
  if (!(iflag & SEFLG_TRUEPOS) && !(iflag & SEFLG_NOGDEFL))
    swiDeflectLight(xx, dtsaveForDefl, iflag, swed);
  /* annual aberration of light */
  if (!(iflag & SEFLG_TRUEPOS) && !(iflag & SEFLG_NOABERR)) {
    swiAberrLight(xx, xxctr, iflag);
    if (iflag & SEFLG_SPEED)
      for (let i = 3; i <= 5; i++)
        xx[i] += xxctr[i] - xxctr2[i];
  }
  if (!(iflag & SEFLG_SPEED))
    for (let i = 3; i <= 5; i++) xx[i] = 0;
  /* ICRS to J2000 */
  if (!(iflag & SEFLG_ICRS) && swiGetDenum(ipl, epheflag, swed) >= 403) {
    swiBias(xx, tjd, iflag, false, swed);
  }
  /* save J2000 coordinates for sidereal */
  const xxsv = new Array(24).fill(0);
  for (let i = 0; i <= 5; i++) xxsv[i] = xx[i];
  /* precession */
  let oe = swed.oec2000;
  if (!(iflag & SEFLG_J2000)) {
    swiPrecess(xx, tjd, iflag, J2000_TO_J, swed);
    if (iflag & SEFLG_SPEED) {
      const spd = [xx[3], xx[4], xx[5]];
      swiPrecessSpeed(spd, tjd, iflag, J2000_TO_J, swed);
      xx[3] = spd[0]; xx[4] = spd[1]; xx[5] = spd[2];
    }
    oe = swed.oec;
  }
  /* nutation */
  if (!(iflag & SEFLG_NONUT))
    swiNutate(xx, iflag, false, swed);
  /* fill xreturn layout */
  const xreturn = new Array(24).fill(0);
  /* equatorial cartesian */
  for (let i = 0; i <= 5; i++) xreturn[18 + i] = xx[i];
  /* ecliptic conversion */
  swiCoortrf2(xx, xx, oe.seps, oe.ceps);
  if (iflag & SEFLG_SPEED)
    swiCoortrf2(xx, xx, oe.seps, oe.ceps, 3, 3);
  if (!(iflag & SEFLG_NONUT)) {
    swiCoortrf2(xx, xx, swed.nut.snut, swed.nut.cnut);
    if (iflag & SEFLG_SPEED)
      swiCoortrf2(xx, xx, swed.nut.snut, swed.nut.cnut, 3, 3);
  }
  /* ecliptic cartesian */
  for (let i = 0; i <= 5; i++) xreturn[6 + i] = xx[i];
  /* sidereal */
  if (iflag & SEFLG_SIDEREAL) {
    if (swed.sidd.sidMode & SE_SIDBIT_ECL_T0) {
      swiTropRa2SidLon(xxsv, xreturn.slice(6), xreturn.slice(18), iflag, swed);
    } else if (swed.sidd.sidMode & SE_SIDBIT_SSY_PLANE) {
      swiTropRa2SidLonSosy(xxsv, xreturn.slice(6), iflag, swed);
    } else {
      /* traditional: convert to polar, apply ayanamsa, convert back */
      const eclPol = [0, 0, 0, 0, 0, 0];
      swiCartpolSp([xreturn[6], xreturn[7], xreturn[8], xreturn[9], xreturn[10], xreturn[11]], eclPol);
      for (let i = 0; i <= 5; i++) xreturn[i] = eclPol[i];
      for (let i = 0; i < 24; i++) xxsv[i] = xreturn[i];
      const ayaRes = swiGetAyanamsaWithSpeed(swed, tjd, iflag);
      if (ayaRes.retc === ERR) return { flags: ERR, xx: xxret, serr: ayaRes.serr };
      for (let i = 0; i < 24; i++) xreturn[i] = xxsv[i];
      xreturn[0] -= ayaRes.daya * DEGTORAD;
      xreturn[3] -= ayaRes.dayaSpeed * DEGTORAD;
      const eclCart = [0, 0, 0, 0, 0, 0];
      swiPolcartSp(xreturn, eclCart);
      for (let i = 0; i <= 5; i++) xreturn[6 + i] = eclCart[i];
    }
  }
  /* polar coordinates */
  const eqPol = [0, 0, 0, 0, 0, 0];
  swiCartpolSp([xreturn[18], xreturn[19], xreturn[20], xreturn[21], xreturn[22], xreturn[23]], eqPol);
  for (let i = 0; i <= 5; i++) xreturn[12 + i] = eqPol[i];
  const eclPol2 = [0, 0, 0, 0, 0, 0];
  swiCartpolSp([xreturn[6], xreturn[7], xreturn[8], xreturn[9], xreturn[10], xreturn[11]], eclPol2);
  for (let i = 0; i <= 5; i++) xreturn[i] = eclPol2[i];
  /* radians to degrees */
  for (let i = 0; i < 2; i++) {
    xreturn[i] *= RADTODEG;
    xreturn[i + 3] *= RADTODEG;
    xreturn[i + 12] *= RADTODEG;
    xreturn[i + 15] *= RADTODEG;
  }
  /* select output based on flags */
  let offset = 0;
  if (iflag & SEFLG_EQUATORIAL) {
    offset = (iflag & SEFLG_XYZ) ? 18 : 12;
  } else {
    offset = (iflag & SEFLG_XYZ) ? 6 : 0;
  }
  for (let i = 0; i < 6; i++) xxret[i] = xreturn[offset + i];
  if (!(iflag & SEFLG_SPEED))
    for (let i = 3; i < 6; i++) xxret[i] = 0;
  if (iflag & SEFLG_RADIANS) {
    for (let i = 0; i < 2; i++) xxret[i] *= DEGTORAD;
    if (iflag & SEFLG_SPEED)
      for (let i = 3; i < 5; i++) xxret[i] *= DEGTORAD;
  }
  /* normalize longitude */
  if (!(iflag & SEFLG_XYZ) && !(iflag & SEFLG_RADIANS)) {
    xxret[0] = sweDegnorm(xxret[0]);
  }
  return { flags: iflag, xx: xxret, serr };
}

/* ================================================================
 * JPL file loading and misc public functions
 * ================================================================ */

/** Map DE number to tidal acceleration (C: swi_get_tid_acc switch) */
function tidAccForDenum(denum: number): number {
  switch (denum) {
    case 200: return SE_TIDAL_DE200;
    case 403: return SE_TIDAL_DE403;
    case 404: return SE_TIDAL_DE404;
    case 405: return SE_TIDAL_DE405;
    case 406: return SE_TIDAL_DE406;
    case 421: return SE_TIDAL_DE421;
    case 422: return SE_TIDAL_DE422;
    case 430: return SE_TIDAL_DE430;
    case 431: return SE_TIDAL_DE431;
    case 440: case 441: return SE_TIDAL_DE441;
    default: return SE_TIDAL_DEFAULT;
  }
}

/**
 * Load a JPL binary ephemeris file from an ArrayBuffer.
 * This is the user-facing API for loading JPL DE files.
 */
export function sweLoadJplFile(
  swed: SweData, buffer: ArrayBuffer, fname?: string,
): { retc: number; serr: string } {
  swiInitSwedIfStart(swed);
  const reader = new SE1FileReader(buffer);
  const ss = new Float64Array(3);
  const serr: string[] = [''];
  const retc = swiOpenJplFile(swed, ss, reader, serr);
  if (retc !== OK) {
    return { retc, serr: serr[0] };
  }
  swed.jplFileIsOpen = true;
  swed.jpldenum = swiGetJplDenum(swed);
  if (fname) swed.jplfnam = fname;
  /* Set tidal acceleration based on DE number (if not manual) */
  if (!swed.isTidAccManual) {
    swed.tidAcc = tidAccForDenum(swed.jpldenum);
  }
  return { retc: OK, serr: serr[0] };
}

/**
 * Get metadata of loaded SE1 ephemeris file.
 * C: swe_get_current_file_data
 */
export function sweGetCurrentFileData(swed: SweData, ifno: number): {
  fname: string; tfstart: number; tfend: number; denum: number;
} | null {
  if (ifno < 0 || ifno > 4) return null;
  const pfp = swed.fidat[ifno];
  if (!pfp.fnam) return null;
  return { fname: pfp.fnam, tfstart: pfp.tfstart, tfend: pfp.tfend, denum: pfp.swephDenum };
}

/**
 * Get library path (not meaningful in JS, returns empty string).
 * C: swe_get_library_path
 */
export function sweGetLibraryPath(): string {
  return '';
}
