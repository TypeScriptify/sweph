# Moon Crossings

**Moon crossings** let you find the exact moment the Moon reaches a specific ecliptic longitude or crosses the ecliptic plane (a node crossing). The Moon moves much faster than the Sun -- about 13 degrees per day -- so it crosses any given longitude roughly once every 27.3 days (one sidereal month).

This library provides two related functions:
- **`moonCrossing(longitude, jd)`** -- finds when the Moon next reaches a specific ecliptic longitude
- **`moonNodeCrossing(jd)`** -- finds when the Moon next crosses through the ecliptic plane (ascending or descending node)

These are useful for:
- Finding exact New Moon and Full Moon times
- Tracking lunar transits to natal chart positions
- Finding when the Moon enters each zodiac sign
- Computing eclipse timing (eclipses occur near node crossings)
- Understanding the lunar node cycle (important in both Western and Vedic astrology)

---

## Quick Example

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();
const startJd = SwissEph.julianDay(2025, 3, 1, 0);

// A Full Moon occurs when the Moon is opposite the Sun (Sun's longitude + 180°).
// Step 1: Get the Sun's longitude
const sun = swe.calc(startJd, SE_SUN);

// Step 2: Find when the Moon reaches the opposite point
const fullMoonLon = (sun.longitude + 180) % 360;
const result = swe.moonCrossing(fullMoonLon, startJd);

const d = SwissEph.fromJulianDay(result.jd);
console.log(`Next Full Moon after Mar 1, 2025: JD ${result.jd.toFixed(6)}`);
console.log(`Date: ${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')}`);

swe.close();
```

---

## Detailed Examples

### Finding the next New Moon and Full Moon

A **New Moon** occurs when the Moon has the same ecliptic longitude as the Sun (conjunction). A **Full Moon** occurs when the Moon is at the Sun's longitude + 180 degrees (opposition).

Note: For precise New/Full Moon timing, you should iteratively refine, because the Sun also moves during the time it takes the Moon to reach the target. Here is a simple approach:

```typescript
import { SwissEph } from '../index';
import { SE_SUN } from '../../constants';

const swe = new SwissEph();
const startJd = SwissEph.julianDay(2025, 6, 1, 0);

// --- Find the next New Moon ---
// Iterative refinement: get Sun position, find Moon crossing, repeat
let jd = startJd;
for (let i = 0; i < 3; i++) {
  const sun = swe.calc(jd, SE_SUN);
  const result = swe.moonCrossing(sun.longitude, jd);
  jd = result.jd;
}
const newMoon = SwissEph.fromJulianDay(jd);
const nmHours = (newMoon.day % 1) * 24;
console.log(
  `New Moon: ${newMoon.year}-${String(newMoon.month).padStart(2,'0')}-` +
  `${String(Math.floor(newMoon.day)).padStart(2,'0')} ` +
  `${String(Math.floor(nmHours)).padStart(2,'0')}:${String(Math.floor((nmHours % 1) * 60)).padStart(2,'0')} UT`
);

// --- Find the next Full Moon ---
jd = startJd;
for (let i = 0; i < 3; i++) {
  const sun = swe.calc(jd, SE_SUN);
  const result = swe.moonCrossing((sun.longitude + 180) % 360, jd);
  jd = result.jd;
}
const fullMoon = SwissEph.fromJulianDay(jd);
const fmHours = (fullMoon.day % 1) * 24;
console.log(
  `Full Moon: ${fullMoon.year}-${String(fullMoon.month).padStart(2,'0')}-` +
  `${String(Math.floor(fullMoon.day)).padStart(2,'0')} ` +
  `${String(Math.floor(fmHours)).padStart(2,'0')}:${String(Math.floor((fmHours % 1) * 60)).padStart(2,'0')} UT`
);

swe.close();
```

### Finding when the Moon enters each zodiac sign

The Moon changes signs roughly every 2.3 days. Here is how to find each sign ingress during a month:

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
let jd = SwissEph.julianDay(2025, 4, 1, 0);
const endJd = SwissEph.julianDay(2025, 5, 1, 0);

const signs = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

console.log('Moon sign ingresses for April 2025:');

while (jd < endJd) {
  // Find the Moon's current sign
  const moon = swe.calc(jd, 1); // SE_MOON = 1
  const currentSign = Math.floor(moon.longitude / 30);

  // The next sign boundary
  const nextSignLon = ((currentSign + 1) % 12) * 30;

  const result = swe.moonCrossing(nextSignLon, jd);
  if (result.jd >= endJd) break;

  const d = SwissEph.fromJulianDay(result.jd);
  const hours = (d.day % 1) * 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const signIndex = nextSignLon / 30;

  console.log(
    `  Moon enters ${signs[signIndex].padEnd(12)} ` +
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')} ` +
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} UT`
  );

  jd = result.jd + 0.1; // advance a bit past the crossing
}

swe.close();
```

### Finding lunar node crossings

The Moon's orbit is tilted about 5.1 degrees relative to the ecliptic. It crosses the ecliptic plane twice per orbit -- once going north (ascending node) and once going south (descending node).

```typescript
import { SwissEph } from '../index';

const swe = new SwissEph();
let jd = SwissEph.julianDay(2025, 1, 1, 0);
const endJd = SwissEph.julianDay(2026, 1, 1, 0);

console.log('Moon node crossings in 2025:');
console.log('Date                Node         Longitude  Latitude');
console.log('------------------  -----------  ---------  --------');

let count = 0;
while (jd < endJd && count < 30) {
  const result = swe.moonNodeCrossing(jd);
  if (result.jd >= endJd) break;

  const d = SwissEph.fromJulianDay(result.jd);
  const hours = (d.day % 1) * 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);

  // Latitude near zero at node; sign tells us which node
  // Ascending node: Moon crosses from south to north (latitude was negative, becomes positive)
  // We can check by computing the Moon slightly after the crossing
  const moonAfter = swe.calc(result.jd + 0.01, 1);
  const nodeType = moonAfter.latitude > 0 ? 'Ascending ' : 'Descending';

  console.log(
    `${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')} ` +
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} UT  ` +
    `${nodeType}  ` +
    `${result.longitude.toFixed(3).padStart(8)}°  ` +
    `${result.latitude.toFixed(5).padStart(8)}°`
  );

  jd = result.jd + 10; // Nodes are about 13.6 days apart
  count++;
}

swe.close();
```

### Identifying potential eclipse seasons

Eclipses occur when a New Moon or Full Moon happens close to a lunar node. By combining `moonCrossing()` and `moonNodeCrossing()`, you can identify these windows:

```typescript
import { SwissEph } from '../index';
import { SE_SUN, SE_MOON, SE_TRUE_NODE } from '../../constants';

const swe = new SwissEph();
let jd = SwissEph.julianDay(2025, 1, 1, 0);
const endJd = SwissEph.julianDay(2026, 1, 1, 0);

console.log('Potential eclipse windows in 2025:');
console.log('(New/Full Moons within 18° of a node)\n');

// Find each New and Full Moon in the year
while (jd < endJd) {
  const sun = swe.calc(jd, SE_SUN);

  // Find next New Moon (Moon at Sun's longitude)
  const nm = swe.moonCrossing(sun.longitude, jd);
  if (nm.jd >= endJd) break;

  // Check distance from the True Node
  const node = swe.calc(nm.jd, SE_TRUE_NODE);
  const moon = swe.calc(nm.jd, SE_MOON);

  // Angular distance from Moon to node (normalize to -180..180)
  let distToNode = moon.longitude - node.longitude;
  if (distToNode > 180) distToNode -= 360;
  if (distToNode < -180) distToNode += 360;

  if (Math.abs(distToNode) < 18) {
    const d = SwissEph.fromJulianDay(nm.jd);
    console.log(
      `  NEW MOON ${d.year}-${String(d.month).padStart(2,'0')}-${String(Math.floor(d.day)).padStart(2,'0')}  ` +
      `Moon ${moon.longitude.toFixed(1)}°  Node ${node.longitude.toFixed(1)}°  ` +
      `dist ${Math.abs(distToNode).toFixed(1)}° → possible SOLAR eclipse`
    );
  }

  // Check opposite point for Full Moon
  const fm = swe.moonCrossing((sun.longitude + 180) % 360, nm.jd + 1);
  if (fm.jd < endJd) {
    const nodeFm = swe.calc(fm.jd, SE_TRUE_NODE);
    const moonFm = swe.calc(fm.jd, SE_MOON);

    let distFm = moonFm.longitude - nodeFm.longitude;
    if (distFm > 180) distFm -= 360;
    if (distFm < -180) distFm += 360;

    if (Math.abs(distFm) < 18) {
      const d2 = SwissEph.fromJulianDay(fm.jd);
      console.log(
        `  FULL MOON ${d2.year}-${String(d2.month).padStart(2,'0')}-${String(Math.floor(d2.day)).padStart(2,'0')}  ` +
        `Moon ${moonFm.longitude.toFixed(1)}°  Node ${nodeFm.longitude.toFixed(1)}°  ` +
        `dist ${Math.abs(distFm).toFixed(1)}° → possible LUNAR eclipse`
      );
    }
  }

  jd = nm.jd + 20; // advance past this lunation
}

swe.close();
```

---

## Deep Explanation

### The Moon's Motion

The Moon is the fastest-moving body in geocentric astronomy:
- **Sidereal period** (one complete orbit relative to the stars): ~27.32 days
- **Synodic period** (one New Moon to the next): ~29.53 days (longer because the Sun also moves)
- **Average daily motion**: ~13.18 degrees per day (ranges from about 11.8 to 15.4)
- **Sign change**: every ~2.3 days

Because the Moon moves so fast, its crossings happen frequently. The Moon crosses every degree of the ecliptic roughly once a month.

### New Moon and Full Moon Geometry

```
  New Moon (conjunction):

    Sun ---- Moon ---- Earth
    (Moon between Sun and Earth; same longitude)


  Full Moon (opposition):

    Sun ---- Earth ---- Moon
    (Earth between Sun and Moon; longitude differs by 180°)
```

The Moon's synodic period (29.53 days) is the time between successive New Moons. This is the basis of lunar calendars used throughout history (Islamic, Hebrew, Chinese, Hindu).

### Lunar Nodes

The Moon's orbit is tilted about **5.145 degrees** relative to the ecliptic plane. The two points where the Moon's orbit intersects the ecliptic are called **nodes**:

```
                    Ecliptic plane
    =====================================
              /         \
           Moon's      Moon's
           orbit       orbit
          (below)     (above)
              \         /
    =====================================
         Descending   Ascending
           Node        Node
```

- **Ascending Node** (North Node): where the Moon crosses from south to north of the ecliptic. Called **Rahu** in Vedic astrology, or the "Dragon's Head" in Western tradition.
- **Descending Node** (South Node): where the Moon crosses from north to south. Called **Ketu** in Vedic astrology, or the "Dragon's Tail."

The `moonNodeCrossing()` method finds the actual physical moment when the Moon passes through the ecliptic plane. It returns:
- `jd`: the exact time
- `longitude`: the ecliptic longitude where the crossing occurs
- `latitude`: the Moon's latitude at the crossing (very close to 0, by definition)

### The Nodal Cycle

The lunar nodes are not fixed -- they move slowly **retrograde** (backward through the zodiac) at about 19.3 degrees per year, completing a full cycle in approximately **18.613 years** (the "Metonic-related" nodal period, or more precisely the **nodal regression period**).

This 18.6-year cycle is important in:
- **Eclipse prediction**: Eclipses repeat in patterns related to the nodal cycle (the Saros cycle of ~18 years, 11 days)
- **Vedic astrology**: The nodes (Rahu/Ketu) are treated as shadow planets and are key factors in chart interpretation
- **Western astrology**: The nodes indicate karmic direction (North Node = future growth, South Node = past patterns)

### Eclipse Connection

Eclipses occur when a New Moon (solar eclipse) or Full Moon (lunar eclipse) happens while the Moon is near a node:

- **Solar eclipse**: New Moon within ~18 degrees of a node (the Sun and Moon are both near the node, so the Moon can block the Sun)
- **Lunar eclipse**: Full Moon within ~12 degrees of a node (the Moon passes through Earth's shadow)

There are two "eclipse seasons" per year, each about 34 days long, when the Sun is near enough to a node for eclipses to be possible. The eclipse seasons shift backward through the year by about 19 days per year due to the retrograde motion of the nodes.

### Ascending vs. Descending Node

To determine which type of node crossing occurred, check the Moon's latitude shortly after the crossing:
- If latitude becomes **positive** (Moon moving north), it was an **ascending node** crossing
- If latitude becomes **negative** (Moon moving south), it was a **descending node** crossing

The `moonNodeCrossing()` method finds the **next** node crossing of either type. To find specifically the next ascending or descending node, compute the Moon's latitude slightly after the crossing as shown in the examples above.

### Return Types

```typescript
// moonCrossing
interface CrossingResult {
  jd: number;  // Julian Day when the Moon reaches the target longitude
}

// moonNodeCrossing
interface MoonNodeCrossingResult {
  jd: number;        // Julian Day of the node crossing
  longitude: number; // Ecliptic longitude at the crossing point (degrees)
  latitude: number;  // Moon's latitude at crossing (very close to 0)
}
```

### API Details

**`moonCrossing(longitude, jd, flags?)`**
- `longitude`: Target ecliptic longitude in degrees (0-360)
- `jd`: Starting Julian Day (search forward from here)
- `flags` (optional): Calculation flags

The function finds the next time the Moon reaches the specified longitude after `jd`. Since the Moon completes a full cycle in ~27.3 days, you will always get a result within about a month.

**`moonNodeCrossing(jd, flags?)`**
- `jd`: Starting Julian Day (search forward from here)
- `flags` (optional): Calculation flags

The function finds the next time the Moon crosses the ecliptic plane (latitude = 0). Node crossings happen about every 13.6 days (half the sidereal month), alternating between ascending and descending.

### Rahu and Ketu in Vedic Astrology

In Vedic (Hindu) astrology, the lunar nodes are given planetary status:
- **Rahu** (ascending node): associated with ambition, materialism, worldly desires, and obsession. Considered a malefic that amplifies whatever it touches.
- **Ketu** (descending node): associated with spirituality, detachment, past-life karma, and liberation. Considered a malefic that strips away worldly attachments.

The node positions used in Vedic astrology are typically the **mean nodes** (computed from `SE_MEAN_NODE = 10`), not the true/osculating nodes. The mean nodes move smoothly backward; the true nodes (from `SE_TRUE_NODE = 11`) wobble due to solar and planetary perturbations. Both can be computed with `swe.calc()`.
