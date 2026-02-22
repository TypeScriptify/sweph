# Delta-T

**Delta-T** (written as the greek symbol, also known as the "delta-T correction") is the difference between two time scales: **Terrestrial Time (TT)** and **Universal Time (UT)**. It answers a deceptively simple question: how far has Earth's rotation drifted from a perfectly uniform clock?

- **Terrestrial Time (TT)** (formerly called Ephemeris Time) ticks at a perfectly uniform rate, defined by atomic clocks. It is the time scale used internally by the Swiss Ephemeris for all planetary calculations.
- **Universal Time (UT)** is based on the actual rotation of the Earth -- one UT day is one full rotation of the Earth relative to the mean Sun. Because the Earth's rotation is irregular (it is gradually slowing down due to tidal friction from the Moon, and also fluctuates unpredictably), UT days are not all exactly the same length.

**Delta-T = TT - UT**. When Delta-T is positive (as it is today), Terrestrial Time is ahead of Universal Time -- meaning the Earth has rotated slightly less than a perfectly uniform clock would predict.

Why does this matter? If you want to compute where the planets were at a given clock time (UT), the Swiss Ephemeris needs to know the corresponding TT to look up positions in its tables. The difference is small for modern dates (~69 seconds in 2024), but for ancient dates it can be hours, which dramatically affects where eclipses and other events are predicted to have occurred on Earth.

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Get delta-T for J2000.0 (January 1, 2000 at 12:00 UT)
const jd = SwissEph.julianDay(2000, 1, 1, 12);
const dt = swe.deltaT(jd);

// The result is in fractions of a day -- multiply by 86400 for seconds
console.log(`Delta-T: ${(dt * 86400).toFixed(2)} seconds`);
// Delta-T: ~63.83 seconds

swe.close();
```

---

## Detailed Examples

### Delta-T at different historical epochs

Delta-T varies dramatically across history. In ancient times, the accumulated drift of Earth's rotation amounts to hours. In the modern era, it is tens of seconds.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const dates = [
  { year: -500,  label: '500 BCE' },
  { year: 0,     label: '1 BCE / 1 CE' },
  { year: 500,   label: '500 CE' },
  { year: 1000,  label: '1000 CE' },
  { year: 1500,  label: '1500 CE' },
  { year: 1700,  label: '1700 CE' },
  { year: 1800,  label: '1800 CE' },
  { year: 1900,  label: '1900 CE' },
  { year: 1950,  label: '1950 CE' },
  { year: 2000,  label: '2000 CE' },
  { year: 2024,  label: '2024 CE' },
];

console.log('Epoch            Delta-T (seconds)    Delta-T (hours)');
console.log('------           -----------------    ---------------');

for (const d of dates) {
  const jd = SwissEph.julianDay(d.year, 7, 1, 12);
  const dt = swe.deltaT(jd);
  const seconds = dt * 86400;
  const hours = seconds / 3600;
  console.log(
    `${d.label.padEnd(17)}` +
    `${seconds.toFixed(1).padStart(10)} s` +
    `${hours.toFixed(3).padStart(16)} h`
  );
}

swe.close();
```

Expected approximate output:

| Epoch     | Delta-T (seconds) | Delta-T (hours) |
|-----------|--------------------|-----------------|
| 500 BCE   | ~17,190 s          | ~4.8 h          |
| 1 BCE     | ~10,580 s          | ~2.9 h          |
| 500 CE    | ~5,710 s           | ~1.6 h          |
| 1000 CE   | ~1,570 s           | ~0.4 h          |
| 1500 CE   | ~141 s             | ~0.04 h         |
| 1700 CE   | ~9 s               | ~0.002 h        |
| 1800 CE   | ~14 s              | ~0.004 h        |
| 1900 CE   | ~-3 s              | ~-0.001 h       |
| 1950 CE   | ~29 s              | ~0.008 h        |
| 2000 CE   | ~64 s              | ~0.018 h        |
| 2024 CE   | ~69 s              | ~0.019 h        |

Note how Delta-T was actually slightly negative around 1900, meaning Earth was slightly ahead of the uniform clock at that time. The overall trend is increasing due to the gradual slowing of Earth's rotation.

### Converting between UT and ET manually

In most cases the library handles this automatically (if you use `timeMode: 'ut'`, every call internally adds Delta-T). But if you need to convert manually:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Given a UT date: April 8, 2024 at 18:00 UT
const jdUt = SwissEph.julianDay(2024, 4, 8, 18.0);

// Get Delta-T for this date
const dt = swe.deltaT(jdUt);

// Convert to Ephemeris Time (TT)
const jdEt = jdUt + dt;

console.log(`JD (UT): ${jdUt.toFixed(6)}`);
console.log(`Delta-T: ${(dt * 86400).toFixed(2)} seconds`);
console.log(`JD (ET): ${jdEt.toFixed(6)}`);
console.log(`Difference: ${(dt * 86400).toFixed(2)} seconds = ${(dt * 86400 / 60).toFixed(4)} minutes`);

swe.close();
```

### Setting a user-defined Delta-T

For research purposes you may want to override the built-in Delta-T model with a specific value. For example, when testing historical eclipse computations with a known Delta-T estimate:

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(-600, 5, 28, 12); // 601 BCE

// Check the default delta-T
const dtDefault = swe.deltaT(jd);
console.log(`Default Delta-T: ${(dtDefault * 86400).toFixed(1)} seconds`);

// Override with a custom value (in fractions of a day)
// For example, set Delta-T to exactly 18,000 seconds (5 hours)
swe.setDeltaTUserDefined(18000 / 86400);

const dtCustom = swe.deltaT(jd);
console.log(`Custom Delta-T:  ${(dtCustom * 86400).toFixed(1)} seconds`);

// All subsequent UT-based calculations will use this value
const sun = swe.calc(jd, SE_SUN);
console.log(`Sun longitude with custom Delta-T: ${sun.longitude.toFixed(4)} deg`);

swe.close();
```

### Observing Delta-T growth over recent decades

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

console.log('Year    Delta-T (s)    Growth (s/yr)');
console.log('----    -----------    -------------');

let prevDt = 0;
for (let year = 1970; year <= 2024; year += 2) {
  const jd = SwissEph.julianDay(year, 1, 1, 0);
  const dt = swe.deltaT(jd) * 86400;
  const growth = prevDt ? (dt - prevDt) / 2 : 0;
  console.log(
    `${year}    ${dt.toFixed(2).padStart(8)} s    ` +
    `${prevDt ? growth.toFixed(3).padStart(8) : '      --'} s/yr`
  );
  prevDt = dt;
}

swe.close();
```

---

## Deep Explanation

### Why Earth's rotation is slowing down

The primary cause is **tidal friction**. The Moon raises tides in the oceans (and to a lesser extent in the solid Earth). As the Earth rotates, it drags these tidal bulges slightly ahead of the Earth-Moon line. The gravitational pull of the Moon on these bulges acts as a brake on Earth's rotation, slowing it down by about 2.3 milliseconds per century. As a consequence, the Moon is also slowly spiraling outward from Earth, gaining orbital energy at the expense of Earth's rotational energy. The Moon recedes by about 3.8 cm per year.

Over centuries, this tiny daily slowdown accumulates into a significant offset. After 1000 years of 2 ms/century deceleration, the accumulated drift is roughly:

```
0.5 * (deceleration) * (time)^2 = 0.5 * (2.3 ms/century) * (10 centuries)^2 ~ 115 seconds per century squared
```

This is why Delta-T grows roughly quadratically with time -- the values for ancient dates are thousands of seconds.

### Unpredictable fluctuations

Besides the smooth tidal deceleration, Earth's rotation has irregular fluctuations on timescales from days to decades. These are caused by:

- **Core-mantle coupling**: Fluid motions in Earth's liquid outer core transfer angular momentum to the solid mantle
- **Post-glacial rebound**: The mantle is still rebounding from ice-age glaciers, changing Earth's moment of inertia
- **Atmospheric and oceanic circulation**: Seasonal and weather-related angular momentum exchanges
- **Earthquakes**: Large events can measurably change Earth's moment of inertia (the 2004 Sumatra earthquake shortened the day by ~2.7 microseconds)

Because of these unpredictable components, Delta-T cannot be precisely predicted for the future. Extrapolations more than 10-20 years ahead diverge from actual measurements by several seconds.

### Historical constraints: ancient eclipse records

For dates before the telescopic era (pre-1600), Delta-T is estimated primarily from historical records of eclipses. Ancient Babylonian clay tablets record solar and lunar eclipses with enough detail to constrain when they occurred and, crucially, where they were visible. If a total solar eclipse was observed in Babylon on a known date, we can compute the eclipse geometry and figure out what Delta-T must have been to place the eclipse path over Babylon. Chinese and Arabic records provide additional constraints. The uncertainty in Delta-T for ancient dates is still large (hundreds of seconds for dates before 500 BCE) but these eclipse records are the best evidence we have.

### The Delta-T models in Swiss Ephemeris

The Swiss Ephemeris uses a composite Delta-T model assembled from several sources:

1. **Observed values (1955-present)**: Directly measured values from the International Earth Rotation and Reference Systems Service (IERS), the most accurate data available
2. **Historical tables (1620-1955)**: Based on telescope-era observations, primarily from Stephenson, Morrison, and Hohenkerk (2016)
3. **Parabolic extrapolation (before 1620)**: Based on Stephenson, Morrison, and Hohenkerk's analysis of historical eclipse records, using the tidal deceleration rate to extrapolate further back
4. **Future extrapolation (after latest observed values)**: A parabolic projection based on the current rate of change, with growing uncertainty

The `flags` parameter can select different Delta-T models, though the default (`-1`) uses the built-in composite model which is appropriate for nearly all use cases.

### Leap seconds and Delta-T

Since 1972, **leap seconds** have been periodically added to UTC (Coordinated Universal Time) to keep it within 0.9 seconds of UT1 (a refined version of UT). This means UTC effectively tracks UT1 in a stepwise fashion. Delta-T, however, measures the smooth difference between TT and UT1, independent of leap seconds. The relationship is:

```
Delta-T = 32.184 s + (TAI - UTC) - (UT1 - UTC)
```

where TAI (International Atomic Time) and TT differ by a constant 32.184 seconds, and (TAI - UTC) is the cumulative leap second count.

As of 2024, 27 leap seconds have been added since 1972, and the last one was in December 2016. Earth's rotation has recently been slightly speeding up (for reasons not fully understood), leading to discussions of potentially needing a "negative leap second" -- an unprecedented event that has never occurred.

### Why Delta-T matters for practical calculations

For modern dates (say, 1900-2100), Delta-T is at most about 1-2 minutes. Since planets move relatively slowly, a 1-minute error in time translates to a tiny fraction of a degree in planetary positions -- negligible for most purposes.

But for ancient dates, the situation is very different:

| Date       | Delta-T    | Moon error at horizon |
|------------|------------|-----------------------|
| 2024 CE    | ~69 s      | ~0.03 deg             |
| 1000 CE    | ~1,570 s   | ~0.7 deg              |
| 500 BCE    | ~17,190 s  | ~7.9 deg              |
| 3000 BCE   | ~58,000 s  | ~27 deg               |

The Moon moves about 0.5 degrees per minute, so an uncertainty of even 1000 seconds (17 minutes) in Delta-T shifts the predicted Moon position by about 8 degrees. This is larger than the Moon's angular diameter and enough to completely change whether a solar eclipse is visible from a given location. This is why historical eclipse computations always require careful attention to Delta-T.

### The result is a fraction of a day

The `deltaT()` method returns its result as a **fraction of a Julian day**, not in seconds. This matches the convention used internally by the Swiss Ephemeris where time differences are in day fractions. To convert:

```typescript
const dtDays = swe.deltaT(jd);       // fraction of a day
const dtSeconds = dtDays * 86400;     // seconds
const dtMinutes = dtDays * 1440;      // minutes
const dtHours = dtDays * 24;          // hours
```

### The flags parameter

The optional `flags` parameter to `deltaT()` defaults to `-1`, which selects the default built-in model. You should rarely need to change this. The flags value matches the ephemeris flag constants (`SEFLG_MOSEPH`, `SEFLG_SWIEPH`, `SEFLG_JPLEPH`), and different ephemeris modes may use slightly different tidal acceleration values which feed into the Delta-T model. In practice, the differences between models are negligible for dates within a few thousand years of the present.
