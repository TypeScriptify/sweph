/* ================================================================
 * SwissEph — Modern TypeScript wrapper for Swiss Ephemeris
 *
 * Hides C-style patterns (SweData threading, Float64Array returns,
 * mutable output arrays, error codes) behind a clean class API
 * with named return types, automatic UT/ET routing, and exceptions.
 * ================================================================ */

import type { SweData } from '../types';
import { createDefaultSweData } from '../types';

import {
  sweCalc, sweCalcUt, sweCalcPctr,
  sweFixstar, sweFixstarUt, sweFixstarMag,
  sweFixstar2, sweFixstar2Ut, sweFixstar2Mag,
  sweSetSidMode, sweGetAyanamsaEx, sweGetAyanamsaExUt, sweGetAyanamsaName,
  sweSetTopo, sweSetEphePath, sweSetEphemerisFile, sweLoadJplFile,
  sweGetPlanetName, sweVersion, sweClose, sweTimeEqu,
  sweSolcross, sweSolcrossUt, sweMooncross, sweMooncrossUt,
  sweMooncrossNode, sweMooncrossNodeUt, sweHelioCross, sweHelioCrossUt,
  sweDifdeg2n,
} from '../sweph';

import {
  sweDeltatEx, sweSidtime, sweDegnorm, sweRadnorm,
  sweDegMidp, sweRadMidp, sweCotrans, sweSplitDeg,
} from '../swephlib';

import {
  sweHousesEx2, sweHousesArmcEx2, sweHousePos, sweHouseName,
} from '../swehouse';

import {
  sweNodAps, sweNodApsUt,
  sweGetOrbitalElements, sweOrbitMaxMinTrueDistance,
  sweSolEclipseWhenGlob, sweSolEclipseWhere, sweSolEclipseHow, sweSolEclipseWhenLoc,
  sweLunEclipseWhen, sweLunEclipseHow, sweLunEclipseWhenLoc,
  sweLunOccultWhenGlob, sweLunOccultWhere, sweLunOccultWhenLoc,
  sweRiseTrans, sweAzalt, sweAzaltRev,
  swePheno, swePhenoUt,
  sweGauquelinSector, sweRefrac,
} from '../swecl';

import {
  sweHeliacalUt, sweHeliacalPhenoUt, sweVisLimitMag,
} from '../swehel';

import {
  julDay, revJul, utcToJd, jdetToUtc, jdut1ToUtc, dayOfWeek,
} from '../swedate';

import {
  SEFLG_MOSEPH, SEFLG_SWIEPH, SEFLG_JPLEPH, SEFLG_SPEED,
  SEFLG_SIDEREAL, SEFLG_TOPOCTR,
  SE_CALC_RISE, SE_CALC_SET, SE_CALC_MTRANSIT, SE_CALC_ITRANSIT,
  SE_ECL2HOR, ERR, SE_GREG_CAL,
} from '../constants';

import { SwissEphError } from './errors';

import type {
  GeoPosition, SwissEphOptions, RiseSetOptions, HeliacalOptions,
  PlanetPosition, StarPosition, NodesApsides, OrbitalElements, OrbitDistances,
  SolarEclipseGlobal, SolarEclipseLocal, SolarEclipseWhere, SolarEclipseHow,
  LunarEclipseGlobal, LunarEclipseLocal, LunarEclipseHow,
  OccultationGlobal, OccultationLocal, OccultationWhere,
  EclipseAttributes,
  RiseSetResult, PhenoResult,
  AzaltResult, AzaltRevResult,
  CrossingResult, MoonNodeCrossingResult,
  HeliacalResult, HeliacalPhenoResult, VisualLimitResult,
  GauquelinResult, HouseResult, SplitDegResult,
  DateResult, UtcToJdResult, JdToUtcResult,
} from './types';

export { SwissEphError } from './errors';
export type * from './types';

/* ================================================================
 * Helpers
 * ================================================================ */

function posFromXx(flags: number, xx: Float64Array): PlanetPosition {
  return {
    longitude: xx[0], latitude: xx[1], distance: xx[2],
    longitudeSpeed: xx[3], latitudeSpeed: xx[4], distanceSpeed: xx[5],
    flags,
  };
}

function posFrom6(arr: number[]): PlanetPosition {
  return {
    longitude: arr[0], latitude: arr[1], distance: arr[2],
    longitudeSpeed: arr[3], latitudeSpeed: arr[4], distanceSpeed: arr[5],
    flags: 0,
  };
}

function geoArr(geo: GeoPosition): number[] {
  return [geo.longitude, geo.latitude, geo.altitude ?? 0];
}

function mapEclAttr(attr: number[]): EclipseAttributes {
  return {
    fraction: attr[0], ratio: attr[1], magnitude: attr[2],
    sarosCycle: attr[3], sarosMember: attr[4],
    solarDiameter: attr[5], lunarDiameter: attr[6],
    sarosRepetition: attr[7], eclipseLongitude: attr[8],
    eclipseLatitude: attr[9], eclipseMagnitude: attr[10],
    sunAltitude: attr[11],
  };
}

/* ================================================================
 * SwissEph class
 * ================================================================ */

export class SwissEph {
  /** Internal engine state — exposed for advanced / escape-hatch use */
  readonly swed: SweData;
  private timeMode: 'ut' | 'et';
  private ephemerisFlag: number;

  constructor(options?: SwissEphOptions) {
    this.swed = createDefaultSweData();
    this.timeMode = options?.timeMode ?? 'ut';

    switch (options?.ephemeris) {
      case 'swisseph': this.ephemerisFlag = SEFLG_SWIEPH; break;
      case 'jpl':      this.ephemerisFlag = SEFLG_JPLEPH; break;
      default:         this.ephemerisFlag = SEFLG_MOSEPH; break;
    }

    if (options?.siderealMode != null) {
      sweSetSidMode(this.swed, options.siderealMode,
        options.siderealT0 ?? 0, options.siderealAyanT0 ?? 0);
    }
    if (options?.topo) {
      sweSetTopo(this.swed,
        options.topo.longitude, options.topo.latitude, options.topo.altitude ?? 0);
    }
  }

  /** Release internal resources. The instance should not be used after this. */
  close(): void {
    sweClose(this.swed);
  }

  /* ---------- flag helpers ---------- */

  private flags(extra: number = 0): number {
    return this.ephemerisFlag | SEFLG_SPEED | extra;
  }

  private get isUt(): boolean { return this.timeMode === 'ut'; }

  /* ==============================================================
   * Core Calculation
   * ============================================================== */

  /** Calculate position of a planet / object. */
  calc(jd: number, planet: number, flags: number = 0): PlanetPosition {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweCalcUt(this.swed, jd, planet, f)
      : sweCalc(this.swed, jd, planet, f);
    if (r.flags === ERR) throw new SwissEphError(r.serr || 'calc failed');
    return posFromXx(r.flags, r.xx);
  }

  /** Calculate position of a planet as seen from another planet (planetocentric). */
  calcPlanetocentric(jd: number, planet: number, center: number, flags: number = 0): PlanetPosition {
    const f = this.flags(flags);
    const r = sweCalcPctr(this.swed, jd, planet, center, f);
    if (r.flags === ERR) throw new SwissEphError(r.serr || 'calcPctr failed');
    return posFromXx(r.flags, r.xx);
  }

  /** Calculate position of a fixed star. */
  fixedStar(star: string, jd: number, flags: number = 0): StarPosition {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweFixstarUt(this.swed, star, jd, f)
      : sweFixstar(this.swed, star, jd, f);
    if (r.flags === ERR) throw new SwissEphError(r.serr || 'fixedStar failed');
    return { ...posFromXx(r.flags, r.xx), starName: r.starOut };
  }

  /** Calculate position of a fixed star (using fixstar2 variant). */
  fixedStar2(star: string, jd: number, flags: number = 0): StarPosition {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweFixstar2Ut(this.swed, star, jd, f)
      : sweFixstar2(this.swed, star, jd, f);
    if (r.flags === ERR) throw new SwissEphError(r.serr || 'fixedStar2 failed');
    return { ...posFromXx(r.flags, r.xx), starName: r.starOut };
  }

  /** Get the magnitude of a fixed star. */
  fixedStarMagnitude(star: string): number {
    const r = sweFixstarMag(this.swed, star);
    if (r.serr) throw new SwissEphError(r.serr);
    return r.mag;
  }

  /** Calculate planetary nodes and apsides (perihelion/aphelion). */
  nodesApsides(jd: number, planet: number, method: number = 0, flags: number = 0): NodesApsides {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweNodApsUt(this.swed, jd, planet, f, method)
      : sweNodAps(this.swed, jd, planet, f, method);
    if (r.retval === ERR) throw new SwissEphError(r.serr || 'nodesApsides failed');
    return {
      ascendingNode: posFrom6(r.xnasc),
      descendingNode: posFrom6(r.xndsc),
      perihelion: posFrom6(r.xperi),
      aphelion: posFrom6(r.xaphe),
    };
  }

  /** Get orbital elements for a planet. */
  orbitalElements(jd: number, planet: number, flags: number = 0): OrbitalElements {
    const f = this.flags(flags);
    const r = sweGetOrbitalElements(this.swed, jd, planet, f);
    if (r.retval === ERR) throw new SwissEphError(r.serr || 'orbitalElements failed');
    const d = r.dret;
    return {
      semiAxis: d[0], eccentricity: d[1], inclination: d[2],
      ascNode: d[3], argPerihelion: d[4], longPerihelion: d[5],
      meanAnomaly: d[6], meanLongitude: d[7], dailyMotion: d[8],
      tropicalPeriod: d[9], synodicPeriod: d[10],
      meanDailyMotion: d[11], meanLongJ2000: d[12], meanLongOfDate: d[13],
      meanLongSpeed: d[14], nodeJ2000: d[15], nodeOfDate: d[16],
      nodeSpeed: d[17], perihelionJ2000: d[18], perihelionOfDate: d[19],
      perihelionSpeed: d[20],
    };
  }

  /** Get maximum, minimum, and true distance of an orbit. */
  orbitDistances(jd: number, planet: number, flags: number = 0): OrbitDistances {
    const f = this.flags(flags);
    const r = sweOrbitMaxMinTrueDistance(this.swed, jd, planet, f);
    if (r.retval === ERR) throw new SwissEphError(r.serr || 'orbitDistances failed');
    return { max: r.dmax, min: r.dmin, true: r.dtrue };
  }

  /* ==============================================================
   * Ayanamsa
   * ============================================================== */

  /** Get ayanamsa value for a given Julian day. */
  getAyanamsa(jd: number, flags: number = 0): number {
    const f = this.ephemerisFlag | flags;
    const r = this.isUt
      ? sweGetAyanamsaExUt(this.swed, jd, f)
      : sweGetAyanamsaEx(this.swed, jd, f);
    if (r.retc === ERR) throw new SwissEphError(r.serr || 'getAyanamsa failed');
    return r.daya;
  }

  /** Set sidereal mode (ayanamsa system). */
  setSiderealMode(mode: number, t0: number = 0, ayanT0: number = 0): void {
    sweSetSidMode(this.swed, mode, t0, ayanT0);
  }

  /** Get the name of a sidereal mode. */
  getAyanamsaName(mode: number): string {
    return sweGetAyanamsaName(mode);
  }

  /* ==============================================================
   * Houses
   * ============================================================== */

  /** Calculate house cusps and angles. */
  houses(jd: number, geo: GeoPosition, system: string = 'P', flags: number = 0): HouseResult {
    const f = this.ephemerisFlag | flags;
    const cusp: number[] = new Array(37).fill(0);
    const ascmc: number[] = new Array(10).fill(0);
    const cuspSpeed: number[] = new Array(37).fill(0);
    const ascmcSpeed: number[] = new Array(10).fill(0);
    const serr = { value: '' };
    sweHousesEx2(this.swed, jd, f, geo.latitude, geo.longitude, system,
      cusp, ascmc, cuspSpeed, ascmcSpeed, serr);
    return {
      cusps: cusp,
      ascendant: ascmc[0],
      mc: ascmc[1],
      armc: ascmc[2],
      vertex: ascmc[3],
      equatorialAscendant: ascmc[4],
      coAscendantKoch: ascmc[5],
      coAscendantMunkasey: ascmc[6],
      polarAscendant: ascmc[7],
    };
  }

  /** Calculate houses from ARMC (sidereal time in degrees). */
  housesFromArmc(armc: number, lat: number, eps: number, system: string = 'P'): HouseResult {
    const cusp: number[] = new Array(37).fill(0);
    const ascmc: number[] = new Array(10).fill(0);
    const serr = { value: '' };
    sweHousesArmcEx2(armc, lat, eps, system, cusp, ascmc, null, null, serr);
    return {
      cusps: cusp,
      ascendant: ascmc[0],
      mc: ascmc[1],
      armc: ascmc[2],
      vertex: ascmc[3],
      equatorialAscendant: ascmc[4],
      coAscendantKoch: ascmc[5],
      coAscendantMunkasey: ascmc[6],
      polarAscendant: ascmc[7],
    };
  }

  /** Get the house position (1.0–12.999…) of a body. */
  housePosition(armc: number, lat: number, eps: number, system: string,
    eclLon: number, eclLat: number): number {
    const serr = { value: '' };
    const pos = sweHousePos(armc, lat, eps, system, [eclLon, eclLat], serr);
    if (pos === 0 && serr.value) throw new SwissEphError(serr.value);
    return pos;
  }

  /** Get the name of a house system. */
  houseName(system: string): string {
    return sweHouseName(system);
  }

  /* ==============================================================
   * Solar Eclipses
   * ============================================================== */

  /** Find the next global solar eclipse after jd. */
  solarEclipseGlobal(jd: number, type: number = 0, backward: boolean = false): SolarEclipseGlobal {
    const r = sweSolEclipseWhenGlob(this.swed, jd, this.ephemerisFlag, type, backward ? 1 : 0);
    if (r.retval === ERR) throw new SwissEphError('solarEclipseGlobal failed');
    return {
      type: r.retval,
      maximum: r.tret[0], first: r.tret[1], second: r.tret[2],
      third: r.tret[3], fourth: r.tret[4],
      sunrise: r.tret[5], sunset: r.tret[6],
    };
  }

  /** Find the next local solar eclipse after jd. */
  solarEclipseLocal(jd: number, geo: GeoPosition, backward: boolean = false): SolarEclipseLocal {
    const r = sweSolEclipseWhenLoc(this.swed, jd, this.ephemerisFlag, geoArr(geo), backward ? 1 : 0);
    if (r.retval === ERR) throw new SwissEphError('solarEclipseLocal failed');
    return {
      type: r.retval,
      maximum: r.tret[0], firstContact: r.tret[1], secondContact: r.tret[2],
      thirdContact: r.tret[3], fourthContact: r.tret[4],
      attributes: mapEclAttr(r.attr),
    };
  }

  /** Calculate geographic coordinates of central line for a solar eclipse at jd. */
  solarEclipseWhere(jd: number): SolarEclipseWhere {
    const r = sweSolEclipseWhere(this.swed, jd, this.ephemerisFlag);
    if (r.retval === ERR) throw new SwissEphError('solarEclipseWhere failed');
    return {
      type: r.retval,
      geopos: { longitude: r.geopos[0], latitude: r.geopos[1] },
      attributes: mapEclAttr(r.attr),
    };
  }

  /** Calculate attributes of a solar eclipse for a geographic position. */
  solarEclipseHow(jd: number, geo: GeoPosition): SolarEclipseHow {
    const r = sweSolEclipseHow(this.swed, jd, this.ephemerisFlag, geoArr(geo));
    if (r.retval === ERR) throw new SwissEphError('solarEclipseHow failed');
    return { type: r.retval, attributes: mapEclAttr(r.attr) };
  }

  /* ==============================================================
   * Lunar Eclipses
   * ============================================================== */

  /** Find the next global lunar eclipse after jd. */
  lunarEclipseGlobal(jd: number, type: number = 0, backward: boolean = false): LunarEclipseGlobal {
    const r = sweLunEclipseWhen(this.swed, jd, this.ephemerisFlag, type, backward ? 1 : 0);
    if (r.retval === ERR) throw new SwissEphError('lunarEclipseGlobal failed');
    return {
      type: r.retval,
      maximum: r.tret[0],
      partialBegin: r.tret[2], partialEnd: r.tret[3],
      totalBegin: r.tret[4], totalEnd: r.tret[5],
      penumbralBegin: r.tret[6], penumbralEnd: r.tret[7],
    };
  }

  /** Calculate attributes of a lunar eclipse at jd. */
  lunarEclipseHow(jd: number, geo?: GeoPosition): LunarEclipseHow {
    const r = sweLunEclipseHow(this.swed, jd, this.ephemerisFlag, geo ? geoArr(geo) : null);
    if (r.retval === ERR) throw new SwissEphError('lunarEclipseHow failed');
    return {
      type: r.retval,
      umbraMagnitude: r.attr[0], penumbraMagnitude: r.attr[1],
      moonDiameter: r.attr[5], umbraDiameter: r.attr[6],
      penumbraDiameter: r.attr[7], sunDistanceFromNode: r.attr[8],
    };
  }

  /** Find the next local lunar eclipse after jd. */
  lunarEclipseLocal(jd: number, geo: GeoPosition, backward: boolean = false): LunarEclipseLocal {
    const r = sweLunEclipseWhenLoc(this.swed, jd, this.ephemerisFlag, geoArr(geo), backward ? 1 : 0);
    if (r.retval === ERR) throw new SwissEphError('lunarEclipseLocal failed');
    const how = sweLunEclipseHow(this.swed, r.tret[0], this.ephemerisFlag, geoArr(geo));
    return {
      type: r.retval,
      maximum: r.tret[0],
      partialBegin: r.tret[2], partialEnd: r.tret[3],
      totalBegin: r.tret[4], totalEnd: r.tret[5],
      penumbralBegin: r.tret[6], penumbralEnd: r.tret[7],
      moonRise: r.tret[8], moonSet: r.tret[9],
      attributes: {
        type: how.retval,
        umbraMagnitude: how.attr[0], penumbraMagnitude: how.attr[1],
        moonDiameter: how.attr[5], umbraDiameter: how.attr[6],
        penumbraDiameter: how.attr[7], sunDistanceFromNode: how.attr[8],
      },
    };
  }

  /* ==============================================================
   * Occultations
   * ============================================================== */

  /** Find the next global occultation of a planet/star by the Moon. */
  occultationGlobal(jd: number, planet: number, starname: string | null = null,
    type: number = 0, backward: boolean = false): OccultationGlobal {
    const r = sweLunOccultWhenGlob(this.swed, jd, planet, starname,
      this.ephemerisFlag, type, backward ? 1 : 0);
    if (r.retval === ERR) throw new SwissEphError('occultationGlobal failed');
    return {
      type: r.retval,
      maximum: r.tret[0], first: r.tret[1], second: r.tret[2],
      third: r.tret[3], fourth: r.tret[4],
      sunrise: r.tret[5], sunset: r.tret[6],
    };
  }

  /** Find the next local occultation at a geographic position. */
  occultationLocal(jd: number, planet: number, geo: GeoPosition,
    starname: string | null = null, backward: boolean = false): OccultationLocal {
    const r = sweLunOccultWhenLoc(this.swed, jd, planet, starname,
      this.ephemerisFlag, geoArr(geo), backward ? 1 : 0);
    if (r.retval === ERR) throw new SwissEphError('occultationLocal failed');
    return {
      type: r.retval,
      maximum: r.tret[0], firstContact: r.tret[1], secondContact: r.tret[2],
      thirdContact: r.tret[3], fourthContact: r.tret[4],
      attributes: mapEclAttr(r.attr),
    };
  }

  /** Calculate geographic coordinates of an occultation at jd. */
  occultationWhere(jd: number, planet: number, starname: string | null = null): OccultationWhere {
    const r = sweLunOccultWhere(this.swed, jd, planet, starname, this.ephemerisFlag);
    if (r.retval === ERR) throw new SwissEphError('occultationWhere failed');
    return {
      type: r.retval,
      geopos: { longitude: r.geopos[0], latitude: r.geopos[1] },
      attributes: mapEclAttr(r.attr),
    };
  }

  /* ==============================================================
   * Rise / Set / Transit
   * ============================================================== */

  /** Find the next rise of a planet after jd. */
  rise(jd: number, planet: number, geo: GeoPosition, options?: RiseSetOptions): RiseSetResult {
    return this.riseSetTransit(jd, planet, geo, SE_CALC_RISE, options);
  }

  /** Find the next set of a planet after jd. */
  set(jd: number, planet: number, geo: GeoPosition, options?: RiseSetOptions): RiseSetResult {
    return this.riseSetTransit(jd, planet, geo, SE_CALC_SET, options);
  }

  /** Find the next upper meridian transit of a planet after jd. */
  transit(jd: number, planet: number, geo: GeoPosition, options?: RiseSetOptions): RiseSetResult {
    return this.riseSetTransit(jd, planet, geo, SE_CALC_MTRANSIT, options);
  }

  /** Find the next lower meridian transit of a planet after jd. */
  antiTransit(jd: number, planet: number, geo: GeoPosition, options?: RiseSetOptions): RiseSetResult {
    return this.riseSetTransit(jd, planet, geo, SE_CALC_ITRANSIT, options);
  }

  private riseSetTransit(jd: number, planet: number, geo: GeoPosition,
    rsmi: number, options?: RiseSetOptions): RiseSetResult {
    const serr = { value: '' };
    const r = sweRiseTrans(this.swed, jd, planet, null, this.ephemerisFlag,
      rsmi | (options?.flags ?? 0),
      geoArr(geo), options?.pressure ?? 1013.25, options?.temperature ?? 15, serr);
    if (r.retval === ERR) throw new SwissEphError(serr.value || 'rise/set/transit failed');
    return { jd: r.tret };
  }

  /* ==============================================================
   * Horizon Coordinates
   * ============================================================== */

  /** Convert ecliptic/equatorial coordinates to azimuth/altitude. */
  azalt(jd: number, geo: GeoPosition, lon: number, lat: number, dist: number = 1,
    calcFlag: number = SE_ECL2HOR, pressure: number = 1013.25, temperature: number = 15): AzaltResult {
    const xaz: number[] = [0, 0, 0];
    sweAzalt(this.swed, jd, calcFlag, geoArr(geo), pressure, temperature,
      [lon, lat, dist], xaz);
    return { azimuth: xaz[0], trueAltitude: xaz[1], apparentAltitude: xaz[2] };
  }

  /** Convert azimuth/altitude back to ecliptic/equatorial. */
  azaltReverse(jd: number, geo: GeoPosition, azimuth: number, altitude: number,
    calcFlag: number = SE_ECL2HOR): AzaltRevResult {
    const xout: number[] = [0, 0];
    sweAzaltRev(this.swed, jd, calcFlag, geoArr(geo), [azimuth, altitude], xout);
    return { azimuth: xout[0], altitude: xout[1] };
  }

  /* ==============================================================
   * Phenomena
   * ============================================================== */

  /** Calculate planetary phenomena (phase angle, elongation, etc.). */
  phenomena(jd: number, planet: number, flags: number = 0): PhenoResult {
    const f = this.ephemerisFlag | flags;
    const serr = { value: '' };
    const r = this.isUt
      ? swePhenoUt(this.swed, jd, planet, f, serr)
      : swePheno(this.swed, jd, planet, f, serr);
    if (r.retval === ERR) throw new SwissEphError(serr.value || 'phenomena failed');
    return {
      phaseAngle: r.attr[0], phase: r.attr[1], elongation: r.attr[2],
      apparentDiameter: r.attr[3], apparentMagnitude: r.attr[4],
    };
  }

  /** Calculate Gauquelin sector position of a planet. */
  gauquelinSector(jd: number, planet: number, geo: GeoPosition,
    method: number = 0, pressure: number = 1013.25, temperature: number = 15): GauquelinResult {
    const serr = { value: '' };
    const r = sweGauquelinSector(this.swed, jd, planet, null, this.ephemerisFlag,
      method, geoArr(geo), pressure, temperature, serr);
    if (r.retval === ERR) throw new SwissEphError(serr.value || 'gauquelinSector failed');
    return { sector: r.dgsect };
  }

  /* ==============================================================
   * Crossings
   * ============================================================== */

  /** Find the next time the Sun crosses a given ecliptic longitude. */
  sunCrossing(longitude: number, jd: number, flags: number = 0): CrossingResult {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweSolcrossUt(this.swed, longitude, jd, f)
      : sweSolcross(this.swed, longitude, jd, f);
    if (r.jd < jd - 0.5) throw new SwissEphError(r.serr || 'sunCrossing failed');
    return { jd: r.jd };
  }

  /** Find the next time the Moon crosses a given ecliptic longitude. */
  moonCrossing(longitude: number, jd: number, flags: number = 0): CrossingResult {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweMooncrossUt(this.swed, longitude, jd, f)
      : sweMooncross(this.swed, longitude, jd, f);
    if (r.jd < jd - 0.5) throw new SwissEphError(r.serr || 'moonCrossing failed');
    return { jd: r.jd };
  }

  /** Find the next time the Moon crosses the ecliptic (node crossing). */
  moonNodeCrossing(jd: number, flags: number = 0): MoonNodeCrossingResult {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweMooncrossNodeUt(this.swed, jd, f)
      : sweMooncrossNode(this.swed, jd, f);
    if (r.jd < jd - 0.5) throw new SwissEphError(r.serr || 'moonNodeCrossing failed');
    return { jd: r.jd, longitude: r.xlon, latitude: r.xlat };
  }

  /** Find the next time a planet crosses a heliocentric longitude. */
  helioCrossing(planet: number, longitude: number, jd: number, flags: number = 0, dir: number = 0): CrossingResult {
    const f = this.flags(flags);
    const r = this.isUt
      ? sweHelioCrossUt(this.swed, planet, longitude, jd, f, dir)
      : sweHelioCross(this.swed, planet, longitude, jd, f, dir);
    if (r.jdCross < jd - 0.5) throw new SwissEphError(r.serr || 'helioCrossing failed');
    return { jd: r.jdCross };
  }

  /* ==============================================================
   * Heliacal Events
   * ============================================================== */

  /** Find the next heliacal rising/setting event. */
  heliacalEvent(jd: number, geo: GeoPosition, object: string,
    eventType: number, options?: HeliacalOptions): HeliacalResult {
    const { datm, dobs, helflag } = this.heliacalParams(options);
    const r = sweHeliacalUt(this.swed, jd, geoArr(geo), datm, dobs,
      object, eventType, helflag);
    if (r.retval === ERR) throw new SwissEphError(r.serr || 'heliacalEvent failed');
    return {
      startVisible: r.dret[0], bestVisible: r.dret[1], endVisible: r.dret[2],
    };
  }

  /** Calculate heliacal phenomena (detailed arc of vision etc.). */
  heliacalPhenomena(jd: number, geo: GeoPosition, object: string,
    eventType: number, options?: HeliacalOptions): HeliacalPhenoResult {
    const { datm, dobs, helflag } = this.heliacalParams(options);
    const r = sweHeliacalPhenoUt(this.swed, jd, geoArr(geo), datm, dobs,
      object, eventType, helflag);
    if (r.retval === ERR) throw new SwissEphError(r.serr || 'heliacalPhenomena failed');
    const d = r.darr;
    return {
      raw: d,
      tcrescent: d[0], tcrescentBest: d[1], tcrescent3: d[2],
      elong: d[3], elongBest: d[4], eDistArcVis: d[5],
      altObj: d[6], azObj: d[7], altSun: d[8], azSun: d[9],
      altMoon: d[10], azMoon: d[11], elongMoon: d[12],
    };
  }

  /** Calculate the visual limiting magnitude at a given time/place. */
  visualLimitMagnitude(jd: number, geo: GeoPosition, object: string,
    options?: HeliacalOptions): VisualLimitResult {
    const { datm, dobs, helflag } = this.heliacalParams(options);
    const r = sweVisLimitMag(this.swed, jd, geoArr(geo), datm, dobs, object, helflag);
    if (r.retval === ERR) throw new SwissEphError(r.serr || 'visualLimitMag failed');
    return {
      limitingMagnitude: r.dret[0],
      altObject: r.dret[1], azObject: r.dret[2],
      altSun: r.dret[3], azSun: r.dret[4],
      altMoon: r.dret[5], azMoon: r.dret[6],
      elongMoon: r.dret[7],
    };
  }

  private heliacalParams(options?: HeliacalOptions) {
    const datm = [
      options?.pressure ?? 1013.25,
      options?.temperature ?? 15,
      options?.humidity ?? 40,
      options?.extinction ?? 0.25,
    ];
    const dobs = [
      options?.acuity ?? 1,
      options?.acuity ?? 1,
      options?.observerAge ?? 36,
      0, 0, 0,
    ];
    const helflag = this.ephemerisFlag | (options?.flags ?? 0);
    return { datm, dobs, helflag };
  }

  /* ==============================================================
   * Configuration
   * ============================================================== */

  /** Set topocentric observer position. */
  setTopo(geo: GeoPosition): void {
    sweSetTopo(this.swed, geo.longitude, geo.latitude, geo.altitude ?? 0);
  }

  /** Set the ephemeris file search path. */
  setEphePath(path: string): void {
    sweSetEphePath(this.swed, path);
  }

  /** Load an SE1 binary ephemeris file from an ArrayBuffer. */
  loadEphemerisFile(data: ArrayBuffer, name: string): void {
    sweSetEphemerisFile(name, data, this.swed);
  }

  /** Load a JPL binary ephemeris file from an ArrayBuffer. */
  loadJplFile(data: ArrayBuffer, name?: string): void {
    const r = sweLoadJplFile(this.swed, data, name);
    if (r.retc === ERR) throw new SwissEphError(r.serr || 'loadJplFile failed');
  }

  /** Set tidal acceleration value. */
  setTidalAcceleration(value: number): void {
    (this.swed as SweData).tidAcc = value;
    (this.swed as SweData).isTidAccManual = true;
  }

  /** Set a user-defined delta-T value. */
  setDeltaTUserDefined(value: number): void {
    (this.swed as SweData).deltaTUserdefIsSet = true;
    (this.swed as SweData).deltaTUserdef = value;
  }

  /** Set nutation interpolation on or off. */
  setInterpolateNutation(enable: boolean): void {
    (this.swed as SweData).doInterpolateNut = enable;
  }

  /* ==============================================================
   * Utility (instance)
   * ============================================================== */

  /** Get the name of a planet/object by its number. */
  getPlanetName(planet: number): string {
    return sweGetPlanetName(planet, this.swed);
  }

  /** Get delta-T for a Julian day. */
  deltaT(jd: number, flags: number = -1): number {
    return sweDeltatEx(jd, flags, this.swed);
  }

  /** Get sidereal time for a Julian day (UT). Returns hours. */
  siderealTime(jd: number): number {
    return sweSidtime(this.swed, jd);
  }

  /** Get the equation of time (difference between apparent and mean solar time). */
  timeEquation(jd: number): number {
    const r = sweTimeEqu(this.swed, jd);
    if (r.retc === ERR) throw new SwissEphError(r.serr || 'timeEquation failed');
    return r.e;
  }

  /** Calculate atmospheric refraction. */
  refraction(altitude: number, pressure: number, temperature: number, flag: number): number {
    return sweRefrac(altitude, pressure, temperature, flag);
  }

  /** Split a degree value into degrees, minutes, seconds, sign. */
  splitDegrees(value: number, flags: number): SplitDegResult {
    return sweSplitDeg(value, flags);
  }

  /** Normalize a degree difference to [-180, 180). */
  difDeg2n(p1: number, p2: number): number {
    return sweDifdeg2n(p1, p2);
  }

  /* ==============================================================
   * Date/Time (static)
   * ============================================================== */

  /** Convert a calendar date to Julian Day number. */
  static julianDay(y: number, m: number, d: number, h: number = 0,
    gregflag: number = SE_GREG_CAL): number {
    return julDay(y, m, d, h, gregflag);
  }

  /** Convert a Julian Day number to calendar date components. */
  static fromJulianDay(jd: number, gregflag: number = SE_GREG_CAL): DateResult {
    return revJul(jd, gregflag);
  }

  /** Convert UTC date/time components to Julian Day numbers (ET and UT). */
  static utcToJd(y: number, m: number, d: number, h: number, min: number, sec: number,
    gregflag: number = SE_GREG_CAL): UtcToJdResult {
    // utcToJd needs a deltatEx callback — create a temporary SweData for it
    const tmpSwed = createDefaultSweData();
    return utcToJd(y, m, d, h, min, sec, gregflag,
      (tjd, iflag) => sweDeltatEx(tjd, iflag, tmpSwed));
  }

  /** Convert Julian Day (ET) to UTC date/time components. */
  static jdToUtc(jdEt: number, gregflag: number = SE_GREG_CAL): JdToUtcResult {
    const tmpSwed = createDefaultSweData();
    return jdetToUtc(jdEt, gregflag,
      (tjd, iflag) => sweDeltatEx(tjd, iflag, tmpSwed));
  }

  /** Convert Julian Day (UT) to UTC date/time components. */
  static jdUtToUtc(jdUt: number, gregflag: number = SE_GREG_CAL): JdToUtcResult {
    const tmpSwed = createDefaultSweData();
    return jdut1ToUtc(jdUt, gregflag,
      (tjd, iflag) => sweDeltatEx(tjd, iflag, tmpSwed));
  }

  /** Get the day of week (0 = Monday, 6 = Sunday). */
  static dayOfWeek(jd: number): number {
    return dayOfWeek(jd);
  }

  /* ==============================================================
   * Math Utilities (static)
   * ============================================================== */

  /** Get the Swiss Ephemeris version string. */
  static version(): string {
    return sweVersion();
  }

  /** Normalize degrees to [0, 360). */
  static normalizeDegrees(x: number): number {
    return sweDegnorm(x);
  }

  /** Normalize radians to [0, 2π). */
  static normalizeRadians(x: number): number {
    return sweRadnorm(x);
  }

  /** Midpoint between two degree values on the circle. */
  static degreeMidpoint(a: number, b: number): number {
    return sweDegMidp(a, b);
  }

  /** Midpoint between two radian values on the circle. */
  static radianMidpoint(a: number, b: number): number {
    return sweRadMidp(a, b);
  }

  /** Transform coordinates by obliquity (ecliptic ↔ equatorial). */
  static coordinateTransform(coords: number[], eps: number): number[] {
    const out = [0, 0, 0, 0, 0, 0];
    sweCotrans(coords, out, eps);
    return out;
  }
}
