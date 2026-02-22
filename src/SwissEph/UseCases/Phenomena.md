# Planetary Phenomena

Planetary phenomena are the observable characteristics of a planet as seen from Earth at a given moment. When you look at a planet in the night sky, you might wonder: How bright is it? How far from the Sun does it appear? How much of its surface is illuminated? The `phenomena()` method answers all these questions at once, returning five key measurements:

- **Phase angle**: the angle Sun-Planet-Earth, which determines how much of the planet's illuminated side faces us
- **Phase (illuminated fraction)**: a number from 0.0 to 1.0 representing what proportion of the visible disk is lit
- **Elongation**: the angular separation between the planet and the Sun as seen from Earth
- **Apparent diameter**: how large the planet appears, measured in arcseconds
- **Apparent magnitude**: how bright the planet appears on the astronomical magnitude scale

These quantities are useful for observation planning (can I see this planet tonight?), astrophotography, and understanding the geometric relationship between the Sun, a planet, and the Earth.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_VENUS } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 3, 15, 20); // 2025 Mar 15, 20:00 UT

const p = swe.phenomena(jd, SE_VENUS);

console.log(`Phase angle:         ${p.phaseAngle.toFixed(2)} deg`);
console.log(`Phase (illuminated): ${(p.phase * 100).toFixed(1)}%`);
console.log(`Elongation from Sun: ${p.elongation.toFixed(2)} deg`);
console.log(`Apparent diameter:   ${p.apparentDiameter.toFixed(2)} arcsec`);
console.log(`Apparent magnitude:  ${p.apparentMagnitude.toFixed(2)}`);

swe.close();
```

---

## Detailed Examples

### Phenomena for all visible planets

```typescript
import { SwissEph } from '../index';
import {
  SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 6, 1, 0);

const planets = [
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('Planet     Elong   Phase%   Mag    Diam"');
console.log('---------- ------  ------  -----  -----');

for (const pl of planets) {
  const p = swe.phenomena(jd, pl.id);
  console.log(
    `${pl.name.padEnd(10)} ` +
    `${p.elongation.toFixed(1).padStart(5)}°  ` +
    `${(p.phase * 100).toFixed(1).padStart(5)}%  ` +
    `${p.apparentMagnitude.toFixed(1).padStart(5)}  ` +
    `${p.apparentDiameter.toFixed(2).padStart(5)}`
  );
}

swe.close();
```

### Checking if a planet is visible

A planet is generally visible to the naked eye when:
1. Its elongation from the Sun is greater than about 15 degrees (so the sky is dark enough where it appears)
2. Its apparent magnitude is less than about 6.0 (the naked-eye limit)

```typescript
import { SwissEph } from '../index';
import {
  SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 4, 10, 20);

const planets = [
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

for (const pl of planets) {
  const p = swe.phenomena(jd, pl.id);

  const farEnoughFromSun = p.elongation > 15;
  const brightEnough = p.apparentMagnitude < 6.0;
  const visible = farEnoughFromSun && brightEnough;

  console.log(
    `${pl.name.padEnd(10)} elong=${p.elongation.toFixed(1).padStart(5)}° ` +
    `mag=${p.apparentMagnitude.toFixed(1).padStart(5)} ` +
    `→ ${visible ? 'VISIBLE' : 'not visible'}`
  );
}

swe.close();
```

Note: This is a simplified check. True visibility also depends on whether the planet is above the horizon at your location and the time of night. For a complete analysis, combine with `swe.riseSet()` and `swe.azalt()`.

### Tracking Venus phases over a synodic cycle

Venus goes through phases like the Moon. As an inferior planet (orbiting closer to the Sun than Earth), Venus shows a full range of phases depending on its position relative to the Sun and Earth.

```typescript
import { SwissEph } from '../index';
import { SE_VENUS } from '../../constants';

const swe = new SwissEph();

// Track Venus phenomena monthly over ~19 months (Venus synodic period ≈ 584 days)
const startJd = SwissEph.julianDay(2025, 1, 1, 0);

console.log('Date        Phase%   Elong   PhaseAngle   Mag    Diam"');

for (let month = 0; month < 20; month++) {
  const jd = startJd + month * 30.44; // ~1 month intervals
  const p = swe.phenomena(jd, SE_VENUS);
  const d = SwissEph.fromJulianDay(jd);

  console.log(
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')}  ` +
    `${(p.phase * 100).toFixed(1).padStart(5)}%  ` +
    `${p.elongation.toFixed(1).padStart(5)}°  ` +
    `${p.phaseAngle.toFixed(1).padStart(9)}°  ` +
    `${p.apparentMagnitude.toFixed(1).padStart(5)}  ` +
    `${p.apparentDiameter.toFixed(1).padStart(5)}`
  );
}

swe.close();
```

When Venus is on the far side of the Sun (superior conjunction), it appears nearly full but small and faint. When it is closest to Earth (inferior conjunction), it appears as a thin crescent but very large and actually at its brightest just before/after, when the combination of size and illumination peaks.

### Moon phase as illuminated fraction

The `phenomena()` method works for the Moon too, giving you the illuminated fraction directly.

```typescript
import { SwissEph } from '../index';
import { SE_MOON } from '../../constants';

const swe = new SwissEph();

// Check Moon phase nightly for a month
const startJd = SwissEph.julianDay(2025, 3, 1, 0);

for (let day = 0; day < 30; day++) {
  const jd = startJd + day;
  const p = swe.phenomena(jd, SE_MOON);
  const d = SwissEph.fromJulianDay(jd);

  // Simple phase name based on illuminated fraction and phase angle
  const pct = p.phase * 100;
  let phaseName: string;
  if (pct < 2) phaseName = 'New Moon';
  else if (pct < 40) phaseName = p.elongation < 180 ? 'Waxing Crescent' : 'Waning Crescent';
  else if (pct < 60) phaseName = p.elongation < 180 ? 'First Quarter' : 'Last Quarter';
  else if (pct < 98) phaseName = p.elongation < 180 ? 'Waxing Gibbous' : 'Waning Gibbous';
  else phaseName = 'Full Moon';

  const bar = '#'.repeat(Math.round(pct / 5)).padEnd(20);
  console.log(
    `Mar ${String(day + 1).padStart(2)}  ${pct.toFixed(1).padStart(5)}%  [${bar}]  ${phaseName}`
  );
}

swe.close();
```

---

## Deep Explanation

### Phase Angle

The phase angle is the angle formed at the planet between the directions to the Sun and to the Earth. Imagine standing on the planet's surface: the phase angle is the angle between the Sun and Earth in your sky.

```
        Sun
       /
      / phase angle
Planet ---------- Earth
```

- **0 degrees**: The Sun is directly behind Earth (from the planet's perspective). This is **opposition** for superior planets -- the planet's fully lit face points toward Earth. For the Moon, this is a Full Moon.
- **90 degrees**: Half the visible disk is illuminated (like a quarter Moon, or Mercury/Venus at greatest elongation).
- **180 degrees**: The planet is between Earth and the Sun (**conjunction**). The lit side faces away from Earth. For the Moon, this is a New Moon.

### Phase (Illuminated Fraction)

The phase is a value from 0.0 to 1.0 representing the fraction of the planet's visible disk that is illuminated by the Sun. It is related to the phase angle by:

```
phase = (1 + cos(phaseAngle)) / 2
```

- 1.0 = fully illuminated (opposition/full)
- 0.5 = half illuminated (quarter)
- 0.0 = unilluminated (conjunction/new)

For the Moon, this is the familiar "percent illumination" often shown in weather apps and calendars.

### Elongation

Elongation is the angular distance between the planet and the Sun as seen from Earth. It determines whether and when you can observe the planet:

- **0 degrees**: conjunction -- the planet is in the same direction as the Sun and invisible in the glare
- **~15 degrees**: the minimum elongation for a planet to be glimpsed in twilight
- **90 degrees**: quadrature -- the planet is a quarter of the sky away from the Sun
- **180 degrees**: opposition -- the planet is opposite the Sun, rising at sunset and visible all night

For **inferior planets** (Mercury and Venus, which orbit closer to the Sun than Earth), elongation has a maximum value:
- Mercury: ~18-28 degrees (varies due to orbital eccentricity)
- Venus: ~45-47 degrees

This is why Mercury and Venus are always seen near the Sun, as "morning stars" or "evening stars." They can never appear at opposition.

For **superior planets** (Mars through Pluto), elongation can range from 0 to 180 degrees.

### Apparent Diameter

The apparent diameter is how large the planet appears in the sky, measured in **arcseconds** (1/3600 of a degree). For reference:
- The Sun and Moon are each about 1800 arcseconds (30 arcminutes, or half a degree)
- Jupiter at opposition: ~45 arcseconds
- Saturn (disk only): ~18 arcseconds
- Mars at opposition: ~14-25 arcseconds (varies greatly)
- Venus at closest approach: ~60 arcseconds (larger than Jupiter!)

The apparent diameter changes as the planet's distance from Earth changes. It is inversely proportional to distance.

### Apparent Magnitude

The **magnitude scale** is the astronomer's measure of brightness. It was invented by the ancient Greek astronomer **Hipparchus** (~150 BC), who classified stars into six groups: the brightest stars were "first magnitude" and the faintest visible stars were "sixth magnitude."

The modern scale is logarithmic and extends in both directions:
- **Lower numbers = brighter**. Negative magnitudes are very bright.
- Each step of 1 magnitude corresponds to a brightness factor of about 2.512
- A difference of 5 magnitudes = exactly 100x brightness difference

Typical planet magnitudes:
| Object | Typical Magnitude |
|--------|------------------|
| Sun | -26.7 |
| Full Moon | -12.7 |
| Venus (brightest) | -4.6 |
| Jupiter (opposition) | -2.5 |
| Mars (opposition) | -2.0 to -2.9 |
| Saturn | +0.5 to +1.5 |
| Mercury | -0.5 to +3 |
| Uranus | +5.7 |
| Neptune | +7.8 (invisible to naked eye) |
| Naked eye limit | ~+6.0 |

### Geometry of Opposition and Conjunction

For a **superior planet** (orbiting farther from the Sun than Earth):

```
          Sun
           |
     Earth-+--------Planet    ← Opposition (phase angle ≈ 0°, elongation = 180°)
```

At opposition, the planet is closest to Earth, appears brightest, shows its full disk, and is visible all night. This is the best time to observe it.

```
          Sun
           |
    Planet-+-Earth             ← Conjunction (phase angle ≈ 180°, elongation ≈ 0°)
```

At conjunction, the planet is behind the Sun and invisible.

For an **inferior planet** (Mercury or Venus):

```
          Sun
           |
     Earth-+    Venus          ← Greatest Eastern Elongation (evening star)
                                  seen after sunset in the west
```

```
          Sun
           |
   Venus   +-Earth             ← Greatest Western Elongation (morning star)
                                  seen before sunrise in the east
```

### Return Type

```typescript
interface PhenoResult {
  phaseAngle: number;        // degrees, 0-180
  phase: number;             // illuminated fraction, 0.0-1.0
  elongation: number;        // degrees from Sun, 0-180
  apparentDiameter: number;  // arcseconds
  apparentMagnitude: number; // magnitude (lower = brighter)
}
```

### Applicable Bodies

The `phenomena()` method works for all planets (Mercury through Pluto), the Moon, asteroids, and fixed stars. For the Sun itself, most values are not meaningful (the Sun's elongation from itself is always 0).

### Flags

The optional `flags` parameter controls the calculation method. Normally you can omit it and accept the defaults. Possible flags include sidereal mode flags, but for phenomena calculations the default tropical geocentric computation is standard.
