# Azimuth and Altitude

**Azimuth** and **altitude** form the **horizontal coordinate system**, which describes where an object appears in the sky as seen from a specific location on Earth at a specific time. Unlike ecliptic or equatorial coordinates (which are fixed to the celestial sphere), horizontal coordinates change constantly as the Earth rotates.

- **Altitude** (also called elevation): The angle above the horizon, in degrees. 0 degrees = on the horizon, 90 degrees = directly overhead (the zenith), negative values = below the horizon.
- **Azimuth**: The compass direction along the horizon, measured in degrees.

This coordinate system is immediately practical: it tells you exactly where to point a telescope, where to look in the sky, or whether an object is above the horizon at all. It is used in telescope pointing systems, satellite tracking, architectural sun studies, and any situation where you need to know the physical direction of a celestial body from your location.

**IMPORTANT: Swiss Ephemeris azimuth convention** -- The Swiss Ephemeris measures azimuth starting from **South**, going clockwise through **West**:
- 0 degrees = **South**
- 90 degrees = **West**
- 180 degrees = **North**
- 270 degrees = **East**

This is **different from the common navigation/compass convention** where 0 degrees = North, 90 degrees = East, 180 degrees = South, 270 degrees = West. If you need compass bearings, add 180 degrees and normalize to [0, 360):

```typescript
const compassAzimuth = (sweAzimuth + 180) % 360;
```

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

// Where is the Sun in the sky from New York at 3 PM UT on June 21, 2024?
const jd = SwissEph.julianDay(2024, 6, 21, 15);
const nyc = { longitude: -74.006, latitude: 40.713 };

// First get the Sun's ecliptic position
const sun = swe.calc(jd, SE_SUN);

// Convert to horizontal coordinates
const hor = swe.azalt(jd, nyc, sun.longitude, sun.latitude, sun.distance);

console.log(`Sun azimuth (SE convention): ${hor.azimuth.toFixed(2)} deg`);
console.log(`Sun true altitude:           ${hor.trueAltitude.toFixed(2)} deg`);
console.log(`Sun apparent altitude:        ${hor.apparentAltitude.toFixed(2)} deg`);

// Convert to compass bearing
const compass = (hor.azimuth + 180) % 360;
console.log(`Sun compass bearing:          ${compass.toFixed(2)} deg`);

swe.close();
```

---

## Detailed Examples

### Sun position throughout the day

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const london = { longitude: -0.128, latitude: 51.507 };

console.log('Sun position from London, June 21, 2024:');
console.log('Hour(UT)  Altitude   Azimuth(SE)  Compass');

for (let hour = 4; hour <= 21; hour++) {
  const jd = SwissEph.julianDay(2024, 6, 21, hour);
  const sun = swe.calc(jd, SE_SUN);
  const hor = swe.azalt(jd, london, sun.longitude, sun.latitude, sun.distance);

  const compass = (hor.azimuth + 180) % 360;
  const compassDir = compassDirection(compass);

  if (hor.apparentAltitude > -2) { // Show when Sun is near or above horizon
    console.log(
      `  ${String(hour).padStart(2)}:00    ` +
      `${hor.apparentAltitude.toFixed(1).padStart(6)} deg  ` +
      `${hor.azimuth.toFixed(1).padStart(7)} deg   ` +
      `${compass.toFixed(1).padStart(6)} deg ${compassDir}`
    );
  }
}

function compassDirection(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return dirs[index];
}

swe.close();
```

### True altitude vs apparent altitude

The `azalt` function returns both the **true** (geometric) altitude and the **apparent** altitude (after atmospheric refraction). Refraction makes objects appear slightly higher than they actually are, especially near the horizon.

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const geo = { longitude: 0, latitude: 51.5 };

// Check the Sun near sunset when refraction is strongest
const jd = SwissEph.julianDay(2024, 3, 20, 18); // Near sunset at equinox
const sun = swe.calc(jd, SE_SUN);
const hor = swe.azalt(jd, geo, sun.longitude, sun.latitude, sun.distance);

console.log(`True (geometric) altitude: ${hor.trueAltitude.toFixed(4)} deg`);
console.log(`Apparent altitude:         ${hor.apparentAltitude.toFixed(4)} deg`);
console.log(`Refraction effect:         ${(hor.apparentAltitude - hor.trueAltitude).toFixed(4)} deg`);
// Near the horizon, refraction lifts the apparent position by about 0.5 degrees
// At higher altitudes the effect diminishes rapidly

swe.close();
```

### Custom atmospheric conditions

Refraction depends on pressure and temperature. You can specify these for your location.

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const geo = { longitude: 0, latitude: 51.5 };
const jd = SwissEph.julianDay(2024, 3, 20, 18);
const sun = swe.calc(jd, SE_SUN);

// Standard atmosphere (default)
const standard = swe.azalt(jd, geo, sun.longitude, sun.latitude, sun.distance);
console.log(`Standard (1013.25 mbar, 15C): apparent alt = ${standard.apparentAltitude.toFixed(4)} deg`);

// High altitude, cold conditions
const highAlt = swe.azalt(jd, geo, sun.longitude, sun.latitude, sun.distance,
  0, // calcFlag: SE_ECL2HOR (default)
  700, // pressure in mbar (at ~3000m elevation)
  -10  // temperature in Celsius
);
console.log(`High altitude (700 mbar, -10C): apparent alt = ${highAlt.apparentAltitude.toFixed(4)} deg`);

// No refraction (pressure = 0)
const noRefr = swe.azalt(jd, geo, sun.longitude, sun.latitude, sun.distance,
  0, 0, 0);
console.log(`No refraction (0 mbar):         apparent alt = ${noRefr.apparentAltitude.toFixed(4)} deg`);

swe.close();
```

### Using equatorial input (SE_EQU2HOR)

If you already have equatorial coordinates (Right Ascension and Declination) instead of ecliptic coordinates, use `SE_EQU2HOR` as the calculation flag.

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SEFLG_EQUATORIAL, SE_EQU2HOR } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 15);
const geo = { longitude: -74.006, latitude: 40.713 };

// Get Sun in equatorial coordinates
const sun = swe.calc(jd, SE_SUN, SEFLG_EQUATORIAL);
const ra = sun.longitude;   // Right Ascension in degrees
const dec = sun.latitude;   // Declination in degrees

// Convert from equatorial to horizontal
// When using SE_EQU2HOR, pass RA as "lon" and Dec as "lat"
const hor = swe.azalt(jd, geo, ra, dec, 1, SE_EQU2HOR);

console.log(`From equatorial (RA=${ra.toFixed(2)}, Dec=${dec.toFixed(2)}):`);
console.log(`  Azimuth:           ${hor.azimuth.toFixed(2)} deg (SE convention)`);
console.log(`  True altitude:     ${hor.trueAltitude.toFixed(2)} deg`);
console.log(`  Apparent altitude: ${hor.apparentAltitude.toFixed(2)} deg`);

swe.close();
```

### Reverse conversion: azimuth/altitude to ecliptic

Given a direction in the sky (azimuth and apparent altitude), you can find what ecliptic longitude and latitude that direction corresponds to.

```typescript
import { SwissEph } from '../index';
import { SE_ECL2HOR, SE_EQU2HOR } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 15);
const geo = { longitude: -74.006, latitude: 40.713 };

// I see something at azimuth 90 deg (West in SE convention) and altitude 45 deg
// What ecliptic coordinates does that correspond to?
const result = swe.azaltReverse(jd, geo, 90, 45, SE_ECL2HOR);
console.log(`Ecliptic longitude: ${result.azimuth.toFixed(2)} deg`);
console.log(`Ecliptic latitude:  ${result.altitude.toFixed(2)} deg`);

// Or get equatorial coordinates back:
const resultEqu = swe.azaltReverse(jd, geo, 90, 45, SE_EQU2HOR);
console.log(`\nRight Ascension: ${resultEqu.azimuth.toFixed(2)} deg`);
console.log(`Declination:     ${resultEqu.altitude.toFixed(2)} deg`);

swe.close();
```

### Checking if a planet is visible (above the horizon)

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MOON, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 4, 15, 20); // 8 PM UT
const paris = { longitude: 2.352, latitude: 48.857 };

const bodies = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('Visibility from Paris at 20:00 UT, April 15, 2024:');
for (const b of bodies) {
  const pos = swe.calc(jd, b.id);
  const hor = swe.azalt(jd, paris, pos.longitude, pos.latitude, pos.distance);
  const compass = (hor.azimuth + 180) % 360;
  const visible = hor.apparentAltitude > 0 ? 'VISIBLE' : 'below horizon';
  console.log(
    `  ${b.name.padEnd(8)} alt: ${hor.apparentAltitude.toFixed(1).padStart(6)} deg` +
    `  compass: ${compass.toFixed(0).padStart(3)} deg` +
    `  ${visible}`
  );
}

swe.close();
```

### Sky map: plotting planet positions in horizontal coordinates

```typescript
import { SwissEph } from '../index';
import {
  SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 8, 15, 22); // 10 PM UT
const geo = { longitude: 13.405, latitude: 52.520 }; // Berlin

const planets = [
  { id: SE_MOON,    name: 'Moon',    symbol: 'D' },
  { id: SE_MERCURY, name: 'Mercury', symbol: 'Me' },
  { id: SE_VENUS,   name: 'Venus',   symbol: 'Ve' },
  { id: SE_MARS,    name: 'Mars',    symbol: 'Ma' },
  { id: SE_JUPITER, name: 'Jupiter', symbol: 'Ju' },
  { id: SE_SATURN,  name: 'Saturn',  symbol: 'Sa' },
];

console.log('Sky positions from Berlin at 22:00 UT, Aug 15, 2024:');
console.log('Planet    Compass    Altitude');

for (const p of planets) {
  const pos = swe.calc(jd, p.id);
  const hor = swe.azalt(jd, geo, pos.longitude, pos.latitude, pos.distance);

  if (hor.apparentAltitude > 0) {
    const compass = (hor.azimuth + 180) % 360;
    console.log(
      `  ${p.name.padEnd(9)} ${compass.toFixed(1).padStart(6)} deg  ` +
      `${hor.apparentAltitude.toFixed(1).padStart(5)} deg`
    );
  }
}

swe.close();
```

---

## Deep Explanation

### The azimuth convention in detail

**This is one of the most common sources of confusion when using the Swiss Ephemeris.**

The Swiss Ephemeris follows the astronomical convention where azimuth is measured from **South** and increases clockwise (through West):

| SE Azimuth | Direction |
|------------|-----------|
| 0 degrees | South |
| 90 degrees | West |
| 180 degrees | North |
| 270 degrees | East |

The common **navigation/compass convention** (used in GPS, maps, and daily life) measures from **North** and increases clockwise (through East):

| Compass Azimuth | Direction |
|-----------------|-----------|
| 0 degrees | North |
| 90 degrees | East |
| 180 degrees | South |
| 270 degrees | West |

To convert between them:

```typescript
// Swiss Ephemeris to compass
const compassAzimuth = (sweAzimuth + 180) % 360;

// Compass to Swiss Ephemeris
const sweAzimuth = (compassAzimuth + 180) % 360;
```

The formula is the same in both directions because 180 degrees is exactly half a circle.

The astronomical convention originated because in the Northern Hemisphere, celestial objects transit (cross the meridian) in the South, so it was natural for astronomers to make South the reference direction. Many classical astronomical instruments (transit telescopes, meridian circles) point South by default.

### Altitude explained

| Altitude | Meaning |
|----------|---------|
| +90 degrees | Zenith (directly overhead) |
| +45 degrees | Halfway between horizon and zenith |
| 0 degrees | On the geometric horizon |
| -0.57 degrees | Approximate apparent altitude of a rising/setting star (refraction lifts it from ~-0.57 to 0) |
| -0.83 degrees | Approximate true altitude of the Sun's center at sunrise/sunset |
| -6 degrees | End of civil twilight |
| -12 degrees | End of nautical twilight |
| -18 degrees | End of astronomical twilight |
| -90 degrees | Nadir (directly below) |

### Atmospheric refraction

Atmospheric refraction causes celestial objects to appear higher in the sky than they geometrically are. The effect is strongest at the horizon and negligible at the zenith:

| True altitude | Refraction amount |
|--------------|-------------------|
| 0 degrees (horizon) | ~34 arc-minutes (~0.57 degrees) |
| 5 degrees | ~10 arc-minutes |
| 10 degrees | ~5 arc-minutes |
| 20 degrees | ~2.5 arc-minutes |
| 45 degrees | ~1 arc-minute |
| 90 degrees (zenith) | 0 |

The `azalt` function returns both `trueAltitude` (geometric, no refraction) and `apparentAltitude` (with refraction). The difference between them is the refraction correction.

Refraction depends on atmospheric conditions:
- **Higher pressure** = more refraction (denser air bends light more)
- **Lower temperature** = more refraction (colder air is denser)
- Default values: 1013.25 mbar, 15 degrees C

Setting pressure to 0 effectively disables the refraction calculation (apparent altitude = true altitude).

### SE_ECL2HOR vs SE_EQU2HOR

The `calcFlag` parameter determines what kind of input coordinates you are providing:

| Flag | Value | Input meaning |
|------|-------|--------------|
| `SE_ECL2HOR` | 0 | `lon` = ecliptic longitude, `lat` = ecliptic latitude. The function internally converts to equatorial then to horizontal. |
| `SE_EQU2HOR` | 1 | `lon` = Right Ascension (in degrees, not hours), `lat` = Declination. The function converts directly to horizontal. |

Both produce the same output (azimuth, true altitude, apparent altitude). Use whichever matches the coordinates you already have. If you have computed a planet position with `swe.calc()` (which returns ecliptic coordinates by default), use `SE_ECL2HOR`. If you used `SEFLG_EQUATORIAL` in the calc, use `SE_EQU2HOR`.

### The `azaltReverse` function

This reverses the conversion: given an azimuth and apparent altitude (what you see in the sky), it returns the ecliptic (or equatorial) coordinates that correspond to that direction.

The return value uses the same `AzaltRevResult` type with fields named `azimuth` and `altitude`, but these actually contain the ecliptic longitude/latitude (or RA/Dec) depending on the `calcFlag`:

| calcFlag | `azimuth` field | `altitude` field |
|----------|----------------|-----------------|
| `SE_ECL2HOR` (0) | Ecliptic longitude | Ecliptic latitude |
| `SE_EQU2HOR` (1) | Right Ascension (degrees) | Declination |

### The `dist` parameter

The `dist` parameter in `azalt()` is the distance of the object in AU. For most purposes, this has negligible effect and can be left at the default (1). It matters only for very close objects (like the Moon, which shows measurable parallax) -- but if you are getting the position from `swe.calc()`, you already have the correct distance in the result.

### Practical uses

- **Telescope pointing**: Convert a planet's ephemeris position to azimuth/altitude for alt-azimuth telescope mounts. Remember to convert the SE azimuth to compass azimuth if your mount uses the navigation convention.
- **Visibility checking**: If a planet's apparent altitude is negative, it is below the horizon and not observable.
- **Shadow calculation**: The Sun's altitude determines shadow length. At altitude *h*, a vertical stick of height *H* casts a shadow of length *H / tan(h)*.
- **Solar energy**: The Sun's altitude and azimuth determine the angle of incidence on solar panels, which affects energy generation.
- **Photography**: The Sun's position determines lighting direction and quality. Low altitude produces warm, long-shadow light (golden hour); high altitude produces harsh, overhead light.

### Tips

- Always remember the azimuth convention (0 = South in Swiss Ephemeris). Converting to compass bearing is simple: `(azimuth + 180) % 360`.
- The `apparentAltitude` is what you actually see; `trueAltitude` is the geometric reality. For observational purposes (is this object visible?), use `apparentAltitude`.
- At very low altitudes (near the horizon), refraction can be anomalous due to temperature inversions, mirages, and other atmospheric effects. The standard refraction formula is an average approximation.
- Setting `pressure` to 0 disables refraction, which is equivalent to what `SE_BIT_NO_REFRACTION` does for rise/set calculations.
