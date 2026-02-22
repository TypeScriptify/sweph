# Topocentric Correction

**Geocentric** positions are calculated from the center of the Earth. **Topocentric** positions are calculated from a specific point on the Earth's surface -- your actual physical location. The difference between these two is called **diurnal parallax**, and it matters most for nearby objects.

Why does this distinction exist? Imagine two people on opposite sides of the Earth looking at the Moon at the same instant. They see it in slightly different positions against the background stars, because they are separated by about 12,700 km (the Earth's diameter). This shift in apparent position is parallax. For the Moon, which is only about 384,000 km away, this parallax can reach nearly **1 degree** -- that is twice the Moon's apparent diameter. For the Sun (150 million km away), it is about 9 arc-seconds. For Jupiter and beyond, it is negligible.

Most astrological software uses geocentric positions (from Earth's center) because the differences are small for most planets. But for precise work involving the Moon, solar eclipses, occultations, or near-Earth asteroids, topocentric correction is essential.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SEFLG_TOPOCTR } from '../../constants';

// Set up the observer's location in the constructor
const swe = new SwissEph({
  topo: { longitude: 2.35, latitude: 48.86, altitude: 35 }, // Paris
});

const jd = SwissEph.julianDay(2025, 6, 15, 22);

// Topocentric Moon -- must pass SEFLG_TOPOCTR flag
const moonTopo = swe.calc(jd, SE_MOON, SEFLG_TOPOCTR);
console.log(`Moon (topocentric from Paris): ${moonTopo.longitude.toFixed(4)} deg`);

swe.close();
```

---

## Detailed Examples

### Comparing geocentric vs topocentric Moon

This example shows the parallax effect directly by computing the Moon's position both ways.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SEFLG_TOPOCTR } from '../../constants';

// Create two instances: one with topo, one without
const sweTopo = new SwissEph({
  topo: { longitude: -73.98, latitude: 40.75, altitude: 10 }, // New York
});
const sweGeo = new SwissEph();

const jd = SwissEph.julianDay(2025, 3, 20, 3); // Moon near meridian transit

const moonGeo  = sweGeo.calc(jd, SE_MOON);
const moonTopo = sweTopo.calc(jd, SE_MOON, SEFLG_TOPOCTR);

console.log(`Moon geocentric longitude:  ${moonGeo.longitude.toFixed(4)} deg`);
console.log(`Moon topocentric longitude: ${moonTopo.longitude.toFixed(4)} deg`);
console.log(`Longitude difference:       ${(moonTopo.longitude - moonGeo.longitude).toFixed(4)} deg`);

console.log(`\nMoon geocentric latitude:   ${moonGeo.latitude.toFixed(4)} deg`);
console.log(`Moon topocentric latitude:  ${moonTopo.latitude.toFixed(4)} deg`);
console.log(`Latitude difference:        ${(moonTopo.latitude - moonGeo.latitude).toFixed(4)} deg`);

console.log(`\nMoon geocentric distance:   ${moonGeo.distance.toFixed(6)} AU`);
console.log(`Moon topocentric distance:  ${moonTopo.distance.toFixed(6)} AU`);

sweGeo.close();
sweTopo.close();
```

### Using setTopo() to change location

Instead of setting the topocentric position in the constructor, you can use `setTopo()` to change it at any time. This is useful when computing positions for multiple observers.

```typescript
import { SwissEph } from '../index';
import { SE_MOON, SEFLG_TOPOCTR } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2025, 1, 15, 0);

const locations = [
  { name: 'North Pole',  geo: { longitude: 0,       latitude: 90,     altitude: 0 } },
  { name: 'Quito',       geo: { longitude: -78.47,  latitude: -0.18,  altitude: 2850 } },
  { name: 'London',      geo: { longitude: -0.13,   latitude: 51.51,  altitude: 11 } },
  { name: 'Sydney',      geo: { longitude: 151.21,  latitude: -33.87, altitude: 58 } },
  { name: 'South Pole',  geo: { longitude: 0,       latitude: -90,    altitude: 2835 } },
];

const moonGeo = swe.calc(jd, SE_MOON);
console.log(`Moon geocentric: ${moonGeo.longitude.toFixed(4)} deg lon, ${moonGeo.latitude.toFixed(4)} deg lat\n`);

console.log('Topocentric Moon from different locations:');
for (const loc of locations) {
  swe.setTopo(loc.geo);
  const moon = swe.calc(jd, SE_MOON, SEFLG_TOPOCTR);
  const dLon = moon.longitude - moonGeo.longitude;
  const dLat = moon.latitude - moonGeo.latitude;
  console.log(
    `  ${loc.name.padEnd(12)}  ` +
    `lon=${moon.longitude.toFixed(4)}  lat=${moon.latitude.toFixed(4)}  ` +
    `(dLon=${dLon.toFixed(4)}, dLat=${dLat.toFixed(4)})`
  );
}

swe.close();
```

### Effect on the Sun and planets

The topocentric correction is much smaller for the Sun and planets than for the Moon. This example quantifies the difference for each body.

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS,
  SE_JUPITER, SE_SATURN, SEFLG_TOPOCTR,
} from '../../constants';

const swe = new SwissEph({
  topo: { longitude: -73.98, latitude: 40.75, altitude: 10 }, // New York
});

const jd = SwissEph.julianDay(2025, 6, 15, 0);

const bodies = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_MERCURY, name: 'Mercury' },
  { id: SE_VENUS,   name: 'Venus' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('Topocentric parallax from New York:');
console.log('Body       Geo lon      Topo lon     Difference (arcsec)');
console.log('-'.repeat(60));

for (const b of bodies) {
  const geo  = swe.calc(jd, b.id);
  const topo = swe.calc(jd, b.id, SEFLG_TOPOCTR);
  const diffArcsec = (topo.longitude - geo.longitude) * 3600;
  console.log(
    `${b.name.padEnd(9)}  ` +
    `${geo.longitude.toFixed(4).padStart(10)}  ` +
    `${topo.longitude.toFixed(4).padStart(10)}  ` +
    `${diffArcsec.toFixed(2).padStart(10)}`
  );
}
// Moon: up to ~3600 arcsec (1 degree)
// Sun: ~9 arcsec
// Planets: < 1 arcsec typically

swe.close();
```

### Topocentric Moon for eclipse timing

When computing the exact timing of a lunar occultation or the moment of eclipse contact for your location, topocentric positions give you the precision you need.

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SEFLG_TOPOCTR } from '../../constants';

// Austin, Texas -- in the path of the 2024 April 8 total solar eclipse
const swe = new SwissEph({
  topo: { longitude: -97.74, latitude: 30.27, altitude: 150 },
});

// Near the time of eclipse maximum
const jd = SwissEph.julianDay(2024, 4, 8, 18.3); // ~18:18 UT

const sunGeo   = swe.calc(jd, SE_SUN);
const moonGeo  = swe.calc(jd, SE_MOON);
const sunTopo  = swe.calc(jd, SE_SUN, SEFLG_TOPOCTR);
const moonTopo = swe.calc(jd, SE_MOON, SEFLG_TOPOCTR);

console.log('Geocentric Sun-Moon separation:');
const sepGeo = moonGeo.longitude - sunGeo.longitude;
console.log(`  ${sepGeo.toFixed(4)} deg`);

console.log('Topocentric Sun-Moon separation (from Austin):');
const sepTopo = moonTopo.longitude - sunTopo.longitude;
console.log(`  ${sepTopo.toFixed(4)} deg`);

console.log(`\nDifference: ${((sepTopo - sepGeo) * 3600).toFixed(1)} arcsec`);
// This difference determines whether you see totality or a near miss!

swe.close();
```

### Combining topocentric with sidereal

Topocentric correction can be combined with other flags like `SEFLG_SIDEREAL` or `SEFLG_EQUATORIAL`.

```typescript
import { SwissEph } from '../index';
import {
  SE_MOON, SE_SIDM_LAHIRI,
  SEFLG_TOPOCTR, SEFLG_SIDEREAL, SEFLG_EQUATORIAL,
} from '../../constants';

const swe = new SwissEph({
  siderealMode: SE_SIDM_LAHIRI,
  topo: { longitude: 77.59, latitude: 12.97, altitude: 920 }, // Bangalore
});

const jd = SwissEph.julianDay(2025, 1, 15, 18);

// Sidereal topocentric Moon
const moonSidTopo = swe.calc(jd, SE_MOON, SEFLG_SIDEREAL | SEFLG_TOPOCTR);
console.log(`Moon sidereal topocentric: ${moonSidTopo.longitude.toFixed(4)} deg (Lahiri)`);

// Equatorial topocentric Moon (RA/Dec from observer's location)
const moonEqTopo = swe.calc(jd, SE_MOON, SEFLG_EQUATORIAL | SEFLG_TOPOCTR);
console.log(`Moon RA (topocentric):     ${moonEqTopo.longitude.toFixed(4)} deg`);
console.log(`Moon Dec (topocentric):    ${moonEqTopo.latitude.toFixed(4)} deg`);

swe.close();
```

---

## Deep Explanation

### What is diurnal parallax?

**Diurnal parallax** (from Greek "parallaxis" = alteration) is the apparent shift in position of a celestial body caused by the observer being displaced from Earth's center. It is called "diurnal" because as the Earth rotates over 24 hours, the observer sweeps through different positions, and the parallax shifts accordingly.

The maximum possible parallax for any object is called the **horizontal parallax** -- it occurs when the object is on the observer's horizon (the maximum displacement from Earth's center in the direction of the object). For the Moon, the horizontal parallax is about:

```
HP_Moon = arctan(R_Earth / d_Moon)
        = arctan(6371 km / 384400 km)
        = 0.95 degrees
        = 57 arc-minutes
```

This is nearly a full degree. The actual parallax at any given moment depends on the Moon's altitude above the horizon and the observer's latitude.

For comparison:
- Sun: ~9 arc-seconds (0.0025 degrees)
- Mars at closest approach: ~23 arc-seconds
- Jupiter: ~2 arc-seconds
- Saturn: ~1 arc-second

### How topocentric correction works

The Swiss Ephemeris computes topocentric positions by:

1. Computing the geocentric position of the body normally
2. Computing the observer's position on the Earth's surface in the same coordinate system (using the geodetic latitude, longitude, and altitude)
3. Subtracting the observer's position vector from the body's geocentric position vector
4. Converting the result back to ecliptic (or equatorial) coordinates

The observer's position on Earth's surface depends on:
- **Geodetic latitude**: the latitude you read from a map or GPS. This differs from geocentric latitude because the Earth is not a perfect sphere -- it is an oblate spheroid (wider at the equator). At 45 degrees latitude, the difference is about 11 arc-minutes.
- **Longitude**: determines the observer's east-west position as Earth rotates.
- **Altitude above sea level**: a higher altitude increases the observer's distance from Earth's center, slightly increasing the parallax.

### When topocentric matters

| Scenario | Importance |
|----------|-----------|
| Moon position for astrology | Moderate. Up to ~1 deg difference. Some precise astrologers prefer topocentric charts. |
| Eclipse contact times | Critical. A fraction of a degree in the Moon's position determines whether totality occurs at your location. |
| Occultation predictions | Critical. Whether a star is hidden by the Moon depends on the exact topocentric Moon position. |
| Moon rise/set times | Important. The Swiss Ephemeris rise/set functions handle topocentric correction internally. |
| Sun position for precise sundials | Moderate. ~9 arcsec matters for precision sundial calibration. |
| Planet positions for astrology | Negligible. Less than 1 arcsec for all planets beyond Mars. |
| Fixed star positions | Zero effect. Stars are infinitely far away; parallax from Earth's surface is unmeasurable. |

### Geocentric vs geodetic latitude

An important subtlety: the latitude you get from a GPS or a map is **geodetic latitude** -- the angle between the local surface normal and the equatorial plane. Because the Earth is flattened at the poles, this differs from **geocentric latitude** -- the angle between the line to the Earth's center and the equatorial plane. The Swiss Ephemeris handles this conversion internally when you provide geodetic coordinates (which is what you should always provide).

The difference between geodetic and geocentric latitude can be up to about 11.5 arc-minutes (0.19 degrees) at 45 degrees latitude. At the equator and poles, they are identical.

### Altitude effect

Observer altitude above sea level has a small but measurable effect. A person on a 3,000-meter mountain is about 3 km farther from Earth's center than someone at sea level, which increases the parallax slightly. The effect is most pronounced for the Moon (a few arc-seconds) and negligible for everything else.

For very precise work (eclipse timing, occultation predictions), always include the observer's altitude.

### The constructor option vs setTopo()

There are two ways to set the topocentric position:

**Constructor option** (set once at creation time):
```typescript
const swe = new SwissEph({
  topo: { longitude: -0.13, latitude: 51.51, altitude: 11 }
});
```

**setTopo() method** (can be changed at any time):
```typescript
const swe = new SwissEph();
swe.setTopo({ longitude: -0.13, latitude: 51.51, altitude: 11 });
```

Both produce the same result. The `setTopo()` method is useful when you need to compute positions for multiple observers with the same instance.

### The SEFLG_TOPOCTR flag

Setting up the topocentric position (via constructor or `setTopo()`) only configures **where** the observer is. You must also pass `SEFLG_TOPOCTR` in the `flags` parameter of `calc()` to actually enable the topocentric correction. Without this flag, the position will still be geocentric even if `topo` is configured.

This two-step design (configure location, then opt-in per calculation) allows you to easily compare geocentric and topocentric results without creating separate instances.

### Combining with other flags

`SEFLG_TOPOCTR` can be combined with other flags using bitwise OR:

| Combination | Effect |
|------------|--------|
| `SEFLG_TOPOCTR` | Topocentric ecliptic coordinates |
| `SEFLG_TOPOCTR \| SEFLG_EQUATORIAL` | Topocentric equatorial (RA/Dec from observer) |
| `SEFLG_TOPOCTR \| SEFLG_SIDEREAL` | Topocentric sidereal ecliptic |
| `SEFLG_TOPOCTR \| SEFLG_EQUATORIAL \| SEFLG_SIDEREAL` | Topocentric sidereal equatorial |

`SEFLG_TOPOCTR` cannot be combined with `SEFLG_HELCTR` or `SEFLG_BARYCTR` (those place the observer at the Sun or solar system barycenter, which contradicts the idea of being on Earth's surface).

### The GeoPosition type

```typescript
interface GeoPosition {
  longitude: number;   // Geographic longitude in degrees. East = positive, West = negative.
  latitude: number;    // Geographic (geodetic) latitude in degrees. North = positive, South = negative.
  altitude?: number;   // Altitude above sea level in meters. Defaults to 0.
}
```

Examples:
- New York: `{ longitude: -73.98, latitude: 40.75, altitude: 10 }`
- Tokyo: `{ longitude: 139.69, latitude: 35.69, altitude: 40 }`
- South Pole: `{ longitude: 0, latitude: -90, altitude: 2835 }`
