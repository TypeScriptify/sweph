# Date and Time

The **Julian Day** (JD) is a continuous day count used in astronomy. It counts the number of days (and fractions of a day) that have elapsed since **January 1, 4713 BC at noon** (in the Julian proleptic calendar). This system has no gaps for calendar reforms, no missing days, no ambiguity about time zones -- just a single number that increases steadily.

Despite the name, the Julian Day has **nothing to do with the Julian calendar**. The naming is a coincidence: the Julian Day system was devised by Joseph Scaliger in 1583 and named after his father Julius Caesar Scaliger, while the Julian calendar was named after the Roman dictator Julius Caesar. The similarity is purely in the name "Julius."

The Julian Day is the standard time input for the Swiss Ephemeris. Every calculation -- planet positions, eclipses, rise/set times -- takes a Julian Day number as its time parameter. This library provides utility methods to convert between familiar calendar dates and Julian Day numbers.

---

## Quick Example

```typescript
import { SwissEph } from '../index';

// Convert a date to Julian Day
const jd = SwissEph.julianDay(2025, 6, 15, 12); // June 15, 2025 at noon UT
console.log(`Julian Day: ${jd}`);
// 2460811.0

// Convert back to a date
const date = SwissEph.fromJulianDay(jd);
console.log(`${date.year}-${date.month}-${date.day}, hour: ${date.hour}`);
// 2025-6-15, hour: 12

// Day of the week
const dow = SwissEph.dayOfWeek(jd);
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
console.log(`Day of week: ${dayNames[dow]}`);
```

---

## Detailed Examples

### Converting dates to Julian Day

The `julianDay()` method takes year, month, day, and fractional hour. Hours are expressed as decimal fractions of a day: 6.5 = 6:30 AM, 18.75 = 6:45 PM.

```typescript
import { SwissEph } from '../index';

// J2000.0 epoch (January 1, 2000 at 12:00 TT)
const j2000 = SwissEph.julianDay(2000, 1, 1, 12);
console.log(`J2000.0: ${j2000}`);
// 2451545.0

// Midnight on January 1, 2025
const newYear = SwissEph.julianDay(2025, 1, 1, 0);
console.log(`2025 New Year midnight: ${newYear}`);

// A specific time: March 20, 2025 at 09:01:25 UT
// Convert h:m:s to fractional hours: 9 + 1/60 + 25/3600 = 9.02361...
const equinox = SwissEph.julianDay(2025, 3, 20, 9 + 1/60 + 25/3600);
console.log(`2025 vernal equinox: ${equinox.toFixed(6)}`);

// Negative years: 1 BC = year 0, 2 BC = year -1, etc.
// (Astronomical year numbering, not historical)
const ancient = SwissEph.julianDay(-3000, 7, 19, 12);
console.log(`July 19, 3001 BC: ${ancient}`);
```

### Converting Julian Day back to a date

```typescript
import { SwissEph } from '../index';

const jd = 2460811.0; // some Julian Day

const date = SwissEph.fromJulianDay(jd);
console.log(`Year:  ${date.year}`);
console.log(`Month: ${date.month}`);
console.log(`Day:   ${date.day}`);
console.log(`Hour:  ${date.hour}`); // fractional hour

// Convert fractional hour to h:m:s
const h = Math.floor(date.hour);
const m = Math.floor((date.hour - h) * 60);
const s = ((date.hour - h) * 60 - m) * 60;
console.log(`Time: ${h}:${String(m).padStart(2,'0')}:${s.toFixed(1).padStart(4,'0')}`);
```

### UTC conversions with utcToJd and jdToUtc

The `utcToJd()` method converts a UTC date/time to Julian Day numbers and returns **both** the ET (Ephemeris Time) and UT (Universal Time) values. This is important because the Swiss Ephemeris internally works in ET, but most users think in UT/UTC.

```typescript
import { SwissEph } from '../index';

// Convert a precise UTC time to Julian Day
const result = SwissEph.utcToJd(2025, 3, 20, 9, 1, 25.0); // 2025-03-20 09:01:25 UTC

console.log(`JD (ET): ${result.tjdEt.toFixed(6)}`);
console.log(`JD (UT): ${result.tjdUt.toFixed(6)}`);
console.log(`Difference (ET - UT): ${((result.tjdEt - result.tjdUt) * 86400).toFixed(1)} seconds`);
// The difference is delta-T, about 69 seconds in 2025

// Convert JD (ET) back to UTC
const utcFromEt = SwissEph.jdToUtc(result.tjdEt);
console.log(`\nBack to UTC from ET:`);
console.log(`  ${utcFromEt.year}-${utcFromEt.month}-${utcFromEt.day}`);
console.log(`  ${utcFromEt.hour}:${utcFromEt.minute}:${utcFromEt.second.toFixed(3)}`);

// Convert JD (UT) back to UTC
const utcFromUt = SwissEph.jdUtToUtc(result.tjdUt);
console.log(`\nBack to UTC from UT:`);
console.log(`  ${utcFromUt.year}-${utcFromUt.month}-${utcFromUt.day}`);
console.log(`  ${utcFromUt.hour}:${utcFromUt.minute}:${utcFromUt.second.toFixed(3)}`);
```

### Day of the week

The `dayOfWeek()` method returns 0 for Monday through 6 for Sunday. It works for any Julian Day, including dates thousands of years in the past or future.

```typescript
import { SwissEph } from '../index';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// What day of the week was July 20, 1969 (Apollo 11 landing)?
const apollo = SwissEph.julianDay(1969, 7, 20, 20.3); // ~20:17 UT
console.log(`Apollo 11 landing: ${dayNames[SwissEph.dayOfWeek(apollo)]}`);
// Sunday

// What day of the week is January 1, 2000?
const y2k = SwissEph.julianDay(2000, 1, 1, 0);
console.log(`Y2K: ${dayNames[SwissEph.dayOfWeek(y2k)]}`);
// Saturday

// Check a range of dates
console.log('\nFirst day of each month in 2025:');
for (let month = 1; month <= 12; month++) {
  const jd = SwissEph.julianDay(2025, month, 1, 0);
  console.log(`  2025-${String(month).padStart(2,'0')}-01: ${dayNames[SwissEph.dayOfWeek(jd)]}`);
}
```

### Gregorian vs Julian calendar

The `SE_GREG_CAL` (default) and `SE_JUL_CAL` flags control which calendar system is used. The Gregorian calendar was introduced by Pope Gregory XIII on October 15, 1582 (the day after October 4 in the Julian calendar -- 10 days were skipped). Different countries adopted it at different times.

```typescript
import { SwissEph } from '../index';
import { SE_GREG_CAL, SE_JUL_CAL } from '../../constants';

// The same "date" in both calendars gives different Julian Days
// because the calendars diverge after the 1582 reform.

// October 15, 1582 -- first day of the Gregorian calendar
const gregStart = SwissEph.julianDay(1582, 10, 15, 12, SE_GREG_CAL);
console.log(`Oct 15, 1582 (Gregorian): JD ${gregStart}`);

// October 5, 1582 -- the Julian calendar day that corresponds to the same moment
const julSame = SwissEph.julianDay(1582, 10, 5, 12, SE_JUL_CAL);
console.log(`Oct 5, 1582 (Julian):     JD ${julSame}`);
console.log(`Same day? ${gregStart === julSame}`); // true

// For ancient dates, always use SE_JUL_CAL
// The Battle of Marathon: September 12, 490 BC
const marathon = SwissEph.julianDay(-489, 9, 12, 12, SE_JUL_CAL);
const marathonDate = SwissEph.fromJulianDay(marathon, SE_JUL_CAL);
console.log(`\nMarathon: JD ${marathon}`);
console.log(`Verified: ${marathonDate.year}/${marathonDate.month}/${marathonDate.day}`);

// Note: In astronomical year numbering, 490 BC = year -489
// (there is a year 0 between 1 BC and 1 AD)
```

### Converting JD to local time

Julian Day numbers are in Universal Time (UT). To get local time, add the timezone offset as a fraction of a day (hours / 24).

```typescript
import { SwissEph } from '../index';

// An event occurs at JD 2460811.25 (some UT time)
const jdUt = 2460811.25;

// Convert to calendar date in UT
const utDate = SwissEph.fromJulianDay(jdUt);
const utH = Math.floor(utDate.hour);
const utM = Math.floor((utDate.hour - utH) * 60);
console.log(`UT: ${utDate.year}-${utDate.month}-${utDate.day} ${utH}:${String(utM).padStart(2,'0')}`);

// Convert to New York time (EST = UT-5, EDT = UT-4)
const estOffset = -5; // EST
const jdLocal = jdUt + estOffset / 24;
const localDate = SwissEph.fromJulianDay(jdLocal);
const locH = Math.floor(localDate.hour);
const locM = Math.floor((localDate.hour - locH) * 60);
console.log(`EST: ${localDate.year}-${localDate.month}-${localDate.day} ${locH}:${String(locM).padStart(2,'0')}`);

// Convert to Tokyo time (JST = UT+9)
const jstOffset = 9;
const jdTokyo = jdUt + jstOffset / 24;
const tokyoDate = SwissEph.fromJulianDay(jdTokyo);
const tokH = Math.floor(tokyoDate.hour);
const tokM = Math.floor((tokyoDate.hour - tokH) * 60);
console.log(`JST: ${tokyoDate.year}-${tokyoDate.month}-${tokyoDate.day} ${tokH}:${String(tokM).padStart(2,'0')}`);
```

### Computing the number of days between two dates

Since Julian Day is a continuous count, subtraction gives you the exact number of days between any two dates.

```typescript
import { SwissEph } from '../index';

const jd1 = SwissEph.julianDay(2000, 1, 1, 0);
const jd2 = SwissEph.julianDay(2025, 6, 15, 0);

const days = jd2 - jd1;
const years = days / 365.25;
console.log(`Days between 2000-01-01 and 2025-06-15: ${days.toFixed(1)}`);
console.log(`Approximately ${years.toFixed(2)} years`);

// How many days since the Unix epoch? (January 1, 1970 00:00 UTC)
const unixEpoch = SwissEph.julianDay(1970, 1, 1, 0);
const now = SwissEph.julianDay(2025, 6, 15, 12);
console.log(`\nDays since Unix epoch: ${(now - unixEpoch).toFixed(1)}`);
```

### Using utcToJd with seconds precision

The `utcToJd()` method accepts seconds as a floating-point number, giving you sub-second precision.

```typescript
import { SwissEph } from '../index';

// A precise event: 2025-03-20 09:01:25.432 UTC
const result = SwissEph.utcToJd(2025, 3, 20, 9, 1, 25.432);
console.log(`JD (ET): ${result.tjdEt.toFixed(8)}`);
console.log(`JD (UT): ${result.tjdUt.toFixed(8)}`);

// Verify by converting back
const back = SwissEph.jdUtToUtc(result.tjdUt);
console.log(`\nVerification:`);
console.log(`  ${back.year}-${back.month}-${back.day} ${back.hour}:${back.minute}:${back.second.toFixed(3)}`);
```

---

## Deep Explanation

### Julian Day origin and numbering

The Julian Day count begins at **JD 0.0 = January 1, 4713 BC (Julian calendar) at 12:00 noon** (Greenwich Mean Time). This seemingly arbitrary starting point was chosen by Joseph Scaliger because it is the start of the current cycle of three combined chronological cycles (the 28-year solar cycle, the 19-year Metonic cycle, and the 15-year indiction cycle). By starting so far in the past, all recorded historical dates have positive Julian Day numbers.

Key Julian Day values:

| JD | Date | Significance |
|----|------|-------------|
| 0.0 | Jan 1, 4713 BC noon | JD epoch |
| 2299160.5 | Oct 15, 1582 midnight | Start of Gregorian calendar |
| 2415020.0 | Jan 0.5, 1900 | Origin of "Julian Date" in some older systems |
| 2440587.5 | Jan 1, 1970 midnight | Unix epoch |
| 2451545.0 | Jan 1, 2000 noon | J2000.0 epoch |

### The noon convention

Julian Day numbers change at **noon UT**, not at midnight. This was designed for the convenience of astronomers, who typically observe at night -- a single Julian Day number covers an entire night of observations without the day changing in the middle.

This means:
- JD 2451545.0 = January 1, 2000 at **12:00 noon** UT
- JD 2451545.5 = January 2, 2000 at **00:00 midnight** UT
- JD 2451544.75 = January 1, 2000 at **06:00 AM** UT

The fractional part of the JD encodes the time of day: .0 = noon, .25 = 6 PM, .5 = midnight, .75 = 6 AM.

### Modified Julian Day

The **Modified Julian Day** (MJD) is a commonly used variant:

```
MJD = JD - 2400000.5
```

The MJD starts at midnight (not noon) on November 17, 1858. It is used by many modern astronomical data systems because the numbers are smaller and more convenient. The Swiss Ephemeris uses regular JD internally, but you can easily convert.

### ET vs UT: why there are two time scales

**Universal Time (UT)** is based on the Earth's rotation. It is the time you read on a clock (after adjusting for time zones). However, the Earth's rotation is not perfectly uniform -- it gradually slows down due to tidal friction, and it has irregular fluctuations.

**Ephemeris Time (ET)**, also called **Terrestrial Time (TT)**, is a uniform time scale defined by atomic clocks. It ticks at a perfectly constant rate. This is the time scale used internally by the planetary ephemeris, because the laws of physics (and thus planetary orbits) follow uniform time.

The difference between ET and UT is called **delta-T**:

```
ET = UT + delta-T
```

In 2025, delta-T is approximately 69.2 seconds. This means ET is about 69 seconds ahead of UT. For ancient dates, the difference is much larger (hours or even days) because it has accumulated over centuries.

### Why utcToJd returns both ET and UT

The `utcToJd()` method returns two Julian Day values:

- `tjdEt`: for use with functions that expect Ephemeris Time (if you created the SwissEph instance with `timeMode: 'et'`)
- `tjdUt`: for use with functions that expect Universal Time (the default mode)

In most cases, you will use `tjdUt` (since the default time mode is UT). The `tjdEt` value is useful if you need to pass time to the lower-level engine directly.

### The fractional hour convention

The `julianDay()` function takes the hour as a single floating-point number:

| Hour value | Actual time |
|-----------|-------------|
| 0 | 00:00 (midnight) |
| 6.5 | 06:30 |
| 12 | 12:00 (noon) |
| 18.75 | 18:45 |
| 23.999 | 23:59:56.4 |

To convert hours, minutes, seconds to fractional hours:
```typescript
const fractionalHour = hours + minutes / 60 + seconds / 3600;
```

For more precision (separate hour, minute, second with floating-point seconds), use `utcToJd()` instead.

### Gregorian vs Julian calendar details

The Julian calendar, introduced by Julius Caesar in 46 BC, has a simple leap year rule: every year divisible by 4 is a leap year. This gives an average year length of 365.25 days, which is about 11 minutes and 14 seconds too long compared to the actual solar year.

Over centuries, this error accumulated. By 1582, the calendar was about 10 days out of sync with the seasons. Pope Gregory XIII reformed the calendar by:
1. Skipping 10 days (October 4 was followed by October 15, 1582)
2. Changing the leap year rule: century years (1700, 1800, 1900) are NOT leap years, unless they are divisible by 400 (so 2000 WAS a leap year)

This gives an average year of 365.2425 days -- much closer to the solar year.

**When to use which calendar**:
- Dates after October 15, 1582 in Catholic countries: `SE_GREG_CAL`
- Dates after 1752 in Britain and its colonies: `SE_GREG_CAL`
- Dates before the local adoption of the Gregorian calendar: `SE_JUL_CAL`
- When in doubt for modern dates: `SE_GREG_CAL` (the default)

### Astronomical year numbering

The Swiss Ephemeris uses **astronomical year numbering**, where:
- 1 AD = year 1
- 1 BC = year 0 (not year -1)
- 2 BC = year -1
- 3 BC = year -2
- etc.

This differs from the historical convention, which has no year 0. So when computing dates for "490 BC," pass -489 as the year.

### Common epochs

| Epoch | JD | Description |
|-------|------|-------------|
| J2000.0 | 2451545.0 | January 1, 2000 at 12:00 TT. The standard reference epoch for modern astronomy. Most star catalogs and coordinate systems are defined relative to this epoch. |
| B1950.0 | 2433282.4235 | January 0.923, 1950 (Besselian year). An older reference epoch still found in some older catalogs. |
| J1900.0 | 2415020.0 | January 0.5, 1900. Used in some older ephemeris systems. |

### Summary of static methods

| Method | Input | Output |
|--------|-------|--------|
| `SwissEph.julianDay(y, m, d, h?, gregflag?)` | Calendar date + fractional hour | Julian Day number |
| `SwissEph.fromJulianDay(jd, gregflag?)` | Julian Day number | `{ year, month, day, hour }` |
| `SwissEph.utcToJd(y, m, d, h, min, sec, gregflag?)` | Full UTC date/time | `{ tjdEt, tjdUt }` |
| `SwissEph.jdToUtc(jdEt, gregflag?)` | JD in ET | `{ year, month, day, hour, minute, second }` |
| `SwissEph.jdUtToUtc(jdUt, gregflag?)` | JD in UT | `{ year, month, day, hour, minute, second }` |
| `SwissEph.dayOfWeek(jd)` | Julian Day number | 0 (Mon) through 6 (Sun) |

All methods are **static** -- they are called on the class itself (`SwissEph.julianDay(...)`) and do not require creating an instance.
