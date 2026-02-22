# Ephemeris Files

The Swiss Ephemeris supports three different ephemeris modes, each offering a different tradeoff between convenience, precision, and resource requirements:

- **Moshier** (default): A purely analytical ephemeris built into the library. No external files needed. Accuracy is about 1 arcsecond for planets and a few arcseconds for the Moon over the period 3000 BCE to 3000 CE. This is the easiest to use and is sufficient for most astrological applications.

- **Swiss Ephemeris (SWIEPH)**: Compressed data derived from NASA's JPL ephemerides, stored in `.se1` binary files. Accuracy is about 0.001 arcsecond (1 milliarcsecond) -- roughly 1000 times more precise than Moshier. Covers about 10,800 years (5400 BCE to 5400 CE). File sizes are modest (a few hundred KB each).

- **JPL Development Ephemeris**: NASA's own ephemeris files (DE441, DE440, etc.), the gold standard used for space mission navigation. Accuracy is limited only by the observations used to construct it. File sizes are large (hundreds of MB to several GB). Covers up to 26,000 years (DE441).

For most applications, the built-in Moshier ephemeris is perfectly adequate. You only need external files if you require milliarcsecond precision or have specific research needs.

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';

// Default: Moshier analytical ephemeris (no files needed)
const swe = new SwissEph();
const jd = SwissEph.julianDay(2024, 6, 21, 12);
const mars = swe.calc(jd, SE_MARS);
console.log(`Mars (Moshier): ${mars.longitude.toFixed(6)} deg`);
swe.close();
```

---

## Detailed Examples

### Using the Moshier ephemeris (default)

No setup required. Just create a SwissEph instance and start calculating:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SE_MARS } from '../../constants';

const swe = new SwissEph(); // Default: Moshier

const jd = SwissEph.julianDay(2024, 1, 1, 12);
console.log(`Sun:  ${swe.calc(jd, SE_SUN).longitude.toFixed(6)} deg`);
console.log(`Moon: ${swe.calc(jd, SE_MOON).longitude.toFixed(6)} deg`);
console.log(`Mars: ${swe.calc(jd, SE_MARS).longitude.toFixed(6)} deg`);

swe.close();
```

### Loading Swiss Ephemeris (SE1) files

SE1 files contain compressed Chebyshev polynomial coefficients for very high precision. You need separate files for planets, the Moon, and asteroids:

| File pattern    | Contents              |
|-----------------|-----------------------|
| `sepl_*.se1`    | Major planets         |
| `semo_*.se1`    | The Moon              |
| `seas_*.se1`    | Asteroids             |

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SE_MARS } from '../../constants';

// Create instance configured for Swiss Ephemeris mode
const swe = new SwissEph({ ephemeris: 'swisseph' });

// Load the SE1 files (you must provide the ArrayBuffer data)
// In Node.js:
import { readFileSync } from 'fs';
const planetData = readFileSync('ephe/sepl_18.se1');
const moonData = readFileSync('ephe/semo_18.se1');

swe.loadEphemerisFile(planetData.buffer, 'sepl_18.se1');
swe.loadEphemerisFile(moonData.buffer, 'semo_18.se1');

// In a browser, you would fetch the files:
// const resp = await fetch('/ephe/sepl_18.se1');
// const planetData = await resp.arrayBuffer();
// swe.loadEphemerisFile(planetData, 'sepl_18.se1');

// Now calculate with milliarcsecond precision
const jd = SwissEph.julianDay(2024, 1, 1, 12);
console.log(`Sun (SWIEPH):  ${swe.calc(jd, SE_SUN).longitude.toFixed(6)} deg`);
console.log(`Moon (SWIEPH): ${swe.calc(jd, SE_MOON).longitude.toFixed(6)} deg`);
console.log(`Mars (SWIEPH): ${swe.calc(jd, SE_MARS).longitude.toFixed(6)} deg`);

swe.close();
```

### Loading JPL ephemeris files

JPL files (like DE441) provide the ultimate in precision:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SE_MARS } from '../../constants';
import { readFileSync } from 'fs';

const swe = new SwissEph({ ephemeris: 'jpl' });

// Load the JPL file
const jplData = readFileSync('ephe/de441.eph');
swe.loadJplFile(jplData.buffer, 'de441.eph');

const jd = SwissEph.julianDay(2024, 1, 1, 12);
console.log(`Sun (JPL):  ${swe.calc(jd, SE_SUN).longitude.toFixed(6)} deg`);
console.log(`Moon (JPL): ${swe.calc(jd, SE_MOON).longitude.toFixed(6)} deg`);
console.log(`Mars (JPL): ${swe.calc(jd, SE_MARS).longitude.toFixed(6)} deg`);

swe.close();
```

### Fallback behavior

If you request a higher-precision ephemeris but the necessary file is not loaded, the engine silently falls back:

- JPL mode falls back to SWIEPH (if SE1 files loaded), then to Moshier
- SWIEPH mode falls back to Moshier

You can detect the actual ephemeris used by checking the returned `flags`:

```typescript
import { SwissEph } from '../index';
import { SE_MARS, SEFLG_MOSEPH, SEFLG_SWIEPH, SEFLG_JPLEPH } from '../../constants';

// Request SWIEPH but do not load any files
const swe = new SwissEph({ ephemeris: 'swisseph' });

const jd = SwissEph.julianDay(2024, 1, 1, 12);
const mars = swe.calc(jd, SE_MARS);

// Check which ephemeris was actually used
if (mars.flags & SEFLG_JPLEPH) {
  console.log('Used: JPL');
} else if (mars.flags & SEFLG_SWIEPH) {
  console.log('Used: Swiss Ephemeris (SE1 files)');
} else {
  console.log('Used: Moshier (fallback)');
}
// Output: "Used: Moshier (fallback)" because no SE1 files were loaded

swe.close();
```

### Comparing precision between ephemeris modes

```typescript
import { SwissEph } from '../index';
import { SE_MARS } from '../../constants';
import { readFileSync } from 'fs';

const jd = SwissEph.julianDay(2024, 1, 1, 12);

// Moshier
const mosh = new SwissEph();
const marsMosh = mosh.calc(jd, SE_MARS);

// Swiss Ephemeris
const swi = new SwissEph({ ephemeris: 'swisseph' });
const planetData = readFileSync('ephe/sepl_18.se1');
swi.loadEphemerisFile(planetData.buffer, 'sepl_18.se1');
const marsSwi = swi.calc(jd, SE_MARS);

// Compare
const diffArcsec = Math.abs(marsMosh.longitude - marsSwi.longitude) * 3600;
console.log(`Mars (Moshier):  ${marsMosh.longitude.toFixed(8)} deg`);
console.log(`Mars (SWIEPH):   ${marsSwi.longitude.toFixed(8)} deg`);
console.log(`Difference:      ${diffArcsec.toFixed(4)} arcseconds`);

mosh.close();
swi.close();
```

### Setting the ephemeris file path

For systems that read files from disk (not applicable to in-memory ArrayBuffer loading, but useful if the underlying engine supports path-based loading):

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph({ ephemeris: 'swisseph' });

// Tell the engine where to look for ephemeris files
swe.setEphePath('/path/to/ephemeris/files');

swe.close();
```

---

## Deep Explanation

### The JPL Development Ephemeris series

NASA's Jet Propulsion Laboratory (JPL) has been producing numerical ephemerides since the 1960s. Each version (called a "Development Ephemeris" or DE) incorporates improved observations and models. The major versions:

| Version | Year | Time span              | Notes                                                   |
|---------|------|------------------------|---------------------------------------------------------|
| DE200   | 1981 | 1600-2169              | First widely used modern ephemeris. Based on optical and radar observations. |
| DE405   | 1998 | 1600-2200              | Major improvement incorporating VLBI data and LLR (Lunar Laser Ranging). Used as reference for many years. |
| DE406   | 1998 | -3000 to +3000         | Long-span version of DE405 with slightly reduced precision. |
| DE421   | 2008 | 1900-2050              | Updated with additional LLR data and Mars spacecraft tracking. |
| DE430   | 2014 | 1550-2650              | Incorporated MESSENGER data at Mercury and improved Mars data. |
| DE431   | 2014 | -13200 to +17191       | Long-span version of DE430 for historical research.     |
| DE440   | 2020 | 1550-2650              | Latest short-span ephemeris with Juno data at Jupiter.   |
| DE441   | 2020 | -13200 to +17191       | Long-span version of DE440. Current standard.            |

Short-span versions (DE440) are slightly more accurate than their long-span counterparts (DE441) because they can include the effect of the Moon's liquid core-mantle interaction, which dissipates over long timescales but matters for the highest precision over short intervals. The difference is sub-milliarcsecond and irrelevant for nearly all applications.

### What the files contain

All three ephemeris formats store the same fundamental data: positions (and sometimes velocities) of solar system bodies as functions of time. The difference is in representation and precision:

**JPL files** store **Chebyshev polynomial coefficients** in fixed-length records. Each record covers a specific time interval (typically 32 days) and contains sets of polynomial coefficients for each body. To get a position at any time, the engine evaluates the Chebyshev polynomial for the relevant interval. The polynomials are fitted to the output of JPL's numerical integration to the full precision of the integration. Velocities are obtained by differentiating the polynomial.

Bodies covered: Sun, Moon, Mercury through Pluto, lunar librations, and (in newer versions) the Earth-Moon nutation angles.

**SE1 files** use the same Chebyshev polynomial approach but with compressed coefficients. The Swiss Ephemeris developers took the JPL data, verified it, and repackaged it with data compression (reducing precision from ~10 significant digits to ~8, still yielding milliarcsecond accuracy) and split it into separate files for planets, Moon, and asteroids. This dramatically reduces file sizes.

**Moshier** uses completely different analytical expressions -- series expansions in powers of time fitted to the JPL ephemeris. No Chebyshev polynomials, no external data. The series terms are hard-coded in the library. For the planets, Moshier's implementation is based on Steve Moshier's adaptation of Jean Meeus's algorithms (themselves based on the VSOP87 planetary theory for planets and ELP 2000-85 for the Moon). The limited number of terms in the series expansion is what limits accuracy to about 1 arcsecond.

### File sizes

| Ephemeris     | Files needed                       | Total size (approx)  |
|---------------|------------------------------------|-----------------------|
| Moshier       | None                               | 0 (built-in)         |
| SE1 (planets) | `sepl_18.se1`                      | ~500 KB              |
| SE1 (Moon)    | `semo_18.se1`                      | ~1.2 MB              |
| SE1 (asteroids) | `seas_18.se1`                    | varies               |
| DE405         | `de405.eph` (or segments)          | ~55 MB               |
| DE406         | `de406.eph`                        | ~190 MB              |
| DE441         | `de441.eph`                        | ~2.6 GB              |
| DE440         | `de440.eph`                        | ~115 MB              |

### Accuracy comparison

| Ephemeris | Planet accuracy (modern dates) | Moon accuracy  | Time range          |
|-----------|-------------------------------|----------------|---------------------|
| Moshier   | ~1 arcsecond                  | ~3 arcseconds  | ~3000 BCE-3000 CE   |
| SE1       | ~0.001 arcsecond              | ~0.001 arcsec  | ~5400 BCE-5400 CE   |
| DE441     | ~0.0001 arcsecond (inner planets) | ~0.001 arcsec | 13200 BCE-17191 CE |

To put 1 arcsecond in perspective: at the distance of the Moon, 1 arcsecond corresponds to about 1.9 km on the lunar surface. At the distance of Mars at closest approach, it corresponds to about 530 km. For astrology, where positions are meaningful to about 1 arcminute (60 arcseconds), Moshier's 1-arcsecond accuracy is more than adequate.

### Tidal acceleration and DE versions

Different JPL ephemeris versions use different values for the tidal acceleration of the Moon (which affects long-term lunar motion). The Swiss Ephemeris automatically adjusts its internal tidal acceleration parameter to match the loaded ephemeris:

| DE version     | Tidal acceleration (arcsec/cy^2) |
|----------------|----------------------------------|
| DE200          | -23.8946                         |
| DE405/DE406    | -25.826                          |
| DE421          | -25.85                           |
| DE430/DE431    | -25.82                           |
| DE440/DE441    | -25.936                          |

This parameter affects Delta-T calculations and long-term lunar motion predictions. When a JPL or SE1 file is loaded, the appropriate value is set automatically.

### When to use which ephemeris

**Moshier (default)** -- Use for:
- General astrological software
- Mobile/web applications where you want to minimize download size
- Quick calculations where sub-arcsecond precision is not needed
- Dates within about 3000 BCE to 3000 CE

**Swiss Ephemeris (SE1 files)** -- Use for:
- Professional astrological software requiring milliarcsecond precision
- Applications where you need both high precision and moderate file sizes
- Date ranges up to about 5400 BCE to 5400 CE
- Research requiring highly accurate historical positions

**JPL (DE441 etc.)** -- Use for:
- Scientific research
- Verifying calculations against the "gold standard"
- Space mission planning and navigation
- Very long time spans (DE441 covers 26,000 years)
- When you need the absolute highest precision available

### Loading files in different environments

**Node.js:**
```typescript
import { readFileSync } from 'fs';

const data = readFileSync('ephe/sepl_18.se1');
swe.loadEphemerisFile(data.buffer, 'sepl_18.se1');
```

**Browser (fetch):**
```typescript
const response = await fetch('/ephe/sepl_18.se1');
const data = await response.arrayBuffer();
swe.loadEphemerisFile(data, 'sepl_18.se1');
```

**Bundled (import):**
If your build tool supports importing binary files as ArrayBuffers, you can bundle the SE1 files directly into your application. This is convenient for small files like `sepl_18.se1` (~500 KB).

### SE1 file naming convention

SE1 files follow a naming pattern where the number indicates the century range:

| File         | Century coverage                  |
|-------------|-----------------------------------|
| `sepl_18.se1` | Planets, covering centuries 18-27 (1800-2700 CE) |
| `semo_18.se1` | Moon, covering centuries 18-27    |
| `sepl_06.se1` | Planets, covering centuries 6-17 (600-1800 CE) |

For most modern-date applications, the `_18` files are sufficient. For historical work you may need additional files covering earlier centuries.

### Multiple files can be loaded

You can load multiple SE1 files simultaneously. The engine will use whichever file covers the requested date:

```typescript
import { readFileSync } from 'fs';

// Load planet files for two century ranges
swe.loadEphemerisFile(readFileSync('ephe/sepl_06.se1').buffer, 'sepl_06.se1');
swe.loadEphemerisFile(readFileSync('ephe/sepl_18.se1').buffer, 'sepl_18.se1');

// This works for dates in both ranges
const jd1 = SwissEph.julianDay(1200, 6, 15, 12); // Uses sepl_06
const jd2 = SwissEph.julianDay(2024, 6, 15, 12); // Uses sepl_18
```

### JPL file auto-detection

When loading a JPL file, the library automatically detects the DE version, time span, and endianness. You do not need to specify which DE version you are loading -- the library reads this from the file header.

```typescript
swe.loadJplFile(data, 'de441.eph');
// Internally, the library reads the header and configures itself for DE441
```

If the file name is not provided, the library attempts to use a default name. It is best practice to always provide the name.
