# House Systems

In astrology, the **houses** are twelve divisions of the sky (or the ecliptic) as seen from a specific location on Earth at a specific time. While the zodiac signs divide the ecliptic based on the Sun's annual path, the houses divide it based on the Earth's daily rotation. Each house represents a domain of life experience (self, finances, communication, home, creativity, etc.).

Because there are many different mathematical ways to divide the sky into twelve sections, there are many **house systems**. Each produces slightly (or sometimes dramatically) different house cusps. The choice of house system is one of the most debated topics in Western astrology. Vedic astrology predominantly uses Whole Sign houses.

The Swiss Ephemeris supports over 20 house systems. Given a time and geographic location, it computes the twelve house cusp longitudes plus several important angles (Ascendant, MC, Vertex, etc.).

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// January 1, 2000 at noon UT, London
const jd = SwissEph.julianDay(2000, 1, 1, 12);
const geo = { longitude: -0.1276, latitude: 51.5074 };

const houses = swe.houses(jd, geo, 'P'); // Placidus

console.log(`Ascendant: ${houses.ascendant.toFixed(2)} deg`);
console.log(`MC:        ${houses.mc.toFixed(2)} deg`);

// House cusps are 1-indexed: cusps[1] through cusps[12]
for (let i = 1; i <= 12; i++) {
  console.log(`House ${String(i).padStart(2)} cusp: ${houses.cusps[i].toFixed(2)} deg`);
}

swe.close();
```

---

## Detailed Examples

### Comparing house systems

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 3, 20, 12); // Vernal equinox 2024
const geo = { longitude: -73.9857, latitude: 40.7484 }; // New York

const systems = [
  { code: 'P', name: 'Placidus' },
  { code: 'K', name: 'Koch' },
  { code: 'E', name: 'Equal (from Asc)' },
  { code: 'W', name: 'Whole Sign' },
  { code: 'R', name: 'Regiomontanus' },
  { code: 'C', name: 'Campanus' },
  { code: 'O', name: 'Porphyry' },
  { code: 'T', name: 'Topocentric (Polich/Page)' },
];

for (const sys of systems) {
  const h = swe.houses(jd, geo, sys.code);
  console.log(`\n--- ${sys.name} (${sys.code}) ---`);
  console.log(`  Asc: ${h.ascendant.toFixed(2)}  MC: ${h.mc.toFixed(2)}`);
  for (let i = 1; i <= 12; i++) {
    process.stdout.write(`  H${i}: ${h.cusps[i].toFixed(1)}  `);
    if (i % 4 === 0) process.stdout.write('\n');
  }
}

swe.close();
```

### Whole Sign and Equal houses

Whole Sign and Equal houses are the simplest systems. In Whole Sign, each house is exactly one zodiac sign (30 degrees). In Equal, each house is 30 degrees starting from the Ascendant.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 0);
const geo = { longitude: 80.27, latitude: 13.08 }; // Chennai, India

// Whole Sign houses (popular in Vedic astrology)
const ws = swe.houses(jd, geo, 'W');
console.log('Whole Sign:');
for (let i = 1; i <= 12; i++) {
  // Each cusp is the start of a sign boundary
  console.log(`  House ${i}: ${ws.cusps[i].toFixed(2)} deg`);
}

// Equal houses from Ascendant
const eq = swe.houses(jd, geo, 'E');
console.log('\nEqual from Ascendant:');
for (let i = 1; i <= 12; i++) {
  // Each cusp is exactly 30 degrees apart, starting from the Ascendant
  console.log(`  House ${i}: ${eq.cusps[i].toFixed(2)} deg`);
}

swe.close();
```

### Accessing all the angle values

Beyond the 12 house cusps, the `houses()` function returns several important astronomical/astrological points:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 6, 21, 12);
const geo = { longitude: -0.1276, latitude: 51.5074 }; // London

const h = swe.houses(jd, geo, 'P');

console.log(`Ascendant (ASC):           ${h.ascendant.toFixed(4)} deg`);
console.log(`Midheaven (MC):            ${h.mc.toFixed(4)} deg`);
console.log(`ARMC (sidereal time):      ${h.armc.toFixed(4)} deg`);
console.log(`Vertex:                    ${h.vertex.toFixed(4)} deg`);
console.log(`Equatorial Ascendant:      ${h.equatorialAscendant.toFixed(4)} deg`);
console.log(`Co-Ascendant (Koch):       ${h.coAscendantKoch.toFixed(4)} deg`);
console.log(`Co-Ascendant (Munkasey):   ${h.coAscendantMunkasey.toFixed(4)} deg`);
console.log(`Polar Ascendant:           ${h.polarAscendant.toFixed(4)} deg`);

swe.close();
```

### Computing houses from ARMC directly

If you already know the ARMC (sidereal time in degrees), geographic latitude, and obliquity of the ecliptic, you can compute houses without a Julian Day:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// ARMC in degrees (sidereal time * 15)
const armc = 279.50;   // example value
const lat = 51.5074;   // London latitude
const eps = 23.4393;   // mean obliquity of the ecliptic (approx)

const h = swe.housesFromArmc(armc, lat, eps, 'P');
console.log(`Ascendant: ${h.ascendant.toFixed(4)} deg`);
console.log(`MC:        ${h.mc.toFixed(4)} deg`);

swe.close();
```

### Getting the name of a house system

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const codes = 'PKEWCRTADFGHIJLMNOQSUVXY'.split('');
for (const code of codes) {
  console.log(`${code} = ${swe.houseName(code)}`);
}

swe.close();
```

### Gauquelin sectors (36 sectors)

The Gauquelin sector system uses 36 sectors instead of 12 houses. When you request system `'G'`, the `cusps` array contains 37 entries (cusps[1] through cusps[36]).

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);
const geo = { longitude: 2.3522, latitude: 48.8566 }; // Paris

const g = swe.houses(jd, geo, 'G');
console.log('Gauquelin sectors (36):');
for (let i = 1; i <= 36; i++) {
  console.log(`  Sector ${String(i).padStart(2)}: ${g.cusps[i].toFixed(2)} deg`);
}

swe.close();
```

---

## Deep Explanation

### All supported house systems

Each system is identified by a single-character code passed as the `system` parameter.

| Code | Name                       | Description                                                                                                                                     |
|------|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `P`  | Placidus                   | The most popular system in modern Western astrology. Divides the diurnal and nocturnal semi-arcs of the ecliptic into three equal time intervals. Fails at high latitudes (>66.5 deg) where some points never rise or set. |
| `K`  | Koch                       | Also called GOH (Geburtsort-Haeuser). Similar to Placidus in concept but uses a different mathematical approach. Also fails at high latitudes. |
| `E`  | Equal (from Ascendant)     | Each house is exactly 30 degrees. House 1 starts at the Ascendant. Simple and unambiguous at all latitudes. The MC does not necessarily fall on the 10th cusp. |
| `W`  | Whole Sign                 | Each house corresponds to an entire zodiac sign. House 1 is the sign containing the Ascendant (cusp = 0 deg of that sign). The oldest known house system, used in Hellenistic and Vedic astrology. |
| `B`  | Alcabitius                 | Semi-arc system that divides the diurnal semi-arc of the Ascendant into three equal parts. Medieval European system. |
| `C`  | Campanus                   | Divides the prime vertical (the great circle passing through the east point, zenith, west point, and nadir) into 12 equal arcs of 30 degrees, then projects them onto the ecliptic. |
| `R`  | Regiomontanus              | Divides the celestial equator into 12 equal arcs of 30 degrees, then projects them onto the ecliptic via great circles through the north and south points of the horizon. Popular in horary astrology. |
| `T`  | Polich/Page (Topocentric)  | Very similar to Placidus in practice but uses a different mathematical model. Claimed to be more accurate for topocentric purposes. Works at all latitudes. |
| `A`  | Equal (from Ascendant)     | Same as `E`. Alternative code. |
| `D`  | Equal (from MC)            | Each house is 30 degrees starting from the MC (Midheaven). The MC is exactly on the 10th cusp. |
| `F`  | Carter poli-equatorial     | Carter's system projecting from the equator. |
| `G`  | Gauquelin sectors          | 36 sectors (not 12 houses) used in the Gauquelin research on planetary positions in relation to the angles. |
| `H`  | Horizon / Azimuthal        | Divides the horizon into 12 equal segments of 30 degrees, starting from the east point. |
| `I`  | Sunshine (Treindl)         | Based on the proportion of daylight/nighttime hours. |
| `J`  | Sunshine (alternative)     | Alternative version of the Sunshine system. |
| `L`  | Pullen SD (sinusoidal delta) | Pullen's sinusoidal delta house system. |
| `M`  | Morinus                    | Divides the equator into 12 equal arcs, then converts each cusp to ecliptic longitude. Does not use the horizon at all -- only depends on sidereal time. |
| `N`  | Pullen SR (sinusoidal ratio) | Pullen's sinusoidal ratio house system. |
| `O`  | Porphyry                   | Trisects the arcs between the four angles (ASC, IC, DSC, MC). One of the oldest quadrant-based systems. Simple and works at all latitudes. |
| `Q`  | Pullen                     | Pullen's general house system. |
| `S`  | Sripati                    | Used in Indian astrology. Similar to Porphyry but shifts each cusp by half a house: each house cusp is the midpoint of the corresponding Porphyry houses. |
| `U`  | Krusinski                  | Krusinski-Pisa house system. Divides the vertical joining the Ascendant and Descendant. |
| `V`  | Pisa                       | Variation of the Krusinski system. |
| `X`  | Axial rotation             | Based on the Earth's axial rotation projected onto the ecliptic. |
| `Y`  | APC houses                 | Astrological houses based on the Ascendant parallel circle. |

### Cusps array indexing

The `cusps` array is **1-indexed**: house cusp longitudes are in `cusps[1]` through `cusps[12]` (or `cusps[36]` for Gauquelin sectors). `cusps[0]` is unused (always 0).

```typescript
const h = swe.houses(jd, geo, 'P');
// h.cusps[0]  -> 0 (unused)
// h.cusps[1]  -> 1st house cusp (same as Ascendant for most systems)
// h.cusps[2]  -> 2nd house cusp
// ...
// h.cusps[12] -> 12th house cusp
```

For most quadrant systems (Placidus, Koch, Regiomontanus, Campanus, Topocentric, Porphyry), `cusps[1]` equals the Ascendant and `cusps[10]` equals the MC. For Equal and Whole Sign, `cusps[10]` may differ from the MC.

### The angle values explained

| Field                  | Description                                                                                    |
|------------------------|------------------------------------------------------------------------------------------------|
| `ascendant`            | The ecliptic degree rising on the eastern horizon. The most important angle in a chart.        |
| `mc`                   | Medium Coeli (Midheaven). The ecliptic degree at the upper meridian (highest point the ecliptic reaches). |
| `armc`                 | ARMC = sidereal time expressed in degrees (sidereal time in hours * 15). Used internally for house position calculations. |
| `vertex`               | The ecliptic degree on the prime vertical in the west. Used in synastry and as a "fated point." |
| `equatorialAscendant`  | The Ascendant calculated on the celestial equator (sometimes called the "East Point").         |
| `coAscendantKoch`      | Co-Ascendant as defined by Koch.                                                               |
| `coAscendantMunkasey`  | Co-Ascendant as defined by Munkasey.                                                           |
| `polarAscendant`       | The Ascendant of the polar opposite latitude (also called the "Anti-Vertex").                  |

### High-latitude issues

**Placidus and Koch** systems fail at latitudes beyond approximately 66.5 degrees (within the Arctic or Antarctic circles). At these latitudes, some ecliptic degrees never rise or set, making it impossible to compute the time-based house divisions these systems require. The engine will return results but they may be unreliable.

Systems that work at **all latitudes** include:
- Equal (`E`, `A`, `D`)
- Whole Sign (`W`)
- Porphyry (`O`)
- Morinus (`M`)
- Campanus (`C`)
- Regiomontanus (`R`)
- Topocentric/Polich-Page (`T`) -- designed to handle extreme latitudes
- Axial rotation (`X`)
- APC (`Y`)

### Geographic position convention

- **Longitude**: Positive = east, negative = west. For example, New York is about -74 degrees, Tokyo is about +139.7 degrees.
- **Latitude**: Positive = north, negative = south. For example, Sydney is about -33.9 degrees.
- **Altitude**: In meters above sea level. Optional (defaults to 0). Only affects topocentric corrections.

### Choosing a house system

There is no universally "correct" house system. The choice depends on your astrological tradition:

- **Modern Western astrology**: Placidus (`P`) is by far the most popular, followed by Koch (`K`) and Equal (`E`).
- **Traditional/Hellenistic astrology**: Whole Sign (`W`) is the historically oldest system and has seen a major revival.
- **Horary astrology**: Regiomontanus (`R`) is traditional for horary work.
- **Vedic/Indian astrology (Jyotish)**: Whole Sign (`W`) or Sripati (`S`).
- **Uranian/Hamburg School**: Often uses Meridian or equal systems.
- **Research (Gauquelin)**: The Gauquelin sector system (`G`) with 36 sectors.

When in doubt, Placidus is the safe default for Western astrology, and Whole Sign for Vedic or Hellenistic work.
