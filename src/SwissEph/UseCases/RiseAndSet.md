# Rise and Set

**Rise** and **set** refer to the moments when a celestial body appears above or disappears below the horizon. Sunrise and sunset are the most familiar examples, but the Moon, planets, and stars all rise and set as well due to the Earth's rotation.

Knowing when objects rise and set is fundamental to observational astronomy (you can only observe objects when they are above the horizon) and is one of the oldest astronomical calculations. It also has practical applications in daily life, agriculture, religious observances (many traditions define prayer times or holidays based on sunset/sunrise), photography (golden hour), and navigation.

The Swiss Ephemeris computes rise and set times accounting for atmospheric refraction, the apparent size of the object's disc, and the observer's geographic position. It can also compute twilight times (civil, nautical, and astronomical), which are defined by the Sun reaching specific angles below the horizon.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

// Sunrise and sunset in New York on June 21, 2024
const jd = SwissEph.julianDay(2024, 6, 21, 0); // midnight UT
const nyc = { longitude: -74.006, latitude: 40.713 };

const sunrise = swe.rise(jd, SE_SUN, nyc);
const sunset = swe.set(jd, SE_SUN, nyc);

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

console.log(`Sunrise: ${fmt(sunrise.jd)}`);
console.log(`Sunset:  ${fmt(sunset.jd)}`);

swe.close();
```

---

## Detailed Examples

### Sunrise and sunset with local time conversion

The result is in UT (Universal Time). To display local time, add the timezone offset.

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

// London, January 15, 2024
const jd = SwissEph.julianDay(2024, 1, 15, 0);
const london = { longitude: -0.128, latitude: 51.507 };

const sunrise = swe.rise(jd, SE_SUN, london);
const sunset = swe.set(jd, SE_SUN, london);

const fmtLocal = (jd: number, tzOffsetHours: number) => {
  const d = SwissEph.fromJulianDay(jd);
  let hours = d.hour + tzOffsetHours;
  if (hours < 0) hours += 24;
  if (hours >= 24) hours -= 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// London is UTC+0 in winter (GMT)
console.log(`Sunrise: ${fmtLocal(sunrise.jd, 0)} GMT`);
console.log(`Sunset:  ${fmtLocal(sunset.jd, 0)} GMT`);

swe.close();
```

### Moonrise and moonset

The Moon rises and sets just like the Sun, but its times shift by roughly 50 minutes per day because the Moon orbits the Earth.

```typescript
import { SwissEph } from '../index';
import { SE_MOON } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 0);
const paris = { longitude: 2.352, latitude: 48.857 };

const moonrise = swe.rise(jd, SE_MOON, paris);
const moonset = swe.set(jd, SE_MOON, paris);

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

console.log(`Moonrise: ${fmt(moonrise.jd)}`);
console.log(`Moonset:  ${fmt(moonset.jd)}`);

swe.close();
```

### Planet rise and set

```typescript
import { SwissEph } from '../index';
import { SE_VENUS, SE_JUPITER, SE_MARS } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 4, 15, 0);
const sydney = { longitude: 151.209, latitude: -33.868 };

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

const planets = [
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
];

for (const p of planets) {
  const rise = swe.rise(jd, p.id, sydney);
  const set = swe.set(jd, p.id, sydney);
  console.log(`${p.name.padEnd(8)} rise: ${fmt(rise.jd)}  set: ${fmt(set.jd)}`);
}

swe.close();
```

### Twilight times

Twilight is the period when the Sun is below the horizon but its light still illuminates the atmosphere. There are three standard definitions:

- **Civil twilight**: Sun is 0 to 6 degrees below the horizon. Enough light to see outdoors without artificial lighting.
- **Nautical twilight**: Sun is 6 to 12 degrees below. The horizon is still visible at sea.
- **Astronomical twilight**: Sun is 12 to 18 degrees below. The sky is dark enough for most astronomical observations.

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN,
  SE_BIT_CIVIL_TWILIGHT, SE_BIT_NAUTIC_TWILIGHT, SE_BIT_ASTRO_TWILIGHT,
} from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 0);
const berlin = { longitude: 13.405, latitude: 52.520 };

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

// Morning twilight (when twilight begins = Sun rises past the threshold going up)
const astroBegin  = swe.rise(jd, SE_SUN, berlin, { flags: SE_BIT_ASTRO_TWILIGHT });
const nauticBegin = swe.rise(jd, SE_SUN, berlin, { flags: SE_BIT_NAUTIC_TWILIGHT });
const civilBegin  = swe.rise(jd, SE_SUN, berlin, { flags: SE_BIT_CIVIL_TWILIGHT });
const sunrise     = swe.rise(jd, SE_SUN, berlin);

// Evening twilight (when Sun sets past the threshold going down)
const sunset     = swe.set(jd, SE_SUN, berlin);
const civilEnd   = swe.set(jd, SE_SUN, berlin, { flags: SE_BIT_CIVIL_TWILIGHT });
const nauticEnd  = swe.set(jd, SE_SUN, berlin, { flags: SE_BIT_NAUTIC_TWILIGHT });
const astroEnd   = swe.set(jd, SE_SUN, berlin, { flags: SE_BIT_ASTRO_TWILIGHT });

console.log(`Berlin, June 21, 2024:`);
console.log(`  Astro twilight begins:  ${fmt(astroBegin.jd)}`);
console.log(`  Nautic twilight begins: ${fmt(nauticBegin.jd)}`);
console.log(`  Civil twilight begins:  ${fmt(civilBegin.jd)}`);
console.log(`  Sunrise:                ${fmt(sunrise.jd)}`);
console.log(`  Sunset:                 ${fmt(sunset.jd)}`);
console.log(`  Civil twilight ends:    ${fmt(civilEnd.jd)}`);
console.log(`  Nautic twilight ends:   ${fmt(nauticEnd.jd)}`);
console.log(`  Astro twilight ends:    ${fmt(astroEnd.jd)}`);

swe.close();
```

### Disc center and no refraction

By default, rise/set is calculated for when the **upper limb** (top edge) of the object's disc crosses the horizon, with atmospheric refraction applied. You can change this behavior.

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN,
  SE_BIT_DISC_CENTER, SE_BIT_NO_REFRACTION,
} from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 3, 20, 0);
const geo = { longitude: 0, latitude: 51.5 };

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  const s = Math.round(((d.hour - h) * 60 - m) * 60);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`;
};

// Default: upper limb with refraction
const normal = swe.rise(jd, SE_SUN, geo);
console.log(`Normal sunrise (upper limb + refraction): ${fmt(normal.jd)}`);

// Disc center: when the center of the Sun crosses the horizon
const center = swe.rise(jd, SE_SUN, geo, { flags: SE_BIT_DISC_CENTER });
console.log(`Disc center sunrise:                      ${fmt(center.jd)}`);

// No refraction: geometric rise (no atmospheric bending)
const noRefr = swe.rise(jd, SE_SUN, geo, { flags: SE_BIT_NO_REFRACTION });
console.log(`No refraction:                            ${fmt(noRefr.jd)}`);

// Both: disc center without refraction
const both = swe.rise(jd, SE_SUN, geo, {
  flags: SE_BIT_DISC_CENTER | SE_BIT_NO_REFRACTION,
});
console.log(`Disc center, no refraction:               ${fmt(both.jd)}`);

swe.close();
```

### Custom atmospheric conditions

Atmospheric refraction depends on air pressure and temperature. The defaults are standard conditions (1013.25 mbar, 15 degrees Celsius). You can customize these for your location.

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 1, 15, 0);

// High altitude location: La Paz, Bolivia (3,640m elevation)
// Lower pressure and temperature at high altitude
const laPaz = { longitude: -68.15, latitude: -16.50, altitude: 3640 };

const sunriseStandard = swe.rise(jd, SE_SUN, laPaz);
const sunriseCustom = swe.rise(jd, SE_SUN, laPaz, {
  pressure: 650,      // ~650 mbar at 3640m elevation
  temperature: 8,     // typical temperature in Celsius
});

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  const s = Math.round(((d.hour - h) * 60 - m) * 60);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`;
};

console.log(`La Paz sunrise (standard atm): ${fmt(sunriseStandard.jd)}`);
console.log(`La Paz sunrise (custom atm):   ${fmt(sunriseCustom.jd)}`);

swe.close();
```

### Finding the next sunrise from any starting time

The `rise` function finds the *next* rise after the given Julian Day. If you start from noon and the Sun has already risen, it will find the *following* day's sunrise.

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();
const geo = { longitude: -74.006, latitude: 40.713 }; // New York

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')} ${h}:${String(m).padStart(2,'0')} UT`;
};

// Starting from Jan 15 at midnight UT -- finds sunrise on Jan 15
const jd1 = SwissEph.julianDay(2024, 1, 15, 0);
console.log(`From midnight: ${fmt(swe.rise(jd1, SE_SUN, geo).jd)}`);

// Starting from Jan 15 at noon UT -- sunrise already happened, finds Jan 16
const jd2 = SwissEph.julianDay(2024, 1, 15, 12);
console.log(`From noon:     ${fmt(swe.rise(jd2, SE_SUN, geo).jd)}`);

swe.close();
```

### Sunrise and sunset times over a month

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();
const tokyo = { longitude: 139.692, latitude: 35.690 };

console.log('Sunrise/Sunset in Tokyo, June 2024 (UT):');

for (let day = 1; day <= 30; day++) {
  const jd = SwissEph.julianDay(2024, 6, day, 0);
  const rise = swe.rise(jd, SE_SUN, tokyo);
  const set = swe.set(jd, SE_SUN, tokyo);

  const fmtTime = (jd: number) => {
    const d = SwissEph.fromJulianDay(jd);
    const h = Math.floor(d.hour);
    const m = Math.floor((d.hour - h) * 60);
    return `${h}:${String(m).padStart(2,'0')}`;
  };

  // Day length in hours
  const dayLength = (set.jd - rise.jd) * 24;

  console.log(
    `  Jun ${String(day).padStart(2)}:` +
    `  rise ${fmtTime(rise.jd)}` +
    `  set ${fmtTime(set.jd)}` +
    `  (${dayLength.toFixed(1)}h daylight)`
  );
}

swe.close();
```

---

## Deep Explanation

### What "rise" means astronomically

When we say a celestial body "rises," we mean it crosses the observer's **astronomical horizon** -- the geometric plane tangent to Earth's surface at the observer's location. However, the actual moment of rise is affected by several factors:

1. **Atmospheric refraction**: Earth's atmosphere bends light, making objects appear higher than they geometrically are. At the horizon, this bending is approximately 34 arc-minutes (just over half a degree). This means you can see the Sun even when it is geometrically below the horizon.

2. **Semi-diameter**: The standard definition of sunrise/sunset is when the **upper limb** (top edge) of the Sun's disc appears at the horizon, not the center. The Sun's semi-diameter is about 16 arc-minutes.

3. **Combined effect**: The Sun is considered to have "risen" when its center is about 50 arc-minutes (0.833 degrees) below the geometric horizon: 34' of refraction + 16' of semi-diameter.

For the Moon, the semi-diameter varies more (14.5' to 16.7') because the Moon's distance from Earth varies significantly during its orbit.

### Standard altitude for rise/set

The Swiss Ephemeris uses these standard altitudes for rise/set (the altitude of the body's center at the moment of rise/set):

| Body | Standard altitude | Components |
|------|------------------|------------|
| Sun | -0.8333 degrees | -0.5667 deg (refraction) - 0.2666 deg (semi-diameter) |
| Moon | Varies (~-0.56 to -0.83 deg) | Refraction + actual semi-diameter (depends on distance) |
| Stars/planets | -0.5667 degrees | Refraction only (point sources have negligible diameter) |

### Atmospheric refraction

Refraction depends on atmospheric conditions. At standard conditions (1013.25 mbar pressure, 15 degrees C temperature), the refraction at the horizon is about 34 arc-minutes. The Swiss Ephemeris uses Bennett's formula for refraction.

Higher pressure increases refraction (light bends more). Higher temperature decreases it (warmer air is less dense). At high-altitude locations with low pressure, the refraction is notably less.

Setting pressure to 0 is equivalent to using `SE_BIT_NO_REFRACTION`.

### The flag constants

| Constant | Value | Effect |
|----------|-------|--------|
| `SE_BIT_DISC_CENTER` | 256 | Rise/set of the disc center instead of the upper limb. |
| `SE_BIT_DISC_BOTTOM` | 8192 | Rise/set of the lower limb (bottom edge) of the disc. |
| `SE_BIT_NO_REFRACTION` | 512 | Ignore atmospheric refraction (geometric rise/set). |
| `SE_BIT_CIVIL_TWILIGHT` | 1024 | Use -6 degrees altitude instead of standard rise/set. |
| `SE_BIT_NAUTIC_TWILIGHT` | 2048 | Use -12 degrees altitude. |
| `SE_BIT_ASTRO_TWILIGHT` | 4096 | Use -18 degrees altitude. |
| `SE_BIT_FIXED_DISC_SIZE` | 16384 | Use a fixed disc size (ignore actual apparent diameter variation). |
| `SE_BIT_HINDU_RISING` | combined | Disc center + no refraction + no ecliptic latitude. Used in Indian (Hindu) astronomy where "rising" means the geometric disc center at the horizon. |

Flags can be combined with the bitwise OR operator:
```typescript
{ flags: SE_BIT_DISC_CENTER | SE_BIT_NO_REFRACTION }
```

### Twilight definitions

| Twilight type | Sun altitude | Constant | Description |
|---------------|-------------|----------|-------------|
| Civil | -6 degrees | `SE_BIT_CIVIL_TWILIGHT` | Bright enough to work outdoors. Brightest stars visible. |
| Nautical | -12 degrees | `SE_BIT_NAUTIC_TWILIGHT` | Horizon still visible at sea. Many stars visible. |
| Astronomical | -18 degrees | `SE_BIT_ASTRO_TWILIGHT` | Sky fully dark. Faintest objects observable. |

When using a twilight flag with `rise()`, it finds when the Sun rises past that altitude (morning twilight begins). When used with `set()`, it finds when the Sun sets past that altitude (evening twilight ends).

### Dip of the horizon

The Swiss Ephemeris does not automatically account for the **dip of the horizon** caused by the observer's elevation. When you are standing on a hill or in a tall building, you can see slightly further below the geometric horizon. The `altitude` field in the `GeoPosition` affects the parallax calculation and slightly adjusts the rise/set altitude to account for this.

### Edge cases

- **Polar regions**: At very high latitudes, the Sun (or Moon/planets) may not rise or set on certain days. In the Arctic summer, the Sun stays above the horizon all day (midnight Sun). In the Arctic winter, it stays below all day (polar night). If a rise or set event does not occur, the function may throw an error.

- **Circumpolar objects**: Stars that never set (always above the horizon) or never rise (always below) from a given latitude have no rise/set time. The function will throw if asked for a rise/set that cannot occur.

- **Starting time matters**: The function finds the *next* event after the given JD. If you start from noon and the Sun has already risen, `rise()` will return the next day's sunrise. To get today's sunrise, start from the previous midnight.

- **Moon rise/set gaps**: Because the Moon rises about 50 minutes later each day, there can be days when the Moon does not rise at all (it skipped from rising late one day to early the next). This is normal and most common near the Moon's extremes of declination.

### Options parameter

```typescript
interface RiseSetOptions {
  pressure?: number;     // Atmospheric pressure in mbar (default 1013.25)
  temperature?: number;  // Temperature in Celsius (default 15)
  flags?: number;        // Bitwise OR of SE_BIT_* constants (default 0)
}
```

All options are optional. If you only need to change one setting, the others keep their defaults:

```typescript
// Only change the flags, keep default pressure and temperature
swe.rise(jd, SE_SUN, geo, { flags: SE_BIT_DISC_CENTER });

// Only change atmospheric conditions, keep default flags
swe.rise(jd, SE_SUN, geo, { pressure: 900, temperature: 25 });
```
