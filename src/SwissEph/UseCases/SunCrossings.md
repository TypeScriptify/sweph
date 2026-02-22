# Sun Crossings (Solar Ingresses)

A **Sun crossing** (or **solar ingress**) is the precise moment when the Sun reaches a specific ecliptic longitude. Since the Sun moves along the ecliptic at roughly 1 degree per day, it crosses each degree of the zodiac once per year. The most important crossings are the **solstices** and **equinoxes** -- the four cardinal points that define the astronomical seasons.

The `sunCrossing()` method finds the next Julian Day when the Sun reaches a given ecliptic longitude, searching forward from a starting date.

This is essential for:
- Determining the exact start of astronomical seasons
- Finding zodiac sign ingresses (when the Sun enters each sign)
- Computing the tropical year length
- Casting ingress charts in mundane astrology (political/world event astrology)

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find the next vernal equinox (Sun at 0° Aries) after Jan 1, 2025
const startJd = SwissEph.julianDay(2025, 1, 1, 0);
const result = swe.sunCrossing(0, startJd);

const d = SwissEph.fromJulianDay(result.jd);
console.log(`Vernal Equinox 2025: ${d.year}-${d.month}-${d.day.toFixed(6)}`);
// The Sun crosses 0° longitude around March 20, 2025

swe.close();
```

---

## Detailed Examples

### Finding all four cardinal points (seasons) in a year

The four cardinal longitudes are:
- **0 degrees** -- Vernal Equinox (start of spring, Northern Hemisphere)
- **90 degrees** -- Summer Solstice (longest day)
- **180 degrees** -- Autumnal Equinox (start of autumn)
- **270 degrees** -- Winter Solstice (shortest day)

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const year = 2025;
const startJd = SwissEph.julianDay(year, 1, 1, 0);

const cardinals = [
  { lon: 0,   name: 'Vernal Equinox (Spring)' },
  { lon: 90,  name: 'Summer Solstice' },
  { lon: 180, name: 'Autumnal Equinox (Fall)' },
  { lon: 270, name: 'Winter Solstice' },
];

for (const c of cardinals) {
  const result = swe.sunCrossing(c.lon, startJd);
  const d = SwissEph.fromJulianDay(result.jd);
  const hours = (d.day % 1) * 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  console.log(
    `${c.name.padEnd(30)} ` +
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')} ` +
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} UT`
  );
}

swe.close();
```

### Finding all 12 zodiac sign ingresses

When the Sun enters each zodiac sign, it crosses the sign boundary at a specific longitude. Each sign spans 30 degrees:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const year = 2025;
const startJd = SwissEph.julianDay(year, 1, 1, 0);

const signs = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

for (let i = 0; i < 12; i++) {
  const longitude = i * 30;
  // Search from start of year; for signs Sun has already passed,
  // the search will find next year's ingress if needed
  const result = swe.sunCrossing(longitude, startJd);
  const d = SwissEph.fromJulianDay(result.jd);

  const hours = (d.day % 1) * 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);

  console.log(
    `Sun enters ${signs[i].padEnd(12)} (${String(longitude).padStart(3)}°): ` +
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')} ` +
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} UT`
  );
}

swe.close();
```

### Measuring the length of the tropical year

The tropical year is the time between two successive vernal equinoxes. It is approximately 365.2422 days, but varies slightly from year to year.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find vernal equinoxes for several consecutive years
const years: number[] = [];
const equinoxJds: number[] = [];

for (let year = 2020; year <= 2030; year++) {
  const startJd = SwissEph.julianDay(year, 1, 1, 0);
  const result = swe.sunCrossing(0, startJd);
  years.push(year);
  equinoxJds.push(result.jd);
}

// Compute tropical year lengths
for (let i = 1; i < years.length; i++) {
  const length = equinoxJds[i] - equinoxJds[i - 1];
  const d = SwissEph.fromJulianDay(equinoxJds[i]);
  const hours = (d.day % 1) * 24;
  console.log(
    `${years[i]} Equinox: ` +
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')} ` +
    `${Math.floor(hours).toString().padStart(2,'0')}:${Math.floor((hours % 1) * 60).toString().padStart(2,'0')} UT  ` +
    `  year length: ${length.toFixed(6)} days`
  );
}

swe.close();
```

### Finding when the Sun reaches a specific degree (e.g., 15 degrees Taurus)

In astrology, you might want to know when the Sun reaches an exact degree -- for example, to find when the Sun hits 15 degrees Taurus (45 degrees ecliptic longitude), perhaps for a transit to a natal planet.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// 15° Taurus = 30° (Aries) + 15° = 45° ecliptic longitude
const targetLon = 45;
const startJd = SwissEph.julianDay(2025, 1, 1, 0);
const result = swe.sunCrossing(targetLon, startJd);

const d = SwissEph.fromJulianDay(result.jd);
const hours = (d.day % 1) * 24;
const h = Math.floor(hours);
const m = Math.floor((hours - h) * 60);

console.log(
  `Sun reaches 15° Taurus: ` +
  `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')} ` +
  `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} UT`
);

// Verify by computing the Sun's position at that moment
const sun = swe.calc(result.jd, 0); // SE_SUN = 0
console.log(`Sun longitude at that moment: ${sun.longitude.toFixed(6)}°`);
// Should be very close to 45.000000°

swe.close();
```

---

## Deep Explanation

### The Ecliptic and Solar Longitude

The **ecliptic** is the apparent path of the Sun across the sky over the course of a year. It is the plane of Earth's orbit projected onto the celestial sphere. Solar longitude measures the Sun's position along this path:

- **0 degrees**: The Vernal Equinox point (also called the First Point of Aries), where the Sun crosses the celestial equator going northward
- **90 degrees**: The Sun is at its northernmost point (Summer Solstice)
- **180 degrees**: The Sun crosses the celestial equator going southward (Autumnal Equinox)
- **270 degrees**: The Sun is at its southernmost point (Winter Solstice)

```
                90° (Summer Solstice, ~Jun 21)
                |
                |
  180° ---------+--------- 0°/360° (Vernal Equinox, ~Mar 20)
(Autumnal       |
 Equinox,       |
 ~Sep 23)       |
                270° (Winter Solstice, ~Dec 21)
```

### Equinoxes and Solstices

The **equinoxes** are the two moments when the Sun crosses the celestial equator. At these times, day and night are approximately equal in length everywhere on Earth ("equinox" comes from Latin "equal night").

The **solstices** are the two moments when the Sun reaches its maximum northern or southern declination. The Summer Solstice is the longest day in the Northern Hemisphere (shortest in the Southern), and vice versa for the Winter Solstice.

These four points divide the year into the four astronomical seasons. The exact dates shift slightly from year to year because the tropical year (365.2422 days) does not divide evenly into calendar days.

### Precession and the Tropical Zodiac

The Vernal Equinox point (0 degrees Aries) is not fixed among the stars. Due to **precession** -- the slow wobble of Earth's axis over a ~26,000-year cycle -- the equinox point drifts westward through the constellations at about 1 degree every 72 years.

This is the difference between the **tropical zodiac** (based on the equinox, used in Western astrology) and the **sidereal zodiac** (based on the fixed stars, used in Vedic astrology). The `sunCrossing()` method uses the tropical zodiac by default -- 0 degrees always means the Vernal Equinox point.

If you need sidereal crossings, apply an ayanamsa offset to the longitude:
```typescript
const ayanamsa = swe.getAyanamsa(jd); // e.g., 24.2° for Lahiri
const siderealTarget = 0; // 0° sidereal Aries
const tropicalTarget = siderealTarget + ayanamsa;
const result = swe.sunCrossing(tropicalTarget, jd);
```

### The Tropical Year

The tropical year -- the time from one Vernal Equinox to the next -- is the basis of our calendar. Its current mean length is approximately:

**365.24219 days = 365 days, 5 hours, 48 minutes, 45 seconds**

This is not exactly 365.25 days (the Julian calendar's approximation), which is why the Gregorian calendar has its leap year rules (divisible by 4, except centuries unless divisible by 400).

The tropical year length varies slightly from year to year (by up to about 20 minutes) due to gravitational perturbations from the Moon and other planets.

### Ingress Charts in Mundane Astrology

In **mundane astrology** (the astrology of nations and world events), an **ingress chart** is the horoscope cast for the exact moment the Sun enters a cardinal sign (0 degrees of Aries, Cancer, Libra, or Capricorn) for a given location (usually a national capital).

The **Aries ingress** chart (Vernal Equinox) is considered the most important, as it is said to set the tone for the entire year. Astrologers examine the positions of planets, the Ascendant, and house placements in this chart to make predictions about the coming season or year.

### Sun's Speed Variation

The Sun's apparent speed along the ecliptic is not constant. Due to Earth's elliptical orbit:
- The Sun moves fastest around **perihelion** (early January): ~1.019 degrees/day
- The Sun moves slowest around **aphelion** (early July): ~0.953 degrees/day
- Average speed: ~0.9856 degrees/day

This means the Sun spends more time in the signs it transits during Northern Hemisphere summer (Cancer through Sagittarius) than in the winter signs. The `sunCrossing()` function accounts for this automatically.

### API Details

```typescript
swe.sunCrossing(longitude: number, jd: number, flags?: number): CrossingResult
```

**Parameters:**
- `longitude`: The target ecliptic longitude in degrees (0-360). The function normalizes values outside this range.
- `jd`: The starting Julian Day to search from. The function finds the **next** crossing after this date.
- `flags` (optional): Calculation flags. Normally omitted (defaults are appropriate for most uses).

**Returns:**
```typescript
interface CrossingResult {
  jd: number;  // Julian Day of the crossing
}
```

The returned Julian Day is precise to sub-second accuracy. Convert to a calendar date with `SwissEph.fromJulianDay(result.jd)`.

**Error handling:** The method throws a `SwissEphError` if the crossing cannot be found (which should not happen for the Sun under normal circumstances, since the Sun completes a full cycle every year).
