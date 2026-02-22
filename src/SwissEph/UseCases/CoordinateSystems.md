# Coordinate Systems

Celestial objects can be located on the sky using different coordinate systems, each defined by a different reference plane. The three main systems are:

- **Ecliptic coordinates** (longitude and latitude): Based on the **ecliptic** -- the plane of Earth's orbit around the Sun, or equivalently, the Sun's apparent annual path across the sky. The Sun is always at latitude 0 by definition, and its longitude increases through the zodiac from 0 to 360 degrees. This is the native coordinate system for astrological work and solar system mechanics.

- **Equatorial coordinates** (Right Ascension and Declination): Based on the **celestial equator** -- Earth's equator projected onto the sky. This is the standard system for observational astronomy, telescope pointing, and star catalogs. Right Ascension (RA) is measured in hours (0h-24h) or degrees (0-360), and Declination (Dec) ranges from -90 to +90 degrees.

- **Horizontal coordinates** (Azimuth and Altitude): Based on the **observer's local horizon**. This is the most intuitive system -- it tells you where to look in the sky. Unlike the other two, it changes constantly as the Earth rotates and depends on your location.

The key angle connecting the ecliptic and equatorial systems is the **obliquity of the ecliptic** -- the 23.44 degree tilt of Earth's rotation axis relative to its orbital plane. Without this tilt, the ecliptic and equatorial planes would be the same, and there would be no seasons.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SE_ECL_NUT, SEFLG_EQUATORIAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 6, 21, 12);

// Get Mars in ecliptic coordinates (default)
const marsEcl = swe.calc(jd, SE_MARS);
console.log(`Mars ecliptic:  lon=${marsEcl.longitude.toFixed(4)} deg, lat=${marsEcl.latitude.toFixed(4)} deg`);

// Get Mars in equatorial coordinates
const marsEqu = swe.calc(jd, SE_MARS, SEFLG_EQUATORIAL);
console.log(`Mars equatorial: RA=${marsEqu.longitude.toFixed(4)} deg, Dec=${marsEqu.latitude.toFixed(4)} deg`);

swe.close();
```

---

## Detailed Examples

### Converting ecliptic to equatorial with coordinateTransform

The static `coordinateTransform()` method converts between ecliptic and equatorial coordinates using the obliquity. Pass **positive** obliquity for ecliptic-to-equatorial, **negative** for equatorial-to-ecliptic.

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_ECL_NUT } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 6, 21, 12); // Summer solstice

// Get the obliquity of the ecliptic
// SE_ECL_NUT returns: [0] = true obliquity, [1] = mean obliquity, [2] = nutation lon, etc.
const eclNut = swe.calc(jd, SE_ECL_NUT);
const trueObliquity = eclNut.longitude;
console.log(`True obliquity: ${trueObliquity.toFixed(6)} deg`);

// Get the Sun's ecliptic position
const sun = swe.calc(jd, SE_SUN);
console.log(`\nSun ecliptic:  lon=${sun.longitude.toFixed(4)} deg, lat=${sun.latitude.toFixed(4)} deg`);

// Convert to equatorial using coordinateTransform
// Positive obliquity = ecliptic -> equatorial
const equatorial = SwissEph.coordinateTransform(
  [sun.longitude, sun.latitude, sun.distance],
  trueObliquity
);
const ra = equatorial[0];
const dec = equatorial[1];
console.log(`Sun equatorial: RA=${ra.toFixed(4)} deg, Dec=${dec.toFixed(4)} deg`);

// Convert RA to hours
const raHours = ra / 15;
const h = Math.floor(raHours);
const m = Math.floor((raHours - h) * 60);
const s = ((raHours - h) * 60 - m) * 60;
console.log(`Sun RA: ${h}h ${m}m ${s.toFixed(1)}s`);

// At the summer solstice, the Sun's declination should be ~+23.44 degrees
// (equal to the obliquity, since the Sun is at the northernmost point of the ecliptic)
console.log(`\nSun declination at solstice: ${dec.toFixed(4)} deg (should be ~obliquity)`);

swe.close();
```

### Converting equatorial to ecliptic

Use **negative** obliquity to reverse the conversion:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_ECL_NUT, SEFLG_EQUATORIAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 3, 20, 12);

// Get obliquity
const eclNut = swe.calc(jd, SE_ECL_NUT);
const eps = eclNut.longitude;

// Get Sun in equatorial coordinates
const sunEqu = swe.calc(jd, SE_SUN, SEFLG_EQUATORIAL);
console.log(`Sun equatorial: RA=${sunEqu.longitude.toFixed(4)} deg, Dec=${sunEqu.latitude.toFixed(4)} deg`);

// Convert back to ecliptic using NEGATIVE obliquity
const ecliptic = SwissEph.coordinateTransform(
  [sunEqu.longitude, sunEqu.latitude, sunEqu.distance],
  -eps  // Negative = equatorial -> ecliptic
);
console.log(`Sun ecliptic:  lon=${ecliptic[0].toFixed(4)} deg, lat=${ecliptic[1].toFixed(4)} deg`);

// Verify against the direct ecliptic calculation
const sunEcl = swe.calc(jd, SE_SUN);
console.log(`Sun ecliptic (direct): lon=${sunEcl.longitude.toFixed(4)} deg, lat=${sunEcl.latitude.toFixed(4)} deg`);

swe.close();
```

### Getting equatorial coordinates directly from calc()

Instead of converting manually, you can get equatorial coordinates directly by passing `SEFLG_EQUATORIAL`:

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MOON, SE_MARS, SE_JUPITER, SE_SATURN,
  SEFLG_EQUATORIAL,
} from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 8, 15, 0);

const bodies = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
  { id: SE_SATURN,  name: 'Saturn' },
];

console.log('Body      Ecl.Lon (deg)  Ecl.Lat (deg)  RA (deg)  RA (h:m:s)      Dec (deg)');

for (const b of bodies) {
  const ecl = swe.calc(jd, b.id);
  const equ = swe.calc(jd, b.id, SEFLG_EQUATORIAL);

  const raH = equ.longitude / 15;
  const h = Math.floor(raH);
  const m = Math.floor((raH - h) * 60);
  const s = ((raH - h) * 60 - m) * 60;
  const raStr = `${String(h).padStart(2)}h${String(m).padStart(2,'0')}m${s.toFixed(0).padStart(2,'0')}s`;

  console.log(
    `${b.name.padEnd(10)}` +
    `${ecl.longitude.toFixed(2).padStart(10)}` +
    `${ecl.latitude.toFixed(2).padStart(13)}` +
    `${equ.longitude.toFixed(2).padStart(12)}  ` +
    `${raStr.padStart(12)}` +
    `${equ.latitude.toFixed(2).padStart(11)}`
  );
}

swe.close();
```

### Ecliptic to horizontal coordinates (two-step conversion)

To go from ecliptic to horizontal (azimuth/altitude), you can use the `azalt()` method, which does the full conversion internally:

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 8, 15, 22); // 10 PM UT
const geo = { longitude: -0.128, latitude: 51.507 }; // London

// Step 1: Get ecliptic position
const mars = swe.calc(jd, SE_MARS);
console.log(`Mars ecliptic: lon=${mars.longitude.toFixed(2)} deg, lat=${mars.latitude.toFixed(2)} deg`);

// Step 2: Convert to horizontal (azalt does this in one call)
const hor = swe.azalt(jd, geo, mars.longitude, mars.latitude, mars.distance);
console.log(`Mars horizontal: az=${hor.azimuth.toFixed(2)} deg (SE), alt=${hor.apparentAltitude.toFixed(2)} deg`);

// Convert to compass bearing
const compass = (hor.azimuth + 180) % 360;
console.log(`Mars compass bearing: ${compass.toFixed(2)} deg`);

swe.close();
```

### Getting obliquity values

The obliquity of the ecliptic is available through `SE_ECL_NUT`:

```typescript
import { SwissEph } from '../index';
import { SE_ECL_NUT } from '../../constants';

const swe = new SwissEph();

// Check obliquity at different epochs
const epochs = [
  { year: -3000, label: '3000 BCE' },
  { year: 0,     label: '1 BCE' },
  { year: 1000,  label: '1000 CE' },
  { year: 2000,  label: '2000 CE (J2000)' },
  { year: 2024,  label: '2024 CE' },
  { year: 3000,  label: '3000 CE' },
];

console.log('Epoch             True Obliquity     Mean Obliquity');
console.log('-----             --------------     --------------');

for (const e of epochs) {
  const jd = SwissEph.julianDay(e.year, 1, 1, 12);
  const nut = swe.calc(jd, SE_ECL_NUT);

  // longitude = true obliquity, latitude = mean obliquity
  console.log(
    `${e.label.padEnd(20)}` +
    `${nut.longitude.toFixed(6).padStart(12)} deg` +
    `${nut.latitude.toFixed(6).padStart(14)} deg`
  );
}

// The obliquity is currently decreasing at about 47" per century
// due to the gravitational influence of the other planets.
// It oscillates between about 22.1 and 24.5 degrees over a ~41,000 year cycle.

swe.close();
```

### Practical example: finding a planet's constellation

Constellation boundaries are defined in equatorial coordinates (RA/Dec). To determine which constellation a planet is in (astronomically, not astrologically), you need equatorial coordinates:

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SEFLG_EQUATORIAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 8, 15, 0);

const mars = swe.calc(jd, SE_MARS, SEFLG_EQUATORIAL);
const raDeg = mars.longitude;
const raHours = raDeg / 15;
const dec = mars.latitude;

console.log(`Mars RA: ${raHours.toFixed(4)} h = ${raDeg.toFixed(4)} deg`);
console.log(`Mars Dec: ${dec.toFixed(4)} deg`);
console.log();
console.log('To determine the constellation, compare these equatorial');
console.log('coordinates against the IAU constellation boundary data.');
console.log('(Constellation boundaries are defined in RA/Dec, epoch B1875.)');

swe.close();
```

---

## Deep Explanation

### The ecliptic plane

The **ecliptic** is the plane of Earth's orbit around the Sun. Equivalently, it is the apparent path the Sun traces across the sky over the course of a year. The planets all orbit roughly in this plane (within a few degrees), which is why ecliptic coordinates are natural for solar system work.

In the tropical zodiac (used in Western astrology), ecliptic longitude is measured from the **vernal equinox** -- the point where the Sun crosses the celestial equator heading north (around March 20). This point is defined as 0 degrees Aries. Longitude increases eastward through the zodiac signs: 0-30 Aries, 30-60 Taurus, and so on.

Ecliptic latitude measures angular distance above (+) or below (-) the ecliptic plane. The Sun's latitude is always essentially zero. The Moon's maximum latitude is about 5.1 degrees. Pluto can reach about 17 degrees.

### The celestial equator

The **celestial equator** is Earth's equator projected onto the sky. It is tilted relative to the ecliptic by the obliquity angle (~23.44 degrees). The two planes intersect at two points: the vernal equinox (0h RA = 0 degrees ecliptic longitude) and the autumnal equinox (12h RA = 180 degrees ecliptic longitude).

Right Ascension is measured eastward along the celestial equator from the vernal equinox. It is traditionally measured in hours (0h to 24h) because of its direct relationship to sidereal time: an object's RA equals the sidereal time when it crosses the meridian. However, the Swiss Ephemeris returns RA in degrees (0-360), and you can convert: `raHours = raDeg / 15`.

Declination measures angular distance above (+) or below (-) the celestial equator. The north celestial pole (near Polaris) is at Dec = +90 degrees.

### The obliquity of the ecliptic

The obliquity (symbol epsilon) is the angle between the ecliptic and the celestial equator -- it is the tilt of Earth's rotation axis relative to its orbit. Currently about 23.44 degrees, it:

- Changes slowly (currently decreasing at about 47 arcseconds per century)
- Oscillates between about 22.1 and 24.5 degrees over a ~41,000 year cycle (the obliquity cycle, one of the Milankovitch cycles)
- Is affected by nutation, which causes short-term oscillations of about 9 arcseconds with a period of ~18.6 years

The **mean obliquity** ignores nutation; the **true obliquity** includes it. For coordinate transformations, you generally want the true obliquity. You can get both from `SE_ECL_NUT`:

```typescript
const nut = swe.calc(jd, SE_ECL_NUT);
const trueObliquity = nut.longitude;   // includes nutation
const meanObliquity = nut.latitude;     // without nutation
```

### The coordinate transformation

The conversion between ecliptic and equatorial coordinates is a rotation around the X-axis (the vernal equinox direction) by the obliquity angle. The formulas are:

**Ecliptic to equatorial** (longitude/latitude to RA/Dec):

```
sin(Dec) = sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon)
cos(Dec) * cos(RA) = cos(lat) * cos(lon)
cos(Dec) * sin(RA) = -sin(lat) * sin(eps) + cos(lat) * cos(eps) * sin(lon)
```

**Equatorial to ecliptic** (the inverse):

Same formulas with the sign of eps negated, which is why `coordinateTransform` uses positive eps for ecliptic-to-equatorial and negative eps for the reverse.

### Precession and the J2000 reference frame

Due to gravitational torques from the Sun and Moon on Earth's equatorial bulge, the orientation of Earth's axis slowly rotates (precesses) with a period of about 25,770 years. This means:

- The vernal equinox drifts westward along the ecliptic at about 50 arcseconds per year (this is what causes the ayanamsa drift in sidereal astrology)
- Star catalogs are defined for a specific **epoch** (reference date), most commonly J2000.0 (January 1, 2000 at 12:00 TT)
- Coordinates "of date" use the equinox at the time of observation; coordinates in J2000 use the fixed J2000 equinox

By default, the Swiss Ephemeris returns positions referred to the equinox of date (the true equinox including precession and nutation). To get positions in the J2000 frame, use `SEFLG_J2000`. To get the equinox of date but without nutation (mean equinox), use `SEFLG_NONUT`.

### The FK5 reference frame

The Swiss Ephemeris uses the FK5 (Fifth Fundamental Catalogue) reference frame for the equatorial system and transforms to the ecliptic using the IAU standard obliquity. This is consistent with the JPL ephemerides. The FK5 frame is aligned to the International Celestial Reference Frame (ICRF), which is defined by distant quasars and is essentially inertial.

### When to use which coordinate system

| System     | Best for                                                    |
|------------|-------------------------------------------------------------|
| Ecliptic   | Astrology, planetary aspects, zodiac positions, solar system geometry |
| Equatorial | Telescope pointing, star catalogs, constellation identification, meridian transits |
| Horizontal | Visual observation, rise/set calculations, "where do I look in the sky?" |

### The distance component

All three systems include a third coordinate: **distance**. In ecliptic and equatorial systems, this is the distance from Earth (or the Sun, if heliocentric) in AU. In horizontal coordinates, it is typically not meaningful and the Swiss Ephemeris preserves whatever distance was in the input.

The `coordinateTransform()` function passes the distance through unchanged (it only rotates the angular coordinates). The distance is needed in the input array but is not modified by the transformation.
