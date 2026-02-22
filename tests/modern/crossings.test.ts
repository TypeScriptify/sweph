import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_MARS } from '../../src/constants';

describe('Crossings (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('sunCrossing', () => {
    it('vernal equinox 2000 should be Mar 20', () => {
      const start = SwissEph.julianDay(2000, 3, 1, 0);
      const r = swe.sunCrossing(0, start);
      const d = SwissEph.fromJulianDay(r.jd);
      assert.strictEqual(d.month, 3);
      assert.strictEqual(d.day, 20);
    });
  });

  describe('moonCrossing', () => {
    it('should find Moon crossing 0 deg after J2000', () => {
      const r = swe.moonCrossing(0, J2000);
      assert.ok(r.jd > J2000);
    });
  });

  describe('moonNodeCrossing', () => {
    it('should find next node crossing', () => {
      const r = swe.moonNodeCrossing(J2000);
      assert.ok(r.jd > J2000);
      assert.ok(typeof r.longitude === 'number');
      assert.ok(typeof r.latitude === 'number');
    });
  });

  describe('helioCrossing', () => {
    it('Mars should cross 0 deg helio', () => {
      const r = swe.helioCrossing(SE_MARS, 0, J2000);
      assert.ok(r.jd > J2000);
    });
  });
});
