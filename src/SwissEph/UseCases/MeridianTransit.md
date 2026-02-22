# Meridian Transit

A **meridian transit** (also called **culmination**) is the moment when a celestial body crosses the observer's **meridian** -- the imaginary north-south line passing through the zenith (the point directly overhead). At this moment, the body reaches its highest point in the sky for that day. This is called the **upper transit** or **upper culmination**.

There is also a **lower transit** (or **lower culmination**), when the body crosses the meridian below the pole -- its lowest point. For most observers, this happens below the horizon and is not visible. But for circumpolar objects (objects that never set), the lower transit is visible and represents the object's closest approach to the horizon.

Meridian transits are important in several contexts:

- **Solar noon**: The Sun's upper transit defines **local apparent noon** -- the moment when the Sun is highest in the sky and shadows point due north (in the Northern Hemisphere) or due south (in the Southern Hemisphere). This is the basis of sundial time.
- **Timekeeping**: Before atomic clocks, astronomical time was determined by observing the meridian transit of stars with a transit telescope.
- **Observation planning**: Objects are best observed near their transit, when they are highest above the horizon and atmospheric effects (seeing, extinction) are minimized.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

// Find solar noon in New York on June 21, 2024
const jd = SwissEph.julianDay(2024, 6, 21, 0);
const nyc = { longitude: -74.006, latitude: 40.713 };

const noon = swe.transit(jd, SE_SUN, nyc);

const date = SwissEph.fromJulianDay(noon.jd);
const h = Math.floor(date.hour);
const m = Math.floor((date.hour - h) * 60);
const s = Math.round(((date.hour - h) * 60 - m) * 60);
console.log(`Solar noon: ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} UT`);
// New York is UTC-4 in summer (EDT), so add -4 to convert to local time

swe.close();
```

---

## Detailed Examples

### Solar noon vs clock noon

Solar noon almost never occurs at exactly 12:00 clock time, even after accounting for time zones. The difference arises from two effects: your position within your time zone, and the equation of time.

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const fmt = (jd: number, tzOffset: number) => {
  const d = SwissEph.fromJulianDay(jd);
  let hours = d.hour + tzOffset;
  if (hours < 0) hours += 24;
  if (hours >= 24) hours -= 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.round(((hours - h) * 60 - m) * 60);
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

// Compare solar noon at different dates in New York (UTC-5 in winter, UTC-4 in summer)
const nyc = { longitude: -74.006, latitude: 40.713 };

const dates = [
  { y: 2024, m: 2, d: 12, tz: -5, label: 'Feb 12 (EST)' }, // equation of time ~ -14 min
  { y: 2024, m: 5, d: 14, tz: -4, label: 'May 14 (EDT)' }, // equation of time ~ +4 min
  { y: 2024, m: 7, d: 26, tz: -4, label: 'Jul 26 (EDT)' }, // equation of time ~ -6 min
  { y: 2024, m: 11, d: 3, tz: -5, label: 'Nov 3 (EST)'  }, // equation of time ~ +16 min
];

console.log('Solar noon in New York at different times of year:');
for (const d of dates) {
  const jd = SwissEph.julianDay(d.y, d.m, d.d, 0);
  const noon = swe.transit(jd, SE_SUN, nyc);
  console.log(`  ${d.label}: ${fmt(noon.jd, d.tz)} local time`);
}
// Solar noon varies by over 30 minutes across the year!

swe.close();
```

### Lower transit (anti-transit)

The lower transit is when the body crosses the meridian at its lowest point. For the Sun, this is approximately midnight (but not exactly, for the same reasons solar noon is not exactly 12:00).

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 0);
const london = { longitude: -0.128, latitude: 51.507 };

const upperTransit = swe.transit(jd, SE_SUN, london);
const lowerTransit = swe.antiTransit(jd, SE_SUN, london);

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

console.log(`Sun upper transit (solar noon):     ${fmt(upperTransit.jd)}`);
console.log(`Sun lower transit (solar midnight): ${fmt(lowerTransit.jd)}`);

swe.close();
```

### Planet meridian transits

```typescript
import { SwissEph } from '../index';
import { SE_JUPITER, SE_SATURN, SE_MARS } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 4, 15, 0);
const geo = { longitude: -118.243, latitude: 34.052 }; // Los Angeles

const fmt = (jd: number) => {
  const d = SwissEph.fromJulianDay(jd);
  const h = Math.floor(d.hour);
  const m = Math.floor((d.hour - h) * 60);
  return `${h}:${String(m).padStart(2,'0')} UT`;
};

const planets = [
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
  { id: SE_MARS,    name: 'Mars' },
];

console.log('Next planet meridian transits from Los Angeles:');
for (const p of planets) {
  const tr = swe.transit(jd, p.id, geo);
  const date = SwissEph.fromJulianDay(tr.jd);
  console.log(`  ${p.name.padEnd(8)} ${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')} ${fmt(tr.jd)}`);
}

swe.close();
```

### Solar noon over a year (tracking the equation of time)

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

// Observer at the center of the UTC+0 timezone (longitude 0)
// Here, the deviation of solar noon from 12:00 UT is purely the equation of time
const greenwich = { longitude: 0, latitude: 51.477 };

console.log('Solar noon at Greenwich, 2024 (deviation from 12:00 UT):');
for (let month = 1; month <= 12; month++) {
  const jd = SwissEph.julianDay(2024, month, 15, 0);
  const noon = swe.transit(jd, SE_SUN, greenwich);

  const d = SwissEph.fromJulianDay(noon.jd);
  const deviationMinutes = (d.hour - 12) * 60;

  const sign = deviationMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(deviationMinutes);
  const dm = Math.floor(abs);
  const ds = Math.round((abs - dm) * 60);

  const monthNames = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  console.log(
    `  ${monthNames[month]} 15: noon at ${Math.floor(d.hour)}:${String(Math.floor((d.hour % 1) * 60)).padStart(2,'0')} UT` +
    `  (${sign}${dm}m ${ds}s from 12:00)`
  );
}
// The deviation ranges from about -14 minutes (Feb) to +16 minutes (Nov)

swe.close();
```

### Combining transit with azalt to find maximum altitude

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 0); // Summer solstice
const geo = { longitude: -0.128, latitude: 51.507 }; // London

// Find solar noon
const noon = swe.transit(jd, SE_SUN, geo);

// Get the Sun's position at transit
const sun = swe.calc(noon.jd, SE_SUN);

// Convert to azimuth/altitude
const hor = swe.azalt(noon.jd, geo, sun.longitude, sun.latitude, sun.distance);

console.log(`Sun at solar noon (London, summer solstice):`);
console.log(`  Altitude: ${hor.trueAltitude.toFixed(2)} degrees`);
console.log(`  Azimuth:  ${hor.azimuth.toFixed(2)} degrees`);
// The Sun reaches about 62 degrees altitude at London on the summer solstice

swe.close();
```

---

## Deep Explanation

### The meridian

The **celestial meridian** is the great circle on the celestial sphere that passes through the celestial poles and the observer's zenith. It divides the sky into an eastern half and a western half.

When a body crosses the meridian going from east to west (the normal direction due to Earth's rotation), it is at its highest point. This is the **upper transit**. About 12 hours later (for the Sun; for stars it is the sidereal day), it crosses the meridian again at its lowest point -- the **lower transit**. For bodies that are circumpolar (always above the horizon), both transits are observable.

### Local apparent noon vs clock noon

**Local apparent noon** is the moment when the Sun crosses the observer's meridian. It differs from 12:00 clock time for two reasons:

1. **Longitude within time zone**: Time zones are typically 15 degrees wide (1 hour). If you are at the eastern edge of your time zone, the Sun reaches your meridian earlier than for someone at the western edge. For example, within the US Eastern time zone, Detroit (lon -83.0) sees solar noon about 25 minutes later than New York (lon -74.0).

2. **The equation of time**: Even at the center of a time zone, solar noon drifts back and forth throughout the year by up to 16 minutes. This is called the **equation of time**.

### The equation of time

The equation of time is the difference between **apparent solar time** (based on the actual Sun's position) and **mean solar time** (based on a fictitious Sun that moves at a constant rate). It arises from two physical effects:

1. **Orbital eccentricity**: Earth's orbit is slightly elliptical (eccentricity ~0.017). According to Kepler's second law, Earth moves faster when closer to the Sun (perihelion, around January 3) and slower when farther (aphelion, around July 4). This means the angular speed of the Sun along the ecliptic varies.

2. **Obliquity of the ecliptic**: The Earth's rotational axis is tilted 23.4 degrees from the orbital plane. Even if the Sun moved at a constant speed along the ecliptic, its projection onto the celestial equator (which determines the time between successive meridian crossings) would vary because the ecliptic and equator make an angle.

The two effects combine to produce the equation of time, which follows an approximately sinusoidal curve:

| Time of year | Equation of time | Solar noon compared to 12:00 |
|-------------|-----------------|------------------------------|
| Early February | about -14 minutes | Sun is slow; noon is at ~12:14 |
| Mid-April | 0 (crossing) | Noon at ~12:00 |
| Mid-May | about +4 minutes | Sun is fast; noon at ~11:56 |
| Mid-June | 0 (crossing) | Noon at ~12:00 |
| Late July | about -6 minutes | Sun is slow; noon at ~12:06 |
| Early September | 0 (crossing) | Noon at ~12:00 |
| Early November | about +16 minutes | Sun is fast; noon at ~11:44 |
| Late December | 0 (crossing) | Noon at ~12:00 |

The Swiss Ephemeris also provides `swe.timeEquation(jd)`, which returns the equation of time in days (multiply by 24 * 60 to get minutes).

### Circumpolar transits

At high latitudes, some celestial bodies are **circumpolar** -- they never set below the horizon. For these objects:

- The **upper transit** is when the body is at its maximum altitude (crossing the meridian above the pole).
- The **lower transit** is when the body is at its minimum altitude (crossing the meridian below the pole but still above the horizon).

For example, Polaris (the North Star) is circumpolar from most of the Northern Hemisphere. Its lower transit passes very close to the celestial north pole.

In the Arctic during summer, the Sun itself becomes circumpolar. Its upper transit (solar noon) still occurs at the highest altitude, but the lower transit (around midnight) also occurs above the horizon -- the midnight sun.

### Transit vs rise/set

| Property | Transit | Rise/Set |
|----------|---------|----------|
| **Definition** | Body crosses the meridian | Body crosses the horizon |
| **Altitude** | Maximum (upper) or minimum (lower) | ~0 degrees (with refraction) |
| **Always occurs?** | Yes (for all visible objects) | No (circumpolar objects never set; some objects never rise) |
| **Affected by refraction?** | No (meridian crossing is a direction, not an altitude) | Yes (significantly) |
| **Atmospheric pressure/temperature** | Not applicable | Affects the result through refraction |

### Tips

- The `transit()` and `antiTransit()` methods do not accept `pressure`, `temperature`, or `flags` like rise/set does, because meridian transit is a purely geometric event not affected by atmospheric refraction. However, they do accept the `options` parameter for API consistency.
- To find "solar noon" for a given date, start from midnight UT of that date (hour = 0) and call `swe.transit()`. The result will be the Sun's meridian passage on that day.
- The time between successive solar noons varies slightly throughout the year (from about 23h 59m 39s to 24h 0m 30s) due to the equation of time. The mean interval is exactly 24 hours.
- For stars, the time between successive meridian transits is one sidereal day (23h 56m 4.1s), which is why stars appear to shift about 4 minutes earlier each night.
