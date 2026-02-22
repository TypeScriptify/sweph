/*************************************************************
 * Swiss Ephemeris TypeScript type definitions
 * Translated from sweph.h, swephexp.h, sweodef.h, swehouse.h
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland.
 * All rights reserved. (AGPL)
 *************************************************************/

import {
  SEI_NPLANETS, SEI_NNODE_ETC, SE_NPLANETS,
  SEI_NEPHFILES, SEI_FILE_NMAXPLAN, SEI_NMODELS,
} from './constants';

import type { SE1FileReader } from './file-reader';

/* ---- Public result types ---- */

/** Result from swe_calc / swe_calc_ut */
export interface CalcResult {
  longitude: number;
  latitude: number;
  distance: number;
  longitudeSpeed: number;
  latitudeSpeed: number;
  distanceSpeed: number;
  flags: number;
  error?: string;
}

/** Result from swe_houses */
export interface HouseResult {
  cusps: number[];         // cusps[1]..cusps[12] (index 0 unused, to match C convention)
  ascendant: number;
  mc: number;              // Midheaven
  armc: number;            // ARMC (sidereal time in degrees)
  vertex: number;
  equatorialAscendant: number;
  coAscendantKoch: number;
  coAscendantMunkasey: number;
  polarAscendant: number;
}

/** Result from swe_revjul */
export interface DateResult {
  year: number;
  month: number;
  day: number;
  hour: number;            // fractional hours
}

/** Result from swe_utc_to_jd */
export interface UtcToJdResult {
  tjdEt: number;           // Julian day in ET
  tjdUt: number;           // Julian day in UT1
  error?: string;
}

/** Result from swe_jdet_to_utc / swe_jdut1_to_utc */
export interface JdToUtcResult {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/* ---- Internal data structures ---- */

/** Obliquity of ecliptic (struct epsilon) */
export interface Epsilon {
  teps: number;            // JD for which eps was computed
  eps: number;             // obliquity in radians
  seps: number;            // sin(eps)
  ceps: number;            // cos(eps)
}

export function createEpsilon(): Epsilon {
  return { teps: 0, eps: 0, seps: 0, ceps: 0 };
}

/** Nutation data (struct nut) */
export interface Nut {
  tnut: number;
  nutlo: [number, number];   // nutation in longitude and obliquity
  snut: number;              // sin(nut obliquity)
  cnut: number;              // cos(nut obliquity)
  matrix: number[][];        // 3x3 nutation matrix
}

export function createNut(): Nut {
  return {
    tnut: 0,
    nutlo: [0, 0],
    snut: 0,
    cnut: 0,
    matrix: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  };
}

/** Planetary data from ephemeris (struct plan_data) */
export interface PlanData {
  ibdy: number;              // internal body number
  iflg: number;              // SEI_FLG_HELIO, SEI_FLG_ROTATE, etc.
  ncoe: number;              // polynomial order + 1
  lndx0: number;             // file position of planet's index
  nndx: number;              // number of index entries
  tfstart: number;           // ephemeris start JD
  tfend: number;             // ephemeris end JD
  dseg: number;              // segment size in days
  telem: number;             // epoch of orbital elements
  prot: number;
  qrot: number;
  dprot: number;
  dqrot: number;
  rmax: number;              // normalisation factor of Chebyshev coefficients
  peri: number;              // for reference ellipse
  dperi: number;
  refep: Float64Array | null;  // Chebyshev coefficients of reference ellipse (2*ncoe)
  tseg0: number;             // start JD of current segment
  tseg1: number;             // end JD of current segment
  segp: Float64Array | null; // unpacked Chebyshev coefficients (3*ncoe)
  neval: number;             // how many coefficients to evaluate
  teval: number;             // time of last evaluation
  iephe: number;             // which ephemeris was used
  x: Float64Array;           // position & speed, equatorial J2000 (6 elements)
  xflgs: number;
  xreturn: Float64Array;     // return positions (24 elements: 4 coord systems × 6)
}

export function createPlanData(): PlanData {
  return {
    ibdy: 0, iflg: 0, ncoe: 0, lndx0: 0, nndx: 0,
    tfstart: 0, tfend: 0, dseg: 0, telem: 0,
    prot: 0, qrot: 0, dprot: 0, dqrot: 0, rmax: 0,
    peri: 0, dperi: 0,
    refep: null, tseg0: 0, tseg1: 0, segp: null,
    neval: 0, teval: 0, iephe: 0,
    x: new Float64Array(6),
    xflgs: 0,
    xreturn: new Float64Array(24),
  };
}

/** File data (struct file_data) */
export interface FileData {
  fnam: string;
  fversion: number;
  astnam: string;
  swephDenum: number;        // DE number of source JPL ephemeris
  tfstart: number;
  tfend: number;
  iflg: number;              // byte order flags
  npl: number;               // how many planets in file
  ipl: Int32Array;           // planet numbers
  reader: SE1FileReader | null;  // replaces C FILE*
}

export function createFileData(): FileData {
  return {
    fnam: '', fversion: 0, astnam: '', swephDenum: 0,
    tfstart: 0, tfend: 0, iflg: 0, npl: 0,
    ipl: new Int32Array(SEI_FILE_NMAXPLAN),
    reader: null,
  };
}

/** General constants from ephemeris file (struct gen_const) */
export interface GenConst {
  clight: number;
  aunit: number;
  helgravconst: number;
  ratme: number;
  sunradius: number;
}

export function createGenConst(): GenConst {
  return { clight: 0, aunit: 0, helgravconst: 0, ratme: 0, sunradius: 0 };
}

/** Saved calculation positions (struct save_positions) */
export interface SavePositions {
  ipl: number;
  tsave: number;
  iflgsave: number;
  xsaves: Float64Array;     // 24 doubles (4 coord systems × 6)
}

export function createSavePositions(): SavePositions {
  return {
    ipl: 0, tsave: 0, iflgsave: 0,
    xsaves: new Float64Array(24),
  };
}

/** Node/apside data (struct node_data, but actually uses plan_data in C) */
export type NodeData = PlanData;
export const createNodeData = createPlanData;

/** Topocentric observer (struct topo_data) */
export interface TopoData {
  geolon: number;
  geolat: number;
  geoalt: number;
  teval: number;
  tjdUt: number;
  xobs: Float64Array;       // 6 elements
}

export function createTopoData(): TopoData {
  return {
    geolon: 0, geolat: 0, geoalt: 0,
    teval: 0, tjdUt: 0,
    xobs: new Float64Array(6),
  };
}

/** Sidereal mode data (struct sid_data) */
export interface SidData {
  sidMode: number;
  ayanT0: number;
  t0: number;
  t0IsUT: boolean;
}

export function createSidData(): SidData {
  return { sidMode: 0, ayanT0: 0, t0: 0, t0IsUT: false };
}

/** Nutation interpolation data (struct interpol) */
export interface Interpol {
  tjdNut0: number;
  tjdNut2: number;
  nutDpsi0: number;
  nutDpsi1: number;
  nutDpsi2: number;
  nutDeps0: number;
  nutDeps1: number;
  nutDeps2: number;
}

export function createInterpol(): Interpol {
  return {
    tjdNut0: 0, tjdNut2: 0,
    nutDpsi0: 0, nutDpsi1: 0, nutDpsi2: 0,
    nutDeps0: 0, nutDeps1: 0, nutDeps2: 0,
  };
}

/** Moshier planet table (struct plantbl) */
export interface Plantbl {
  maxHarmonic: number[];     // 9 elements
  maxPowerOfT: number;
  argTbl: Int8Array;
  lonTbl: Float64Array;
  latTbl: Float64Array;
  radTbl: Float64Array;
  distance: number;
}

/** House calculation data (struct houses from swehouse.h) */
export interface Houses {
  cusp: Float64Array;        // 37 cusps
  cuspSpeed: Float64Array;   // 37 cusp speeds
  ac: number;
  acSpeed: number;
  mc: number;
  mcSpeed: number;
  armcSpeed: number;
  vertex: number;
  vertexSpeed: number;
  equasc: number;
  equascSpeed: number;
  coasc1: number;
  coasc1Speed: number;
  coasc2: number;
  coasc2Speed: number;
  polasc: number;
  polascSpeed: number;
  sundec: number;
  doSpeed: boolean;
  doHspeed: boolean;
  doInterpol: boolean;
  serr: string;
}

export function createHouses(): Houses {
  return {
    cusp: new Float64Array(37),
    cuspSpeed: new Float64Array(37),
    ac: 0, acSpeed: 0,
    mc: 0, mcSpeed: 0,
    armcSpeed: 0,
    vertex: 0, vertexSpeed: 0,
    equasc: 0, equascSpeed: 0,
    coasc1: 0, coasc1Speed: 0,
    coasc2: 0, coasc2Speed: 0,
    polasc: 0, polascSpeed: 0,
    sundec: 0,
    doSpeed: false,
    doHspeed: false,
    doInterpol: false,
    serr: '',
  };
}

/** JPL ephemeris save state (struct jpl_save) */
export interface JplSave {
  jplReader: SE1FileReader | null;
  doReorder: boolean;
  ehCval: Float64Array;      // [400]
  ehSs: Float64Array;        // [3] start, end, segment size
  ehAu: number;
  ehEmrat: number;
  ehDenum: number;
  ehNcon: number;
  ehIpt: Int32Array;         // [39]
  chCnam: string;
  pv: Float64Array;          // [78]
  pvsun: Float64Array;       // [6]
  buf: Float64Array;         // [1500]
  pc: Float64Array;          // [18]
  vc: Float64Array;          // [18]
  ac: Float64Array;          // [18]
  jc: Float64Array;          // [18]
  doKm: boolean;
  // static TLS vars from interp()
  interpNp: number;
  interpNv: number;
  interpNac: number;
  interpNjk: number;
  interpTwot: number;
  // static TLS vars from state()
  stateIrecsz: number;
  stateNrl: number;
  stateNcoeffs: number;
  stateLpt: Int32Array;      // [3]
}

export function createJplSave(): JplSave {
  return {
    jplReader: null,
    doReorder: false,
    ehCval: new Float64Array(400),
    ehSs: new Float64Array(3),
    ehAu: 0,
    ehEmrat: 0,
    ehDenum: 0,
    ehNcon: 0,
    ehIpt: new Int32Array(39),
    chCnam: '',
    pv: new Float64Array(78),
    pvsun: new Float64Array(6),
    buf: new Float64Array(1500),
    pc: new Float64Array(18),
    vc: new Float64Array(18),
    ac: new Float64Array(18),
    jc: new Float64Array(18),
    doKm: false,
    interpNp: 0,
    interpNv: 0,
    interpNac: 0,
    interpNjk: 0,
    interpTwot: 0,
    stateIrecsz: 0,
    stateNrl: 0,
    stateNcoeffs: 0,
    stateLpt: new Int32Array(3),
  };
}

/** Main Swiss Ephemeris state (struct swe_data) */
export interface SweData {
  ephePathIsSet: boolean;
  jplFileIsOpen: boolean;
  ephepath: string;
  jplfnam: string;
  jpldenum: number;
  lastEpheflag: number;
  geoposIsSet: boolean;
  ayanaIsSet: boolean;
  isOldStarfile: boolean;
  eopTjdBeg: number;
  eopTjdBegHorizons: number;
  eopTjdEnd: number;
  eopTjdEndAdd: number;
  eopDpsiLoaded: number;
  tidAcc: number;
  isTidAccManual: boolean;
  initDtDone: boolean;
  swedIsInitialised: boolean;
  deltaTUserdefIsSet: boolean;
  deltaTUserdef: number;
  astG: number;
  astH: number;
  astDiam: number;
  astelem: string;
  iSavedPlanetName: number;
  savedPlanetName: string;
  dpsi: Float64Array | null;
  deps: Float64Array | null;
  timeout: number;
  astroModels: Int32Array;
  doInterpolateNut: boolean;
  interpol: Interpol;
  fidat: FileData[];
  gcdat: GenConst;
  pldat: PlanData[];
  nddat: PlanData[];         // node data uses PlanData
  savedat: SavePositions[];
  oec: Epsilon;
  oec2000: Epsilon;
  nut: Nut;
  nut2000: Nut;
  nutv: Nut;
  topd: TopoData;
  sidd: SidData;
  nFixstarsReal: number;
  nFixstarsNamed: number;
  nFixstarsRecords: number;
  jplSave: JplSave | null;
  ephemerisFiles?: Map<string, ArrayBuffer>;
}

/** Create the default SweData state */
export function createDefaultSweData(): SweData {
  const fidat: FileData[] = [];
  for (let i = 0; i < SEI_NEPHFILES; i++) fidat.push(createFileData());
  const pldat: PlanData[] = [];
  for (let i = 0; i < SEI_NPLANETS; i++) pldat.push(createPlanData());
  const nddat: PlanData[] = [];
  for (let i = 0; i < SEI_NNODE_ETC; i++) nddat.push(createPlanData());
  const savedat: SavePositions[] = [];
  for (let i = 0; i < SE_NPLANETS + 1; i++) savedat.push(createSavePositions());

  return {
    ephePathIsSet: false,
    jplFileIsOpen: false,
    ephepath: '',
    jplfnam: '',
    jpldenum: 0,
    lastEpheflag: 0,
    geoposIsSet: false,
    ayanaIsSet: false,
    isOldStarfile: false,
    eopTjdBeg: 0,
    eopTjdBegHorizons: 0,
    eopTjdEnd: 0,
    eopTjdEndAdd: 0,
    eopDpsiLoaded: 0,
    tidAcc: 0,
    isTidAccManual: false,
    initDtDone: false,
    swedIsInitialised: false,
    deltaTUserdefIsSet: false,
    deltaTUserdef: 0,
    astG: 0,
    astH: 0,
    astDiam: 0,
    astelem: '',
    iSavedPlanetName: 0,
    savedPlanetName: '',
    dpsi: null,
    deps: null,
    timeout: 0,
    astroModels: new Int32Array(SEI_NMODELS),
    doInterpolateNut: false,
    interpol: createInterpol(),
    fidat,
    gcdat: createGenConst(),
    pldat,
    nddat,
    savedat,
    oec: createEpsilon(),
    oec2000: createEpsilon(),
    nut: createNut(),
    nut2000: createNut(),
    nutv: createNut(),
    topd: createTopoData(),
    sidd: createSidData(),
    nFixstarsReal: 0,
    nFixstarsNamed: 0,
    nFixstarsRecords: 0,
    jplSave: null,
  };
}
