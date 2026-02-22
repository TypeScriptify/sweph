# Gauquelin Sectors

**Michel Gauquelin** (1928-1991) was a French psychologist and statistician who conducted one of the most controversial and widely-discussed statistical studies in the history of astrology. He collected birth data for tens of thousands of professionals and found that the positions of certain planets at the moment of birth correlated with professional eminence in specific fields. To analyze these correlations, he divided the sky into **36 sectors** (a finer division than the 12 astrological houses) based on the planet's diurnal arc -- the path it traces across the sky from rising to setting.

His most famous finding, the **"Mars effect,"** showed that an unusually high proportion of eminent athletes were born when Mars had just risen above the horizon or had just passed the meridian (culminated). Similar effects were found for Jupiter and actors, Saturn and scientists, and the Moon and writers.

The `gauquelinSector()` method calculates which of the 36 sectors a planet occupies at a given moment, for a specific geographic location.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(1960, 10, 30, 2.5); // Oct 30, 1960, 02:30 UT

// Diego Maradona's approximate birth location (Lanús, Argentina)
const geo = { longitude: -58.39, latitude: -34.70 };

const result = swe.gauquelinSector(jd, SE_MARS, geo);
console.log(`Mars Gauquelin sector: ${result.sector.toFixed(2)}`);
// A sector near 1 (just risen) or 10 (just culminated) would be in a "plus zone"

swe.close();
```

---

## Detailed Examples

### Checking all classical planets for Gauquelin sectors

```typescript
import { SwissEph } from '../index';
import {
  SE_MOON, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();

// Example birth data
const jd = SwissEph.julianDay(1985, 7, 15, 14.5); // Jul 15, 1985, 14:30 UT
const geo = { longitude: 2.3522, latitude: 48.8566 }; // Paris

const planets = [
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

for (const pl of planets) {
  const r = swe.gauquelinSector(jd, pl.id, geo);
  const sector = Math.floor(r.sector);

  // Check if in a "plus zone"
  const risePlus = [36, 1, 2, 3];
  const culminPlus = [9, 10, 11, 12];
  const isRisePlus = risePlus.includes(sector);
  const isCulminPlus = culminPlus.includes(sector);

  let zone = '';
  if (isRisePlus) zone = ' ← PLUS ZONE (rise)';
  if (isCulminPlus) zone = ' ← PLUS ZONE (culmination)';

  console.log(`${pl.name.padEnd(9)} sector ${sector.toString().padStart(2)}${zone}`);
}

swe.close();
```

### Using different calculation methods

The `method` parameter controls how the sectors are calculated:

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(1990, 5, 20, 8.0);
const geo = { longitude: -0.1276, latitude: 51.5074 }; // London

// Method 0: sector from ecliptic longitude and house position (Placidus)
// Method 1: sector from ecliptic longitude and house position (Placidus),
//           planet/house computed from rising and setting of the planet
// Method 2: sector from right ascension of MC and house position (Placidus)
// Method 3: sector from right ascension of MC and house position (Placidus),
//           planet/house computed from rising and setting of the planet

for (let method = 0; method <= 3; method++) {
  const r = swe.gauquelinSector(jd, SE_MARS, geo, method);
  console.log(`Method ${method}: Mars sector = ${r.sector.toFixed(4)}`);
}

swe.close();
```

### Full "Mars effect" analysis for a group of athletes

This example demonstrates how you might analyze a collection of birth data to look for the Mars effect pattern:

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();

// Hypothetical athlete birth data (JD, longitude, latitude)
const athletes = [
  { jd: SwissEph.julianDay(1960, 10, 30, 2.5),  geo: { longitude: -58.39, latitude: -34.70 } },
  { jd: SwissEph.julianDay(1940, 10, 23, 19.0),  geo: { longitude: -43.17, latitude: -22.91 } },
  { jd: SwissEph.julianDay(1981, 8, 29, 18.0),  geo: { longitude: 2.35,   latitude: 48.86 } },
  { jd: SwissEph.julianDay(1942, 1, 17, 8.0),   geo: { longitude: 13.40,  latitude: 52.52 } },
];

// Count how many have Mars in the plus zones
const risePlusZones = [36, 1, 2, 3];
const culminPlusZones = [9, 10, 11, 12];
const allPlusZones = [...risePlusZones, ...culminPlusZones];

let plusCount = 0;

for (const a of athletes) {
  const r = swe.gauquelinSector(jd, SE_MARS, a.geo);
  const sector = Math.floor(r.sector);
  if (allPlusZones.includes(sector)) plusCount++;
}

const expectedPct = (8 / 36) * 100; // 22.2% expected by chance
const actualPct = (plusCount / athletes.length) * 100;

console.log(`Athletes with Mars in plus zones: ${plusCount}/${athletes.length}`);
console.log(`Expected by chance: ${expectedPct.toFixed(1)}%`);
console.log(`Actual: ${actualPct.toFixed(1)}%`);
// Gauquelin found ~22% for ordinary people vs ~30%+ for eminent athletes

swe.close();
```

### Accounting for atmospheric refraction

The `pressure` and `temperature` parameters allow you to control atmospheric refraction, which affects the precise moment a planet appears to rise or set:

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(1990, 5, 20, 8.0);
const geo = { longitude: 2.35, latitude: 48.86, altitude: 35 }; // Paris, 35m elevation

// Default atmospheric conditions
const r1 = swe.gauquelinSector(jd, SE_MARS, geo, 0, 1013.25, 15);
console.log(`Standard atmosphere: sector ${r1.sector.toFixed(4)}`);

// Custom conditions (high altitude, low pressure, cold)
const r2 = swe.gauquelinSector(jd, SE_MARS, geo, 0, 900, 5);
console.log(`Mountain conditions: sector ${r2.sector.toFixed(4)}`);

// No refraction (pressure = 0)
const r3 = swe.gauquelinSector(jd, SE_MARS, geo, 0, 0, 0);
console.log(`No refraction:       sector ${r3.sector.toFixed(4)}`);

swe.close();
```

---

## Deep Explanation

### How Gauquelin Sectors Work

The 36 Gauquelin sectors are essentially the 12 Placidus houses, each subdivided into 3 equal parts. They are based on the **diurnal arc** -- the path a celestial body traces across the sky during one day.

A planet's diurnal cycle consists of:
1. **Rising** (crossing the eastern horizon) -- the Ascendant
2. **Culminating** (crossing the upper meridian) -- the Midheaven (MC)
3. **Setting** (crossing the western horizon) -- the Descendant
4. **Anti-culminating** (crossing the lower meridian) -- the IC

The sectors are numbered 1-36, starting from the Ascendant and proceeding in the direction of **diurnal motion** (clockwise in a standard chart):

```
                MC (Midheaven)
              Sectors 9-10-11
                    |
                    |
   Sectors     ----+----    Sectors
   4-5-6-7-8       |       12-13-14-15-16
                    |
              Sectors 17-18
              IC (Imum Coeli)
                    |
   Sectors     ----+----    Sectors
   19-20-21-22-23   |      27-28-29-30-31
                    |
          Sectors 24-25-26
             Desc (Setting)
                    |
              Sectors 32-33
                    |
   Sectors     ----+----    Sectors
   34-35-36         |      34-35-36...
                    |
              ASC (Rising)
              Sectors 36-1
```

The numbering proceeds: sector 36 is just above the eastern horizon (the planet has just risen), sector 1 is just below the eastern horizon (the planet is about to rise or has just risen -- the convention counts clockwise from the ASC). A planet at the MC is around sectors 9-10.

### The Plus Zones and Minus Zones

Gauquelin identified four "plus zones" and four "minus zones" arranged in a cross pattern:

| Zone | Sectors | Sky position | Meaning |
|------|---------|-------------|---------|
| Plus Zone 1 | 36, 1, 2, 3 | Just after rising | Planet has just risen |
| Plus Zone 2 | 9, 10, 11, 12 | Just after culmination | Planet has just passed MC |
| Plus Zone 3 | 19, 20, 21 | Just after setting | Planet has just set |
| Plus Zone 4 | 28, 29, 30 | Just after anti-culmination | Planet has just passed IC |

The rise and culmination plus zones (1 and 2) showed the strongest effects. The setting and IC zones showed weaker but still elevated frequencies.

### The Mars Effect

Gauquelin's most famous finding: among **2,088 eminent European sports champions**, Mars appeared in the plus zones significantly more often than chance would predict.

Expected by chance: ~22% (8 out of 36 sectors)
Observed for champions: ~30%+

This result was replicated multiple times, including by skeptical organizations (CSICOP/CFEPP), though the interpretation of those replications remains disputed.

### Other Gauquelin Findings

| Planet | Profession | Effect |
|--------|-----------|--------|
| Mars | Athletes, military leaders | Plus zones over-represented |
| Jupiter | Actors, politicians | Plus zones over-represented |
| Saturn | Scientists, doctors | Plus zones over-represented |
| Moon | Writers, politicians | Plus zones over-represented |

Gauquelin found NO significant effects for the Sun, Mercury, Venus, Uranus, Neptune, or Pluto. He also found no effects for "ordinary" people -- only for those who achieved eminence in their profession.

### Method Parameter Details

The `method` parameter controls two aspects of the calculation:

**Ecliptic vs. Equatorial (methods 0-1 vs. 2-3)**:
- Methods 0 and 1 compute the sector based on the planet's ecliptic longitude (the standard astrological coordinate)
- Methods 2 and 3 use the planet's right ascension and the MC's right ascension (equatorial coordinates)

**Standard vs. Planet-based houses (even vs. odd methods)**:
- Methods 0 and 2 divide the diurnal arc based on the ecliptic (like standard Placidus houses)
- Methods 1 and 3 divide the diurnal arc based on the actual rising and setting times of the planet itself. This is more astronomically precise because different planets rise and set at different points along the horizon depending on their declination

For most Gauquelin research, method 0 is standard.

### Relationship to Placidus Houses

Gauquelin sectors map directly to Placidus houses:
- Sectors 1-3 = 12th house (planet has just risen)
- Sectors 4-6 = 11th house
- Sectors 7-9 = 10th house (approaching MC)
- Sectors 10-12 = 9th house (just past MC)
- Sectors 13-15 = 8th house
- Sectors 16-18 = 7th house (approaching Descendant)
- Sectors 19-21 = 6th house (just past setting)
- Sectors 22-24 = 5th house
- Sectors 25-27 = 4th house (approaching IC)
- Sectors 28-30 = 3rd house (just past IC)
- Sectors 31-33 = 2nd house
- Sectors 34-36 = 1st house (approaching rise)

Note the numbering direction: sector 1 starts just past the Ascendant going clockwise (which is the 12th house in a standard chart), and the numbers increase in the direction of diurnal motion.

### Controversy and Scientific Reception

The Gauquelin findings remain one of the most debated topics at the intersection of science and astrology:

**In favor**: The Mars effect was replicated by multiple independent groups. The data was collected from official civil registries, making fabrication difficult. The effect showed appropriate "dose-response" -- it was stronger for more eminent athletes.

**Against**: Skeptics raised concerns about demographic artifacts (birth times being rounded to certain hours), possible selection bias in choosing which athletes counted as "eminent," and the absence of any known physical mechanism.

**Current status**: Most scientists consider the effect to be a statistical artifact or the result of subtle methodological issues, while proponents argue that no specific flaw has been identified that explains the full pattern of results.

### Return Type

```typescript
interface GauquelinResult {
  sector: number;  // Fractional sector value, 1.0–36.999...
}
```

The returned value is a fractional number. For example, `1.5` means the planet is in the middle of sector 1. Use `Math.floor(result.sector)` to get the integer sector number (but note that sector 0 should be treated as sector 36).

### Requirements

Gauquelin sector calculation requires a geographic location because it depends on the local horizon and meridian. The calculation will not work without a valid `geo` parameter containing longitude and latitude.
