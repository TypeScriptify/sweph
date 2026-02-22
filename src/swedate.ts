/*************************************************************
 * swedate.ts — Julian day / calendar date conversions
 * Translated from swedate.c
 *
 * swe_julday()          -> julDay()
 * swe_revjul()          -> revJul()
 * swe_date_conversion() -> dateConversion()
 * swe_utc_time_zone()   -> utcTimeZone()
 * swe_utc_to_jd()       -> utcToJd()
 * swe_jdet_to_utc()     -> jdetToUtc()
 * swe_jdut1_to_utc()    -> jdut1ToUtc()
 * swe_day_of_week()     -> dayOfWeek()
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *
 * Authors: Dieter Koch and Alois Treindl, Astrodienst Zurich
 *************************************************************/

import { SE_GREG_CAL, SE_JUL_CAL, OK, ERR } from './constants';
import type { DateResult, JdToUtcResult, UtcToJdResult } from './types';

/* Leap seconds were inserted at the end of the following days */
const NLEAP_SECONDS = 27;
const NLEAP_INIT = 10;    // initial difference between UTC and TAI in 1972
const J1972 = 2441317.5;

const LEAP_SECONDS: number[] = [
  19720630,
  19721231,
  19731231,
  19741231,
  19751231,
  19761231,
  19771231,
  19781231,
  19791231,
  19810630,
  19820630,
  19830630,
  19850630,
  19871231,
  19891231,
  19901231,
  19920630,
  19930630,
  19940630,
  19951231,
  19970630,
  19981231,
  20051231,
  20081231,
  20120630,
  20150630,
  20161231,
];

/**
 * Compute the Julian day number for a given calendar date.
 *
 * If gregflag = SE_GREG_CAL (1), Gregorian calendar is assumed.
 * If gregflag = SE_JUL_CAL  (0), Julian calendar is assumed.
 *
 * The Julian day number is a double representing the number of days since
 * JD = 0.0 on 1 Jan -4712, 12:00 noon (Julian calendar).
 *
 * Original author: Marc Pottenger, Los Angeles.
 * Bug fix for year < -4711: Alois Treindl, 15-aug-88.
 */
export function julDay(year: number, month: number, day: number, hour: number, gregflag: number = SE_GREG_CAL): number {
  let u = year;
  if (month < 3) u -= 1;
  const u0 = u + 4712.0;
  let u1 = month + 1.0;
  if (u1 < 4) u1 += 12.0;
  let jd = Math.floor(u0 * 365.25)
         + Math.floor(30.6 * u1 + 0.000001)
         + day + hour / 24.0 - 63.5;
  if (gregflag === SE_GREG_CAL) {
    let u2 = Math.floor(Math.abs(u) / 100) - Math.floor(Math.abs(u) / 400);
    if (u < 0.0) u2 = -u2;
    jd = jd - u2 + 2;
    if ((u < 0.0) && (u / 100 === Math.floor(u / 100)) && (u / 400 !== Math.floor(u / 400))) {
      jd -= 1;
    }
  }
  return jd;
}

/**
 * Reverse Julian day: compute calendar date from a Julian day number.
 *
 * Returns { year, month, day, hour } where hour is a decimal fraction (0..23.999).
 *
 * Original author: Mark Pottenger, Los Angeles.
 * Bug fix for year < -4711: Alois Treindl, 16-aug-88.
 */
export function revJul(jd: number, gregflag: number = SE_GREG_CAL): DateResult {
  let u0 = jd + 32082.5;
  if (gregflag === SE_GREG_CAL) {
    let u1 = u0 + Math.floor(u0 / 36525.0) - Math.floor(u0 / 146100.0) - 38.0;
    if (jd >= 1830691.5) u1 += 1;
    u0 = u0 + Math.floor(u1 / 36525.0) - Math.floor(u1 / 146100.0) - 38.0;
  }
  const u2 = Math.floor(u0 + 123.0);
  const u3 = Math.floor((u2 - 122.2) / 365.25);
  const u4 = Math.floor((u2 - Math.floor(365.25 * u3)) / 30.6001);
  let month = Math.trunc(u4 - 1.0);
  if (month > 12) month -= 12;
  const day = Math.trunc(u2 - Math.floor(365.25 * u3) - Math.floor(30.6001 * u4));
  const year = Math.trunc(u3 + Math.floor((u4 - 2.0) / 12.0) - 4800);
  const hour = (jd - Math.floor(jd + 0.5) + 0.5) * 24.0;
  return { year, month, day, hour };
}

/**
 * Validate and convert a date+time to Julian day number.
 *
 * Returns OK (0) for valid dates, ERR (-1) for illegal dates.
 * The Julian day is always computed, even for illegal dates (e.g. 32 Jan → 1 Feb).
 *
 * @param c  Calendar: 'g' for Gregorian, 'j' for Julian
 */
export function dateConversion(
  y: number, m: number, d: number,
  uttime: number, c: string
): { ok: boolean; jd: number } {
  const gregflag = c === 'g' ? SE_GREG_CAL : SE_JUL_CAL;
  const jd = julDay(y, m, d, uttime, gregflag);
  const rev = revJul(jd, gregflag);
  const ok = (rev.month === m && rev.day === d && rev.year === y);
  return { ok, jd };
}

/**
 * Convert local time to UTC or UTC to local time.
 *
 * For time zones east of Greenwich, d_timezone is positive.
 * For time zones west of Greenwich, d_timezone is negative.
 *
 * For conversion from local time to UTC, use +d_timezone.
 * For conversion from UTC to local time, use -d_timezone.
 */
export function utcTimeZone(
  iyear: number, imonth: number, iday: number,
  ihour: number, imin: number, dsec: number,
  dTimezone: number
): JdToUtcResult {
  let haveLeapsec = false;
  if (dsec >= 60.0) {
    haveLeapsec = true;
    dsec -= 1.0;
  }
  let dhour = ihour + imin / 60.0 + dsec / 3600.0;
  let tjd = julDay(iyear, imonth, iday, 0, SE_GREG_CAL);
  dhour -= dTimezone;
  if (dhour < 0.0) {
    tjd -= 1.0;
    dhour += 24.0;
  }
  if (dhour >= 24.0) {
    tjd += 1.0;
    dhour -= 24.0;
  }
  const rev = revJul(tjd + 0.001, SE_GREG_CAL);
  const hourOut = Math.trunc(dhour);
  let d = (dhour - hourOut) * 60;
  const minOut = Math.trunc(d);
  let secOut = (d - minOut) * 60;
  if (haveLeapsec) {
    secOut += 1.0;
  }
  return {
    year: rev.year,
    month: rev.month,
    day: rev.day,
    hour: hourOut,
    minute: minOut,
    second: secOut,
  };
}

/**
 * monday = 0, ... sunday = 6
 */
export function dayOfWeek(jd: number): number {
  return (Math.trunc(jd - 2433282 - 1.5) % 7 + 7) % 7;
}

/**
 * Type for a delta-T function that will be provided by swephlib.
 * Signature matches swe_deltat_ex(tjd, iflag, serr).
 */
export type DeltaTFn = (tjd: number, iflag: number) => number;

/**
 * Convert UTC to Julian day numbers ET and UT1.
 *
 * - Before 1972, input time is treated as UT1.
 * - From 1972 on, input time is treated as UTC.
 * - If delta_t - nleap - 32.184 > 1, input is treated as UT1
 *   (to avoid errors when the leap seconds table is outdated).
 *
 * @param deltatEx  delta T function (injected from swephlib)
 */
export function utcToJd(
  iyear: number, imonth: number, iday: number,
  ihour: number, imin: number, dsec: number,
  gregflag: number,
  deltatEx: DeltaTFn
): UtcToJdResult {
  let tjdUt1 = julDay(iyear, imonth, iday, 0, gregflag);
  const rev = revJul(tjdUt1, gregflag);
  if (iyear !== rev.year || imonth !== rev.month || iday !== rev.day) {
    return {
      tjdEt: 0, tjdUt: 0,
      error: `invalid date: year = ${iyear}, month = ${imonth}, day = ${iday}`,
    };
  }
  if (ihour < 0 || ihour > 23
    || imin < 0 || imin > 59
    || dsec < 0 || dsec >= 61
    || (dsec >= 60 && (imin < 59 || ihour < 23 || tjdUt1 < J1972))) {
    return {
      tjdEt: 0, tjdUt: 0,
      error: `invalid time: ${ihour}:${imin}:${dsec.toFixed(2)}`,
    };
  }
  const dhour = ihour + imin / 60.0 + dsec / 3600.0;
  /* before 1972, treat input as UT1 */
  if (tjdUt1 < J1972) {
    const ut = julDay(iyear, imonth, iday, dhour, gregflag);
    return { tjdEt: ut + deltatEx(ut, -1), tjdUt: ut };
  }
  /* if Julian calendar, convert to Gregorian for leap second lookup */
  let iy = iyear, im = imonth, id = iday;
  let gflag = gregflag;
  if (gflag === SE_JUL_CAL) {
    gflag = SE_GREG_CAL;
    const r = revJul(tjdUt1, gflag);
    iy = r.year; im = r.month; id = r.day;
  }
  /* number of leap seconds since 1972 */
  const tabsiz = LEAP_SECONDS.length;
  let nleap = NLEAP_INIT;
  const ndat = iy * 10000 + im * 100 + id;
  let i: number;
  for (i = 0; i < tabsiz; i++) {
    if (ndat <= LEAP_SECONDS[i]) break;
    nleap++;
  }
  /* If delta_t - nleap - 32.184 >= 1.0, treat as UT1 (table outdated) */
  let d = deltatEx(tjdUt1, -1) * 86400.0;
  if (d - nleap - 32.184 >= 1.0) {
    const ut = tjdUt1 + dhour / 24.0;
    return { tjdEt: ut + deltatEx(ut, -1), tjdUt: ut };
  }
  /* validate leap second input */
  if (dsec >= 60) {
    let found = false;
    for (i = 0; i < tabsiz; i++) {
      if (ndat === LEAP_SECONDS[i]) { found = true; break; }
    }
    if (!found) {
      return {
        tjdEt: 0, tjdUt: 0,
        error: `invalid time (no leap second!): ${ihour}:${imin}:${dsec.toFixed(2)}`,
      };
    }
  }
  /* convert UTC to ET and UT1 */
  d = tjdUt1 - J1972;
  d += ihour / 24.0 + imin / 1440.0 + dsec / 86400.0;
  const tjdEt1972 = J1972 + (32.184 + NLEAP_INIT) / 86400.0;
  const tjdEt = tjdEt1972 + d + (nleap - NLEAP_INIT) / 86400.0;
  d = deltatEx(tjdEt, -1);
  let tjdUt = tjdEt - deltatEx(tjdEt - d, -1);
  tjdUt = tjdEt - deltatEx(tjdUt, -1);
  return { tjdEt, tjdUt };
}

/**
 * Convert Julian day (TT/ET) to UTC date components.
 *
 * - Before 1 Jan 1972 UTC → output is UT1
 * - From 1972 on → output is UTC
 *
 * @param deltatEx  delta T function (injected from swephlib)
 */
export function jdetToUtc(
  tjdEt: number, gregflag: number,
  deltatEx: DeltaTFn
): JdToUtcResult {
  const tjdEt1972 = J1972 + (32.184 + NLEAP_INIT) / 86400.0;
  let d = deltatEx(tjdEt, -1);
  let tjdUt = tjdEt - deltatEx(tjdEt - d, -1);
  tjdUt = tjdEt - deltatEx(tjdUt, -1);

  /* before 1972, return UT1 */
  if (tjdEt < tjdEt1972) {
    const r = revJul(tjdUt, gregflag);
    const hourInt = Math.trunc(r.hour);
    d = (r.hour - hourInt) * 60;
    const minInt = Math.trunc(d);
    const sec = (d - minInt) * 60.0;
    return { year: r.year, month: r.month, day: r.day, hour: hourInt, minute: minInt, second: sec };
  }

  /* count leap seconds */
  const tabsiz = LEAP_SECONDS.length;
  const rPrev = revJul(tjdUt - 1, SE_GREG_CAL);
  const ndat = rPrev.year * 10000 + rPrev.month * 100 + rPrev.day;
  let nleap = 0;
  let i: number;
  for (i = 0; i < tabsiz; i++) {
    if (ndat <= LEAP_SECONDS[i]) break;
    nleap++;
  }

  /* date of potentially missing leap second */
  let second60 = 0;
  if (nleap < tabsiz) {
    const ls = LEAP_SECONDS[nleap];
    const iyear2 = Math.trunc(ls / 10000);
    const imonth2 = Math.trunc((ls % 10000) / 100);
    const iday2 = ls % 100;
    const tjd = julDay(iyear2, imonth2, iday2, 0, SE_GREG_CAL);
    const rNext = revJul(tjd + 1, SE_GREG_CAL);
    const utcRes = utcToJd(rNext.year, rNext.month, rNext.day, 0, 0, 0, SE_GREG_CAL, deltatEx);
    d = tjdEt - utcRes.tjdEt;
    if (d >= 0) {
      nleap++;
    } else if (d < 0 && d > -1.0 / 86400.0) {
      second60 = 1;
    }
  }

  /* UTC, still unsure about one leap second */
  let tjd2 = J1972 + (tjdEt - tjdEt1972) - (nleap + second60) / 86400.0;
  let r = revJul(tjd2, SE_GREG_CAL);
  let yearOut = r.year, monthOut = r.month, dayOut = r.day;
  let hourOut = Math.trunc(r.hour);
  d = (r.hour - hourOut) * 60;
  let minOut = Math.trunc(d);
  let secOut = (d - minOut) * 60.0 + second60;

  /* If leap seconds table is outdated, treat as UT1 */
  d = deltatEx(tjdEt, -1);
  d = deltatEx(tjdEt - d, -1);
  if (d * 86400.0 - (nleap + NLEAP_INIT) - 32.184 >= 1.0) {
    r = revJul(tjdEt - d, SE_GREG_CAL);
    yearOut = r.year; monthOut = r.month; dayOut = r.day;
    hourOut = Math.trunc(r.hour);
    d = (r.hour - hourOut) * 60;
    minOut = Math.trunc(d);
    secOut = (d - minOut) * 60.0;
  }

  if (gregflag === SE_JUL_CAL) {
    const tjdG = julDay(yearOut, monthOut, dayOut, 0, SE_GREG_CAL);
    r = revJul(tjdG, gregflag);
    yearOut = r.year; monthOut = r.month; dayOut = r.day;
  }

  return { year: yearOut, month: monthOut, day: dayOut, hour: hourOut, minute: minOut, second: secOut };
}

/**
 * Convert Julian day (UT1) to UTC date components.
 */
export function jdut1ToUtc(
  tjdUt: number, gregflag: number,
  deltatEx: DeltaTFn
): JdToUtcResult {
  const tjdEt = tjdUt + deltatEx(tjdUt, -1);
  return jdetToUtc(tjdEt, gregflag, deltatEx);
}
