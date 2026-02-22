# Sidereal Time

**Sidereal time** is "star time" -- it measures the rotation of the Earth relative to the distant stars, rather than relative to the Sun. While a **solar day** (noon to noon) is 24 hours, a **sidereal day** (the time for the stars to return to the same position in the sky) is about **23 hours, 56 minutes, and 4 seconds**. The difference arises because the Earth is simultaneously orbiting the Sun: after one full rotation relative to the stars, it has moved about 1 degree along its orbit, so it needs to rotate a little extra to bring the Sun back to the same position.

**Greenwich Sidereal Time (GST)** is the sidereal time at the Prime Meridian (longitude 0 degrees). It tells you which Right Ascension is currently crossing the meridian at Greenwich. To get **Local Sidereal Time (LST)** for any other location, simply add the observer's longitude (in hours):

```
LST = GST + (longitude_degrees / 15)
```

Sidereal time is fundamental to observational astronomy (it tells you which stars and constellations are visible right now), and in astrology it is the basis for house calculations: the **ARMC** (Ascensional Right Ascension of the Midheaven) is simply sidereal time multiplied by 15 (converting hours to degrees).

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Greenwich Sidereal Time at J2000.0
const jd = SwissEph.julianDay(2000, 1, 1, 12);
const gst = swe.siderealTime(jd);

console.log(`Greenwich Sidereal Time: ${gst.toFixed(6)} hours`);
// ~18.697374 hours

// Convert to hh:mm:ss
const h = Math.floor(gst);
const m = Math.floor((gst - h) * 60);
const s = ((gst - h) * 60 - m) * 60;
console.log(`GST: ${h}h ${m}m ${s.toFixed(2)}s`);

swe.close();
```

---

## Detailed Examples

### Local Sidereal Time for any location

To get the local sidereal time, add the observer's longitude (converted to hours by dividing by 15). East longitudes are positive, west longitudes are negative.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

const jd = SwissEph.julianDay(2024, 6, 21, 22, ); // June 21, 2024 at 22:00 UT

const gst = swe.siderealTime(jd);
console.log(`Greenwich Sidereal Time: ${formatHMS(gst)}`);

// Local Sidereal Time for different cities
const cities = [
  { name: 'London',    lon: -0.128 },
  { name: 'New York',  lon: -74.006 },
  { name: 'Tokyo',     lon: 139.692 },
  { name: 'Sydney',    lon: 151.209 },
  { name: 'Mumbai',    lon: 72.878 },
];

for (const city of cities) {
  // LST = GST + longitude/15, then normalize to [0, 24)
  let lst = gst + city.lon / 15;
  while (lst < 0) lst += 24;
  while (lst >= 24) lst -= 24;

  console.log(`${city.name.padEnd(12)} LST: ${formatHMS(lst)}`);
}

function formatHMS(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = ((hours - h) * 60 - m) * 60;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s.toFixed(2).padStart(5, '0')}s`;
}

swe.close();
```

### What is on the meridian right now?

The Local Sidereal Time directly tells you the Right Ascension that is currently crossing your local meridian (due south in the Northern Hemisphere). Any object with that RA is at its highest point in the sky (its culmination or upper transit).

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SE_MARS, SE_JUPITER, SEFLG_EQUATORIAL } from '../../constants';

const swe = new SwissEph();

// Current observer: Los Angeles, some evening
const lon = -118.243;
const jd = SwissEph.julianDay(2024, 8, 15, 4); // 4:00 UT = ~9 PM PDT

const gst = swe.siderealTime(jd);
let lst = gst + lon / 15;
while (lst < 0) lst += 24;
while (lst >= 24) lst -= 24;

console.log(`Local Sidereal Time: ${lst.toFixed(4)} hours`);
console.log(`RA on the meridian: ${lst.toFixed(4)} hours = ${(lst * 15).toFixed(2)} deg`);
console.log();

// Check how far each planet is from the meridian
const bodies = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
];

for (const b of bodies) {
  const pos = swe.calc(jd, b.id, SEFLG_EQUATORIAL);
  const raHours = pos.longitude / 15; // Convert RA from degrees to hours

  // Hour angle = LST - RA (how far west of the meridian)
  let ha = lst - raHours;
  while (ha < -12) ha += 24;
  while (ha > 12) ha -= 24;

  const side = ha > 0 ? 'west of meridian' : 'east of meridian';
  console.log(
    `${b.name.padEnd(9)} RA: ${raHours.toFixed(2)}h  ` +
    `HA: ${Math.abs(ha).toFixed(2)}h ${side}` +
    `${Math.abs(ha) < 1 ? '  <-- NEAR TRANSIT' : ''}`
  );
}

swe.close();
```

### ARMC: Sidereal time as the basis for house cusps

In house calculations, the starting point is the **ARMC** (Ascensional Right Ascension of the MC, also known simply as the MC in Right Ascension). It equals the Local Sidereal Time expressed in degrees:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// London, J2000.0
const jd = SwissEph.julianDay(2000, 1, 1, 12);
const londonLon = -0.128;
const londonLat = 51.507;

// Get sidereal time and compute ARMC
const gst = swe.siderealTime(jd);
let lst = gst + londonLon / 15;
while (lst < 0) lst += 24;
while (lst >= 24) lst -= 24;

const armc = lst * 15; // Convert hours to degrees
console.log(`ARMC: ${armc.toFixed(4)} deg`);

// Verify: the houses() function returns ARMC as well
const houses = swe.houses(jd, { longitude: londonLon, latitude: londonLat });
console.log(`ARMC from houses(): ${houses.armc.toFixed(4)} deg`);
console.log(`MC:  ${houses.mc.toFixed(4)} deg`);

// Note: ARMC and MC are NOT the same thing!
// ARMC is in Right Ascension (equatorial).
// MC is the ecliptic longitude where the meridian crosses the ecliptic.

swe.close();
```

### Sidereal time throughout a day

Sidereal time advances about 24h 03m 56s in one solar day (because a sidereal day is shorter, the sidereal clock gains about 3 minutes and 56 seconds per solar day relative to a normal clock):

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

console.log('Sidereal time at Greenwich, March 20, 2024:');
console.log('UT Time    GST');

for (let hour = 0; hour <= 24; hour += 3) {
  const jd = SwissEph.julianDay(2024, 3, 20, hour);
  const gst = swe.siderealTime(jd);

  const h = Math.floor(gst);
  const m = Math.floor((gst - h) * 60);
  const s = ((gst - h) * 60 - m) * 60;
  console.log(
    `${String(hour).padStart(2, '0')}:00 UT   ` +
    `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${s.toFixed(1).padStart(4)}s`
  );
}

// Show the sidereal day length
const jd1 = SwissEph.julianDay(2024, 3, 20, 0);
const jd2 = SwissEph.julianDay(2024, 3, 21, 0);
const gst1 = swe.siderealTime(jd1);
let gst2 = swe.siderealTime(jd2);
if (gst2 < gst1) gst2 += 24;
const gain = (gst2 - gst1) - 24;
console.log(`\nSidereal time gained in 24 solar hours: ${(gain * 60).toFixed(2)} minutes`);
// ~3.94 minutes

swe.close();
```

### At what UT does a specific RA transit?

If you want to know when a specific Right Ascension crosses the local meridian:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// When does RA = 6h 45m (Sirius, approximately) transit at Greenwich?
const targetRA = 6 + 45 / 60; // 6.75 hours

// Start from midnight on a given date
const jdStart = SwissEph.julianDay(2024, 1, 15, 0);
const gstStart = swe.siderealTime(jdStart);

// How many sidereal hours until the target RA reaches the meridian?
let wait = targetRA - gstStart;
while (wait < 0) wait += 24;

// Convert sidereal hours to solar hours
// 1 sidereal hour = 0.99727 solar hours
const solarHours = wait * 0.99727;

const transitJd = jdStart + solarHours / 24;
const date = SwissEph.fromJulianDay(transitJd);

console.log(`Sirius (RA ~6h 45m) transits Greenwich at approximately:`);
console.log(`  ${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')} ` +
  `${Math.floor(date.hour)}:${String(Math.floor((date.hour % 1) * 60)).padStart(2, '0')} UT`);

swe.close();
```

---

## Deep Explanation

### Sidereal day vs solar day

A **sidereal day** is one complete rotation of Earth relative to the distant stars: 23h 56m 04.0905s of mean solar time. A **solar day** (noon to noon) is longer because while the Earth rotates, it also advances about 1 degree along its orbit. The Sun appears to drift about 1 degree eastward per day against the background stars, so after one sidereal day the Earth must rotate about 4 more minutes to "catch up" to the Sun.

This means there are approximately 366.25 sidereal days in one year but only 365.25 solar days. The extra sidereal day comes from the Earth's orbital motion itself -- one full orbit adds one extra rotation relative to the stars.

### Mean vs apparent sidereal time

The Swiss Ephemeris `siderealTime()` returns **mean sidereal time** corrected for nutation (effectively giving apparent sidereal time). The distinction:

- **Mean sidereal time** uses the mean equinox, ignoring the short-period nutation oscillation
- **Apparent sidereal time** accounts for nutation, which causes the equinox to wobble by up to about 1.2 seconds of time (17" of arc)

The nutation correction is small but important for precise house-cusp calculations.

### The relationship to Right Ascension

Right Ascension is measured along the celestial equator, starting from the vernal equinox (the point where the Sun crosses the equator heading north), and increasing eastward. It is measured in hours (0h to 24h), where 1h = 15 degrees.

The Local Sidereal Time is numerically equal to the Right Ascension currently on the observer's meridian. So if LST = 12h 30m, any star with RA = 12h 30m is at its highest point in your sky right now. Stars with smaller RA are west of the meridian (already past their highest), and stars with larger RA are east (still rising).

### Hour Angle

The **Hour Angle (HA)** of an object is the difference between the Local Sidereal Time and the object's Right Ascension:

```
HA = LST - RA
```

- HA = 0h: the object is on the meridian (transiting)
- HA > 0: the object is west of the meridian (past transit, heading toward setting)
- HA < 0: the object is east of the meridian (still rising, before transit)
- HA = +6h: the object is on the western horizon (approximately)
- HA = -6h: the object is on the eastern horizon (approximately)

### ARMC and house calculations

The ARMC (Ascensional Right Ascension of the MC) is the fundamental input for house-cusp calculations. It equals the Local Sidereal Time expressed in degrees (multiply hours by 15). Given the ARMC, the geographic latitude, and the obliquity of the ecliptic, all house systems can compute their cusps.

The MC (Medium Coeli, Midheaven) is the ecliptic longitude where the meridian intersects the ecliptic. It is derived from the ARMC by converting from equatorial to ecliptic coordinates. The MC is NOT simply the ARMC in different units -- the conversion depends on the obliquity.

### Practical uses of sidereal time

- **Telescope alignment**: When setting up a Go-To telescope or an equatorial mount, you need to know the current sidereal time to sync the mount's RA axis
- **Observing planning**: Knowing the current LST tells you which part of the sky is best placed for observation (objects near the meridian are highest and least affected by atmospheric refraction)
- **House cusps**: In astrology, sidereal time is the foundation of house calculations via the ARMC
- **Satellite tracking**: Communication satellites and ground stations use sidereal time to predict satellite positions relative to Earth's rotation

### Sidereal time at the vernal equinox

At the moment of the vernal equinox (when the Sun crosses 0h RA), the Greenwich Sidereal Time at solar noon equals approximately 0h. This is the annual "reset point." From there, sidereal time gains about 3 minutes 56 seconds per solar day, completing a full 24-hour cycle in one year.

Specifically, at the March equinox, the GST at 12:00 UT is close to 0h (it varies slightly because the equinox does not fall at exactly noon). At the June solstice, the GST at noon is close to 6h. At the September equinox, it is close to 12h. At the December solstice, it is close to 18h.

### Input time scale

The `siderealTime()` method expects the input Julian Day to be in **Universal Time (UT)**, regardless of the `timeMode` setting of the SwissEph instance. This is because sidereal time is a measure of Earth's rotation, which is defined in UT. The function internally applies Delta-T to compute the nutation correction.
