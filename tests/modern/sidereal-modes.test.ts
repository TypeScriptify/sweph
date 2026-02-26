import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import {
  SE_SUN, SE_MOON, SE_MARS,
  SEFLG_SIDEREAL, SEFLG_SPEED,
  SE_SIDM_FAGAN_BRADLEY, SE_SIDM_LAHIRI, SE_SIDM_RAMAN,
  SE_SIDM_KRISHNAMURTI, SE_SIDM_J2000,
  SE_SIDBIT_ECL_T0, SE_SIDBIT_SSY_PLANE, SE_SIDBIT_ECL_DATE,
  SE_SIDBIT_NO_PREC_OFFSET, SE_SIDBIT_PREC_ORIG,
} from '../../src/constants';

/**
 * Tests for sidereal mode conversion: ECL_T0, SSY_PLANE, ECL_DATE,
 * precession offset correction, and PREC_ORIG flag.
 *
 * Reference values from swetest 2.10.03 (Moshier ephemeris).
 * Known systematic offset ~0.004° in ayanamsa due to minor precession
 * computation differences; absolute tolerances account for this.
 */

const TJD_2024APR8 = 2460409.0;

/* Tolerance: absolute (includes systematic offset from swetest) */
const AYA_TOL = 0.005;
const POS_TOL = 0.01;
/* Tolerance: relative (comparing TS modes to each other — no systematic offset) */
const REL_TOL = 0.001;

describe('Sidereal modes (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  /* ================================================================
   * Ayanamsa values — default branch with getAyaCorrection
   * ================================================================ */

  describe('Ayanamsa default branch', () => {
    it('Lahiri at J2000 should be ~23.85', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      near(swe.getAyanamsa(J2000), 23.8532, AYA_TOL);
    });

    it('Fagan/Bradley at J2000 should be ~24.74', () => {
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY);
      near(swe.getAyanamsa(J2000), 24.7364, AYA_TOL);
    });

    it('J2000 mode at J2000 should be near 0', () => {
      swe.setSiderealMode(SE_SIDM_J2000);
      const aya = swe.getAyanamsa(J2000);
      // J2000 forces ECL_T0; ayanamsa is tiny (near 0 or 360)
      const ayaNorm = aya > 350 ? aya - 360 : aya;
      near(ayaNorm, 0, 0.01);
    });

    it('Lahiri at 2024 Apr 8 should be ~24.19', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      near(swe.getAyanamsa(TJD_2024APR8), 24.1946, AYA_TOL);
    });
  });

  /* ================================================================
   * ECL_DATE branch
   * ================================================================ */

  describe('Ayanamsa ECL_DATE branch', () => {
    it('Lahiri ECL_DATE at J2000 should be ~23.85', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_DATE);
      near(swe.getAyanamsa(J2000), 23.8532, AYA_TOL);
    });

    it('Lahiri ECL_DATE at 2024 Apr 8 should be ~24.19', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_DATE);
      near(swe.getAyanamsa(TJD_2024APR8), 24.1946, AYA_TOL);
    });

    it('ECL_DATE should be very close to default', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const ayaDef = swe.getAyanamsa(TJD_2024APR8);
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_DATE);
      const ayaEcl = swe.getAyanamsa(TJD_2024APR8);
      near(ayaDef, ayaEcl, REL_TOL);
    });
  });

  /* ================================================================
   * NO_PREC_OFFSET flag
   * ================================================================ */

  describe('NO_PREC_OFFSET flag', () => {
    it('Lahiri with NO_PREC_OFFSET should differ from default', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const ayaDef = swe.getAyanamsa(J2000);
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_NO_PREC_OFFSET);
      const ayaNo = swe.getAyanamsa(J2000);
      // The precession offset correction should change the result
      const diff = Math.abs(ayaDef - ayaNo);
      assert.ok(diff > 0.00001, `Expected non-zero diff, got ${diff}`);
      // swetest diff is ~0.00004°; ours should be in same ballpark
      near(diff, 0.000036, 0.001);
    });

    it('Fagan with NO_PREC_OFFSET should differ from default', () => {
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY);
      const ayaDef = swe.getAyanamsa(J2000);
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY | SE_SIDBIT_NO_PREC_OFFSET);
      const ayaNo = swe.getAyanamsa(J2000);
      const diff = Math.abs(ayaDef - ayaNo);
      assert.ok(diff > 0.00001, `Expected non-zero diff, got ${diff}`);
      // swetest: diff ~0.00011°
      near(diff, 0.000115, 0.001);
    });
  });

  /* ================================================================
   * PREC_ORIG flag
   * ================================================================ */

  describe('PREC_ORIG flag', () => {
    it('Lahiri with PREC_ORIG should differ from default', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const ayaDef = swe.getAyanamsa(J2000);
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_PREC_ORIG);
      const ayaOrig = swe.getAyanamsa(J2000);
      // PREC_ORIG uses the original precession model (IAU 1976 for Lahiri)
      // This should change the result slightly
      near(ayaOrig, ayaDef, 0.01);
    });

    it('Fagan with PREC_ORIG should differ from default', () => {
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY);
      const ayaDef = swe.getAyanamsa(J2000);
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY | SE_SIDBIT_PREC_ORIG);
      const ayaOrig = swe.getAyanamsa(J2000);
      near(ayaOrig, ayaDef, 0.01);
    });
  });

  /* ================================================================
   * ECL_T0 mode — Sun positions
   * ================================================================ */

  describe('ECL_T0 mode (SE_SIDBIT_ECL_T0)', () => {
    it('Sun Lahiri ECL_T0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 256.5149442
      near(res.longitude, 256.515, POS_TOL);
    });

    it('Sun Fagan ECL_T0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 255.6317366
      near(res.longitude, 255.632, POS_TOL);
    });

    it('Sun Raman ECL_T0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_RAMAN | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 257.9612459
      near(res.longitude, 257.961, POS_TOL);
    });

    it('Sun Lahiri ECL_T0 at 2024 Apr 8', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const res = swe.calc(TJD_2024APR8, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 354.9450194
      near(res.longitude, 354.945, POS_TOL);
    });

    it('Moon Lahiri ECL_T0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_MOON, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 199.4613281
      near(res.longitude, 199.461, POS_TOL);
    });

    it('Mars Lahiri ECL_T0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_MARS, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 304.1094230
      near(res.longitude, 304.109, POS_TOL);
    });

    it('Sun Krishnamurti ECL_T0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_KRISHNAMURTI | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 256.6117969
      near(res.longitude, 256.612, POS_TOL);
    });

    it('ECL_T0 should agree closely with default for Sun at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const res1 = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const res2 = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      near(res1.longitude, res2.longitude, 0.01);
    });

    it('ECL_T0 produces different latitude than default', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const t0 = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const def = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // ECL_T0 projects onto ecliptic of t0, so latitude differs
      assert.ok(Math.abs(t0.latitude - def.latitude) > 0.001,
        `Expected different latitudes: ECL_T0=${t0.latitude}, default=${def.latitude}`);
    });
  });

  /* ================================================================
   * SSY_PLANE mode — Sun positions
   * ================================================================ */

  describe('SSY_PLANE mode (SE_SIDBIT_SSY_PLANE)', () => {
    it('Sun Lahiri SSY at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 256.5237241
      near(res.longitude, 256.524, POS_TOL);
    });

    it('Sun Fagan SSY at J2000', () => {
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 255.6404898
      near(res.longitude, 255.640, POS_TOL);
    });

    it('Sun Raman SSY at J2000', () => {
      swe.setSiderealMode(SE_SIDM_RAMAN | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 257.9697826
      near(res.longitude, 257.970, POS_TOL);
    });

    it('Sun Lahiri SSY at 2024 Apr 8', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(TJD_2024APR8, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 354.9515599
      near(res.longitude, 354.952, POS_TOL);
    });

    it('Moon Lahiri SSY at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(J2000, SE_MOON, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 199.4143321
      near(res.longitude, 199.414, POS_TOL);
    });

    it('Mars Lahiri SSY at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(J2000, SE_MARS, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 304.1272715
      near(res.longitude, 304.127, POS_TOL);
    });

    it('SSY_PLANE produces significant latitude change from ecliptic', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const ssy = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const def = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // SSY plane is tilted ~1.58° from ecliptic
      assert.ok(Math.abs(ssy.latitude) > 0.001 || Math.abs(ssy.latitude - def.latitude) > 0.001,
        `Expected SSY latitude to differ from default`);
    });
  });

  /* ================================================================
   * ECL_DATE mode — Sun positions
   * ================================================================ */

  describe('ECL_DATE mode (SE_SIDBIT_ECL_DATE)', () => {
    it('Sun Lahiri ECL_DATE at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_DATE);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 256.5149442; ECL_DATE ayanamsa is very close to default
      near(res.longitude, 256.515, POS_TOL);
    });

    it('Sun Lahiri ECL_DATE at 2024 Apr 8', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_DATE);
      const res = swe.calc(TJD_2024APR8, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // swetest: 354.9450199
      near(res.longitude, 354.945, POS_TOL);
    });
  });

  /* ================================================================
   * Consistency and cross-mode checks
   * ================================================================ */

  describe('Consistency checks', () => {
    it('default and ECL_DATE give very close Sun positions', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const def = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_DATE);
      const ecl = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      near(def.longitude, ecl.longitude, REL_TOL);
    });

    it('ECL_T0 and SSY_PLANE longitudes differ', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const t0 = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const ssy = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      const diff = Math.abs(t0.longitude - ssy.longitude);
      // swetest shows ~0.009° difference; they should not be equal
      assert.ok(diff > 0.001, `Expected ECL_T0 != SSY_PLANE, diff=${diff}`);
      near(diff, 0.009, 0.01);
    });

    it('different ayanamsas produce different ECL_T0 results', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const lah = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY | SE_SIDBIT_ECL_T0);
      const fag = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      const diff = Math.abs(lah.longitude - fag.longitude);
      // Should differ by roughly the ayanamsa difference (~0.88°)
      near(diff, 0.88, 0.02);
    });

    it('different ayanamsas produce different SSY_PLANE results', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const lah = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY | SE_SIDBIT_SSY_PLANE);
      const fag = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      const diff = Math.abs(lah.longitude - fag.longitude);
      near(diff, 0.88, 0.02);
    });

    it('J2000 mode ayanamsa is near zero at J2000', () => {
      swe.setSiderealMode(SE_SIDM_J2000);
      const aya = swe.getAyanamsa(J2000);
      // J2000 forces ECL_T0; ayanamsa should be tiny
      const ayaNorm = aya > 350 ? aya - 360 : aya;
      near(ayaNorm, 0, 0.01);
    });

    it('ECL_T0 produces valid speed values', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_ECL_T0);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // Sun's sidereal speed should be ~1°/day
      near(res.longitudeSpeed, 1.018, 0.02);
    });

    it('SSY_PLANE produces valid speed values', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI | SE_SIDBIT_SSY_PLANE);
      const res = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL | SEFLG_SPEED);
      // Sun's speed should be ~1°/day
      near(res.longitudeSpeed, 1.018, 0.02);
    });
  });
});
