import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import {
  SE_SUN, SEFLG_SIDEREAL,
  SE_SIDM_FAGAN_BRADLEY, SE_SIDM_LAHIRI, SE_SIDM_RAMAN,
  SE_SIDM_KRISHNAMURTI, SE_SIDM_YUKTESHWAR,
  SE_SIDM_GALCENT_0SAG, SE_SIDM_J2000,
  SE_SIDM_TRUE_CITRA, SE_SIDM_TRUE_REVATI, SE_SIDM_TRUE_PUSHYA,
  SE_SIDM_TRUE_MULA, SE_SIDM_GALEQU_TRUE,
  SE_SIDM_LAHIRI_1940, SE_SIDM_LAHIRI_VP285,
  SE_SIDM_KRISHNAMURTI_VP291, SE_SIDM_LAHIRI_ICRC,
} from '../../src/constants';

/**
 * Tests for a broader set of ayanamsa modes.
 * Ayanamsa values from the TS library verified against swetest UT values
 * (systematic offset ~0.004° due to minor computational differences).
 */

describe('Ayanamsa extended (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('Popular ayanamsas at J2000', () => {
    const popular = [
      { mode: SE_SIDM_FAGAN_BRADLEY, name: 'Fagan/Bradley',  aya: 24.740 },
      { mode: SE_SIDM_LAHIRI,        name: 'Lahiri',         aya: 23.857 },
      { mode: SE_SIDM_RAMAN,         name: 'Raman',          aya: 22.411 },
      { mode: SE_SIDM_KRISHNAMURTI,  name: 'Krishnamurti',   aya: 23.760 },
      { mode: SE_SIDM_YUKTESHWAR,    name: 'Yukteshwar',     aya: 22.479 },
    ];

    for (const { mode, name, aya } of popular) {
      it(`${name} (${mode}) should be ~${aya.toFixed(2)}`, () => {
        swe.setSiderealMode(mode);
        const a = swe.getAyanamsa(J2000);
        near(a, aya, 0.02);
      });
    }
  });

  describe('Star-based ayanamsas at J2000', () => {
    const starBased = [
      { mode: SE_SIDM_TRUE_CITRA,    name: 'True Citra',   aya: 23.840 },
      { mode: SE_SIDM_TRUE_REVATI,   name: 'True Revati',  aya: 20.045 },
      { mode: SE_SIDM_TRUE_PUSHYA,   name: 'True Pushya',  aya: 22.727 },
      { mode: SE_SIDM_TRUE_MULA,     name: 'True Mula',    aya: 24.580 },
      { mode: SE_SIDM_GALCENT_0SAG,  name: 'GalCent 0 Sag', aya: 26.846 },
      { mode: SE_SIDM_GALEQU_TRUE,   name: 'GalEqu True',  aya: 30.076 },
    ];

    for (const { mode, name, aya } of starBased) {
      it(`${name} (${mode}) should be ~${aya.toFixed(2)}`, () => {
        swe.setSiderealMode(mode);
        const a = swe.getAyanamsa(J2000);
        near(a, aya, 0.02);
      });
    }
  });

  describe('Modern/reference ayanamsas', () => {
    it('J2000 ayanamsa should be ~0 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_J2000);
      const a = swe.getAyanamsa(J2000);
      near(a, 0.0, 0.01);
    });

    it('Lahiri variants should agree within 0.5 degrees', () => {
      const lahiriModes = [
        SE_SIDM_LAHIRI,
        SE_SIDM_LAHIRI_1940,
        SE_SIDM_LAHIRI_VP285,
        SE_SIDM_LAHIRI_ICRC,
      ];

      const values: number[] = [];
      for (const mode of lahiriModes) {
        swe.setSiderealMode(mode);
        values.push(swe.getAyanamsa(J2000));
      }

      for (let i = 1; i < values.length; i++) {
        const diff = Math.abs(values[0] - values[i]);
        assert.ok(
          diff < 0.5,
          `Lahiri(${lahiriModes[0]})=${values[0].toFixed(4)} vs mode ${lahiriModes[i]}=${values[i].toFixed(4)}, diff=${diff.toFixed(4)}`,
        );
      }
    });

    it('Krishnamurti variants should agree within 0.5 degrees', () => {
      swe.setSiderealMode(SE_SIDM_KRISHNAMURTI);
      const k1 = swe.getAyanamsa(J2000);
      swe.setSiderealMode(SE_SIDM_KRISHNAMURTI_VP291);
      const k2 = swe.getAyanamsa(J2000);
      const diff = Math.abs(k1 - k2);
      assert.ok(diff < 0.5, `KP diff=${diff.toFixed(4)}`);
    });
  });

  describe('Ayanamsa names', () => {
    for (let mode = 0; mode <= 46; mode++) {
      it(`mode ${mode} should have a non-empty name`, () => {
        const name = swe.getAyanamsaName(mode);
        assert.ok(name.length > 0, `mode ${mode} has empty name`);
      });
    }
  });

  describe('Sidereal calculation consistency', () => {
    it('tropical - ayanamsa ≈ sidereal longitude (Lahiri)', () => {
      // Tropical Sun
      const tropSun = swe.calc(J2000, SE_SUN);

      // Sidereal Sun via SEFLG_SIDEREAL
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const sidSun = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL);

      // Ayanamsa
      const aya = swe.getAyanamsa(J2000);

      // tropical - ayanamsa should equal sidereal
      const expected = ((tropSun.longitude - aya) % 360 + 360) % 360;
      near(sidSun.longitude, expected, 0.01);
    });

    it('tropical - ayanamsa ≈ sidereal longitude (Fagan/Bradley)', () => {
      const tropSun = swe.calc(J2000, SE_SUN);

      swe.setSiderealMode(SE_SIDM_FAGAN_BRADLEY);
      const sidSun = swe.calc(J2000, SE_SUN, SEFLG_SIDEREAL);
      const aya = swe.getAyanamsa(J2000);

      const expected = ((tropSun.longitude - aya) % 360 + 360) % 360;
      near(sidSun.longitude, expected, 0.01);
    });
  });
});
