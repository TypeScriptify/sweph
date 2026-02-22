# SwissEph — Modern TypeScript Wrapper

A class-based wrapper around the raw Swiss Ephemeris TypeScript translation. It replaces C-style patterns (threaded `SweData`, `Float64Array` positional indexing, mutable output arrays, error codes) with named return types, automatic UT/ET routing, and thrown errors.

## Quick Start

```ts
import { SwissEph } from './src/SwissEph';
import { SE_SUN, SE_MOON, SE_MARS } from './src/constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 4, 8, 12);

const sun = swe.calc(jd, SE_SUN);
console.log(`Sun: ${sun.longitude.toFixed(2)}°`);

const moon = swe.calc(jd, SE_MOON);
console.log(`Moon: ${moon.longitude.toFixed(2)}°`);

swe.close();
```

## Constructor Options

```ts
const swe = new SwissEph({
  timeMode: 'ut',              // 'ut' (default) or 'et'
  ephemeris: 'moshier',        // 'moshier' (default), 'swisseph', or 'jpl'
  siderealMode: SE_SIDM_LAHIRI,  // optional: enable sidereal mode
  topo: { longitude: -0.1278, latitude: 51.5074, altitude: 11 }, // optional
});
```

- **`timeMode`** — determines whether Julian day arguments are treated as UT or ET. Most users want `'ut'`.
- **`ephemeris`** — which ephemeris engine to use. `'moshier'` needs no data files. `'swisseph'` requires SE1 files loaded via `loadEphemerisFile()`. `'jpl'` requires a JPL file loaded via `loadJplFile()`.
- **`siderealMode`** — activates sidereal zodiac. Use `SE_SIDM_*` constants.
- **`topo`** — activates topocentric corrections. Pass geographic coordinates.

## Planet Positions

```ts
import { SE_MARS, SEFLG_EQUATORIAL } from './src/constants';

const mars = swe.calc(jd, SE_MARS);
// { longitude, latitude, distance, longitudeSpeed, latitudeSpeed, distanceSpeed, flags }

// Equatorial coordinates:
const marsEq = swe.calc(jd, SE_MARS, SEFLG_EQUATORIAL);
// longitude = right ascension, latitude = declination
```

## Fixed Stars

```ts
const spica = swe.fixedStar('Spica', jd);
// { longitude, latitude, distance, ..., starName: 'Spica,alVir' }

const mag = swe.fixedStarMagnitude('Spica');
// 0.98
```

## Houses

```ts
const geo = { longitude: -0.1278, latitude: 51.5074 };
const h = swe.houses(jd, geo, 'P');  // Placidus
// h.cusps[1]..h.cusps[12], h.ascendant, h.mc, h.vertex, ...

// House position of a planet:
const pos = swe.housePosition(h.armc, geo.latitude, 23.44, 'P', sun.longitude, sun.latitude);
// e.g. 10.05
```

## Ayanamsa

```ts
import { SE_SIDM_LAHIRI } from './src/constants';

swe.setSiderealMode(SE_SIDM_LAHIRI);
const aya = swe.getAyanamsa(jd);
// e.g. 24.17

const name = swe.getAyanamsaName(SE_SIDM_LAHIRI);
// 'Lahiri'
```

## Eclipses

### Solar Eclipse

```ts
// Next global solar eclipse after a date:
const ecl = swe.solarEclipseGlobal(jd);
// { type, maximum, first, second, third, fourth, sunrise, sunset }

// Where is the central line at a given time?
const where = swe.solarEclipseWhere(ecl.maximum);
// { type, geopos: { longitude, latitude }, attributes: { fraction, magnitude, ... } }

// How does it look from a specific location?
const how = swe.solarEclipseHow(ecl.maximum, geo);
// { type, attributes: { fraction, ratio, magnitude, ... } }
```

### Lunar Eclipse

```ts
const lun = swe.lunarEclipseGlobal(jd);
// { type, maximum, partialBegin, partialEnd, totalBegin, totalEnd, penumbralBegin, penumbralEnd }

const lunHow = swe.lunarEclipseHow(lun.maximum);
// { type, umbraMagnitude, penumbraMagnitude, moonDiameter, ... }
```

## Rise / Set / Transit

```ts
const geo = { longitude: -0.1278, latitude: 51.5074 };

const sunrise = swe.rise(jd, SE_SUN, geo);
const sunset = swe.set(jd, SE_SUN, geo);
const transit = swe.transit(jd, SE_SUN, geo);  // upper meridian

console.log(`Sunrise JD: ${sunrise.jd}`);
```

With atmospheric options:

```ts
const r = swe.rise(jd, SE_SUN, geo, { pressure: 1013, temperature: 20 });
```

## Azimuth & Altitude

```ts
const az = swe.azalt(jd, geo, sun.longitude, sun.latitude);
// { azimuth, trueAltitude, apparentAltitude }
```

## Phenomena

```ts
const pheno = swe.phenomena(jd, SE_MARS);
// { phaseAngle, phase, elongation, apparentDiameter, apparentMagnitude }
```

## Crossings

```ts
// Vernal equinox (Sun crosses 0° longitude):
const equinox = swe.sunCrossing(0, jd);
// { jd: 2460388.815... }

// Moon crosses 90°:
const moonCross = swe.moonCrossing(90, jd);

// Moon node crossing:
const node = swe.moonNodeCrossing(jd);
// { jd, longitude, latitude }
```

## Orbital Elements

```ts
const orb = swe.orbitalElements(jd, SE_MARS);
// { semiAxis, eccentricity, inclination, ascNode, argPerihelion, tropicalPeriod, ... }

const dist = swe.orbitDistances(jd, SE_MARS);
// { max, min, true }
```

## Nodes & Apsides

```ts
const na = swe.nodesApsides(jd, SE_MARS);
// { ascendingNode: PlanetPosition, descendingNode, perihelion, aphelion }
```

## Heliacal Events

```ts
import { SE_HELIACAL_RISING } from './src/constants';

const geo = { longitude: 8.55, latitude: 47.37, altitude: 400 };
const hel = swe.heliacalEvent(jd, geo, 'Venus', SE_HELIACAL_RISING);
// { startVisible, bestVisible, endVisible }
```

## Planetocentric

```ts
import { SE_MARS, SE_EARTH } from './src/constants';

// Mars as seen from Jupiter:
const marsFromJupiter = swe.calcPlanetocentric(jd, SE_MARS, 5);
```

## Date/Time Utilities (static)

```ts
const jd = SwissEph.julianDay(2024, 4, 8, 12);
const date = SwissEph.fromJulianDay(jd);
// { year: 2024, month: 4, day: 8, hour: 12 }

const utc = SwissEph.utcToJd(2024, 4, 8, 12, 0, 0);
// { tjdEt, tjdUt }

const dow = SwissEph.dayOfWeek(jd); // 0=Mon .. 6=Sun
```

## Math Utilities (static)

```ts
SwissEph.normalizeDegrees(370);   // 10
SwissEph.degreeMidpoint(350, 10); // 0
SwissEph.version();               // '2.10.03'
```

## Error Handling

All methods throw `SwissEphError` when the underlying engine returns an error:

```ts
import { SwissEphError } from './src/SwissEph';

try {
  const pos = swe.calc(jd, 999);
} catch (e) {
  if (e instanceof SwissEphError) {
    console.error('Swiss Ephemeris error:', e.message);
  }
}
```

## Loading Ephemeris Files

For higher precision than Moshier, load SE1 or JPL files:

```ts
// Swiss Ephemeris SE1 files:
const swe = new SwissEph({ ephemeris: 'swisseph' });
const buf = fs.readFileSync('ephe/sepl_18.se1').buffer;
swe.loadEphemerisFile(buf, 'sepl_18.se1');

// JPL files:
const sweJpl = new SwissEph({ ephemeris: 'jpl' });
const jplBuf = fs.readFileSync('de441.eph').buffer;
sweJpl.loadJplFile(jplBuf, 'de441.eph');
```

## Type Reference

All return types are exported from `./src/SwissEph/types`:

- `PlanetPosition` — core position result
- `StarPosition` — extends PlanetPosition with `starName`
- `HouseResult` — house cusps and angles
- `NodesApsides` — nodes and apsides (4 PlanetPositions)
- `OrbitalElements` — Keplerian orbital elements
- `OrbitDistances` — max/min/true distance
- `SolarEclipseGlobal` / `Local` / `Where` / `How`
- `LunarEclipseGlobal` / `Local` / `How`
- `OccultationGlobal` / `Local` / `Where`
- `RiseSetResult`, `PhenoResult`, `AzaltResult`, `AzaltRevResult`
- `CrossingResult`, `MoonNodeCrossingResult`
- `HeliacalResult`, `HeliacalPhenoResult`, `VisualLimitResult`
- `GauquelinResult`, `GeoPosition`, `SwissEphOptions`
- `DateResult`, `UtcToJdResult`, `JdToUtcResult`, `SplitDegResult`
