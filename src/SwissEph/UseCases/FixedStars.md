# Fixed Stars

Fixed stars are the distant suns that form the constellations. Despite the name "fixed," they are not truly stationary -- they have proper motion (their own movement through space), and their apparent positions shift slowly due to precession of the equinoxes. However, compared to planets, their motion is extremely slow (typically fractions of an arcsecond per year), so for most practical purposes they appear fixed against the celestial background.

In astrology, certain bright stars have been considered significant for thousands of years. Conjunctions of planets with prominent stars like Regulus, Spica, Aldebaran, Antares, and Sirius are interpreted in natal and mundane astrology. In Vedic astrology, specific stars define the sidereal zodiac (the nakshatras).

The Swiss Ephemeris includes a catalog of thousands of fixed stars with their positions, proper motions, and visual magnitudes.

---

## Quick Example

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Look up Spica
const spica = swe.fixedStar('Spica', jd);
console.log(`Spica: ${spica.longitude.toFixed(4)} deg, magnitude visible from fixedStarMagnitude()`);
console.log(`Full name: ${spica.starName}`);
// Full name: "Spica,alVir" (traditional name, Bayer designation)

// Get visual magnitude
const mag = swe.fixedStarMagnitude('Spica');
console.log(`Spica magnitude: ${mag.toFixed(2)}`);

swe.close();
```

---

## Detailed Examples

### Looking up several well-known stars

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 6, 21, 12); // Summer solstice 2024

const starNames = [
  'Aldebaran',   // alpha Tauri, "Eye of the Bull"
  'Regulus',     // alpha Leonis, "Heart of the Lion"
  'Spica',       // alpha Virginis
  'Antares',     // alpha Scorpii, "Heart of the Scorpion"
  'Sirius',      // alpha Canis Majoris, brightest star in the sky
  'Fomalhaut',   // alpha Piscis Austrini, one of the "Royal Stars"
  'Algol',       // beta Persei, the "Demon Star"
  'Polaris',     // alpha Ursae Minoris, the North Star
  'Vega',        // alpha Lyrae
  'Canopus',     // alpha Carinae, second-brightest star
];

for (const name of starNames) {
  const star = swe.fixedStar(name, jd);
  const mag = swe.fixedStarMagnitude(name);
  console.log(
    `${name.padEnd(12)} lon: ${star.longitude.toFixed(4).padStart(9)} deg` +
    `  lat: ${star.latitude.toFixed(4).padStart(8)} deg` +
    `  mag: ${mag.toFixed(2)}`
  );
}

swe.close();
```

### The starName field format

When you call `fixedStar()`, the returned `starName` field contains the canonical name in the format `"traditional,Bayer"`. The traditional name is the common name (e.g., "Spica"), and the Bayer designation uses the Greek letter abbreviation and constellation abbreviation (e.g., "alVir" for alpha Virginis).

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

const star = swe.fixedStar('Regulus', jd);
console.log(star.starName);
// "Regulus,alLeo"
// "Regulus" = traditional name
// "alLeo"  = alpha Leonis (Bayer designation)

swe.close();
```

### Searching by partial name

You can pass a partial name and the engine will find the first matching star. The search is case-insensitive for the traditional name portion.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Search by partial traditional name
const result = swe.fixedStar('Alde', jd);
console.log(result.starName); // "Aldebaran,alTau"

swe.close();
```

### Searching by Bayer/Flamsteed designation

You can also search by the Bayer designation. Prefix the search string with a comma to search the designation field:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Search by Bayer designation: comma prefix tells the engine
// to search the designation field
const result = swe.fixedStar(',alTau', jd);
console.log(result.starName); // "Aldebaran,alTau"

const result2 = swe.fixedStar(',alCMa', jd);
console.log(result2.starName); // "Sirius,alCMa"

swe.close();
```

### Stars used for sidereal ayanamsas

Several ayanamsa systems are defined by the position of a specific star. These stars are built into the engine and are used internally when computing star-based ayanamsas:

```typescript
import { SwissEph } from '../index';
import { SE_SIDM_TRUE_CITRA, SE_SIDM_TRUE_REVATI, SE_SIDM_TRUE_PUSHYA } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Spica (Citra in Sanskrit) -- defines SE_SIDM_TRUE_CITRA
// In this system, Spica is fixed at exactly 0 deg Libra (180 deg)
const spica = swe.fixedStar('Spica', jd);
console.log(`Spica (Citra): ${spica.longitude.toFixed(4)} deg`);

// Revati (zeta Piscium) -- defines SE_SIDM_TRUE_REVATI
// In this system, Revati is fixed at exactly 29d50' Pisces (359.833 deg)
const revati = swe.fixedStar(',zePs', jd);
console.log(`Revati: ${revati.longitude.toFixed(4)} deg  (${revati.starName})`);

// Pushya (delta Cancri) -- defines SE_SIDM_TRUE_PUSHYA
// In this system, Pushya is fixed at exactly 16 deg Cancer (106 deg)
const pushya = swe.fixedStar(',deCnc', jd);
console.log(`Pushya: ${pushya.longitude.toFixed(4)} deg  (${pushya.starName})`);

swe.close();
```

### Getting equatorial coordinates of a star

```typescript
import { SwissEph } from '../index';
import { SEFLG_EQUATORIAL } from '../../constants';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

const sirius = swe.fixedStar('Sirius', jd, SEFLG_EQUATORIAL);
// longitude -> Right Ascension (degrees)
// latitude  -> Declination (degrees)
const raHours = sirius.longitude / 15;
console.log(`Sirius RA:  ${raHours.toFixed(4)} hours`);
console.log(`Sirius Dec: ${sirius.latitude.toFixed(4)} deg`);

swe.close();
```

### fixedStar vs fixedStar2

Both `fixedStar()` and `fixedStar2()` compute fixed star positions and accept the same parameters. They are functionally equivalent in this wrapper. The distinction comes from the original C library where `swe_fixstar2` used a slightly different internal search algorithm. You can use either one interchangeably.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 1, 1, 12);

const r1 = swe.fixedStar('Regulus', jd);
const r2 = swe.fixedStar2('Regulus', jd);

console.log(`fixedStar:  ${r1.longitude.toFixed(6)}`);
console.log(`fixedStar2: ${r2.longitude.toFixed(6)}`);
// Both return identical results

swe.close();
```

### Visual magnitude

Visual magnitude measures how bright a star appears from Earth. Lower numbers are brighter. Negative magnitudes are very bright. The scale is logarithmic: a difference of 5 magnitudes corresponds to a factor of 100 in brightness.

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();

// Some notable magnitudes for reference:
const stars = ['Sirius', 'Canopus', 'Vega', 'Polaris', 'Algol', 'Spica'];

for (const name of stars) {
  const mag = swe.fixedStarMagnitude(name);
  console.log(`${name.padEnd(10)} magnitude: ${mag.toFixed(2)}`);
}
// Sirius is about -1.46 (very bright)
// Polaris is about 2.02 (moderately bright)

swe.close();
```

---

## Deep Explanation

### What positions mean for fixed stars

The return values for fixed stars are the same as for planets:

| Field             | Meaning for fixed stars                                                    |
|-------------------|----------------------------------------------------------------------------|
| `longitude`       | Ecliptic longitude in degrees (0-360), or RA if `SEFLG_EQUATORIAL`        |
| `latitude`        | Ecliptic latitude in degrees, or Declination if `SEFLG_EQUATORIAL`        |
| `distance`        | Distance in AU (very large numbers for stars; 1 parsec = 206265 AU)       |
| `longitudeSpeed`  | Annual proper motion in longitude, expressed as degrees per day            |
| `latitudeSpeed`   | Annual proper motion in latitude, expressed as degrees per day             |
| `distanceSpeed`   | Radial velocity contribution to distance change (degrees per day)         |
| `starName`        | Canonical name: `"TraditionalName,BayerDesignation"`                      |

### Why fixed star positions change

Even though stars appear "fixed," their calculated ecliptic longitude changes over time for two reasons:

1. **Precession of the equinoxes** (~50.3 arcseconds/year): The Earth's axis wobbles like a top with a period of about 25,800 years. This shifts the reference point (vernal equinox) that defines 0 degrees Aries in the tropical zodiac. All star longitudes increase by about 50.3"/year due to precession alone. This is by far the dominant effect.

2. **Proper motion**: Each star has its own velocity through space. Most proper motions are tiny (under 1"/year), but a few nearby stars move noticeably. Barnard's Star has the largest proper motion at about 10.3"/year.

### The Four Royal Stars

In ancient Persian (Zoroastrian) astrology, four bright stars were considered the "Watchers" or "Royal Stars," roughly marking the four cardinal directions of the zodiac around 3000 BCE:

- **Aldebaran** (Watcher of the East) -- currently ~10 degrees Gemini
- **Regulus** (Watcher of the North) -- currently ~0 degrees Virgo
- **Antares** (Watcher of the West) -- currently ~10 degrees Sagittarius
- **Fomalhaut** (Watcher of the South) -- currently ~4 degrees Pisces

Due to precession, these stars have moved about 40 degrees since the system was established.

### Bayer designation abbreviations

The Bayer designation uses abbreviated Greek letters and constellation names:

| Abbreviation | Greek Letter | Example             |
|-------------|--------------|---------------------|
| al          | alpha        | alVir = alpha Virginis (Spica) |
| be          | beta         | bePer = beta Persei (Algol)   |
| ga          | gamma        | gaOri = gamma Orionis         |
| de          | delta        | deCnc = delta Cancri          |
| ep          | epsilon      | epCMa = epsilon Canis Majoris |
| ze          | zeta         | zePs = zeta Piscium (Revati)  |

Constellation abbreviations follow the standard IAU three-letter codes: Vir (Virgo), Leo (Leo), Tau (Taurus), Ori (Orion), CMa (Canis Major), etc.

### Applicable flags

Most flags that work with planets also work with fixed stars:

- `SEFLG_EQUATORIAL` -- get Right Ascension and Declination
- `SEFLG_XYZ` -- get Cartesian coordinates
- `SEFLG_SIDEREAL` -- get sidereal position (requires `siderealMode` configured)
- `SEFLG_J2000` -- refer to J2000 equinox
- `SEFLG_NONUT` -- mean equinox of date (no nutation)
- `SEFLG_RADIANS` -- angles in radians

Flags that do not apply to fixed stars (they are silently ignored):
- `SEFLG_HELCTR` -- stars are so distant that heliocentric/geocentric makes no difference
- `SEFLG_TOPOCTR` -- similarly, topocentric parallax is negligible for stars
- `SEFLG_TRUEPOS`, `SEFLG_NOABERR`, `SEFLG_NOGDEFL` -- aberration and light deflection do apply and can be toggled

### Magnitude scale reference

| Magnitude | Example                          |
|-----------|----------------------------------|
| -1.46     | Sirius (brightest star)          |
| -0.72     | Canopus (second brightest)       |
| 0.03      | Vega                             |
| 0.08      | Capella                          |
| 0.85      | Aldebaran                        |
| 1.00      | Spica                            |
| 1.06      | Antares                          |
| 1.35      | Regulus                          |
| 2.02      | Polaris                          |
| 6.0       | Approximate naked-eye limit      |

Lower magnitude = brighter. Each step of 1 magnitude = ~2.512x brightness difference.
