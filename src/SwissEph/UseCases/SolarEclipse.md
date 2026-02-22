# Solar Eclipses

A **solar eclipse** occurs when the Moon passes between the Earth and the Sun, blocking some or all of the Sun's light. This happens because the Moon's orbit occasionally brings it directly in line between the Earth and Sun. Despite the Sun being about 400 times larger than the Moon, it is also about 400 times farther away, so they appear nearly the same size in our sky -- making total solar eclipses possible.

Solar eclipses are among the most dramatic astronomical events. They can only happen during a New Moon, but they do not happen at every New Moon because the Moon's orbit is tilted about 5 degrees relative to the ecliptic. Only when the Moon is near one of its orbital nodes (where its orbit crosses the ecliptic plane) can an eclipse occur.

The Swiss Ephemeris can predict solar eclipses with high precision: finding when they happen, what type they are, where the central path falls on Earth, and how the eclipse appears from any given location.

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find the next solar eclipse after January 1, 2024
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const eclipse = swe.solarEclipseGlobal(jd);

// Convert the time of maximum eclipse to a readable date
const date = SwissEph.fromJulianDay(eclipse.maximum);
console.log(`Next solar eclipse: ${date.year}-${date.month}-${date.day}`);
console.log(`Maximum at JD: ${eclipse.maximum.toFixed(6)}`);

swe.close();
```

---

## Detailed Examples

### Finding the 2024 April 8 total solar eclipse

```typescript
import { SwissEph } from '../index';
import { SE_ECL_TOTAL } from '../../constants';

const swe = new SwissEph();

// Search for the next total solar eclipse after 2024-01-01
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const eclipse = swe.solarEclipseGlobal(jd, SE_ECL_TOTAL);

const date = SwissEph.fromJulianDay(eclipse.maximum);
const hours = (date.hour);
const h = Math.floor(hours);
const m = Math.floor((hours - h) * 60);
const s = Math.round(((hours - h) * 60 - m) * 60);
console.log(`Total solar eclipse: ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`);
console.log(`Maximum at: ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`);
// Total solar eclipse: 2024-04-08
// Maximum at: 18:17:... UT

swe.close();
```

### Where is the central path?

Use `solarEclipseWhere` to find the geographic coordinates of the central line at the moment of maximum eclipse.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// First, find the eclipse
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const eclipse = swe.solarEclipseGlobal(jd);

// Now find where the central line falls at maximum
const where = swe.solarEclipseWhere(eclipse.maximum);
console.log(`Central path at maximum:`);
console.log(`  Longitude: ${where.geopos.longitude.toFixed(2)} deg`);
console.log(`  Latitude:  ${where.geopos.latitude.toFixed(2)} deg`);
// For the 2024 Apr 8 eclipse: approximately lon=-104, lat=25 (northern Mexico)

console.log(`Eclipse type flags: ${where.type}`);
console.log(`Obscuration: ${(where.attributes.fraction * 100).toFixed(1)}%`);
console.log(`Magnitude:   ${where.attributes.magnitude.toFixed(4)}`);

swe.close();
```

### Tracking the central path across the Earth

You can call `solarEclipseWhere` at different times during the eclipse to trace the entire path of the shadow across the Earth's surface.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 1, 1, 0);
const eclipse = swe.solarEclipseGlobal(jd);

// Trace from first central contact to last central contact
// second = start of central phase, third = end of central phase
const start = eclipse.second;
const end = eclipse.third;
const steps = 20;
const dt = (end - start) / steps;

console.log('Central path of the solar eclipse:');
for (let i = 0; i <= steps; i++) {
  const t = start + i * dt;
  const where = swe.solarEclipseWhere(t);
  const date = SwissEph.fromJulianDay(t);
  const h = Math.floor(date.hour);
  const m = Math.floor((date.hour - h) * 60);
  console.log(
    `  ${h}:${String(m).padStart(2,'0')} UT  ` +
    `lon=${where.geopos.longitude.toFixed(1)}, lat=${where.geopos.latitude.toFixed(1)}`
  );
}

swe.close();
```

### How does the eclipse look from a specific city?

Use `solarEclipseHow` to get eclipse attributes at a specific location and time, or use `solarEclipseLocal` to find the next eclipse visible from that location.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Dallas, Texas (in the path of the 2024 April 8 total eclipse)
const dallas = { longitude: -96.797, latitude: 32.7767 };

// Find the next solar eclipse visible from Dallas after 2024-01-01
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const local = swe.solarEclipseLocal(jd, dallas);

const date = SwissEph.fromJulianDay(local.maximum);
console.log(`Eclipse visible from Dallas on: ${date.year}-${date.month}-${date.day}`);

// Four contact times
const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  const s = Math.round(((d.hour - h) * 60 - m) * 60);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`;
};

console.log(`First contact (partial begins):  ${fmt(local.firstContact)}`);
console.log(`Second contact (total begins):   ${fmt(local.secondContact)}`);
console.log(`Maximum eclipse:                 ${fmt(local.maximum)}`);
console.log(`Third contact (total ends):      ${fmt(local.thirdContact)}`);
console.log(`Fourth contact (partial ends):   ${fmt(local.fourthContact)}`);

// Attributes at maximum
console.log(`\nEclipse attributes:`);
console.log(`  Obscuration fraction: ${(local.attributes.fraction * 100).toFixed(1)}%`);
console.log(`  Magnitude:           ${local.attributes.magnitude.toFixed(4)}`);
console.log(`  Sun/Moon diameter ratio: ${local.attributes.ratio.toFixed(4)}`);
console.log(`  Saros cycle:   ${local.attributes.sarosCycle}`);
console.log(`  Saros member:  ${local.attributes.sarosMember}`);

swe.close();
```

### Eclipse attributes at a location using `solarEclipseHow`

If you already know the JD of an eclipse (from `solarEclipseGlobal`) and just want to check how it looks from a specific place, `solarEclipseHow` is more direct than `solarEclipseLocal`.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find the eclipse first
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const eclipse = swe.solarEclipseGlobal(jd);

// Check from multiple cities
const cities = [
  { name: 'Dallas',    geo: { longitude: -96.797, latitude: 32.777 } },
  { name: 'New York',  geo: { longitude: -74.006, latitude: 40.713 } },
  { name: 'London',    geo: { longitude: -0.128,  latitude: 51.507 } },
];

for (const city of cities) {
  const how = swe.solarEclipseHow(eclipse.maximum, city.geo);
  const fraction = how.attributes.fraction;
  if (fraction > 0) {
    console.log(`${city.name}: ${(fraction * 100).toFixed(1)}% obscured, magnitude ${how.attributes.magnitude.toFixed(3)}`);
  } else {
    console.log(`${city.name}: eclipse not visible`);
  }
}

swe.close();
```

### Filtering by eclipse type

You can search specifically for total, annular, partial, or hybrid eclipses.

```typescript
import { SwissEph } from '../index';
import {
  SE_ECL_TOTAL, SE_ECL_ANNULAR, SE_ECL_PARTIAL, SE_ECL_ANNULAR_TOTAL,
} from '../../constants';

const swe = new SwissEph();
let jd = SwissEph.julianDay(2024, 1, 1, 0);

// Find the next 5 total solar eclipses
console.log('Next 5 total solar eclipses:');
for (let i = 0; i < 5; i++) {
  const ecl = swe.solarEclipseGlobal(jd, SE_ECL_TOTAL);
  const date = SwissEph.fromJulianDay(ecl.maximum);
  console.log(`  ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`);
  jd = ecl.maximum + 1; // Move past this eclipse to find the next one
}

// Find the next annular eclipse
const annular = swe.solarEclipseGlobal(SwissEph.julianDay(2024, 1, 1, 0), SE_ECL_ANNULAR);
const d = SwissEph.fromJulianDay(annular.maximum);
console.log(`\nNext annular eclipse: ${d.year}-${d.month}-${d.day}`);

// SE_ECL_ANNULAR_TOTAL (= SE_ECL_HYBRID) finds hybrid eclipses
// A hybrid eclipse is annular in some parts of the path and total in others

swe.close();
```

### Searching backward in time

Set `backward` to `true` to search for the most recent past eclipse.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Find the most recent solar eclipse before January 1, 2024
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const eclipse = swe.solarEclipseGlobal(jd, 0, true); // backward = true

const date = SwissEph.fromJulianDay(eclipse.maximum);
console.log(`Most recent eclipse before 2024: ${date.year}-${date.month}-${date.day}`);
// 2023-10-14 (annular eclipse across the Americas)

swe.close();
```

### Listing eclipses over a range of years

```typescript
import { SwissEph } from '../index';
import { SE_ECL_TOTAL, SE_ECL_ANNULAR, SE_ECL_PARTIAL, SE_ECL_ANNULAR_TOTAL } from '../../constants';

const swe = new SwissEph();

let jd = SwissEph.julianDay(2024, 1, 1, 0);
const endJd = SwissEph.julianDay(2030, 1, 1, 0);

const typeNames = (flags: number): string => {
  if (flags & SE_ECL_TOTAL) return 'Total';
  if (flags & SE_ECL_ANNULAR_TOTAL) return 'Hybrid';
  if (flags & SE_ECL_ANNULAR) return 'Annular';
  if (flags & SE_ECL_PARTIAL) return 'Partial';
  return 'Unknown';
};

console.log('Solar eclipses 2024-2029:');
while (jd < endJd) {
  const ecl = swe.solarEclipseGlobal(jd);
  if (ecl.maximum > endJd) break;
  const date = SwissEph.fromJulianDay(ecl.maximum);
  console.log(`  ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}  ${typeNames(ecl.type)}`);
  jd = ecl.maximum + 1;
}

swe.close();
```

---

## Deep Explanation

### Eclipse types

| Type | Constant | Description |
|------|----------|-------------|
| **Total** | `SE_ECL_TOTAL` (4) | The Moon completely covers the Sun's disc. The sky goes dark, the corona becomes visible. Only possible when the Moon is near perigee (closer to Earth). |
| **Annular** | `SE_ECL_ANNULAR` (8) | The Moon is centered on the Sun but too far away (near apogee) to cover it completely, leaving a bright ring ("annulus") of sunlight around the Moon. |
| **Partial** | `SE_ECL_PARTIAL` (16) | The Moon covers only part of the Sun's disc. This happens at the edges of a total/annular path, or when the alignment is not precise enough for a central eclipse. |
| **Hybrid** | `SE_ECL_ANNULAR_TOTAL` (32) | Also called `SE_ECL_HYBRID`. The eclipse is annular at some points on the path and total at others. This rare type occurs when the Moon's shadow tip just barely reaches Earth's surface. |

The `type` field in the result is a bitmask. You can also see `SE_ECL_CENTRAL` (1) if the eclipse has a central path, or `SE_ECL_NONCENTRAL` (2) if it does not. Use bitwise AND to check:

```typescript
import { SE_ECL_TOTAL, SE_ECL_CENTRAL } from '../../constants';

if (eclipse.type & SE_ECL_TOTAL) {
  console.log('This is a total eclipse');
}
if (eclipse.type & SE_ECL_CENTRAL) {
  console.log('It has a central path across Earth');
}
```

### The four contacts

A solar eclipse has up to four "contact" points, which define the key moments of the eclipse for a specific location:

1. **First contact** (`firstContact` / `first`): The Moon's disc first touches the Sun's disc. Partial phase begins.
2. **Second contact** (`secondContact` / `second`): The Moon completely covers (or maximally overlaps) the Sun. Totality or annularity begins. Only occurs for total/annular eclipses.
3. **Third contact** (`thirdContact` / `third`): Totality or annularity ends. The Moon begins to move off the Sun's disc.
4. **Fourth contact** (`fourthContact` / `fourth`): The Moon's disc completely separates from the Sun. Eclipse ends.

For a partial eclipse, only first and fourth contacts occur (second and third will be 0).

In the **global** result (`solarEclipseGlobal`), the contact times refer to the eclipse overall on Earth's surface. In the **local** result (`solarEclipseLocal`), they refer to the specific observer's location.

### Eclipse magnitude vs obscuration

These are two different measurements that are often confused:

- **Magnitude** (`attributes.magnitude`): The fraction of the Sun's *diameter* covered by the Moon at maximum eclipse. A magnitude of 1.0 means the Moon's diameter exactly matches the Sun's; greater than 1.0 means the Moon is larger (deep total eclipse). For an annular eclipse, magnitude is less than 1.0.

- **Obscuration fraction** (`attributes.fraction`): The fraction of the Sun's *area* that is covered. This is what matters for how much light is blocked. Because area scales with the square of the diameter, a magnitude of 0.5 (half the diameter) covers only about 40% of the area, not 50%.

For total eclipses, the obscuration is 1.0 (100%). For annular eclipses, even though the Moon is centered on the Sun, the obscuration is less than 1.0 because the ring of Sun around the Moon still shines.

### The Saros cycle

The **Saros cycle** is a period of approximately 6,585.3 days (18 years, 11 days, and 8 hours) after which the Sun, Moon, and nodes return to nearly the same relative geometry. This means eclipses tend to repeat in a predictable pattern.

Each eclipse belongs to a **Saros series** (identified by `attributes.sarosCycle`), and its position within that series is given by `attributes.sarosMember`. A Saros series typically produces about 70-80 eclipses over 1,200-1,400 years, starting with small partial eclipses near one pole, progressing to central (total or annular) eclipses, and ending with small partials near the opposite pole.

Because the Saros period is not a whole number of days (the extra 8 hours), each successive eclipse in a series occurs about 120 degrees further west in longitude. After three Saros cycles (54 years 34 days, called an "Exeligmos"), the eclipse returns to approximately the same longitude.

### The `solarEclipseGlobal` result

| Field | Description |
|-------|-------------|
| `type` | Bitmask of eclipse type flags |
| `maximum` | JD of maximum eclipse (greatest magnitude) |
| `first` | JD when the eclipse first begins anywhere on Earth |
| `second` | JD when central eclipse begins (or totality/annularity begins) |
| `third` | JD when central eclipse ends |
| `fourth` | JD when the eclipse ends everywhere on Earth |
| `sunrise` | JD of sunrise for the location of maximum (0 if not applicable) |
| `sunset` | JD of sunset for the location of maximum (0 if not applicable) |

### The `solarEclipseLocal` attributes

| Field | Description |
|-------|-------------|
| `fraction` | Obscuration: fraction of Sun's area covered (0.0 to 1.0) |
| `ratio` | Ratio of apparent lunar diameter to solar diameter |
| `magnitude` | Eclipse magnitude: fraction of Sun's diameter covered |
| `sarosCycle` | Saros series number |
| `sarosMember` | Member number within the Saros series |
| `solarDiameter` | Apparent diameter of the Sun (arc seconds) |
| `lunarDiameter` | Apparent diameter of the Moon (arc seconds) |
| `sarosRepetition` | How many eclipses in this Saros series so far |
| `eclipseLongitude` | Ecliptic longitude where greatest eclipse occurs |
| `eclipseLatitude` | Ecliptic latitude where greatest eclipse occurs |
| `eclipseMagnitude` | Magnitude at the point of greatest eclipse |
| `sunAltitude` | Altitude of the Sun at the location during maximum |

### Safety note

Never look directly at the Sun during a partial or annular eclipse without proper solar filters. Only during the brief totality phase of a total eclipse (when the Sun is completely covered) is it safe to view without protection. The Swiss Ephemeris helps you calculate exactly when totality begins and ends at your location (second and third contacts), but always exercise caution and use certified eclipse glasses or solar filters.

### Tips for working with eclipse calculations

- When iterating through eclipses, advance `jd` by at least 1 day past the previous eclipse's maximum to avoid finding the same eclipse again.
- The `type` filter parameter in `solarEclipseGlobal` skips eclipses that do not match. If you pass `SE_ECL_TOTAL`, it will skip annular, partial, and hybrid eclipses and return the next total one.
- For the most precise local timing, use `solarEclipseLocal` rather than `solarEclipseGlobal` followed by `solarEclipseHow`. The local function finds the eclipse that is actually visible from that location.
- Contact times that are 0 indicate that contact did not occur (e.g., second and third contacts are 0 for a partial eclipse, since totality/annularity never happens).
