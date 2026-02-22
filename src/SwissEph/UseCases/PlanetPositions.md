# Planet Positions

Calculating the position of a planet is the most fundamental operation in astrology and astronomical computing. Given a moment in time (expressed as a Julian Day number), the Swiss Ephemeris computes where each planet appears in the sky. The result includes the planet's **longitude** (its position along the ecliptic, 0-360 degrees), **latitude** (how far above or below the ecliptic plane), and **distance** (how far away it is, in AU). You also get the **speed** of each value -- how fast the planet is moving per day.

This is the building block for natal charts, transits, progressions, synastry, and virtually every astrological technique.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SE_MARS } from '../../constants';

const swe = new SwissEph();

// J2000.0 epoch (January 1, 2000 at 12:00 UT)
const jd = SwissEph.julianDay(2000, 1, 1, 12);

const sun = swe.calc(jd, SE_SUN);
console.log(`Sun longitude: ${sun.longitude.toFixed(4)}deg`);
// Sun longitude: 280.3706deg

const moon = swe.calc(jd, SE_MOON);
console.log(`Moon longitude: ${moon.longitude.toFixed(4)}deg`);

const mars = swe.calc(jd, SE_MARS);
console.log(`Mars longitude: ${mars.longitude.toFixed(4)}deg`);
console.log(`Mars speed: ${mars.longitudeSpeed.toFixed(4)} deg/day`);

swe.close();
```

---

## Detailed Examples

### All classical planets at a given date

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 4, 8, 18.28); // 2024 Apr 8, ~18:17 UT

const planets = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
  { id: SE_URANUS,  name: 'Uranus' },
  { id: SE_NEPTUNE, name: 'Neptune' },
  { id: SE_PLUTO,   name: 'Pluto' },
];

for (const p of planets) {
  const pos = swe.calc(jd, p.id);

  // Convert longitude to zodiac sign
  const signs = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const signIndex = Math.floor(pos.longitude / 30);
  const degInSign = pos.longitude - signIndex * 30;

  console.log(
    `${p.name.padEnd(9)} ${degInSign.toFixed(2).padStart(6)}deg ${signs[signIndex]}` +
    `  speed: ${pos.longitudeSpeed.toFixed(4)} deg/day`
  );
}

swe.close();
```

### Equatorial coordinates (Right Ascension and Declination)

Astronomers typically use equatorial coordinates rather than ecliptic. Pass `SEFLG_EQUATORIAL` to get Right Ascension (in degrees, 0-360) and Declination (in degrees, -90 to +90) instead of ecliptic longitude and latitude.

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SEFLG_EQUATORIAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 6, 21, 12);

const sun = swe.calc(jd, SE_SUN, SEFLG_EQUATORIAL);

// When SEFLG_EQUATORIAL is set:
//   longitude  -> Right Ascension (degrees, 0-360)
//   latitude   -> Declination (degrees, -90 to +90)
//   distance   -> distance in AU (same as ecliptic)
console.log(`Sun RA:  ${sun.longitude.toFixed(4)} deg`);
console.log(`Sun Dec: ${sun.latitude.toFixed(4)} deg`);

// Convert RA from degrees to hours/minutes/seconds
const raHours = sun.longitude / 15;
const h = Math.floor(raHours);
const m = Math.floor((raHours - h) * 60);
const s = ((raHours - h) * 60 - m) * 60;
console.log(`Sun RA:  ${h}h ${m}m ${s.toFixed(1)}s`);

swe.close();
```

### Heliocentric positions

View planets from the Sun's perspective instead of from Earth. Useful for heliocentric astrology and astronomical research.

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_EARTH, SEFLG_HELCTR } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Heliocentric Mars (as seen from the Sun)
const mars = swe.calc(jd, SE_MARS, SEFLG_HELCTR);
console.log(`Mars heliocentric longitude: ${mars.longitude.toFixed(4)} deg`);
console.log(`Mars distance from Sun: ${mars.distance.toFixed(6)} AU`);

// Heliocentric Earth
const earth = swe.calc(jd, SE_EARTH, SEFLG_HELCTR);
console.log(`Earth heliocentric longitude: ${earth.longitude.toFixed(4)} deg`);

swe.close();
```

### Lunar nodes and Lilith

```typescript
import { SwissEph } from '../index';
import { SE_MEAN_NODE, SE_TRUE_NODE, SE_MEAN_APOG, SE_OSCU_APOG } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

const meanNode = swe.calc(jd, SE_MEAN_NODE);
const trueNode = swe.calc(jd, SE_TRUE_NODE);
console.log(`Mean North Node: ${meanNode.longitude.toFixed(4)} deg`);
console.log(`True North Node: ${trueNode.longitude.toFixed(4)} deg`);
// The South Node is always 180 degrees opposite the North Node.

const meanLilith = swe.calc(jd, SE_MEAN_APOG);
const oscuLilith = swe.calc(jd, SE_OSCU_APOG);
console.log(`Mean Lilith (Black Moon): ${meanLilith.longitude.toFixed(4)} deg`);
console.log(`Osculating Lilith:        ${oscuLilith.longitude.toFixed(4)} deg`);

swe.close();
```

### Chiron and the main asteroids

```typescript
import { SwissEph } from '../index';
import { SE_CHIRON, SE_CERES, SE_PALLAS, SE_JUNO, SE_VESTA } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

const bodies = [
  { id: SE_CHIRON, name: 'Chiron' },
  { id: SE_CERES,  name: 'Ceres' },
  { id: SE_PALLAS, name: 'Pallas' },
  { id: SE_JUNO,   name: 'Juno' },
  { id: SE_VESTA,  name: 'Vesta' },
];

for (const b of bodies) {
  const pos = swe.calc(jd, b.id);
  console.log(`${b.name.padEnd(8)} ${pos.longitude.toFixed(4)} deg`);
}

swe.close();
```

### Detecting retrograde motion

A planet is retrograde when its longitudinal speed is negative.

```typescript
import { SwissEph } from '../index';
import { SE_MERCURY } from '../../constants';

const swe = new SwissEph();

// Check Mercury's direction over several months
for (let month = 1; month <= 12; month++) {
  const jd = SwissEph.julianDay(2024, month, 15, 12);
  const pos = swe.calc(jd, SE_MERCURY);
  const direction = pos.longitudeSpeed < 0 ? 'RETROGRADE' : 'direct';
  console.log(`2024-${String(month).padStart(2,'0')}-15  Mercury speed: ${pos.longitudeSpeed.toFixed(4)} deg/day  ${direction}`);
}

swe.close();
```

### Topocentric positions (observer on Earth's surface)

Geocentric positions are calculated from Earth's center. For the Moon especially, the difference from a specific location on Earth's surface (topocentric) can be up to about 1 degree.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SEFLG_TOPOCTR } from '../../constants';

// Set up the observer's location in the constructor
const swe = new SwissEph({
  topo: { longitude: -73.9857, latitude: 40.7484, altitude: 10 }, // New York
});

const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Topocentric Moon
const moonTopo = swe.calc(jd, SE_MOON, SEFLG_TOPOCTR);
console.log(`Moon (topocentric): ${moonTopo.longitude.toFixed(4)} deg`);

// Compare with geocentric (no SEFLG_TOPOCTR)
const swe2 = new SwissEph();
const moonGeo = swe2.calc(jd, SE_MOON);
console.log(`Moon (geocentric):  ${moonGeo.longitude.toFixed(4)} deg`);
console.log(`Difference: ${(moonTopo.longitude - moonGeo.longitude).toFixed(4)} deg`);

swe.close();
swe2.close();
```

### Sidereal positions

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_SIDM_LAHIRI, SEFLG_SIDEREAL } from '../../constants';

const swe = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });
const jd = SwissEph.julianDay(2024, 1, 15, 12);

// IMPORTANT: you must pass SEFLG_SIDEREAL in the flags to calc()
// Setting siderealMode in the constructor only configures which ayanamsa to use;
// it does NOT automatically add SEFLG_SIDEREAL to calc() calls.
const sun = swe.calc(jd, SE_SUN, SEFLG_SIDEREAL);
console.log(`Sun sidereal longitude (Lahiri): ${sun.longitude.toFixed(4)} deg`);

swe.close();
```

---

## Deep Explanation

### What the return values mean

| Field             | Description                                                                                   |
|-------------------|-----------------------------------------------------------------------------------------------|
| `longitude`       | Position along the ecliptic (or RA if `SEFLG_EQUATORIAL`), in degrees 0-360                   |
| `latitude`        | Angular distance above/below the ecliptic (or Declination if `SEFLG_EQUATORIAL`), in degrees  |
| `distance`        | Distance in AU (astronomical units; 1 AU = ~149.6 million km). For the Moon, also in AU.      |
| `longitudeSpeed`  | Daily motion in longitude (degrees per day). Negative = retrograde.                           |
| `latitudeSpeed`   | Daily motion in latitude (degrees per day).                                                   |
| `distanceSpeed`   | Daily change in distance (AU per day). Negative = approaching.                                |
| `flags`           | Flags actually used by the engine (may differ from your input if the engine fell back).       |

### Available planets and bodies

| Constant         | Value | Description                                                         |
|------------------|-------|---------------------------------------------------------------------|
| `SE_SUN`         | 0     | The Sun                                                             |
| `SE_MOON`        | 1     | The Moon                                                            |
| `SE_MERCURY`     | 2     | Mercury                                                             |
| `SE_VENUS`       | 3     | Venus                                                               |
| `SE_MARS`        | 4     | Mars                                                                |
| `SE_JUPITER`     | 5     | Jupiter                                                             |
| `SE_SATURN`      | 6     | Saturn                                                              |
| `SE_URANUS`      | 7     | Uranus                                                              |
| `SE_NEPTUNE`     | 8     | Neptune                                                             |
| `SE_PLUTO`       | 9     | Pluto                                                               |
| `SE_MEAN_NODE`   | 10    | Mean Lunar Node (North Node / Rahu). Moves smoothly.               |
| `SE_TRUE_NODE`   | 11    | True (osculating) Lunar Node. Wobbles with lunar perturbations.     |
| `SE_MEAN_APOG`   | 12    | Mean Lunar Apogee (Black Moon Lilith). Smooth mean motion.         |
| `SE_OSCU_APOG`   | 13    | Osculating Lunar Apogee. True instantaneous value, wobbles.        |
| `SE_EARTH`       | 14    | Earth (only meaningful for heliocentric/barycentric calculations). |
| `SE_CHIRON`      | 15    | Chiron (minor planet / centaur orbiting between Saturn and Uranus). |
| `SE_CERES`       | 17    | Ceres (dwarf planet, largest body in the asteroid belt).           |
| `SE_PALLAS`      | 18    | Pallas (second-largest asteroid).                                  |
| `SE_JUNO`        | 19    | Juno (asteroid).                                                   |
| `SE_VESTA`       | 20    | Vesta (second-most-massive asteroid).                              |

**Note on the South Node**: The Swiss Ephemeris only calculates the North Node. The South Node is always exactly 180 degrees opposite: `southNode = (northNode + 180) % 360`.

**Note on SE_EARTH**: Requesting SE_EARTH in normal geocentric mode is meaningless (you would be asking for Earth's position as seen from Earth). Use it with `SEFLG_HELCTR` (heliocentric) or `SEFLG_BARYCTR` (barycentric).

### Flag constants

Flags modify the calculation. They are combined with the bitwise OR operator (`|`). The wrapper automatically adds `SEFLG_SPEED` so you always get speed values.

| Constant           | Value  | Effect                                                                     |
|--------------------|--------|----------------------------------------------------------------------------|
| `SEFLG_SPEED`      | 256    | Compute speed (added automatically by wrapper).                            |
| `SEFLG_EQUATORIAL` | 2048   | Return Right Ascension / Declination instead of ecliptic longitude/lat.    |
| `SEFLG_XYZ`        | 4096   | Return Cartesian (X, Y, Z) instead of polar (lon, lat, dist).             |
| `SEFLG_RADIANS`    | 8192   | Return angles in radians instead of degrees.                               |
| `SEFLG_HELCTR`     | 8      | Heliocentric position (as seen from the Sun).                              |
| `SEFLG_BARYCTR`    | 16384  | Barycentric position (relative to solar system barycenter).                |
| `SEFLG_TOPOCTR`    | 32768  | Topocentric (from observer's location). Requires `topo` to be set.        |
| `SEFLG_SIDEREAL`   | 65536  | Sidereal zodiac. Requires `siderealMode` to be configured.                |
| `SEFLG_TRUEPOS`    | 16     | True/geometric position (no light-time correction).                        |
| `SEFLG_NOABERR`    | 1024   | No aberration of light correction.                                         |
| `SEFLG_NOGDEFL`    | 512    | No gravitational deflection of light.                                      |
| `SEFLG_J2000`      | 32     | Refer positions to the J2000 equinox (not the equinox of date).           |
| `SEFLG_NONUT`      | 64     | No nutation (use mean equinox of date, not true equinox).                  |

You can combine flags:

```typescript
import { SEFLG_EQUATORIAL, SEFLG_TOPOCTR, SEFLG_SIDEREAL } from '../../constants';

// Sidereal equatorial topocentric position
const pos = swe.calc(jd, SE_SUN, SEFLG_EQUATORIAL | SEFLG_SIDEREAL | SEFLG_TOPOCTR);
```

### Understanding ecliptic longitude

Ecliptic longitude is measured along the ecliptic (the Sun's apparent path through the sky over a year). It starts at the **vernal equinox point** (0 degrees Aries in the tropical zodiac) and increases eastward through the zodiac signs:

| Degrees   | Sign        |
|-----------|-------------|
| 0 - 30    | Aries       |
| 30 - 60   | Taurus      |
| 60 - 90   | Gemini      |
| 90 - 120  | Cancer      |
| 120 - 150 | Leo         |
| 150 - 180 | Virgo       |
| 180 - 210 | Libra       |
| 210 - 240 | Scorpio     |
| 240 - 270 | Sagittarius |
| 270 - 300 | Capricorn   |
| 300 - 330 | Aquarius    |
| 330 - 360 | Pisces      |

To convert absolute longitude to sign + degree within sign:
```typescript
const signIndex = Math.floor(longitude / 30);     // 0 = Aries, 11 = Pisces
const degreeInSign = longitude - signIndex * 30;   // 0.0 to 29.999...
```

### Understanding ecliptic latitude

Most planets stay very close to the ecliptic (latitude near 0). The Moon can reach about +/-5 degrees. Pluto can reach about +/-17 degrees. The Sun's ecliptic latitude is always essentially 0 (by definition, since the ecliptic is the Sun's apparent path).

### Time input: UT vs ET

The Julian Day number you pass to `calc()` is interpreted according to the `timeMode` set in the constructor:

- **`'ut'`** (default): Universal Time. This is clock time corrected for time zones. Use this for most astrological work.
- **`'et'`**: Ephemeris Time (also called Terrestrial Time / TT). This is the uniform time scale used internally by the ephemeris. It differs from UT by "delta-T", which is about 69 seconds in 2024.

For dates within a few centuries of the present, the difference between UT and ET is small and the library handles the conversion internally. For ancient or far-future dates, the distinction becomes significant.

### Edge cases

- **Speed is always included**: The wrapper adds `SEFLG_SPEED` automatically. You do not need to pass it.
- **Ephemeris fallback**: If you request `'swisseph'` or `'jpl'` but the ephemeris files are not loaded, the engine silently falls back to the Moshier analytical ephemeris. You can check the returned `flags` field to see which ephemeris was actually used.
- **Retrograde planets**: When `longitudeSpeed < 0`, the planet is retrograde (appearing to move backward through the zodiac from Earth's perspective). This is a normal geometric effect of orbital mechanics.
- **Mean vs True Node**: The mean node moves smoothly backward through the zodiac (~19.3 degrees/year). The true node oscillates around the mean with a period of about 173 days. Most astrologers use the mean node; Vedic astrology traditionally uses the true node (Rahu/Ketu).
