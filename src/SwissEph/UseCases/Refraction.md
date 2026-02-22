# Refraction

**Atmospheric refraction** is the bending of light as it passes through Earth's atmosphere. Because the atmosphere acts like a giant lens -- denser near the ground, thinner higher up -- light from celestial objects follows a slightly curved path rather than a straight line. The result is that objects in the sky appear **higher** than they actually are.

The effect is dramatic near the horizon and negligible high in the sky:

- At the horizon (0 degrees altitude), refraction lifts an object by about **34 arcminutes** -- which is larger than the Sun's or Moon's apparent diameter (~31 arcminutes). This means that when you see the Sun sitting right on the horizon at sunset, its geometric center has actually already dropped below the horizon. The "sunset" you see is an atmospheric illusion.
- At 10 degrees altitude, refraction is about 5 arcminutes.
- At 45 degrees altitude, refraction is about 1 arcminute.
- At the zenith (90 degrees altitude), refraction is zero.

The Swiss Ephemeris provides a `refraction()` function to compute this correction in both directions: given the true (geometric) altitude, compute the apparent (observed) altitude, and vice versa.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_TRUE_TO_APP, SE_APP_TO_TRUE } from '../../constants';

const swe = new SwissEph();

// An object at true altitude 0 degrees (geometric horizon)
// What apparent altitude does it appear at?
const apparent = swe.refraction(0, 1013.25, 15, SE_TRUE_TO_APP);
console.log(`True alt 0 deg -> Apparent alt: ${(apparent * 60).toFixed(1)} arcmin above horizon`);
// ~34.5 arcminutes

// An object observed at apparent altitude 1 degree
// What is its true geometric altitude?
const correction = swe.refraction(1, 1013.25, 15, SE_APP_TO_TRUE);
const trueAlt = 1 + correction;  // correction is negative for APP_TO_TRUE
console.log(`Apparent alt 1 deg -> True alt: ${(trueAlt * 60).toFixed(1)} arcmin`);

swe.close();
```

---

## Detailed Examples

### True-to-apparent: how high does an object appear?

When you know the true (geometric) altitude and want to know where the object appears in the refracted sky:

```typescript
import { SwissEph } from '../index';
import { SE_TRUE_TO_APP } from '../../constants';

const swe = new SwissEph();

// Standard atmosphere: 1013.25 mbar, 15 degrees C
const pressure = 1013.25;
const temperature = 15;

console.log('True Altitude    Apparent Altitude    Refraction');
console.log('-------------    -----------------    ----------');

const altitudes = [0, 0.5, 1, 2, 5, 10, 15, 20, 30, 45, 60, 90];

for (const trueAlt of altitudes) {
  const apparentAlt = swe.refraction(trueAlt, pressure, temperature, SE_TRUE_TO_APP);
  const refraction = apparentAlt - trueAlt;
  console.log(
    `${trueAlt.toFixed(1).padStart(8)} deg` +
    `${apparentAlt.toFixed(4).padStart(14)} deg` +
    `${(refraction * 60).toFixed(2).padStart(12)} arcmin`
  );
}

swe.close();
```

Expected approximate output:

| True Altitude | Apparent Altitude | Refraction  |
|---------------|-------------------|-------------|
| 0.0 deg       | 0.575 deg         | 34.5 arcmin |
| 0.5 deg       | 1.038 deg         | 32.3 arcmin |
| 1.0 deg       | 1.478 deg         | 28.7 arcmin |
| 2.0 deg       | 2.353 deg         | 21.2 arcmin |
| 5.0 deg       | 5.159 deg         | 9.5 arcmin  |
| 10.0 deg      | 10.088 deg        | 5.3 arcmin  |
| 20.0 deg      | 20.044 deg        | 2.6 arcmin  |
| 45.0 deg      | 45.016 deg        | 1.0 arcmin  |
| 90.0 deg      | 90.000 deg        | 0.0 arcmin  |

### Apparent-to-true: where is an object really?

When you have observed an object at a certain apparent altitude and want to know its true geometric altitude:

```typescript
import { SwissEph } from '../index';
import { SE_APP_TO_TRUE } from '../../constants';

const swe = new SwissEph();

// Standard atmosphere
const pressure = 1013.25;
const temperature = 15;

// I observed a star at apparent altitude 2 degrees.
// What is its true altitude?
const apparentAlt = 2;
const correction = swe.refraction(apparentAlt, pressure, temperature, SE_APP_TO_TRUE);

// For SE_APP_TO_TRUE, the function returns a negative correction value.
// Add it to the apparent altitude to get the true altitude.
const trueAlt = apparentAlt + correction;

console.log(`Observed (apparent) altitude: ${apparentAlt.toFixed(4)} deg`);
console.log(`Refraction correction:       ${(correction * 60).toFixed(2)} arcmin`);
console.log(`True (geometric) altitude:   ${trueAlt.toFixed(4)} deg`);

swe.close();
```

### Effect of pressure and temperature

Atmospheric refraction depends on air density, which is controlled by pressure and temperature. Higher pressure and lower temperature both mean denser air and more refraction.

```typescript
import { SwissEph } from '../index';
import { SE_TRUE_TO_APP } from '../../constants';

const swe = new SwissEph();

const trueAlt = 0; // Horizon -- where the effect is most pronounced

const conditions = [
  { label: 'Standard atmosphere (sea level, mild)', pressure: 1013.25, temp: 15 },
  { label: 'Hot sea level (tropical noon)',         pressure: 1013.25, temp: 40 },
  { label: 'Cold sea level (arctic winter)',        pressure: 1013.25, temp: -30 },
  { label: 'Mountain (3000m, cool)',                pressure: 700,     temp: 5 },
  { label: 'High mountain (5000m, cold)',           pressure: 540,     temp: -15 },
  { label: 'No atmosphere (vacuum)',                pressure: 0,       temp: 0 },
];

console.log('Refraction at the horizon under different conditions:');
console.log('');

for (const c of conditions) {
  const apparentAlt = swe.refraction(trueAlt, c.pressure, c.temp, SE_TRUE_TO_APP);
  const refractionArcmin = apparentAlt * 60;
  console.log(`${c.label}`);
  console.log(`  Pressure: ${c.pressure} mbar, Temp: ${c.temp} C`);
  console.log(`  Refraction: ${refractionArcmin.toFixed(1)} arcmin`);
  console.log('');
}

swe.close();
```

### Why sunset is later than you think

The Sun's apparent diameter is about 32 arcminutes. The standard definition of sunrise/sunset is when the Sun's upper limb touches the apparent horizon. The geometric center of the Sun at this moment is about 50 arcminutes (34' refraction + 16' solar semi-diameter) below the geometric horizon.

```typescript
import { SwissEph } from '../index';
import { SE_TRUE_TO_APP } from '../../constants';

const swe = new SwissEph();

// At standard sunset, the Sun's center is at about -0.833 degrees true altitude
// (-50 arcminutes: -34' refraction + -16' semi-diameter)
const sunsetTrueAlt = -50 / 60; // -0.833 degrees

const apparentAlt = swe.refraction(Math.abs(sunsetTrueAlt), 1013.25, 15, SE_TRUE_TO_APP);
console.log(`At sunset, the Sun's true altitude:     ${sunsetTrueAlt.toFixed(3)} deg`);
console.log(`Refraction at the horizon:              ${(0.575 * 60).toFixed(1)} arcmin`);
console.log(`Sun's semi-diameter:                    ~16 arcmin`);
console.log(`Total geometric depression at sunset:   ~50 arcmin`);
console.log('');
console.log('This means the Sun is already geometrically below the horizon');
console.log('when you see it touching the horizon at sunset!');

// How much time does this add?
// The Sun moves about 1 degree per day = 4 minutes per degree
// 50 arcminutes = 0.833 degrees, so sunset is delayed by:
const delayMinutes = (50 / 60) * 4;
console.log(`\nSunset is delayed by approximately ${delayMinutes.toFixed(1)} minutes due to refraction`);

swe.close();
```

### Building a refraction table

```typescript
import { SwissEph } from '../index';
import { SE_TRUE_TO_APP } from '../../constants';

const swe = new SwissEph();

console.log('Refraction Table (Standard Atmosphere: 1013.25 mbar, 15 C)');
console.log('==========================================================');
console.log('True Alt (deg)   Refraction (arcmin)   Refraction (deg)');
console.log('--------------   -------------------   ----------------');

// Fine steps near the horizon, coarser steps higher up
const altitudes = [
  -1, -0.5, 0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5,
  7, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90,
];

for (const alt of altitudes) {
  const apparentAlt = swe.refraction(alt, 1013.25, 15, SE_TRUE_TO_APP);
  const refraction = apparentAlt - alt;
  console.log(
    `${alt.toFixed(2).padStart(10)}` +
    `${(refraction * 60).toFixed(2).padStart(18)}` +
    `${refraction.toFixed(5).padStart(20)}`
  );
}

swe.close();
```

---

## Deep Explanation

### How refraction works physically

Earth's atmosphere is a gas whose density decreases with altitude -- dense and thick at sea level, thinning to essentially vacuum in space. When light passes from a less dense medium to a more dense medium (or through a medium with a continuous density gradient), it bends toward the denser region. This is the same principle as Snell's law of refraction, applied continuously rather than at a single surface.

A ray of light from a celestial object enters the top of the atmosphere traveling in a straight line. As it descends into progressively denser air, it curves gently downward (toward the Earth's surface). By the time it reaches the observer's eye, it is arriving at a steeper angle than it originally entered the atmosphere. The observer, tracing the light ray backward in a straight line, perceives the object as being higher in the sky than it geometrically is.

The atmosphere can be modeled as a stack of thin concentric shells, each with a slightly different refractive index. The total bending is the integral of all these small refractions. For objects high in the sky, the light passes through less atmosphere (shorter path) and at a steeper angle (less bending per layer), so refraction is small. Near the horizon, the light passes through a maximum amount of atmosphere and grazes the layers at a shallow angle, producing the largest bending.

### Bennett's formula

The Swiss Ephemeris uses a formula based on Bennett (1982) for computing refraction. For the true-to-apparent direction, the refraction R (in arcminutes) at true altitude h (in degrees) is approximately:

```
R = 1 / tan(h + 7.31 / (h + 4.4))
```

This gives the refraction in arcminutes for standard conditions (1013.25 mbar, 10 degrees C in Bennett's original; the Swiss Ephemeris adjusts to 15 degrees C). For non-standard pressure P (in mbar) and temperature T (in Celsius), the result is scaled:

```
R_actual = R * (P / 1010) * (283 / (273 + T))
```

The formula is an empirical fit, accurate to about 0.1 arcminute for altitudes above 1 degree. Below 1 degree (very near the horizon), refraction becomes increasingly unpredictable.

### SE_TRUE_TO_APP vs SE_APP_TO_TRUE

| Flag              | Value | Input              | Output                           |
|-------------------|-------|--------------------|----------------------------------|
| `SE_TRUE_TO_APP`  | 0     | True (geometric) altitude | Returns the apparent (refracted) altitude |
| `SE_APP_TO_TRUE`  | 1     | Apparent (observed) altitude | Returns a negative correction to add to apparent altitude to get true altitude |

Note the asymmetry: `SE_TRUE_TO_APP` returns the full apparent altitude directly, while `SE_APP_TO_TRUE` returns a negative correction that you add to the input:

```typescript
// True to apparent (direct result)
const apparentAlt = swe.refraction(trueAlt, P, T, SE_TRUE_TO_APP);

// Apparent to true (correction to add)
const correction = swe.refraction(apparentAlt, P, T, SE_APP_TO_TRUE);
const trueAlt = apparentAlt + correction; // correction is negative
```

### Why refraction is unreliable near the horizon

Below about 1 degree altitude, the standard refraction formula becomes increasingly inaccurate because:

1. **Temperature inversions**: Normally, air temperature decreases with altitude. But near the ground, temperature inversions (warm air above cool air) can occur, creating abnormal density profiles that bend light in unusual ways. This is the cause of **mirages** -- the shimmering "water" on hot roads, or the occasional inverted images of distant ships.

2. **Turbulence**: Near the horizon, light passes through the maximum thickness of atmosphere and encounters more turbulent layers, causing the image to shimmer and distort unpredictably.

3. **The green flash**: Under rare conditions, the differential refraction of different colors (atmospheric dispersion) produces a momentary green flash at the very top of the setting Sun. Red light is refracted less than green/blue light, so the last sliver of sunlight to disappear is skewed toward green.

4. **Ducting**: In extreme inversions, light can be "ducted" along a layer, allowing you to see objects far beyond the normal geometric horizon. This can make refraction effectively infinite at the horizon.

For these reasons, the standard refraction formula should be treated as an approximation below about 1 degree altitude, and as unreliable below about 0 degrees (below the geometric horizon). The actual refraction at any given moment depends on the specific atmospheric conditions, which vary from minute to minute.

### Standard atmosphere values

The standard values used as defaults are:

| Parameter    | Standard Value | Unit  |
|-------------|----------------|-------|
| Pressure     | 1013.25        | mbar (= hPa) |
| Temperature  | 15             | degrees C     |

These represent average sea-level conditions (the ISA -- International Standard Atmosphere). If you set pressure to 0, the function returns 0 refraction (vacuum, no atmosphere).

Approximate pressure at altitude (assuming standard lapse rate):

| Elevation | Pressure | Refraction at horizon |
|-----------|----------|----------------------|
| Sea level | 1013 mbar | ~34 arcmin           |
| 1000 m    | 899 mbar  | ~30 arcmin           |
| 2000 m    | 795 mbar  | ~27 arcmin           |
| 3000 m    | 701 mbar  | ~24 arcmin           |
| 5000 m    | 540 mbar  | ~18 arcmin           |

### Practical applications

- **Rise and set times**: The standard definition of sunrise/sunset uses -50 arcminutes for the Sun's center (-34' refraction - 16' semi-diameter) and -34 arcminutes for stars and planets. The `rise()` and `set()` methods in SwissEph already account for refraction internally.

- **Telescope pointing**: If your telescope's mount uses true (geometric) coordinates from an ephemeris, you need to add refraction to point accurately at low-altitude targets. Most modern Go-To mounts have built-in refraction correction.

- **Satellite tracking**: For low-Earth orbit satellites near the horizon, refraction must be corrected to accurately predict their apparent positions.

- **Surveying and navigation**: Celestial navigation (sextant observations) requires refraction corrections, especially for objects measured near the horizon. Traditional navigation tables include refraction corrections for this purpose.

- **Atmospheric science**: The amount of refraction at a given altitude can be used to estimate atmospheric conditions (temperature profile, density). Monitoring refraction over time can reveal changes in atmospheric structure.

### Relationship to azalt()

The `azalt()` method in SwissEph already applies refraction automatically, returning both `trueAltitude` and `apparentAltitude`. You only need the standalone `refraction()` function when you want to apply refraction corrections independently, for example when working with altitude values from external sources, when building lookup tables, or when you need fine control over the atmospheric parameters.
