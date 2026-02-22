# Planetocentric Positions

**Planetocentric coordinates** give you the position of a celestial body as seen from a planet other than Earth. Normal astronomical calculations are **geocentric** -- they describe positions as seen from Earth's center. But what if you wanted to know where Jupiter appears in the sky as seen from Mars? Or where Earth is positioned from the perspective of Venus?

The `calcPlanetocentric()` method lets you place your virtual observer on any planet and look at the sky from there.

This is useful for:
- **Space mission planning**: understanding what the sky looks like from another planet's reference frame
- **Comparative planetology**: how do planetary configurations (conjunctions, oppositions, etc.) look from other vantage points?
- **Science fiction worldbuilding**: if you are writing a story set on Mars, what constellations and planetary motions would your characters observe?
- **Educational purposes**: illustrating that geocentric positions are not absolute -- they depend on where you are standing
- **Verification**: geocentric positions of a planet should closely match planetocentric positions computed "from Earth" -- this serves as a sanity check

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_JUPITER } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 6, 15, 12);

// Where does Jupiter appear as seen from Mars?
const jupFromMars = swe.calcPlanetocentric(jd, SE_JUPITER, SE_MARS);

console.log(`Jupiter as seen from Mars:`);
console.log(`  Longitude: ${jupFromMars.longitude.toFixed(4)} deg`);
console.log(`  Latitude:  ${jupFromMars.latitude.toFixed(4)} deg`);
console.log(`  Distance:  ${jupFromMars.distance.toFixed(6)} AU`);

swe.close();
```

---

## Detailed Examples

### Earth as seen from Mars

What would a Martian astronomer observe when looking at Earth? Earth would appear as a bright inner planet (similar to how we see Venus), going through phases and never straying far from the Sun.

```typescript
import { SwissEph } from '../index';
import { SE_EARTH, SE_MARS } from '../../constants';

const swe = new SwissEph();

// Track Earth's position as seen from Mars over one Martian year (~687 days)
const startJd = SwissEph.julianDay(2025, 1, 1, 0);

const signs = ['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];

console.log('Earth as seen from Mars (monthly snapshots):');
for (let i = 0; i < 24; i++) {
  const jd = startJd + i * 30;
  const earth = swe.calcPlanetocentric(jd, SE_EARTH, SE_MARS);
  const date = SwissEph.fromJulianDay(jd);

  const signIdx = Math.floor(earth.longitude / 30);
  const degInSign = earth.longitude - signIdx * 30;

  console.log(
    `  ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}  ` +
    `${degInSign.toFixed(1).padStart(5)} ${signs[signIdx]}  ` +
    `dist=${earth.distance.toFixed(4)} AU  ` +
    `speed=${earth.longitudeSpeed.toFixed(4)} deg/day`
  );
}

swe.close();
```

### Verifying: Mars from Earth vs geocentric Mars

Geocentric positions are simply planetocentric positions "from Earth." Calculating Mars from Earth using `calcPlanetocentric()` should produce results nearly identical to a regular `calc()` call.

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_EARTH } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 6, 15, 12);

// Standard geocentric calculation
const marsGeo = swe.calc(jd, SE_MARS);

// Planetocentric: Mars as seen from Earth
const marsPctr = swe.calcPlanetocentric(jd, SE_MARS, SE_EARTH);

console.log('Mars positions comparison:');
console.log(`  Geocentric longitude:      ${marsGeo.longitude.toFixed(6)} deg`);
console.log(`  Planetocentric (Earth):    ${marsPctr.longitude.toFixed(6)} deg`);
console.log(`  Difference:                ${Math.abs(marsGeo.longitude - marsPctr.longitude).toFixed(6)} deg`);
// The difference should be very small (< 0.01 deg)

console.log(`\n  Geocentric distance:       ${marsGeo.distance.toFixed(6)} AU`);
console.log(`  Planetocentric distance:   ${marsPctr.distance.toFixed(6)} AU`);

swe.close();
```

### The Sun as seen from different planets

How does the Sun's apparent position differ when viewed from different planets?

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 3, 20, 12); // near vernal equinox

const observers = [
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('The Sun as seen from each planet:');
for (const obs of observers) {
  const sun = swe.calcPlanetocentric(jd, SE_SUN, obs.id);
  console.log(
    `  From ${obs.name.padEnd(8)}:  ` +
    `lon=${sun.longitude.toFixed(2).padStart(7)} deg  ` +
    `dist=${sun.distance.toFixed(4)} AU`
  );
}

// For reference: the Sun from Earth (geocentric)
const sunGeo = swe.calc(jd, SE_SUN);
console.log(
  `  From Earth   :  ` +
  `lon=${sunGeo.longitude.toFixed(2).padStart(7)} deg  ` +
  `dist=${sunGeo.distance.toFixed(4)} AU`
);

swe.close();
```

### Retrograde motion from a different planet

On Earth, Mars appears retrograde for about 2 months every ~26 months. What does Jupiter's motion look like from Mars?

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER, SE_MARS } from '../../constants';

const swe = new SwissEph();

// Check Jupiter's speed as seen from Mars over two years
const startJd = SwissEph.julianDay(2025, 1, 1, 0);

console.log('Jupiter longitude speed as seen from Mars:');
for (let i = 0; i < 24; i++) {
  const jd = startJd + i * 30;
  const jup = swe.calcPlanetocentric(jd, SE_JUPITER, SE_MARS);
  const date = SwissEph.fromJulianDay(jd);
  const direction = jup.longitudeSpeed < 0 ? 'RETRO' : 'direct';
  console.log(
    `  ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}  ` +
    `speed=${jup.longitudeSpeed.toFixed(4).padStart(8)} deg/day  ${direction}`
  );
}

swe.close();
```

### Multiple bodies from Jupiter

View the inner solar system from Jupiter's perspective -- all the inner planets and the Sun.

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MERCURY, SE_VENUS, SE_EARTH, SE_MARS,
  SE_SATURN, SE_JUPITER,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 7, 4, 12);

const targets = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_EARTH,   name: 'Earth' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('Sky from Jupiter on 2025-Jul-04:');
for (const t of targets) {
  const pos = swe.calcPlanetocentric(jd, t.id, SE_JUPITER);
  console.log(
    `  ${t.name.padEnd(8)}  ` +
    `lon=${pos.longitude.toFixed(2).padStart(7)}  ` +
    `lat=${pos.latitude.toFixed(2).padStart(6)}  ` +
    `dist=${pos.distance.toFixed(3).padStart(7)} AU`
  );
}

swe.close();
```

---

## Deep Explanation

### What "planetocentric" means

In standard (geocentric) astronomy, all positions are computed relative to the center of the Earth. The Earth is the implied observer. **Planetocentric** means the observer is at the center of a different planet. The computation is conceptually the same -- it is a coordinate transformation that shifts the origin from Earth to the specified planet.

Mathematically, if you know the heliocentric position of both the target body and the observer body, the planetocentric position is:

```
target_from_observer = target_heliocentric - observer_heliocentric
```

The Swiss Ephemeris then applies the same corrections it normally does (light-time, aberration, etc.) but relative to the new observer position.

### Why results differ from geocentric

When you compute Mars from Earth (geocentric) and Mars from Jupiter (Jupitocentric), you get very different results because:

1. **Different vantage point**: You are looking at Mars from a completely different position in space. The ecliptic longitude of Mars depends on the angle between the observer and Mars, which changes dramatically depending on where the observer is.

2. **Different distance**: The distance to Mars is different from Earth vs from Jupiter, which affects light-time correction and apparent position.

3. **Different retrograde patterns**: Retrograde motion is an apparent effect caused by the observer's own orbital motion. Since different planets move at different speeds and in different sized orbits, the retrograde patterns of other planets look completely different from each vantage point.

### The center parameter

The `center` parameter specifies which planet the observer is on. Use the standard planet constants:

| Constant | Value | Observer is on |
|----------|-------|---------------|
| `SE_MERCURY` | 2 | Mercury |
| `SE_VENUS` | 3 | Venus |
| `SE_EARTH` | 14 | Earth (equivalent to geocentric `calc()`) |
| `SE_MARS` | 4 | Mars |
| `SE_JUPITER` | 5 | Jupiter |
| `SE_SATURN` | 6 | Saturn |
| `SE_URANUS` | 7 | Uranus |
| `SE_NEPTUNE` | 8 | Neptune |
| `SE_PLUTO` | 9 | Pluto |

You cannot use the Sun as the center (use `SEFLG_HELCTR` in `calc()` for heliocentric positions). You also cannot use the Moon as the center because it is a satellite of Earth, not an independent heliocentric body in this context.

### Relationship to geocentric and heliocentric

The three main reference frames in positional astronomy are:

- **Heliocentric**: positions relative to the Sun's center. Pure orbital mechanics. No observer effects. Get this with `calc(jd, planet, SEFLG_HELCTR)`.
- **Geocentric**: positions relative to Earth's center. This is the standard for Earth-based astronomy and astrology. Get this with `calc(jd, planet)`.
- **Planetocentric**: positions relative to another planet's center. Get this with `calcPlanetocentric(jd, planet, center)`.

Geocentric is simply the special case of planetocentric where the center is Earth (`SE_EARTH`).

### Limitations

- Not all flag combinations may work with `calcPlanetocentric()`. The basic ecliptic coordinates are always available. Equatorial coordinates (`SEFLG_EQUATORIAL`) should work. Sidereal mode (`SEFLG_SIDEREAL`) works but uses Earth's precession/ayanamsa, not the other planet's.
- You cannot compute the position of a planet as seen from itself (e.g., `calcPlanetocentric(jd, SE_MARS, SE_MARS)` is meaningless and will produce zero or an error).
- The calculation does not account for the **topography** of the other planet -- it places the observer at the planet's center, not on its surface. There is no "topocentric from Mars" capability.

### Practical uses

**Space missions**: When a spacecraft is orbiting or approaching Mars, mission planners need to know where other bodies appear in the Martian sky. While actual mission planning uses more sophisticated tools, planetocentric calculations provide a useful first approximation.

**Astrology from other planets**: Some astrologers have experimented with computing charts for other planets -- for example, a "Martian natal chart" for a Mars rover landing. Planetocentric positions would be the basis for such a chart.

**Understanding parallax**: Comparing geocentric and planetocentric positions for the same target illustrates the concept of parallax on a solar-system scale. The Sun is at nearly the same ecliptic longitude from all planets, but the direction shifts by 180 degrees for the inner planets (because you are looking "back" toward the Sun from the other side).
