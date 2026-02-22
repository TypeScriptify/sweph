# Orbital Elements

**Keplerian orbital elements** are the six numbers that completely define the shape, orientation, and timing of an orbit. They are the language of celestial mechanics -- given these six values, you can reconstruct the exact path of a planet around the Sun and predict where it will be at any moment.

This library provides three related methods:
- **`orbitalElements(jd, planet)`** -- returns the six classical elements plus derived quantities like period and daily motion
- **`orbitDistances(jd, planet)`** -- returns the maximum, minimum, and current distance of the planet
- **`nodesApsides(jd, planet)`** -- returns the positions of the orbital nodes and apsides (perihelion/aphelion) as full position objects

These are useful for:
- Understanding the physical structure of planetary orbits
- Computing orbital periods (how long a "year" is on each planet)
- Finding closest/farthest approaches
- Understanding why planets speed up and slow down
- Astronomical education and visualization

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const elem = swe.orbitalElements(jd, SE_MARS);

console.log(`Mars orbital elements at J2025.0:`);
console.log(`  Semi-major axis:     ${elem.semiAxis.toFixed(4)} AU`);
console.log(`  Eccentricity:        ${elem.eccentricity.toFixed(6)}`);
console.log(`  Inclination:         ${elem.inclination.toFixed(4)}°`);
console.log(`  Ascending node:      ${elem.ascNode.toFixed(4)}°`);
console.log(`  Arg of perihelion:   ${elem.argPerihelion.toFixed(4)}°`);
console.log(`  Mean anomaly:        ${elem.meanAnomaly.toFixed(4)}°`);
console.log(`  Tropical period:     ${elem.tropicalPeriod.toFixed(4)} years`);
console.log(`  Synodic period:      ${elem.synodicPeriod.toFixed(1)} days`);

swe.close();
```

---

## Detailed Examples

### Orbital elements for all planets

```typescript
import { SwissEph } from '../index';
import {
  SE_MERCURY, SE_VENUS, SE_EARTH, SE_MARS,
  SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const planets = [
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_EARTH,   name: 'Earth' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
  { id: SE_URANUS,  name: 'Uranus' },
  { id: SE_NEPTUNE, name: 'Neptune' },
  { id: SE_PLUTO,   name: 'Pluto' },
];

console.log('Planet      a (AU)   e        i (°)    Period (yr)');
console.log('----------  -------  -------  -------  -----------');

for (const pl of planets) {
  const elem = swe.orbitalElements(jd, pl.id);
  console.log(
    `${pl.name.padEnd(10)}  ` +
    `${elem.semiAxis.toFixed(4).padStart(7)}  ` +
    `${elem.eccentricity.toFixed(5).padStart(7)}  ` +
    `${elem.inclination.toFixed(3).padStart(7)}  ` +
    `${elem.tropicalPeriod.toFixed(3).padStart(11)}`
  );
}

swe.close();
```

### Getting orbital distances

The `orbitDistances()` method gives you the maximum, minimum, and current (true) distance from the Sun (for heliocentric) or from Earth (for geocentric, the default):

```typescript
import { SwissEph } from '../index';
import {
  SE_MARS, SE_JUPITER, SE_SATURN, SE_VENUS,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 6, 15, 0);

const planets = [
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('Planet     Current (AU)  Min (AU)  Max (AU)');
console.log('---------  -----------  --------  --------');

for (const pl of planets) {
  const dist = swe.orbitDistances(jd, pl.id);
  console.log(
    `${pl.name.padEnd(9)}  ` +
    `${dist.true.toFixed(4).padStart(11)}  ` +
    `${dist.min.toFixed(4).padStart(8)}  ` +
    `${dist.max.toFixed(4).padStart(8)}`
  );
}

swe.close();
```

### Nodes and apsides with different methods

The `nodesApsides()` method returns the positions of a planet's orbital nodes (where its orbit crosses the ecliptic) and apsides (perihelion and aphelion). There are several computation methods:

```typescript
import { SwissEph } from '../index';
import {
  SE_MARS,
  SE_NODBIT_MEAN, SE_NODBIT_OSCU, SE_NODBIT_OSCU_BAR, SE_NODBIT_FOPOINT,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

// Method 1: Mean nodes/apsides (long-term average, smoothly moving)
const mean = swe.nodesApsides(jd, SE_MARS, SE_NODBIT_MEAN);
console.log('Mean nodes/apsides:');
console.log(`  Ascending node:   ${mean.ascendingNode.longitude.toFixed(4)}°`);
console.log(`  Descending node:  ${mean.descendingNode.longitude.toFixed(4)}°`);
console.log(`  Perihelion:       ${mean.perihelion.longitude.toFixed(4)}° (dist: ${mean.perihelion.distance.toFixed(4)} AU)`);
console.log(`  Aphelion:         ${mean.aphelion.longitude.toFixed(4)}° (dist: ${mean.aphelion.distance.toFixed(4)} AU)`);

// Method 2: Osculating nodes/apsides (instantaneous, includes perturbations)
const oscu = swe.nodesApsides(jd, SE_MARS, SE_NODBIT_OSCU);
console.log('\nOsculating nodes/apsides:');
console.log(`  Ascending node:   ${oscu.ascendingNode.longitude.toFixed(4)}°`);
console.log(`  Descending node:  ${oscu.descendingNode.longitude.toFixed(4)}°`);
console.log(`  Perihelion:       ${oscu.perihelion.longitude.toFixed(4)}°`);
console.log(`  Aphelion:         ${oscu.aphelion.longitude.toFixed(4)}°`);

// Method 3: Osculating with barycentric computation (more accurate for outer planets)
const bar = swe.nodesApsides(jd, SE_MARS, SE_NODBIT_OSCU_BAR);
console.log('\nOsculating (barycentric):');
console.log(`  Ascending node:   ${bar.ascendingNode.longitude.toFixed(4)}°`);
console.log(`  Perihelion:       ${bar.perihelion.longitude.toFixed(4)}°`);

swe.close();
```

### Comparing perihelion distance to orbit eccentricity

The perihelion and aphelion distances are directly related to the semi-major axis and eccentricity:
- Perihelion distance = a * (1 - e)
- Aphelion distance = a * (1 + e)

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_NODBIT_MEAN } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const elem = swe.orbitalElements(jd, SE_MARS);
const nodes = swe.nodesApsides(jd, SE_MARS, SE_NODBIT_MEAN);

console.log('Mars orbit verification:');
console.log(`  Semi-major axis a = ${elem.semiAxis.toFixed(6)} AU`);
console.log(`  Eccentricity    e = ${elem.eccentricity.toFixed(6)}`);
console.log();

const computedPeri = elem.semiAxis * (1 - elem.eccentricity);
const computedAph = elem.semiAxis * (1 + elem.eccentricity);

console.log(`  Perihelion (computed a*(1-e)):  ${computedPeri.toFixed(6)} AU`);
console.log(`  Perihelion (from nodesApsides): ${nodes.perihelion.distance.toFixed(6)} AU`);
console.log();
console.log(`  Aphelion (computed a*(1+e)):    ${computedAph.toFixed(6)} AU`);
console.log(`  Aphelion (from nodesApsides):   ${nodes.aphelion.distance.toFixed(6)} AU`);

swe.close();
```

### Using the focal point (SE_NODBIT_FOPOINT)

The `SE_NODBIT_FOPOINT` flag replaces the aphelion with the **second focus** of the elliptical orbit. An ellipse has two foci; the Sun is at one focus, and the second focus is the empty point on the opposite side. Combined with `SE_NODBIT_OSCU`, this gives you the osculating second focus:

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_NODBIT_OSCU, SE_NODBIT_FOPOINT } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

// Combine flags with bitwise OR
const method = SE_NODBIT_OSCU | SE_NODBIT_FOPOINT;
const result = swe.nodesApsides(jd, SE_MARS, method);

console.log('Mars osculating orbit:');
console.log(`  Ascending node:  ${result.ascendingNode.longitude.toFixed(4)}°`);
console.log(`  Descending node: ${result.descendingNode.longitude.toFixed(4)}°`);
console.log(`  Perihelion:      ${result.perihelion.longitude.toFixed(4)}° at ${result.perihelion.distance.toFixed(4)} AU`);
console.log(`  Second focus:    ${result.aphelion.longitude.toFixed(4)}° at ${result.aphelion.distance.toFixed(4)} AU`);
// Note: when FOPOINT is set, the "aphelion" field contains the second focus instead

swe.close();
```

### Daily motion and orbital speed

The `dailyMotion` and `meanDailyMotion` fields tell you how fast the planet moves along its orbit:

```typescript
import { SwissEph } from '../index';
import {
  SE_MERCURY, SE_VENUS, SE_EARTH, SE_MARS,
  SE_JUPITER, SE_SATURN, SE_URANUS, SE_NEPTUNE, SE_PLUTO,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const planets = [
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_EARTH,   name: 'Earth' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
  { id: SE_URANUS,  name: 'Uranus' },
  { id: SE_NEPTUNE, name: 'Neptune' },
  { id: SE_PLUTO,   name: 'Pluto' },
];

console.log('Planet     Daily Motion  Mean Daily  Period (yr)');
console.log('---------  -----------  ----------  -----------');

for (const pl of planets) {
  const elem = swe.orbitalElements(jd, pl.id);
  console.log(
    `${pl.name.padEnd(9)}  ` +
    `${elem.dailyMotion.toFixed(6).padStart(10)}°  ` +
    `${elem.meanDailyMotion.toFixed(6).padStart(10)}°  ` +
    `${elem.tropicalPeriod.toFixed(3).padStart(11)}`
  );
}

swe.close();
```

---

## Deep Explanation

### The Six Classical Orbital Elements

Every orbit in the solar system can be described by six numbers. Three define the shape and size of the orbit; three define its orientation in space.

#### Shape and Size

**1. Semi-major axis (a)** -- measured in AU (Astronomical Units, where 1 AU = Earth-Sun distance)

The semi-major axis is half the longest diameter of the elliptical orbit. It determines the size of the orbit and, by Kepler's Third Law, the orbital period.

```
         Semi-major axis (a)
    |<-------------------------->|

    Aphelion --- Center --- Perihelion
                   |
                  Sun (at one focus)
```

Typical values:
| Planet | a (AU) |
|--------|--------|
| Mercury | 0.387 |
| Venus | 0.723 |
| Earth | 1.000 |
| Mars | 1.524 |
| Jupiter | 5.203 |
| Saturn | 9.537 |
| Uranus | 19.19 |
| Neptune | 30.07 |
| Pluto | 39.48 |

**2. Eccentricity (e)** -- dimensionless, range 0 to 1

The eccentricity measures how elongated the ellipse is:
- **e = 0**: Perfect circle
- **e = 0.5**: Moderately elliptical
- **e = 1**: Parabola (escape trajectory)
- **e > 1**: Hyperbola (unbound orbit)

Most planets have nearly circular orbits (e < 0.1). Notable exceptions:
| Planet | e | Description |
|--------|------|-----------|
| Venus | 0.007 | Nearly circular |
| Earth | 0.017 | Very slightly elliptical |
| Mars | 0.093 | Noticeably elliptical |
| Pluto | 0.249 | Highly elliptical |
| Mercury | 0.206 | Quite elliptical |

Mars's eccentricity of ~0.093 causes its brightness at opposition to vary dramatically: a close opposition (perihelion side) makes Mars much brighter than a distant one.

**3. Inclination (i)** -- measured in degrees

The angle between the planet's orbital plane and the ecliptic (Earth's orbital plane). Most planets have very low inclinations:
| Planet | i |
|--------|------|
| Mercury | 7.0° |
| Venus | 3.4° |
| Mars | 1.9° |
| Jupiter | 1.3° |
| Pluto | 17.1° |

#### Orientation

**4. Longitude of the Ascending Node (Omega)** -- measured in degrees

The angle (measured along the ecliptic) from the Vernal Equinox to the point where the planet's orbit crosses the ecliptic going northward. This orients the orbital plane's "tilt axis" relative to the reference direction.

```
                    Ecliptic plane
    Vernal Equinox ----Omega---- Ascending Node
                                    /
                              Planet's orbit
                                 (tilted)
```

**5. Argument of Perihelion (omega)** -- measured in degrees

The angle (measured within the orbital plane) from the ascending node to the perihelion point. This tells you where in the orbit the closest approach to the Sun occurs.

**6. Mean Anomaly (M)** -- measured in degrees

The position of the planet along its orbit at the given epoch. Mean anomaly increases uniformly with time (unlike the true anomaly, which speeds up near perihelion). M = 0 at perihelion.

### Kepler's Three Laws

These orbital elements are grounded in Kepler's laws of planetary motion:

**First Law (1609)**: Planets move in ellipses with the Sun at one focus.
- This is why we need `a` (size) and `e` (shape) to describe the orbit.

**Second Law (1609)**: A line from the Sun to a planet sweeps out equal areas in equal times.
- This means planets move faster at perihelion and slower at aphelion. It is why `dailyMotion` (actual current speed) differs from `meanDailyMotion` (average speed).

**Third Law (1619)**: The square of the orbital period is proportional to the cube of the semi-major axis.
- P^2 = a^3 (when P is in years and a is in AU)
- This connects `semiAxis` to `tropicalPeriod`

### Osculating Elements

The elements returned by `orbitalElements()` are **osculating elements** -- they describe the orbit the planet would follow if all gravitational perturbations suddenly stopped at the given moment. They are an instantaneous snapshot.

In reality, the gravitational pull of other planets causes orbital elements to change slowly over time. For example:
- Mercury's argument of perihelion advances by about 574 arcseconds per century (43 of which are due to general relativity -- the famous anomalous precession that Einstein explained)
- Earth's eccentricity oscillates between about 0.005 and 0.058 over a ~100,000-year cycle (affecting ice ages)

This is why the function requires a Julian Day -- the elements are specific to that moment.

### Derived Quantities

Beyond the six classical elements, `orbitalElements()` returns several useful derived quantities:

**Tropical Period** (`tropicalPeriod`): The time for the planet to complete one orbit relative to the Vernal Equinox (in years). Due to precession, this differs very slightly from the sidereal period.

**Synodic Period** (`synodicPeriod`): The time between successive conjunctions of the planet with the Sun as seen from Earth (in days). This is the cycle of visibility -- from one opposition to the next for outer planets, or from one inferior conjunction to the next for inner planets.

**Daily Motion** (`dailyMotion`): The planet's current angular velocity along its orbit (degrees per day). Varies due to Kepler's Second Law -- faster at perihelion, slower at aphelion.

**Mean Daily Motion** (`meanDailyMotion`): The average angular velocity (degrees per day), which is constant: 360 / (period in days).

**Mean Longitude** (`meanLongitude`): The sum of the ascending node, argument of perihelion, and mean anomaly. A single number that increases uniformly and wraps around every orbit.

### The Nodes and Apsides Methods

The `nodesApsides()` method returns the positions of four special points:

**Ascending Node**: Where the planet's orbit crosses the ecliptic going northward. Important in astrology (the "North Node" of the planet).

**Descending Node**: Where the orbit crosses the ecliptic going southward.

**Perihelion**: The point of closest approach to the Sun. The planet moves fastest here (Kepler's Second Law).

**Aphelion**: The point farthest from the Sun. The planet moves slowest here.

Each of these is returned as a full `PlanetPosition` object with longitude, latitude, distance, and speeds.

### Method Constants for nodesApsides

| Constant | Value | Description |
|----------|-------|-------------|
| `SE_NODBIT_MEAN` | 1 | Mean nodes/apsides -- smooth, long-term averages. These change slowly and predictably. Best for general astrological use. |
| `SE_NODBIT_OSCU` | 2 | Osculating nodes/apsides -- instantaneous values based on the current orbit. These can jump around due to perturbations. |
| `SE_NODBIT_OSCU_BAR` | 4 | Osculating, computed from barycentric positions. More accurate for outer planets where the Sun's wobble due to Jupiter matters. |
| `SE_NODBIT_FOPOINT` | 256 | Replace aphelion with the second focus of the ellipse. Can be combined with other flags using bitwise OR. |

### The Astronomical Unit (AU)

The AU is the standard unit for measuring distances within the solar system. Historically defined as the mean Earth-Sun distance, it is now precisely defined as:

**1 AU = 149,597,870.7 km**

All distances in `orbitalElements()` and `orbitDistances()` are given in AU. To convert to kilometers, multiply by 149,597,870.7. To convert to light-minutes, multiply by 8.317 (light takes about 8.3 minutes to travel 1 AU).

### Return Types

```typescript
interface OrbitalElements {
  semiAxis: number;          // a -- semi-major axis in AU
  eccentricity: number;      // e -- eccentricity (0-1)
  inclination: number;       // i -- inclination in degrees
  ascNode: number;           // Longitude of ascending node in degrees
  argPerihelion: number;     // Argument of perihelion in degrees
  longPerihelion: number;    // Longitude of perihelion in degrees (= ascNode + argPerihelion)
  meanAnomaly: number;       // Mean anomaly in degrees
  meanLongitude: number;     // Mean longitude in degrees (= longPerihelion + meanAnomaly)
  dailyMotion: number;       // Current daily motion in degrees/day
  tropicalPeriod: number;    // Tropical period in years
  synodicPeriod: number;     // Synodic period in days
  meanDailyMotion: number;   // Mean daily motion in degrees/day
  meanLongJ2000: number;     // Mean longitude referred to J2000 equinox
  meanLongOfDate: number;    // Mean longitude of date
  meanLongSpeed: number;     // Speed of mean longitude
  nodeJ2000: number;         // Ascending node referred to J2000
  nodeOfDate: number;        // Ascending node of date
  nodeSpeed: number;         // Speed of ascending node
  perihelionJ2000: number;   // Longitude of perihelion referred to J2000
  perihelionOfDate: number;  // Longitude of perihelion of date
  perihelionSpeed: number;   // Speed of longitude of perihelion
}

interface OrbitDistances {
  max: number;    // Maximum distance (aphelion for heliocentric) in AU
  min: number;    // Minimum distance (perihelion for heliocentric) in AU
  true: number;   // Current true distance in AU
}

interface NodesApsides {
  ascendingNode: PlanetPosition;   // Full position at ascending node
  descendingNode: PlanetPosition;  // Full position at descending node
  perihelion: PlanetPosition;      // Full position at perihelion
  aphelion: PlanetPosition;        // Full position at aphelion (or second focus if FOPOINT)
}
```

### Why Elements Change Over Time (Perturbations)

If the Sun and a single planet were the only objects in the universe, the orbital elements would be constant forever (a perfect Keplerian orbit). In reality, the gravitational pulls of other planets cause the elements to drift:

- **Precession of perihelion**: The orientation of the orbit slowly rotates. Mercury's perihelion advances 574"/century.
- **Nodal regression**: The orbital plane slowly wobbles, causing the ascending node to drift.
- **Eccentricity oscillation**: The shape of the orbit changes over very long timescales.

These changes are tiny from year to year but accumulate over millennia. This is why astronomers use osculating elements (valid for a specific instant) rather than fixed mean elements when precision matters.
