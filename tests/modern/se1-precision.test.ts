import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000, loadEpheFile } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN, SE_MOON } from '../../src/constants';

/**
 * Tests that the high-precision "m" variant SE1 files produce values
 * consistent with the standard SE1 files for Sun and Moon.
 */

describe('SE1 precision (m-variant files)', () => {
  let sweStd: SwissEph;
  let sweM: SwissEph;

  before(() => {
    sweStd = new SwissEph({ ephemeris: 'swisseph' });
    sweStd.loadEphemerisFile(loadEpheFile('sepl_18.se1'), 'sepl_18.se1');
    sweStd.loadEphemerisFile(loadEpheFile('semo_18.se1'), 'semo_18.se1');

    sweM = new SwissEph({ ephemeris: 'swisseph' });
    sweM.loadEphemerisFile(loadEpheFile('seplm18.se1'), 'seplm18.se1');
    sweM.loadEphemerisFile(loadEpheFile('semom18.se1'), 'semom18.se1');
  });

  after(() => {
    sweStd.close();
    sweM.close();
  });

  describe('Sun longitude', () => {
    it('m-variant should agree with standard within 0.1"', () => {
      const rStd = sweStd.calc(J2000, SE_SUN);
      const rM = sweM.calc(J2000, SE_SUN);
      const diff = Math.abs(rStd.longitude - rM.longitude);
      assert.ok(
        diff < 0.1 / 3600,
        `Sun std-m diff=${(diff * 3600).toFixed(4)}" exceeds 0.1"`,
      );
    });

    it('speed should agree', () => {
      const rStd = sweStd.calc(J2000, SE_SUN);
      const rM = sweM.calc(J2000, SE_SUN);
      const diff = Math.abs(rStd.longitudeSpeed - rM.longitudeSpeed);
      assert.ok(diff < 0.001, `Sun speed diff=${diff}`);
    });

    it('distance should agree', () => {
      const rStd = sweStd.calc(J2000, SE_SUN);
      const rM = sweM.calc(J2000, SE_SUN);
      const diff = Math.abs(rStd.distance - rM.distance);
      assert.ok(diff < 0.0001, `Sun distance diff=${diff}`);
    });
  });

  describe('Moon longitude', () => {
    it('m-variant should agree with standard within 0.1"', () => {
      const rStd = sweStd.calc(J2000, SE_MOON);
      const rM = sweM.calc(J2000, SE_MOON);
      const diff = Math.abs(rStd.longitude - rM.longitude);
      assert.ok(
        diff < 0.1 / 3600,
        `Moon std-m diff=${(diff * 3600).toFixed(4)}" exceeds 0.1"`,
      );
    });

    it('speed should agree', () => {
      const rStd = sweStd.calc(J2000, SE_MOON);
      const rM = sweM.calc(J2000, SE_MOON);
      const diff = Math.abs(rStd.longitudeSpeed - rM.longitudeSpeed);
      assert.ok(diff < 0.01, `Moon speed diff=${diff}`);
    });

    it('latitude should agree within 1"', () => {
      const rStd = sweStd.calc(J2000, SE_MOON);
      const rM = sweM.calc(J2000, SE_MOON);
      const diff = Math.abs(rStd.latitude - rM.latitude);
      assert.ok(diff < 1 / 3600, `Moon lat diff=${(diff * 3600).toFixed(4)}" exceeds 1"`);
    });

    it('distance should agree', () => {
      const rStd = sweStd.calc(J2000, SE_MOON);
      const rM = sweM.calc(J2000, SE_MOON);
      const diff = Math.abs(rStd.distance - rM.distance);
      assert.ok(diff < 0.0001, `Moon distance diff=${diff}`);
    });
  });

  describe('Both files load successfully', () => {
    it('standard files should produce valid Sun', () => {
      const r = sweStd.calc(J2000, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('m-variant files should produce valid Sun', () => {
      const r = sweM.calc(J2000, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('standard files should produce valid Moon', () => {
      const r = sweStd.calc(J2000, SE_MOON);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('m-variant files should produce valid Moon', () => {
      const r = sweM.calc(J2000, SE_MOON);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });
  });
});
