import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import {
  sweCalc, sweVersion, sweGetPlanetName, sweClose,
  sweGetCurrentFileData, sweGetLibraryPath,
} from '../../src/sweph';
import {
  sweSetTidAcc, sweGetTidAcc,
  sweSetDeltaTUserdef, sweSetInterpolateNut,
  sweSetAstroModels, sweGetAstroModels,
} from '../../src/swephlib';
import { SE_SUN, SE_MOON, SE_MARS, SEFLG_MOSEPH, SEFLG_JPLEPH, SEFLG_SPEED } from '../../src/constants';

describe('Configuration (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('sweVersion', () => {
    it('should return a non-empty string', () => {
      const ver = sweVersion();
      assert.ok(typeof ver === 'string' && ver.length > 0);
    });
  });

  describe('sweGetPlanetName', () => {
    it('should return Sun for SE_SUN', () => {
      assert.strictEqual(sweGetPlanetName(SE_SUN, swed), 'Sun');
    });

    it('should return Moon for SE_MOON', () => {
      assert.strictEqual(sweGetPlanetName(SE_MOON, swed), 'Moon');
    });

    it('should return Mars for SE_MARS', () => {
      assert.strictEqual(sweGetPlanetName(SE_MARS, swed), 'Mars');
    });
  });

  describe('sweGetLibraryPath', () => {
    it('should return empty string when not set', () => {
      assert.strictEqual(sweGetLibraryPath(), '');
    });
  });

  describe('sweGetCurrentFileData', () => {
    it('should return null when no files loaded', () => {
      assert.strictEqual(sweGetCurrentFileData(swed, 0), null);
    });
  });

  describe('Tidal acceleration', () => {
    it('should set and get tidal acceleration', () => {
      sweSetTidAcc(swed, -25.8);
      near(sweGetTidAcc(swed), -25.8, 0.01);
    });
  });

  describe('Delta-T user-defined', () => {
    it('should not throw when setting', () => {
      sweSetDeltaTUserdef(swed, 0);
    });
  });

  describe('Interpolate nutation', () => {
    it('should not throw when setting', () => {
      sweSetInterpolateNut(swed, false);
    });
  });

  describe('Astro models', () => {
    it('should get and set models', () => {
      sweSetAstroModels(swed, '');
      const am = sweGetAstroModels(swed);
      assert.ok(typeof am === 'string');
    });
  });

  describe('JPL fallback', () => {
    it('should fall back when no JPL file loaded', () => {
      const r = sweCalc(swed, J2000, SE_SUN, SEFLG_JPLEPH | SEFLG_SPEED);
      assert.ok(r.xx[0] > 0, `${r.xx[0]}`);
      assert.strictEqual(r.flags & SEFLG_JPLEPH, 0, 'JPL flag should be cleared');
    });
  });

  describe('sweClose', () => {
    it('should not crash', () => {
      const tmp = createDefaultSweData();
      sweClose(tmp);
    });
  });
});
