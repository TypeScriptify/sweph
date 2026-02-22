# Heliacal Events

A **heliacal rising** is the first time a star or planet becomes visible on the eastern horizon just before sunrise, after a period of being hidden in the Sun's glare. A **heliacal setting** is the last time it is visible on the western horizon just after sunset, before it disappears into the Sun's light for weeks or months.

This may sound like a niche concept, but heliacal events were among the most important astronomical observations in the ancient world:

- **Egypt**: The heliacal rising of **Sirius** (called "Sothis" by the Egyptians) coincided with the annual flooding of the Nile and marked the beginning of the Egyptian calendar year. This observation was so important that it anchored their entire calendar system for over 3,000 years.
- **Babylon**: Babylonian astronomers systematically recorded heliacal risings and settings of planets and stars to make omen-based predictions. Their detailed clay tablet records form the oldest continuous astronomical dataset in human history.
- **Islam**: The first sighting of the thin **lunar crescent** after a New Moon determines the start of each month in the Islamic calendar. This is a heliacal event -- the Moon must be far enough from the Sun to be visible in the evening twilight.
- **Greece**: The heliacal rising of the Pleiades cluster marked the beginning of the sailing and farming seasons.

The Swiss Ephemeris implements a sophisticated atmospheric model (based on Bradley Schaefer's work) that accounts for sky brightness, atmospheric extinction, the observer's visual acuity, and local conditions like temperature, pressure, and humidity to predict when a celestial object first becomes visible.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_HELIACAL_RISING } from '../../constants';

const swe = new SwissEph();

// Find when Venus next rises heliacally after January 1, 2025
// (first visible in the morning sky before sunrise)
const jd = SwissEph.julianDay(2025, 1, 1, 0);
const geo = { longitude: -73.98, latitude: 40.75, altitude: 10 }; // New York

const result = swe.heliacalEvent(jd, geo, 'Venus', SE_HELIACAL_RISING);

const date = SwissEph.fromJulianDay(result.startVisible);
console.log(`Venus heliacal rising: ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`);
console.log(`Start visible JD: ${result.startVisible.toFixed(6)}`);
console.log(`Best visible JD:  ${result.bestVisible.toFixed(6)}`);
console.log(`End visible JD:   ${result.endVisible.toFixed(6)}`);

swe.close();
```

---

## Detailed Examples

### Sirius heliacal rising from Cairo (the Egyptian observation)

The ancient Egyptians observed Sirius rising heliacally from the latitude of Memphis/Cairo (about 30 degrees N). In the modern era, due to precession, the date has shifted from mid-July to early August.

```typescript
import { SwissEph } from '../index';
import { SE_HELIACAL_RISING } from '../../constants';

const swe = new SwissEph();

// Cairo, Egypt
const cairo = { longitude: 31.24, latitude: 30.04, altitude: 75 };

// Search for the heliacal rising of Sirius in 2025
const jd = SwissEph.julianDay(2025, 6, 1, 0);
const result = swe.heliacalEvent(jd, cairo, 'Sirius', SE_HELIACAL_RISING);

const date = SwissEph.fromJulianDay(result.startVisible);
console.log(`Sirius heliacal rising from Cairo in ${date.year}:`);
console.log(`  Date: ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`);

// In ancient Egypt (~3000 BC), this occurred around mid-July
// and coincided with the Nile flood. Let's check:
const jdAncient = SwissEph.julianDay(-3000, 5, 1, 0);
const ancient = swe.heliacalEvent(jdAncient, cairo, 'Sirius', SE_HELIACAL_RISING);
const ancientDate = SwissEph.fromJulianDay(ancient.startVisible);
console.log(`\nSirius heliacal rising from Cairo in 3001 BC:`);
console.log(`  Date: ${ancientDate.month}/${ancientDate.day} (Julian calendar)`);

swe.close();
```

### Venus as morning and evening star

Venus alternates between being a "morning star" (visible before sunrise) and an "evening star" (visible after sunset). The heliacal events mark these transitions.

```typescript
import { SwissEph } from '../index';
import {
  SE_HELIACAL_RISING, SE_HELIACAL_SETTING,
  SE_EVENING_FIRST, SE_MORNING_LAST,
} from '../../constants';

const swe = new SwissEph();
const geo = { longitude: -118.24, latitude: 34.05, altitude: 90 }; // Los Angeles

let jd = SwissEph.julianDay(2025, 1, 1, 0);

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
};

// SE_HELIACAL_RISING = SE_MORNING_FIRST: first visible in the morning
const morningFirst = swe.heliacalEvent(jd, geo, 'Venus', SE_HELIACAL_RISING);
console.log(`Venus morning first (heliacal rising): ${fmt(morningFirst.startVisible)}`);

// SE_MORNING_LAST: last visible in the morning before moving behind the Sun
const morningLast = swe.heliacalEvent(jd, geo, 'Venus', SE_MORNING_LAST);
console.log(`Venus morning last:                    ${fmt(morningLast.startVisible)}`);

// SE_EVENING_FIRST: first visible in the evening after superior conjunction
const eveningFirst = swe.heliacalEvent(jd, geo, 'Venus', SE_EVENING_FIRST);
console.log(`Venus evening first:                   ${fmt(eveningFirst.startVisible)}`);

// SE_HELIACAL_SETTING = SE_EVENING_LAST: last visible in the evening
const eveningLast = swe.heliacalEvent(jd, geo, 'Venus', SE_HELIACAL_SETTING);
console.log(`Venus evening last (heliacal setting): ${fmt(eveningLast.startVisible)}`);

swe.close();
```

### Lunar crescent visibility (Islamic calendar)

The Islamic calendar months begin with the first sighting of the thin crescent Moon in the evening sky after a New Moon. This is a heliacal event for the Moon.

```typescript
import { SwissEph } from '../index';
import { SE_EVENING_FIRST } from '../../constants';

const swe = new SwissEph();

// Mecca, Saudi Arabia
const mecca = { longitude: 39.83, latitude: 21.42, altitude: 277 };

// Find the first crescent visibility after each New Moon in 2025
let jd = SwissEph.julianDay(2025, 1, 1, 0);

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
};

console.log('Lunar crescent first visibility from Mecca, 2025:');
for (let i = 0; i < 12; i++) {
  const result = swe.heliacalEvent(jd, mecca, 'Moon', SE_EVENING_FIRST);
  console.log(`  ${fmt(result.startVisible)}`);
  // Advance past this lunation to find the next one
  jd = result.startVisible + 25;
}

swe.close();
```

### Heliacal events for multiple planets

Find when each visible planet next rises heliacally from a given location.

```typescript
import { SwissEph } from '../index';
import { SE_HELIACAL_RISING } from '../../constants';

const swe = new SwissEph();
const geo = { longitude: 12.50, latitude: 41.89, altitude: 20 }; // Rome
const jd = SwissEph.julianDay(2025, 1, 1, 0);

const objects = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
};

console.log('Next heliacal risings from Rome after 2025-01-01:');
for (const obj of objects) {
  const result = swe.heliacalEvent(jd, geo, obj, SE_HELIACAL_RISING);
  console.log(`  ${obj.padEnd(9)} ${fmt(result.startVisible)}`);
}

swe.close();
```

### Customizing atmospheric and observer conditions

The visibility calculation depends on atmospheric conditions and the observer's eyesight. You can customize these parameters.

```typescript
import { SwissEph } from '../index';
import { SE_HELIACAL_RISING } from '../../constants';

const swe = new SwissEph();
const geo = { longitude: -6.26, latitude: 36.70, altitude: 5 }; // Cadiz, Spain

const jd = SwissEph.julianDay(2025, 6, 1, 0);

// Default conditions (average observer, standard atmosphere)
const normal = swe.heliacalEvent(jd, geo, 'Mercury', SE_HELIACAL_RISING);

// Young observer with excellent eyesight, dry atmosphere, high altitude
const optimal = swe.heliacalEvent(jd, geo, 'Mercury', SE_HELIACAL_RISING, {
  pressure: 900,        // lower pressure (high altitude or low pressure system)
  temperature: 25,      // warm (less atmospheric scattering)
  humidity: 20,         // dry air (less extinction)
  extinction: 0.20,     // excellent atmospheric transparency
  observerAge: 20,      // young eyes
  acuity: 1.5,          // above-average visual acuity (Snellen ratio)
});

// Elderly observer, humid and hazy conditions
const difficult = swe.heliacalEvent(jd, geo, 'Mercury', SE_HELIACAL_RISING, {
  pressure: 1020,
  temperature: 10,
  humidity: 80,
  extinction: 0.40,     // poor transparency (haze, pollution)
  observerAge: 65,
  acuity: 0.7,          // below-average eyesight
});

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  return `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
};

console.log(`Mercury heliacal rising from Cadiz:`);
console.log(`  Normal conditions:    ${fmt(normal.startVisible)}`);
console.log(`  Optimal conditions:   ${fmt(optimal.startVisible)}`);
console.log(`  Difficult conditions: ${fmt(difficult.startVisible)}`);
// Better conditions -> the planet becomes visible earlier

swe.close();
```

### Detailed heliacal phenomena

The `heliacalPhenomena()` method returns detailed visibility data: the altitude and azimuth of the object, Sun, and Moon, the elongation, and the arc of vision.

```typescript
import { SwissEph } from '../index';
import { SE_HELIACAL_RISING } from '../../constants';

const swe = new SwissEph();
const geo = { longitude: 31.24, latitude: 30.04, altitude: 75 }; // Cairo

// First find when Sirius rises heliacally
const jd = SwissEph.julianDay(2025, 6, 1, 0);
const event = swe.heliacalEvent(jd, geo, 'Sirius', SE_HELIACAL_RISING);

// Now get the detailed phenomena at that time
const pheno = swe.heliacalPhenomena(event.startVisible, geo, 'Sirius', SE_HELIACAL_RISING);

console.log('Sirius heliacal rising -- detailed phenomena:');
console.log(`  Object altitude:    ${pheno.altObj.toFixed(2)} deg`);
console.log(`  Object azimuth:     ${pheno.azObj.toFixed(2)} deg`);
console.log(`  Sun altitude:       ${pheno.altSun.toFixed(2)} deg`);
console.log(`  Sun azimuth:        ${pheno.azSun.toFixed(2)} deg`);
console.log(`  Elongation:         ${pheno.elong.toFixed(2)} deg`);
console.log(`  Best elongation:    ${pheno.elongBest.toFixed(2)} deg`);
console.log(`  Arc of vision:      ${pheno.eDistArcVis.toFixed(2)} deg`);

swe.close();
```

### Visual limiting magnitude

The `visualLimitMagnitude()` method tells you whether a given object is theoretically visible at a specific time and place, based on the sky brightness and the observer's eye.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const geo = { longitude: -118.24, latitude: 34.05, altitude: 90 }; // Los Angeles

// Check Mercury's visibility at a specific time (during morning twilight)
const jd = SwissEph.julianDay(2025, 3, 15, 5.5); // ~5:30 UT (about 9:30 PM local? -- adjust as needed)

const result = swe.visualLimitMagnitude(jd, geo, 'Mercury');

console.log('Mercury visibility check:');
console.log(`  Limiting magnitude: ${result.limitingMagnitude.toFixed(2)}`);
console.log(`  Object altitude:    ${result.altObject.toFixed(2)} deg`);
console.log(`  Object azimuth:     ${result.azObject.toFixed(2)} deg`);
console.log(`  Sun altitude:       ${result.altSun.toFixed(2)} deg`);
console.log(`  Moon elongation:    ${result.elongMoon.toFixed(2)} deg`);

// If the limiting magnitude is brighter (lower number) than Mercury's actual
// magnitude, then Mercury is visible. Mercury's magnitude ranges from about
// -2.5 to +5.5 depending on its phase.

swe.close();
```

---

## Deep Explanation

### What determines visibility?

A celestial object becomes visible when its light is bright enough to be detected against the background sky. At twilight, the sky is not fully dark -- the Sun, even below the horizon, still illuminates the atmosphere. An object must be bright enough to stand out against this twilight glow. The key factors are:

1. **The object's brightness** (apparent magnitude). Brighter objects (lower magnitude numbers) are easier to see. Venus (mag ~-4) is visible even in fairly bright twilight; Mercury (mag ~0 to +2) requires darker skies.

2. **The Sun's depression below the horizon**. The deeper the Sun is below the horizon, the darker the sky. For most objects, the Sun needs to be at least 6 to 12 degrees below the horizon.

3. **The angular separation between the object and the Sun** (elongation). Objects very close to the Sun are lost in the Sun's glare regardless of sky brightness.

4. **Atmospheric extinction**. The atmosphere absorbs and scatters light. Near the horizon, the light path through the atmosphere is much longer, so objects appear dimmer. Humidity, pollution, and altitude all affect extinction.

5. **The observer's visual acuity**. Human eyes vary in sensitivity. Age, in particular, reduces the eye's ability to detect faint objects.

### The Schaefer atmospheric model

The Swiss Ephemeris uses Bradley Schaefer's model (refined in his 2000 publication) to compute sky brightness and visual limiting magnitude. The model accounts for:

- **Rayleigh scattering**: scattering by air molecules (makes the sky blue)
- **Mie scattering**: scattering by aerosols and dust particles
- **Ozone absorption**: absorption by the ozone layer
- **Airglow**: the atmosphere's own faint luminescence
- **Moon brightness**: when the Moon is above the horizon, it brightens the sky significantly
- **Twilight brightness**: the gradient of sky brightness during twilight

The model takes as input the atmospheric pressure (mbar), temperature (Celsius), relative humidity (%), and an atmospheric extinction coefficient (magnitudes per air mass).

### The visibility arc and arcus visionis

The **arcus visionis** (literally "arc of vision") is the minimum angular distance between the Sun (below the horizon) and a celestial object (above the horizon) that is required for the object to be visible. Different objects have different arcus visionis values based on their brightness.

Historically, Ptolemy and later Arab astronomers compiled tables of arcus visionis values for each planet. Typical values:

| Object | Arcus Visionis (approx) |
|--------|------------------------|
| Venus | 5-6 deg |
| Jupiter | 8-10 deg |
| Mercury | 10-13 deg |
| Saturn | 11-13 deg |
| Mars | 12-15 deg |
| Sirius | 7-8 deg |

The Swiss Ephemeris computes these dynamically based on the actual atmospheric model rather than using fixed lookup tables.

### Event type constants

| Constant | Value | Description |
|----------|-------|-------------|
| `SE_HELIACAL_RISING` | 1 | **Morning first**: the object appears for the first time in the morning sky before sunrise. Same as `SE_MORNING_FIRST`. |
| `SE_HELIACAL_SETTING` | 2 | **Evening last**: the object is seen for the last time in the evening sky after sunset, before disappearing into the Sun's glare. Same as `SE_EVENING_LAST`. |
| `SE_MORNING_FIRST` | 1 | Same as `SE_HELIACAL_RISING`. |
| `SE_EVENING_LAST` | 2 | Same as `SE_HELIACAL_SETTING`. |
| `SE_EVENING_FIRST` | 3 | The object appears for the first time in the **evening** sky. This happens after a planet's superior conjunction with the Sun (when it was behind the Sun). |
| `SE_MORNING_LAST` | 4 | The object is seen for the last time in the **morning** sky, before it approaches the Sun and disappears. |

For inner planets (Mercury and Venus), the full visibility cycle is:
1. **Evening first** (SE_EVENING_FIRST = 3): appears in the evening after superior conjunction
2. **Evening last** (SE_EVENING_LAST = 2): disappears from the evening as it approaches inferior conjunction
3. **Morning first** (SE_MORNING_FIRST = 1): reappears in the morning after inferior conjunction
4. **Morning last** (SE_MORNING_LAST = 4): disappears from the morning as it approaches superior conjunction

For outer planets (Mars through Saturn) and stars, the cycle is simpler:
1. **Evening last** (SE_EVENING_LAST = 2): disappears from the evening as the Sun approaches
2. **Morning first** (SE_MORNING_FIRST = 1): reappears in the morning on the other side of the Sun

### The object parameter

The `object` parameter is a string. For planets, use the planet name: `'Mercury'`, `'Venus'`, `'Mars'`, `'Jupiter'`, `'Saturn'`. For the Moon, use `'Moon'`. For fixed stars, use the star name as it appears in the Swiss Ephemeris star catalog, such as `'Sirius'`, `'Aldebaran'`, `'Spica'`, `'Antares'`, `'Regulus'`, `'Fomalhaut'`, etc.

### The return object

The `heliacalEvent()` method returns three Julian Day numbers:

| Field | Description |
|-------|-------------|
| `startVisible` | The moment when the object first becomes visible (the beginning of the visibility window on that day). |
| `bestVisible` | The moment of best visibility during that twilight (the sky is dark enough and the object is high enough for optimal contrast). |
| `endVisible` | The moment when the object ceases to be visible (either the sky becomes too bright from the approaching sunrise, or the object sets). |

These three times describe a single morning or evening visibility window. For a heliacal rising, `startVisible` is the earliest moment the object can be detected, `bestVisible` is when it is easiest to see, and `endVisible` is when sunrise makes it invisible again.

### The options object

| Option | Default | Description |
|--------|---------|-------------|
| `pressure` | 1013.25 | Atmospheric pressure in millibars. Lower pressure (higher altitude) means less extinction. |
| `temperature` | 15 | Temperature in degrees Celsius. Affects atmospheric density and refraction. |
| `humidity` | 40 | Relative humidity in percent. Higher humidity means more scattering and extinction. |
| `extinction` | 0.25 | Atmospheric extinction coefficient in magnitudes per air mass. 0.20 = excellent transparency (clear mountain air). 0.25 = average. 0.30-0.40 = hazy or polluted. |
| `observerAge` | 36 | Observer's age in years. Older observers have reduced scotopic (night) vision due to changes in the eye's lens and pupil. |
| `acuity` | 1.0 | Snellen visual acuity ratio. 1.0 = normal (20/20). 1.5 = excellent. 0.5 = poor. Affects the ability to detect faint objects. |
| `flags` | 0 | Additional computation flags. |

### Historical significance

**Egypt and the Sothic cycle**: The heliacal rising of Sirius was so central to Egyptian culture that they developed the concept of the **Sothic cycle** -- a period of 1,461 Egyptian civil years (each of 365 days) after which the heliacal rising of Sirius and the start of the civil year coincide again. This happened because the Egyptian civil year lacked a leap day, causing it to drift against the solar year at a rate of one day every four years. The Sothic cycle provides one of the most important tools for dating events in ancient Egyptian history.

**Babylon and the "fixed star" observations**: Babylonian astronomers kept meticulous records of heliacal risings and settings on cuneiform tablets, some dating back to 1600 BC. These records, known as MUL.APIN, cataloged the dates of heliacal risings for dozens of stars and constellations. They were used for agricultural timing, religious festivals, and omens.

**Islam and the crescent Moon**: The Islamic calendar is fundamentally based on heliacal events. Each month begins with the first sighting of the new crescent Moon (hilal) in the evening sky. Because visibility depends on local atmospheric conditions and the observer's location, the start of the month can differ by a day between different regions. Modern computational methods, including the Swiss Ephemeris implementation, are used by many Islamic authorities to predict crescent visibility.

### Practical tips

- **Sirius** is the easiest star to test with because it is the brightest star in the sky (magnitude -1.46). Its heliacal rising is well-documented historically and produces consistent results.
- **Mercury** is the most challenging planet because it never gets far from the Sun and varies greatly in brightness. Its heliacal events are very sensitive to atmospheric conditions.
- For the **lunar crescent**, `SE_EVENING_FIRST` (3) is the relevant event type. The crescent must be at least 7-10 degrees from the Sun and the Moon must be at least a few degrees above the horizon.
- The `heliacalPhenomena()` method is useful for understanding **why** an object is or is not visible at a given time -- it gives you the exact altitudes, azimuths, and elongations.
- Results are sensitive to the observer's geographic position. Even a few degrees of latitude can shift a heliacal date by a day or more.
