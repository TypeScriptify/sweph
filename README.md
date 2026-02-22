# @typescriptify/sweph

A pure TypeScript translation of the [Swiss Ephemeris](https://www.astro.com/swisseph/) — the gold standard library for astronomical and astrological calculations.

This library lets you calculate the positions of the Sun, Moon, planets, and stars with high precision. You can compute house cusps, eclipses, rise/set times, and much more — all from TypeScript or JavaScript, with no native dependencies.

## What can it do?

- **Planet positions** — get the longitude, latitude, and distance of any planet at any date
- **House systems** — calculate house cusps for 24+ house systems (Placidus, Koch, Whole Sign, etc.)
- **Fixed stars** — positions and magnitudes of key stars (Spica, Regulus, Aldebaran, etc.)
- **Eclipses** — find solar/lunar eclipses, occultations, compute eclipse paths
- **Rise/set times** — sunrise, sunset, moonrise, planet transits
- **Ayanamsa** — sidereal zodiac support with 40+ ayanamsa modes (Lahiri, True Citra, etc.)
- **Heliacal events** — heliacal rising/setting of planets and stars
- **Orbital elements** — Keplerian elements, nodes, apsides
- **Date conversions** — Julian day, UTC, Delta T, sidereal time

## Installation

```bash
npm install @typescriptify/sweph
```

## Two API Styles

This library provides two ways to use it:

| | C-style API | Modern TypeScript API |
|---|---|---|
| **Style** | Direct translation of the C functions | Class-based wrapper with named return types |
| **State** | Thread `swed: SweData` manually | Managed inside `SwissEph` instance |
| **Returns** | `Float64Array`, positional indexing (`xx[0]`) | Named objects (`{ longitude, latitude, ... }`) |
| **Errors** | Check return codes (`ERR = -1`) | Throws `SwissEphError` |
| **Time mode** | Separate `*Ut` / `*Et` functions | Automatic routing via `timeMode` option |
| **Docs** | This README (below) | [`src/SwissEph/`](./src/SwissEph/) — see [README](./src/SwissEph/README.md) and [UseCases](./src/SwissEph/UseCases/) |

**Modern API** — if you want a clean, idiomatic TypeScript experience:

```typescript
import { SwissEph } from '@typescriptify/sweph/SwissEph';
import { SE_SUN, SE_MARS } from '@typescriptify/sweph/constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 12);

const sun = swe.calc(jd, SE_SUN);
console.log(`Sun: ${sun.longitude.toFixed(4)}°, speed: ${sun.longitudeSpeed.toFixed(4)}°/day`);

swe.close();
```

See [`src/SwissEph/README.md`](./src/SwissEph/README.md) for full documentation and [`src/SwissEph/UseCases/`](./src/SwissEph/UseCases/) for 27 detailed use case guides covering everything from planet positions to heliacal events.

---

**C-style API** — if you're familiar with the original Swiss Ephemeris C interface, the rest of this README is for you.

## Quick Start

Every function takes a `swed` state object as its first argument. Create one at startup and reuse it:

```typescript
import { createDefaultSweData } from '@typescriptify/sweph/types';
import { sweCalc } from '@typescriptify/sweph/sweph';
import { julDay } from '@typescriptify/sweph/swedate';
import {
  SE_SUN, SE_MOON, SE_MARS,
  SEFLG_MOSEPH, SEFLG_SPEED,
  SE_GREG_CAL,
} from '@typescriptify/sweph/constants';

// 1. Create the state object (do this once)
const swed = createDefaultSweData();

// 2. Convert a calendar date to a Julian day number
//    (January 1, 2025 at noon UT)
const jd = julDay(2025, 1, 1, 12.0, SE_GREG_CAL);

// 3. Calculate the Sun's position
const sun = sweCalc(swed, jd, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);

console.log(`Sun longitude: ${sun.xx[0].toFixed(4)}°`);  // ecliptic longitude
console.log(`Sun latitude:  ${sun.xx[1].toFixed(4)}°`);  // ecliptic latitude
console.log(`Sun distance:  ${sun.xx[2].toFixed(6)} AU`); // distance in AU
console.log(`Sun speed:     ${sun.xx[3].toFixed(4)}°/day`); // daily motion
```

The result `xx` is a `Float64Array` with 6 elements: `[longitude, latitude, distance, lonSpeed, latSpeed, distSpeed]`.

### Calculating the Moon

```typescript
const moon = sweCalc(swed, jd, SE_MOON, SEFLG_MOSEPH | SEFLG_SPEED);
console.log(`Moon: ${moon.xx[0].toFixed(4)}° at ${moon.xx[3].toFixed(2)}°/day`);
```

### Calculating houses

```typescript
import { sweHouses } from '@typescriptify/sweph/swehouse';

const cusps = new Array(37).fill(0);  // cusp[1]..cusp[12]
const ascmc = new Array(10).fill(0);  // ascmc[0]=AC, ascmc[1]=MC, ascmc[2]=ARMC, etc.

// Placidus houses for London at the given time
sweHouses(swed, jd, 51.5074, -0.1276, 'P', cusps, ascmc);

console.log(`Ascendant: ${ascmc[0].toFixed(2)}°`);
console.log(`Midheaven: ${ascmc[1].toFixed(2)}°`);
for (let i = 1; i <= 12; i++) {
  console.log(`  House ${i}: ${cusps[i].toFixed(2)}°`);
}
```

House system codes: `'P'` = Placidus, `'K'` = Koch, `'E'` = Equal, `'W'` = Whole Sign, `'C'` = Campanus, `'R'` = Regiomontanus, `'B'` = Alcabitius, and [many more](#house-systems).

## Ephemeris Modes

This library supports three levels of precision:

| Mode | Flag | Precision | Data files needed? |
|---|---|---|---|
| **Moshier** | `SEFLG_MOSEPH` | ~1 arcsecond | No (built-in) |
| **Swiss Ephemeris** | `SEFLG_SWIEPH` | ~0.001 arcsecond | Yes (`.se1` files) |
| **JPL** | `SEFLG_JPLEPH` | ~0.001 arcsecond | Yes (JPL DE file) |

**Moshier mode** works out of the box with no data files. It uses built-in analytical models and is accurate enough for most purposes.

**Swiss Ephemeris mode** reads pre-computed binary data files (`.se1`) for higher precision. See [Loading Ephemeris Data Files](#loading-ephemeris-data-files) below.

**JPL mode** reads NASA JPL Development Ephemeris binary files (e.g., `de441.eph`). See [Loading JPL Files](#loading-jpl-files) below.

## Loading Ephemeris Data Files

### Where to download

Download `.se1` files from the official Swiss Ephemeris site:
- **https://www.astro.com/ftp/swisseph/ephe/**

The most common files you'll need:
- `sepl_18.se1` — planet data (1800 AD - 2400 AD)
- `semo_18.se1` — Moon data (1800 AD - 2400 AD)

For other date ranges, download the corresponding files (e.g., `sepl_06.se1` for 600 AD - 1200 AD).

### How to load them

Since this is a pure TypeScript library (no filesystem access), you load files as `ArrayBuffer`s. How you get the `ArrayBuffer` depends on your environment:

**Node.js:**
```typescript
import { readFileSync } from 'fs';
import { sweSetEphemerisFile, sweCalc } from '@typescriptify/sweph/sweph';
import { createDefaultSweData } from '@typescriptify/sweph/types';
import { SE_SUN, SEFLG_SWIEPH, SEFLG_SPEED } from '@typescriptify/sweph/constants';

const swed = createDefaultSweData();

// Load the planet and moon ephemeris files
const seplBuf = readFileSync('./ephe/sepl_18.se1');
const semoBuf = readFileSync('./ephe/semo_18.se1');

sweSetEphemerisFile('sepl_18.se1', seplBuf.buffer, swed);
sweSetEphemerisFile('semo_18.se1', semoBuf.buffer, swed);

// Now you can use SEFLG_SWIEPH for higher precision
const sun = sweCalc(swed, 2451545.0, SE_SUN, SEFLG_SWIEPH | SEFLG_SPEED);
console.log(`Sun (SWIEPH): ${sun.xx[0].toFixed(6)}°`);
```

**Browser (fetch):**
```typescript
const response = await fetch('/ephe/sepl_18.se1');
const buffer = await response.arrayBuffer();
sweSetEphemerisFile('sepl_18.se1', buffer, swed);
```

**React Native (expo-file-system, react-native-fs, etc.):**
```typescript
// Read the file into an ArrayBuffer using your preferred file library,
// then pass it to sweSetEphemerisFile() the same way.
```

### Loading JPL files

For the highest precision using NASA JPL ephemerides:

```typescript
import { sweLoadJplFile, sweCalc } from '@typescriptify/sweph/sweph';
import { SEFLG_JPLEPH, SEFLG_SPEED, SE_MARS } from '@typescriptify/sweph/constants';

// Download a JPL DE file (e.g., de441.eph) from:
// https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/
const jplBuffer = readFileSync('./ephe/de441.eph');

const result = sweLoadJplFile(swed, jplBuffer.buffer, 'de441.eph');
if (result.retc < 0) {
  console.error('Failed to load JPL file:', result.serr);
}

// Now use SEFLG_JPLEPH
const mars = sweCalc(swed, 2451545.0, SE_MARS, SEFLG_JPLEPH | SEFLG_SPEED);
```

## More Examples

### Sidereal zodiac (ayanamsa)

```typescript
import { sweSetSidMode, sweGetAyanamsa } from '@typescriptify/sweph/sweph';
import { SE_SIDM_LAHIRI } from '@typescriptify/sweph/constants';

sweSetSidMode(swed, SE_SIDM_LAHIRI, 0, 0);
const ayanamsa = sweGetAyanamsa(swed, jd);
console.log(`Lahiri ayanamsa: ${ayanamsa.toFixed(4)}°`);

// To get sidereal positions, add SEFLG_SIDEREAL to your flags:
import { SEFLG_SIDEREAL } from '@typescriptify/sweph/constants';
const sunSid = sweCalc(swed, jd, SE_SUN, SEFLG_MOSEPH | SEFLG_SIDEREAL);
console.log(`Sun (sidereal): ${sunSid.xx[0].toFixed(4)}°`);
```

### Fixed stars

```typescript
import { sweFixstar } from '@typescriptify/sweph/sweph';

const spica = sweFixstar(swed, 'Spica', jd, SEFLG_MOSEPH);
console.log(`Spica: ${spica.xx[0].toFixed(4)}°`);
```

### Sunrise and sunset

```typescript
import { sweRiseTrans } from '@typescriptify/sweph/swecl';
import { SE_CALC_RISE, SE_CALC_SET } from '@typescriptify/sweph/constants';
import { revJul } from '@typescriptify/sweph/swedate';

const geopos = [-0.1276, 51.5074, 0]; // [longitude, latitude, altitude_meters]

const rise = sweRiseTrans(
  swed, jd, SE_SUN, null, SEFLG_MOSEPH,
  SE_CALC_RISE, geopos, 1013.25, 10, null
);

if (rise.retval >= 0) {
  const d = revJul(rise.tret, SE_GREG_CAL);
  console.log(`Sunrise: ${d.year}-${d.month}-${d.day} ${d.hour.toFixed(2)} UT`);
}
```

### Solar eclipse search

```typescript
import { sweSolEclipseWhenGlob, sweSolEclipseWhere } from '@typescriptify/sweph/swecl';

// Find the next solar eclipse after January 1, 2025
const startJd = julDay(2025, 1, 1, 0, SE_GREG_CAL);
const ecl = sweSolEclipseWhenGlob(swed, startJd, SEFLG_MOSEPH, 0, 0);

if (ecl.retval > 0) {
  const d = revJul(ecl.tret[0], SE_GREG_CAL);
  console.log(`Eclipse maximum: ${d.year}-${d.month}-${d.day} ${d.hour.toFixed(2)} UT`);

  const where = sweSolEclipseWhere(swed, ecl.tret[0], SEFLG_MOSEPH);
  console.log(`Central path: lon=${where.geopos[0].toFixed(1)}° lat=${where.geopos[1].toFixed(1)}°`);
}
```

### Azimuth and altitude

```typescript
import { sweAzalt } from '@typescriptify/sweph/swecl';
import { SE_ECL2HOR } from '@typescriptify/sweph/constants';

const xaz = [0, 0, 0]; // [azimuth, trueAltitude, apparentAltitude]
sweAzalt(
  swed, jd, SE_ECL2HOR,
  [-0.1276, 51.5074, 0],  // geopos
  1013.25, 10,              // pressure (mbar), temperature (C)
  [sun.xx[0], sun.xx[1], sun.xx[2]], // ecliptic lon, lat, distance
  xaz
);
console.log(`Sun azimuth: ${xaz[0].toFixed(2)}°, altitude: ${xaz[2].toFixed(2)}°`);
```

### Orbital elements

```typescript
import { sweGetOrbitalElements } from '@typescriptify/sweph/swecl';

const orb = sweGetOrbitalElements(swed, jd, SE_MARS, SEFLG_MOSEPH);
console.log(`Mars semi-major axis: ${orb.dret[0].toFixed(4)} AU`);
console.log(`Mars eccentricity:    ${orb.dret[1].toFixed(4)}`);
console.log(`Mars inclination:     ${orb.dret[2].toFixed(2)}°`);
```

### Planetary nodes and apsides

```typescript
import { sweNodAps } from '@typescriptify/sweph/swecl';

const nod = sweNodAps(swed, jd, SE_MARS, SEFLG_MOSEPH, 0);
console.log(`Mars ascending node:  ${nod.xnasc[0].toFixed(4)}°`);
console.log(`Mars descending node: ${nod.xndsc[0].toFixed(4)}°`);
console.log(`Mars perihelion:      ${nod.xperi[0].toFixed(4)}°`);
console.log(`Mars aphelion:        ${nod.xaphe[0].toFixed(4)}°`);
```

### Heliacal rising

```typescript
import { sweHeliacalUt } from '@typescriptify/sweph/swehel';

const hel = sweHeliacalUt(
  swed, jd,
  [-0.1276, 51.5074, 0],          // geopos
  [1013.25, 10, 50, 0.25, 0, 0],  // atmospheric conditions
  [0, 0, 0, 0, 0, 0],             // observer conditions
  'Venus', 1, SEFLG_MOSEPH
);
if (hel.retval >= 0) {
  const d = revJul(hel.dret[0], SE_GREG_CAL);
  console.log(`Venus heliacal rising: ${d.year}-${d.month}-${d.day}`);
}
```

### Topocentric positions

```typescript
import { sweSetTopo } from '@typescriptify/sweph/sweph';
import { SEFLG_TOPOCTR } from '@typescriptify/sweph/constants';

// Set observer location: London
sweSetTopo(swed, -0.1276, 51.5074, 0);

const moonTopo = sweCalc(swed, jd, SE_MOON, SEFLG_MOSEPH | SEFLG_TOPOCTR | SEFLG_SPEED);
console.log(`Moon (topocentric): ${moonTopo.xx[0].toFixed(4)}°`);
```

### Cleanup

When you're done, free resources:

```typescript
import { sweClose } from '@typescriptify/sweph/sweph';
sweClose(swed);
```

## House Systems

| Code | Name |
|---|---|
| `P` | Placidus |
| `K` | Koch |
| `O` | Porphyrius |
| `R` | Regiomontanus |
| `C` | Campanus |
| `E` | Equal (from Ascendant) |
| `W` | Whole Sign |
| `B` | Alcabitius |
| `M` | Morinus |
| `X` | Axial Rotation (Meridian) |
| `H` | Azimuthal (Horizontal) |
| `T` | Polich/Page (Topocentric) |
| `G` | Gauquelin sectors (36 cusps) |
| `A` | Equal (from Aries 0) |
| `D` | Equal (MC) |
| `F` | Carter (Poli-Equatorial) |
| `I` | Sunshine / Makransky |
| `J` | Sunshine / Treindl |
| `L` | Pullen SD (sinusoidal delta) |
| `N` | Pullen SR (sinusoidal ratio) |
| `Q` | Pullen cumulative |
| `S` | Sripati |
| `U` | Krusinski-Pisa-Goelzer |
| `V` | Vehlow Equal |
| `Y` | APC houses |

## Planet Constants

| Constant | Planet |
|---|---|
| `SE_SUN` | Sun |
| `SE_MOON` | Moon |
| `SE_MERCURY` | Mercury |
| `SE_VENUS` | Venus |
| `SE_MARS` | Mars |
| `SE_JUPITER` | Jupiter |
| `SE_SATURN` | Saturn |
| `SE_URANUS` | Uranus |
| `SE_NEPTUNE` | Neptune |
| `SE_PLUTO` | Pluto |
| `SE_MEAN_NODE` | Mean Lunar Node |
| `SE_TRUE_NODE` | True Lunar Node |
| `SE_MEAN_APOG` | Mean Lunar Apogee (Black Moon Lilith) |
| `SE_OSCU_APOG` | Osculating Lunar Apogee |
| `SE_CHIRON` | Chiron |
| `SE_EARTH` | Earth |

## About This Project

This is a line-by-line TypeScript translation of the [Swiss Ephemeris C library](https://www.astro.com/swisseph/) (~30,000 lines of C translated to ~15 TypeScript source files). All 9 C source files have been translated, covering all 106 public API functions.

Key design decisions:
- **No global state** — all functions take an explicit `swed: SweData` parameter
- **No filesystem access** — ephemeris files are loaded as `ArrayBuffer`s, making the library work in any JavaScript environment (Node.js, browsers, React Native, etc.)
- **No native dependencies** — pure TypeScript, no WASM, no C bindings

This is a TypeScript translation based on the Node.js wrapper [sweph](https://github.com/timotejroiko/sweph) by Timotej Valentin Rojko. The underlying Swiss Ephemeris is by Astrodienst AG.

## License

This project is a TypeScript translation and is bound by the license of the original Swiss Ephemeris:

- **AGPL-3.0** for open-source use
- **LGPL-3.0** for holders of a professional Swiss Ephemeris license from [Astrodienst AG](https://www.astro.com/swisseph/)

See the original repository for full license details: https://github.com/timotejroiko/sweph

The Swiss Ephemeris itself is Copyright (C) 1997-2021 Astrodienst AG, Switzerland.
