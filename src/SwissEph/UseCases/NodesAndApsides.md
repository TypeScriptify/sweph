# Nodes and Apsides

**Planetary nodes** and **apsides** describe key geometric features of a planet's orbit.

**Nodes** are the two points where a planet's orbit crosses the ecliptic plane (the plane of Earth's orbit around the Sun). Every planet orbits the Sun on a slightly tilted plane, and these planes intersect the ecliptic at two points:
- The **ascending node** is where the planet crosses the ecliptic going northward (from below to above the plane).
- The **descending node** is where it crosses going southward.

The most well-known nodes are the **lunar nodes**. In Vedic astrology, the ascending node is called **Rahu** and the descending node is **Ketu**. In Western astrology, they are known as the **North Node** and **South Node**. But every planet has its own pair of nodes -- they are simply less commonly used.

**Apsides** are the points where a planet is closest to and farthest from the body it orbits:
- **Perihelion**: the point of closest approach to the Sun (for the Moon: **perigee**, closest to Earth).
- **Aphelion**: the point of greatest distance from the Sun (for the Moon: **apogee**, farthest from Earth).

The Moon's apogee has special significance in astrology as **Black Moon Lilith** (the mean apogee) or **Osculating Lilith** (the true, instantaneous apogee).

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SE_NODBIT_MEAN } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 12);

const result = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_MEAN);

console.log(`Moon ascending node:  ${result.ascendingNode.longitude.toFixed(4)} deg`);
console.log(`Moon descending node: ${result.descendingNode.longitude.toFixed(4)} deg`);
console.log(`Moon perigee:         ${result.perihelion.longitude.toFixed(4)} deg`);
console.log(`Moon apogee:          ${result.aphelion.longitude.toFixed(4)} deg`);

swe.close();
```

---

## Detailed Examples

### Moon's nodes: mean vs osculating

The **mean node** moves smoothly backward through the zodiac at about 19.3 degrees per year. The **osculating (true) node** wobbles around the mean with perturbations of up to ~1.5 degrees. Most Western astrologers use the mean node; Vedic astrology traditionally uses the true node.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SE_NODBIT_MEAN, SE_NODBIT_OSCU } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 6, 15, 12);

const mean = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_MEAN);
const oscu = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_OSCU);

console.log(`Mean ascending node:       ${mean.ascendingNode.longitude.toFixed(4)} deg`);
console.log(`Osculating ascending node: ${oscu.ascendingNode.longitude.toFixed(4)} deg`);
console.log(`Difference: ${(oscu.ascendingNode.longitude - mean.ascendingNode.longitude).toFixed(4)} deg`);

// The descending node is always roughly 180 degrees from the ascending node
console.log(`\nMean descending node:      ${mean.descendingNode.longitude.toFixed(4)} deg`);

// Speed of the mean node (retrograde, so negative)
console.log(`Mean node speed: ${mean.ascendingNode.longitudeSpeed.toFixed(6)} deg/day`);

swe.close();
```

### Tracking the Moon's nodal cycle

The Moon's nodes complete a full retrograde circuit of the zodiac in approximately 18.6 years (6,798 days). This is the famous **nodal cycle** (or **Metonic-adjacent cycle**) that governs the timing of eclipses.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SE_NODBIT_MEAN } from '../../constants';

const swe = new SwissEph();
const signs = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];

// Track the North Node's position at the start of each year
console.log('North Node position by year:');
for (let year = 2020; year <= 2038; year++) {
  const jd = SwissEph.julianDay(year, 1, 1, 0);
  const result = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_MEAN);
  const lon = result.ascendingNode.longitude;
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon - signIdx * 30;
  console.log(`  ${year}  ${degInSign.toFixed(1).padStart(5)} deg ${signs[signIdx]}  (${lon.toFixed(2)} deg)`);
}
// After ~18.6 years, the node returns to the same position

swe.close();
```

### Planetary nodes (Mars, Jupiter, Saturn)

Every planet has its own pair of orbital nodes. These move much more slowly than the Moon's nodes.

```typescript
import { SwissEph } from '../index';
import {
  SE_MARS, SE_JUPITER, SE_SATURN,
  SE_NODBIT_MEAN, SE_NODBIT_OSCU,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const planets = [
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

for (const p of planets) {
  const mean = swe.nodesApsides(jd, p.id, SE_NODBIT_MEAN);
  const oscu = swe.nodesApsides(jd, p.id, SE_NODBIT_OSCU);

  console.log(`${p.name}:`);
  console.log(`  Mean asc. node:  ${mean.ascendingNode.longitude.toFixed(4)} deg`);
  console.log(`  Oscu asc. node:  ${oscu.ascendingNode.longitude.toFixed(4)} deg`);
  console.log(`  Mean perihelion:  ${mean.perihelion.longitude.toFixed(4)} deg`);
  console.log(`  Mean aphelion:    ${mean.aphelion.longitude.toFixed(4)} deg`);
  console.log();
}

swe.close();
```

### Mars apsides: perihelion and aphelion

Mars has a notably eccentric orbit (e ~= 0.093). Its perihelion and aphelion distances differ by about 0.28 AU.

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_NODBIT_MEAN } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const result = swe.nodesApsides(jd, SE_MARS, SE_NODBIT_MEAN);

console.log(`Mars perihelion longitude: ${result.perihelion.longitude.toFixed(4)} deg`);
console.log(`Mars perihelion distance:  ${result.perihelion.distance.toFixed(6)} AU`);
console.log(`Mars aphelion longitude:   ${result.aphelion.longitude.toFixed(4)} deg`);
console.log(`Mars aphelion distance:    ${result.aphelion.distance.toFixed(6)} AU`);

// Speed of perihelion precession (very slow)
console.log(`Perihelion speed: ${result.perihelion.longitudeSpeed.toFixed(8)} deg/day`);

swe.close();
```

### Black Moon Lilith: mean vs osculating apogee

In astrology, "Black Moon Lilith" usually refers to the mean lunar apogee. The osculating (true) Lilith is the instantaneous apogee, which can differ significantly.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SE_NODBIT_MEAN, SE_NODBIT_OSCU } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 3, 20, 12);

const mean = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_MEAN);
const oscu = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_OSCU);

console.log(`Mean Lilith (apogee):       ${mean.aphelion.longitude.toFixed(4)} deg`);
console.log(`Osculating Lilith (apogee): ${oscu.aphelion.longitude.toFixed(4)} deg`);
console.log(`Difference: ${(oscu.aphelion.longitude - mean.aphelion.longitude).toFixed(4)} deg`);

// Mean Lilith moves about 40.7 deg/year (direct motion, unlike the nodes)
console.log(`Mean Lilith speed: ${mean.aphelion.longitudeSpeed.toFixed(6)} deg/day`);

swe.close();
```

### The focal point (SE_NODBIT_FOPOINT)

An elliptical orbit has two focal points. The Sun (or Earth, for the Moon) sits at one focus. The `SE_NODBIT_FOPOINT` flag returns the **second (empty) focus** of the orbital ellipse instead of the aphelion. This is sometimes used in esoteric astrology as an alternative to Lilith.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SE_NODBIT_OSCU, SE_NODBIT_FOPOINT } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 12);

// Osculating aphelion (normal)
const oscu = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_OSCU);
console.log(`Osculating apogee (Lilith):   ${oscu.aphelion.longitude.toFixed(4)} deg`);

// Focal point: use SE_NODBIT_OSCU | SE_NODBIT_FOPOINT
const focal = swe.nodesApsides(jd, SE_MOON, SE_NODBIT_OSCU | SE_NODBIT_FOPOINT);
console.log(`Second focal point:           ${focal.aphelion.longitude.toFixed(4)} deg`);

// The focal point and apogee are close but not identical because the orbit is not
// a perfect ellipse — perturbations shift the apsidal line.

swe.close();
```

### Barycentric osculating nodes

The `SE_NODBIT_OSCU_BAR` method computes osculating elements relative to the **solar system barycenter** rather than the Sun. This matters for precise orbital mechanics because the Sun itself wobbles due to Jupiter and other giant planets.

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER, SE_NODBIT_OSCU, SE_NODBIT_OSCU_BAR } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const helio = swe.nodesApsides(jd, SE_JUPITER, SE_NODBIT_OSCU);
const bary  = swe.nodesApsides(jd, SE_JUPITER, SE_NODBIT_OSCU_BAR);

console.log('Jupiter ascending node:');
console.log(`  Heliocentric osculating:  ${helio.ascendingNode.longitude.toFixed(4)} deg`);
console.log(`  Barycentric osculating:   ${bary.ascendingNode.longitude.toFixed(4)} deg`);

console.log('Jupiter perihelion:');
console.log(`  Heliocentric:  ${helio.perihelion.longitude.toFixed(4)} deg`);
console.log(`  Barycentric:   ${bary.perihelion.longitude.toFixed(4)} deg`);

swe.close();
```

---

## Deep Explanation

### What are orbital nodes?

Every planet orbits the Sun in a plane that is slightly tilted relative to the ecliptic. The **inclination** measures this tilt (e.g., Mercury ~7 degrees, Mars ~1.85 degrees, Pluto ~17 degrees). The line where the planet's orbital plane intersects the ecliptic plane is called the **line of nodes**. The two endpoints of this line (projected onto the ecliptic) are the ascending and descending nodes.

The ascending node is conventionally denoted by the symbol &#9738; and the descending node by &#9739;. The **longitude of the ascending node** (often written as capital omega) is one of the six classical Keplerian orbital elements.

### Mean vs osculating elements

This is one of the most important distinctions in orbital mechanics:

- **Mean elements** are averaged values that describe the smoothly varying, long-term behavior of an orbit. They filter out short-period perturbations from other planets. The mean node of the Moon, for example, regresses steadily at about 19.3 degrees per year with no wobbles.

- **Osculating elements** describe the instantaneous orbit -- the ellipse that the body would follow if all perturbations were suddenly turned off at that moment. They capture the real-time wobbles caused by gravitational tugs from other bodies.

For the Moon, the osculating node can differ from the mean node by up to about 1.5 degrees due to solar perturbations. For astrology, the mean node is more commonly used in Western traditions because it produces smoother transits. Vedic astrology, however, traditionally uses the true (osculating) node.

### The method parameter

| Constant | Value | Description |
|----------|-------|-------------|
| `SE_NODBIT_MEAN` | 1 | Mean elements. Smooth, averaged motion. Only available for Moon and planets with defined mean element models. |
| `SE_NODBIT_OSCU` | 2 | Osculating (heliocentric) elements. Instantaneous orbit at the given moment. Available for all bodies. |
| `SE_NODBIT_OSCU_BAR` | 4 | Osculating elements relative to the solar system barycenter instead of the Sun. More physically meaningful for precise work. |
| `SE_NODBIT_FOPOINT` | 256 | Instead of returning the aphelion position, returns the **second focal point** of the orbital ellipse. Can be combined with `SE_NODBIT_OSCU` or `SE_NODBIT_OSCU_BAR` using bitwise OR. |

Methods can be combined: `SE_NODBIT_OSCU | SE_NODBIT_FOPOINT` gives the osculating second focal point.

### The return object

The `nodesApsides()` method returns four `PlanetPosition` objects:

| Field | Description |
|-------|-------------|
| `ascendingNode` | Position of the ascending node (longitude, latitude, distance, speeds) |
| `descendingNode` | Position of the descending node |
| `perihelion` | Position of the point of closest approach to the Sun (or Earth for Moon) |
| `aphelion` | Position of the point of greatest distance (or the second focal point if `SE_NODBIT_FOPOINT` is set) |

Each position includes:
- `longitude`: ecliptic longitude in degrees (0-360)
- `latitude`: ecliptic latitude in degrees (usually near 0 for nodes, can be nonzero for apsides)
- `distance`: heliocentric distance in AU at that orbital point
- `longitudeSpeed`, `latitudeSpeed`, `distanceSpeed`: daily rates of change

### The 18.6-year nodal cycle of the Moon

The Moon's nodes regress (move backward through the zodiac) with a period of about 18.6 years (6,798.4 days). This cycle is fundamental to eclipse prediction: eclipses can only occur when the Sun is near one of the Moon's nodes. Because the nodes regress, eclipse "seasons" shift earlier each year by about 19 days.

The 18.6-year cycle also causes the **nutation** of Earth's axis -- a small wobble of ~9 arc-seconds superimposed on the 26,000-year precession cycle. This is why nutation and lunar nodes are so closely connected in the Swiss Ephemeris internals.

### Perihelion precession

The apsidal line (the line connecting perihelion and aphelion) slowly rotates forward through the zodiac. For Mercury, this precession is about 574 arc-seconds per century -- and it was the famous anomalous 43 arc-seconds per century of Mercury's perihelion precession that provided one of the first confirmations of Einstein's general relativity.

For the Moon, the apsidal line (perigee/apogee) advances at about 40.7 degrees per year, completing a full cycle in about 8.85 years.

### Black Moon Lilith in detail

"Black Moon Lilith" in astrology refers to the lunar apogee, but there are several variants:

| Variant | Source | Description |
|---------|--------|-------------|
| **Mean Lilith** | `SE_MEAN_APOG` (12) via `calc()`, or `nodesApsides()` with `SE_NODBIT_MEAN` | Smooth mean apogee. Moves steadily at ~40.7 deg/year. Most commonly used in astrology. |
| **Osculating Lilith** | `SE_OSCU_APOG` (13) via `calc()`, or `nodesApsides()` with `SE_NODBIT_OSCU` | True instantaneous apogee. Wobbles significantly -- can differ from mean by 30 degrees or more. |
| **Interpolated Lilith** | Some Swiss Ephemeris versions | An interpolation that smooths out extreme wobbles of the osculating Lilith. |
| **Second focal point** | `nodesApsides()` with `SE_NODBIT_OSCU | SE_NODBIT_FOPOINT` | The empty focus of the Moon's orbital ellipse. Very close to osculating Lilith for nearly circular orbits, but differs for eccentric orbits. |

The `calc()` method with `SE_MEAN_APOG` or `SE_OSCU_APOG` is typically the simplest way to get Lilith's position. The `nodesApsides()` method gives you additional control over the calculation method.

### Practical considerations

- **For astrology**: Mean nodes are standard in most traditions. Use `SE_NODBIT_MEAN` for charts.
- **For astronomy**: Osculating elements are physically meaningful. Use `SE_NODBIT_OSCU` or `SE_NODBIT_OSCU_BAR`.
- **For eclipses**: The true (osculating) node determines the actual geometry, but the mean node gives a better sense of the long-term pattern.
- **SE_NODBIT_MEAN** is only available for the Moon and planets. For asteroids and other minor bodies, you must use `SE_NODBIT_OSCU`.
- Nodal and apsidal positions are given in ecliptic coordinates. The `distance` field for a node represents the heliocentric distance of the planet when it crosses the ecliptic, which is useful for understanding the orbital geometry.
