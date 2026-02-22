/* ================================================================
 * SwissEph Wrapper — Public Return Types
 * ================================================================ */

// Re-export existing types that already have good shape
export type { HouseResult, DateResult, UtcToJdResult, JdToUtcResult } from '../types';
export type { SplitDegResult } from '../swephlib';

/* ---- Core position ---- */

export interface PlanetPosition {
  longitude: number;
  latitude: number;
  distance: number;
  longitudeSpeed: number;
  latitudeSpeed: number;
  distanceSpeed: number;
  /** Flags actually used for the computation (may differ from input) */
  flags: number;
}

export interface StarPosition extends PlanetPosition {
  /** Canonical star name returned by the engine */
  starName: string;
}

/* ---- Nodes & Orbital ---- */

export interface NodesApsides {
  ascendingNode: PlanetPosition;
  descendingNode: PlanetPosition;
  perihelion: PlanetPosition;
  aphelion: PlanetPosition;
}

export interface OrbitalElements {
  semiAxis: number;          // dret[0]  a
  eccentricity: number;      // dret[1]  e
  inclination: number;       // dret[2]  i (deg)
  ascNode: number;           // dret[3]  Ω (deg)
  argPerihelion: number;     // dret[4]  ω (deg)
  longPerihelion: number;    // dret[5]  ϖ (deg)
  meanAnomaly: number;       // dret[6]  M (deg)
  meanLongitude: number;     // dret[7]  L (deg)
  dailyMotion: number;       // dret[8]  (deg/day)
  tropicalPeriod: number;    // dret[9]  (years)
  synodicPeriod: number;     // dret[10] (days)
  meanDailyMotion: number;   // dret[11] (deg/day)
  meanLongJ2000: number;     // dret[12]
  meanLongOfDate: number;    // dret[13]
  meanLongSpeed: number;     // dret[14]
  nodeJ2000: number;         // dret[15]
  nodeOfDate: number;        // dret[16]
  nodeSpeed: number;         // dret[17]
  perihelionJ2000: number;   // dret[18]
  perihelionOfDate: number;  // dret[19]
  perihelionSpeed: number;   // dret[20]
}

export interface OrbitDistances {
  max: number;
  min: number;
  true: number;
}

/* ---- Eclipse types (solar) ---- */

export interface SolarEclipseGlobal {
  type: number;
  maximum: number;            // tret[0]
  first: number;              // tret[1] first contact
  second: number;             // tret[2] second contact
  third: number;              // tret[3] third contact
  fourth: number;             // tret[4] fourth contact
  sunrise: number;            // tret[5]
  sunset: number;             // tret[6]
}

export interface EclipseAttributes {
  fraction: number;           // attr[0]
  ratio: number;              // attr[1]
  magnitude: number;          // attr[2]
  sarosCycle: number;         // attr[3]
  sarosMember: number;        // attr[4]
  solarDiameter: number;     // attr[5]
  lunarDiameter: number;     // attr[6]
  sarosRepetition: number;   // attr[7]
  eclipseLongitude: number;  // attr[8]
  eclipseLatitude: number;   // attr[9]
  eclipseMagnitude: number;  // attr[10]
  sunAltitude: number;       // attr[11]
}

export interface SolarEclipseLocal {
  type: number;
  maximum: number;            // tret[0]
  firstContact: number;       // tret[1]
  secondContact: number;      // tret[2]
  thirdContact: number;       // tret[3]
  fourthContact: number;      // tret[4]
  attributes: EclipseAttributes;
}

export interface SolarEclipseWhere {
  type: number;
  geopos: { longitude: number; latitude: number };
  attributes: EclipseAttributes;
}

export interface SolarEclipseHow {
  type: number;
  attributes: EclipseAttributes;
}

/* ---- Eclipse types (lunar) ---- */

export interface LunarEclipseGlobal {
  type: number;
  maximum: number;            // tret[0]
  partialBegin: number;       // tret[2]
  partialEnd: number;         // tret[3]
  totalBegin: number;         // tret[4]
  totalEnd: number;           // tret[5]
  penumbralBegin: number;     // tret[6]
  penumbralEnd: number;       // tret[7]
}

export interface LunarEclipseHow {
  type: number;
  umbraMagnitude: number;     // attr[0]
  penumbraMagnitude: number;  // attr[1]
  moonDiameter: number;       // attr[5]
  umbraDiameter: number;      // attr[6]
  penumbraDiameter: number;   // attr[7]
  sunDistanceFromNode: number;// attr[8]
}

export interface LunarEclipseLocal {
  type: number;
  maximum: number;
  partialBegin: number;
  partialEnd: number;
  totalBegin: number;
  totalEnd: number;
  penumbralBegin: number;
  penumbralEnd: number;
  moonRise: number;           // tret[8]
  moonSet: number;            // tret[9]
  attributes: LunarEclipseHow;
}

/* ---- Occultation ---- */

export type OccultationGlobal = SolarEclipseGlobal;
export type OccultationLocal = SolarEclipseLocal;
export type OccultationWhere = SolarEclipseWhere;

/* ---- Rise/Set ---- */

export interface RiseSetResult {
  /** Julian day of the event */
  jd: number;
}

/* ---- Phenomena ---- */

export interface PhenoResult {
  phaseAngle: number;          // attr[0]
  phase: number;               // attr[1]
  elongation: number;          // attr[2]
  apparentDiameter: number;    // attr[3]
  apparentMagnitude: number;   // attr[4]
}

/* ---- Azimuth ---- */

export interface AzaltResult {
  azimuth: number;
  trueAltitude: number;
  apparentAltitude: number;
}

export interface AzaltRevResult {
  azimuth: number;
  altitude: number;
}

/* ---- Crossing ---- */

export interface CrossingResult {
  jd: number;
}

export interface MoonNodeCrossingResult {
  jd: number;
  longitude: number;
  latitude: number;
}

/* ---- Heliacal ---- */

export interface HeliacalResult {
  startVisible: number;        // dret[0]
  bestVisible: number;         // dret[1]
  endVisible: number;          // dret[2]
}

export interface HeliacalPhenoResult {
  /** Raw array of 30 heliacal phenomena values (darr[0..29]) */
  raw: number[];
  tcrescent: number;           // darr[0]
  tcrescentBest: number;       // darr[1]
  tcrescent3: number;          // darr[2]
  elong: number;               // darr[3]
  elongBest: number;           // darr[4]
  eDistArcVis: number;         // darr[5]
  altObj: number;              // darr[6]
  azObj: number;               // darr[7]
  altSun: number;              // darr[8]
  azSun: number;               // darr[9]
  altMoon: number;             // darr[10]
  azMoon: number;              // darr[11]
  elongMoon: number;           // darr[12]
}

export interface VisualLimitResult {
  /** Visual limiting magnitude */
  limitingMagnitude: number;   // dret[0]
  altObject: number;           // dret[1]
  azObject: number;            // dret[2]
  altSun: number;              // dret[3]
  azSun: number;               // dret[4]
  altMoon: number;             // dret[5]
  azMoon: number;              // dret[6]
  elongMoon: number;           // dret[7]
}

/* ---- Gauquelin ---- */

export interface GauquelinResult {
  sector: number;
}

/* ---- Configuration ---- */

export interface GeoPosition {
  longitude: number;
  latitude: number;
  altitude?: number;
}

export interface SwissEphOptions {
  /** 'ut' (default) or 'et' — determines which raw function variant to call */
  timeMode?: 'ut' | 'et';
  /** Ephemeris source: 'moshier' (default), 'swisseph', or 'jpl' */
  ephemeris?: 'moshier' | 'swisseph' | 'jpl';
  /** Sidereal mode (SE_SIDM_* constant) */
  siderealMode?: number;
  /** T0 for custom sidereal mode */
  siderealT0?: number;
  /** Ayanamsa at T0 for custom sidereal mode */
  siderealAyanT0?: number;
  /** Topocentric observer position */
  topo?: GeoPosition;
}

export interface RiseSetOptions {
  /** Atmospheric pressure in mbar (default 1013.25) */
  pressure?: number;
  /** Temperature in Celsius (default 15) */
  temperature?: number;
  /** Additional rise/set bit flags (SE_BIT_*) */
  flags?: number;
}

export interface HeliacalOptions {
  /** Atmospheric pressure in mbar */
  pressure?: number;
  /** Temperature in Celsius */
  temperature?: number;
  /** Humidity in % */
  humidity?: number;
  /** Extinction coefficient */
  extinction?: number;
  /** Observer age in years */
  observerAge?: number;
  /** Snellen visual acuity ratio */
  acuity?: number;
  /** Additional heliacal flags */
  flags?: number;
}
