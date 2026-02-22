# Ayanamsa and the Sidereal Zodiac

The **ayanamsa** is the angular difference between the tropical zodiac and the sidereal zodiac, measured in degrees. Understanding it requires knowing about two different ways to define the zodiac:

- **Tropical zodiac**: Defined by the seasons. 0 degrees Aries is fixed to the **vernal equinox** (the point where the Sun crosses the celestial equator heading north, around March 20). This is the system used by most Western astrologers.

- **Sidereal zodiac**: Defined by the fixed stars. 0 degrees Aries is fixed to a specific star or stellar reference point. This is the system used by Vedic/Indian astrology (Jyotish) and some Western sidereal astrologers.

Due to the **precession of the equinoxes**, Earth's rotational axis slowly wobbles like a spinning top, completing a full circle in about 25,800 years. This causes the vernal equinox point to drift westward against the background stars at a rate of roughly 50.3 arcseconds per year. As a result, the tropical and sidereal zodiacs slowly drift apart.

The **ayanamsa** is this accumulated drift. In 2024, the Lahiri ayanamsa is approximately 24.18 degrees. This means that a planet at 0 degrees Aries in the tropical zodiac is at approximately 5.82 degrees Pisces in the Lahiri sidereal zodiac (0 - 24.18 = -24.18, or equivalently 360 - 24.18 = 335.82 degrees = 5.82 Pisces).

Different traditions and scholars disagree on the exact epoch when the two zodiacs coincided (i.e., when the ayanamsa was zero), leading to many different ayanamsa systems.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SIDM_LAHIRI } from '../../constants';

const swe = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });
const jd = SwissEph.julianDay(2024, 1, 15, 12);

// Get the Lahiri ayanamsa value
const ayanamsa = swe.getAyanamsa(jd);
console.log(`Lahiri ayanamsa: ${ayanamsa.toFixed(4)} degrees`);
// Lahiri ayanamsa: ~24.1678 degrees

swe.close();
```

---

## Detailed Examples

### Getting the ayanamsa value for different systems

```typescript
import { SwissEph } from '../index';
import {
  SE_SIDM_FAGAN_BRADLEY, SE_SIDM_LAHIRI, SE_SIDM_RAMAN,
  SE_SIDM_KRISHNAMURTI, SE_SIDM_TRUE_CITRA, SE_SIDM_TRUE_REVATI,
  SE_SIDM_GALCENT_0SAG,
} from '../../constants';

const jd = SwissEph.julianDay(2024, 1, 1, 12);

const systems = [
  { id: SE_SIDM_FAGAN_BRADLEY, name: 'Fagan-Bradley' },
  { id: SE_SIDM_LAHIRI,        name: 'Lahiri' },
  { id: SE_SIDM_RAMAN,         name: 'Raman' },
  { id: SE_SIDM_KRISHNAMURTI,  name: 'Krishnamurti' },
  { id: SE_SIDM_TRUE_CITRA,    name: 'True Citra (Spica=180)' },
  { id: SE_SIDM_TRUE_REVATI,   name: 'True Revati' },
  { id: SE_SIDM_GALCENT_0SAG,  name: 'Galactic Center = 0 Sag' },
];

for (const sys of systems) {
  const swe = new SwissEph({ siderealMode: sys.id });
  const aya = swe.getAyanamsa(jd);
  console.log(`${sys.name.padEnd(30)} ${aya.toFixed(4)} deg`);
  swe.close();
}
```

### Computing sidereal planet positions

To get planet positions in the sidereal zodiac, you must:
1. Set the sidereal mode (which ayanamsa to use)
2. Pass `SEFLG_SIDEREAL` in the flags to `calc()`

**Important**: Setting `siderealMode` in the constructor (or calling `setSiderealMode()`) only configures which ayanamsa system to use. It does **not** automatically make `calc()` return sidereal positions. You must explicitly pass `SEFLG_SIDEREAL` in the flags.

```typescript
import { SwissEph } from '../index';
import {
  SE_SUN, SE_MOON, SE_MARS, SE_JUPITER,
  SE_SIDM_LAHIRI, SEFLG_SIDEREAL,
} from '../../constants';

const swe = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });
const jd = SwissEph.julianDay(2024, 1, 15, 12);

const planets = [
  { id: SE_SUN,     name: 'Sun' },
  { id: SE_MOON,    name: 'Moon' },
  { id: SE_MARS,    name: 'Mars' },
  { id: SE_JUPITER, name: 'Jupiter' },
];

console.log('Sidereal positions (Lahiri):');
for (const p of planets) {
  const pos = swe.calc(jd, p.id, SEFLG_SIDEREAL);

  // Convert to Vedic sign
  const signs = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya',
                 'Tula','Vrischika','Dhanu','Makara','Kumbha','Meena'];
  const signIndex = Math.floor(pos.longitude / 30);
  const degInSign = pos.longitude - signIndex * 30;

  console.log(
    `${p.name.padEnd(9)} ${pos.longitude.toFixed(4).padStart(9)} deg = ` +
    `${degInSign.toFixed(2)} deg ${signs[signIndex]}`
  );
}

swe.close();
```

### Comparing tropical and sidereal positions

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_SIDM_LAHIRI, SEFLG_SIDEREAL } from '../../constants';

const swe = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });
const jd = SwissEph.julianDay(2024, 1, 15, 12);

// Tropical position (no SEFLG_SIDEREAL)
const tropical = swe.calc(jd, SE_SUN);

// Sidereal position (with SEFLG_SIDEREAL)
const sidereal = swe.calc(jd, SE_SUN, SEFLG_SIDEREAL);

// The ayanamsa
const ayanamsa = swe.getAyanamsa(jd);

console.log(`Tropical Sun:  ${tropical.longitude.toFixed(4)} deg`);
console.log(`Sidereal Sun:  ${sidereal.longitude.toFixed(4)} deg`);
console.log(`Ayanamsa:      ${ayanamsa.toFixed(4)} deg`);
console.log(`Difference:    ${(tropical.longitude - sidereal.longitude).toFixed(4)} deg`);
// The difference should match the ayanamsa value (approximately)

swe.close();
```

### Using setSiderealMode at runtime

You can change the sidereal mode after construction:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_SIDM_LAHIRI, SE_SIDM_RAMAN, SEFLG_SIDEREAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 15, 12);

// Set Lahiri mode
swe.setSiderealMode(SE_SIDM_LAHIRI);
const lahiri = swe.calc(jd, SE_SUN, SEFLG_SIDEREAL);
console.log(`Sun (Lahiri): ${lahiri.longitude.toFixed(4)} deg`);

// Switch to Raman mode
swe.setSiderealMode(SE_SIDM_RAMAN);
const raman = swe.calc(jd, SE_SUN, SEFLG_SIDEREAL);
console.log(`Sun (Raman):  ${raman.longitude.toFixed(4)} deg`);

console.log(`Difference:   ${(lahiri.longitude - raman.longitude).toFixed(4)} deg`);

swe.close();
```

### Custom ayanamsa with SE_SIDM_USER

If none of the built-in systems match your needs, you can define your own ayanamsa by specifying the epoch (t0) when the ayanamsa was zero and optionally the ayanamsa value at a reference epoch:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_SIDM_USER, SEFLG_SIDEREAL } from '../../constants';

// Define a custom ayanamsa:
//   t0 = the Julian Day when the ayanamsa is zero (both zodiacs align)
//   ayanT0 = the ayanamsa value at t0 (usually 0 for the alignment epoch)
//
// Example: suppose you believe the zodiacs aligned on March 21, 285 AD
const t0 = SwissEph.julianDay(285, 3, 21, 0);
const ayanT0 = 0; // ayanamsa = 0 at this epoch

const swe = new SwissEph({
  siderealMode: SE_SIDM_USER,
  siderealT0: t0,
  siderealAyanT0: ayanT0,
});

const jd = SwissEph.julianDay(2024, 1, 15, 12);

const aya = swe.getAyanamsa(jd);
console.log(`Custom ayanamsa: ${aya.toFixed(4)} deg`);

const sun = swe.calc(jd, SE_SUN, SEFLG_SIDEREAL);
console.log(`Sun (custom sidereal): ${sun.longitude.toFixed(4)} deg`);

swe.close();
```

You can also use `SE_SIDM_USER` to define a fixed ayanamsa value at a known date:

```typescript
import { SwissEph } from '../index';
import { SE_SIDM_USER, SEFLG_SIDEREAL } from '../../constants';

// Suppose you want the ayanamsa to be exactly 23.85 degrees at J2000.0
const t0 = SwissEph.julianDay(2000, 1, 1, 12); // J2000.0
const ayanT0 = 23.85; // degrees

const swe = new SwissEph({
  siderealMode: SE_SIDM_USER,
  siderealT0: t0,
  siderealAyanT0: ayanT0,
});

const jd = SwissEph.julianDay(2024, 1, 15, 12);
const aya = swe.getAyanamsa(jd);
console.log(`Custom ayanamsa at 2024: ${aya.toFixed(4)} deg`);
// Will be ~23.85 + ~24 years of precession (~0.34 deg) = ~24.19

swe.close();
```

### Getting the name of an ayanamsa system

```typescript
import { SwissEph } from '../index';
import {
  SE_SIDM_FAGAN_BRADLEY, SE_SIDM_LAHIRI, SE_SIDM_TRUE_CITRA,
  SE_SIDM_TRUE_REVATI, SE_SIDM_GALCENT_0SAG,
} from '../../constants';

const swe = new SwissEph();

const modes = [
  SE_SIDM_FAGAN_BRADLEY,
  SE_SIDM_LAHIRI,
  SE_SIDM_TRUE_CITRA,
  SE_SIDM_TRUE_REVATI,
  SE_SIDM_GALCENT_0SAG,
];

for (const mode of modes) {
  console.log(`Mode ${mode}: ${swe.getAyanamsaName(mode)}`);
}

swe.close();
```

### Ayanamsa over time

The ayanamsa changes slowly due to precession. Here is how to track it across centuries:

```typescript
import { SwissEph } from '../index';
import { SE_SIDM_LAHIRI } from '../../constants';

const swe = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });

// Ayanamsa at different epochs
const years = [0, 285, 500, 1000, 1500, 1900, 1950, 2000, 2024, 2100];

for (const y of years) {
  const jd = SwissEph.julianDay(y, 1, 1, 12);
  const aya = swe.getAyanamsa(jd);
  console.log(`Year ${String(y).padStart(5)}: ayanamsa = ${aya.toFixed(4)} deg`);
}
// Around year 285, the Lahiri ayanamsa was near 0 (the two zodiacs were aligned)
// The ayanamsa grows by ~50.3 arcseconds per year = ~1 degree every 71.6 years

swe.close();
```

---

## Deep Explanation

### Key ayanamsa systems

| Constant                   | Value | Name / Description                                                                                       |
|---------------------------|-------|-----------------------------------------------------------------------------------------------------------|
| `SE_SIDM_FAGAN_BRADLEY`  | 0     | **Fagan-Bradley**: The standard Western sidereal ayanamsa. Based on Cyril Fagan's research (1950s). Ayanamsa ~24.04 deg in 2000. Used by Western sidereal astrologers. |
| `SE_SIDM_LAHIRI`         | 1     | **Lahiri**: The official ayanamsa of the Indian government (adopted 1955 by the Calendar Reform Committee). The most widely used ayanamsa in Vedic astrology. ~23.86 deg at J2000. |
| `SE_SIDM_DELUCE`         | 2     | **De Luce**: Based on Robert DeLuce's calculations.                                                       |
| `SE_SIDM_RAMAN`          | 3     | **Raman**: B.V. Raman's ayanamsa, popular in South Indian astrology. ~22.38 deg at J2000.                |
| `SE_SIDM_USHASHASHI`     | 4     | **Usha-Shashi**: ~20.08 deg at J2000.                                                                    |
| `SE_SIDM_KRISHNAMURTI`   | 5     | **Krishnamurti**: Used in the KP (Krishnamurti Paddhati) system. ~23.73 deg at J2000.                    |
| `SE_SIDM_GALCENT_0SAG`   | 17    | **Galactic Center at 0 Sagittarius**: Defines the sidereal zodiac such that the Galactic Center is at exactly 0 degrees Sagittarius (240 deg). |
| `SE_SIDM_TRUE_CITRA`     | 27    | **True Citra (Chitrapaksha)**: Defines the zodiac so that the star Spica (Citra) is always at exactly 180 deg (0 Libra). The ayanamsa adjusts dynamically based on Spica's true position. |
| `SE_SIDM_TRUE_REVATI`    | 28    | **True Revati**: Defines the zodiac so that the star Revati (zeta Piscium) is always at 359 deg 50' (29d50' Pisces). |
| `SE_SIDM_TRUE_PUSHYA`    | 29    | **True Pushya**: Defines the zodiac so that the star Pushya (delta Cancri) is always at 106 deg (16 deg Cancer). |
| `SE_SIDM_USER`           | 255   | **User-defined**: Supply your own epoch and ayanamsa value.                                               |

There are over 40 built-in ayanamsa systems in total. The ones listed above are the most commonly used. See the constants file for the complete list (SE_SIDM_0 through SE_SIDM_46, plus SE_SIDM_USER = 255).

### How ayanamsa works mathematically

For a given Julian Day, the ayanamsa A is computed as:

```
sidereal_longitude = tropical_longitude - A
```

Or equivalently:
```
A = tropical_longitude - sidereal_longitude
```

The ayanamsa is a single value that applies uniformly to all longitudes. To convert any tropical position to sidereal, subtract the ayanamsa. To convert sidereal to tropical, add the ayanamsa.

### True star-based vs. epoch-based ayanamsas

There are two categories of ayanamsa:

1. **Epoch-based** (Lahiri, Fagan-Bradley, Raman, etc.): The ayanamsa is defined by choosing an epoch when the two zodiacs were aligned (or an epoch with a known ayanamsa value). The value changes at the constant rate of precession (~50.3"/year). These ayanamsas change smoothly and predictably.

2. **True star-based** (True Citra, True Revati, True Pushya): The ayanamsa is defined by the current actual position of a reference star. Since the star has its own proper motion (independent movement through space), the ayanamsa subtly fluctuates in ways that cannot be predicted from precession alone. These are slightly more accurate in terms of the zodiac's relationship to the actual stars but are more complex to compute.

### The precession cycle

The precession of the equinoxes is caused by the gravitational pull of the Sun and Moon on Earth's equatorial bulge. Key facts:

- **Rate**: ~50.29 arcseconds per year (varies slightly over millennia)
- **Full cycle**: ~25,772 years
- **Direction**: The vernal equinox moves westward (backward through the zodiac)
- **Current direction**: The vernal equinox is currently in the early degrees of Pisces (sidereal) and slowly moving toward Aquarius -- this is the astronomical basis for the "Age of Aquarius"

### Vedic astrology context

In Jyotish (Vedic/Indian astrology), the sidereal zodiac is fundamental. The 12 rashis (signs) and 27 nakshatras (lunar mansions) are all defined in sidereal terms. Most Vedic astrologers use the Lahiri ayanamsa, though Krishnamurti (KP) and Raman are also popular.

The nakshatras divide the sidereal zodiac into 27 equal portions of 13 degrees 20 minutes each:
- Ashwini: 0d00' to 13d20' Aries (sidereal)
- Bharani: 13d20' to 26d40' Aries (sidereal)
- Krittika: 26d40' Aries to 10d00' Taurus (sidereal)
- ...and so on

To place a planet in its nakshatra, first compute its sidereal longitude (using `SEFLG_SIDEREAL`), then divide by 13.333:

```typescript
const nakshatraIndex = Math.floor(siderealLongitude / (360 / 27));
// 0 = Ashwini, 1 = Bharani, ..., 26 = Revati
```

### Important: SEFLG_SIDEREAL must be passed explicitly

Setting `siderealMode` in the constructor or calling `setSiderealMode()` only tells the engine **which** ayanamsa system to use. It does **not** make `calc()` automatically return sidereal positions. You must pass `SEFLG_SIDEREAL` as a flag to `calc()` each time you want sidereal results.

This design allows you to easily get both tropical and sidereal positions from the same `SwissEph` instance:

```typescript
const swe = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });

// Tropical (default -- no SEFLG_SIDEREAL)
const tropical = swe.calc(jd, SE_SUN);

// Sidereal (must pass the flag)
const sidereal = swe.calc(jd, SE_SUN, SEFLG_SIDEREAL);
```

### Edge cases

- **Negative ayanamsa**: For dates before approximately 285 AD (depending on the system), the Lahiri ayanamsa is negative, meaning the sidereal longitude is greater than the tropical longitude.
- **Ayanamsa near 30 degrees**: At some point in the far future (~year 2300 for Lahiri), the ayanamsa will be 30 degrees, meaning the tropical and sidereal zodiacs will be off by exactly one sign. We are currently about 6 degrees short of this.
- **Combining with other flags**: `SEFLG_SIDEREAL` can be combined with `SEFLG_EQUATORIAL`, `SEFLG_TOPOCTR`, and other flags using bitwise OR.
