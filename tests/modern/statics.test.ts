import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_GREG_CAL } from '../../src/constants';

describe('Static Methods (modern)', () => {
  describe('julianDay', () => {
    it('J2000 = 2451545.0', () => {
      assert.strictEqual(SwissEph.julianDay(2000, 1, 1, 12), J2000);
    });

    it('should handle default hour = 0', () => {
      const jd = SwissEph.julianDay(2000, 1, 1);
      assert.strictEqual(jd, J2000 - 0.5);
    });
  });

  describe('fromJulianDay', () => {
    it('should round-trip J2000', () => {
      const d = SwissEph.fromJulianDay(J2000);
      assert.strictEqual(d.year, 2000);
      assert.strictEqual(d.month, 1);
      assert.strictEqual(d.day, 1);
      assert.strictEqual(d.hour, 12);
    });
  });

  describe('utcToJd', () => {
    it('should produce JD near J2000', () => {
      const r = SwissEph.utcToJd(2000, 1, 1, 12, 0, 0);
      near(r.tjdUt, J2000, 0.001);
    });

    it('ET should be ahead of UT', () => {
      const r = SwissEph.utcToJd(2000, 1, 1, 12, 0, 0);
      assert.ok(r.tjdEt > r.tjdUt);
    });
  });

  describe('jdToUtc', () => {
    it('should convert ET JD to UTC components', () => {
      const r = SwissEph.utcToJd(2000, 1, 1, 12, 0, 0);
      const utc = SwissEph.jdToUtc(r.tjdEt);
      assert.strictEqual(utc.year, 2000);
      assert.strictEqual(utc.month, 1);
      assert.strictEqual(utc.day, 1);
    });
  });

  describe('jdUtToUtc', () => {
    it('should convert UT JD to UTC components', () => {
      const utc = SwissEph.jdUtToUtc(J2000);
      assert.strictEqual(utc.year, 2000);
    });
  });

  describe('dayOfWeek', () => {
    it('J2000 should be Saturday (5)', () => {
      assert.strictEqual(SwissEph.dayOfWeek(J2000), 5);
    });
  });

  describe('normalizeDegrees', () => {
    it('370 -> 10', () => {
      assert.strictEqual(SwissEph.normalizeDegrees(370), 10);
    });

    it('-10 -> 350', () => {
      assert.strictEqual(SwissEph.normalizeDegrees(-10), 350);
    });
  });

  describe('normalizeRadians', () => {
    it('should normalize 7 to 0-2pi', () => {
      const r = SwissEph.normalizeRadians(7);
      assert.ok(r >= 0 && r < 2 * Math.PI);
    });
  });

  describe('degreeMidpoint', () => {
    it('midpoint of 350,10 -> 0', () => {
      near(SwissEph.degreeMidpoint(350, 10), 0, 0.01);
    });
  });

  describe('coordinateTransform', () => {
    it('should transform coordinates', () => {
      const out = SwissEph.coordinateTransform([280.0, -0.5, 1.0], 23.44);
      assert.ok(out[0] !== 0 || out[1] !== 0);
    });
  });

  describe('version', () => {
    it('should return non-empty string', () => {
      assert.ok(SwissEph.version().length > 0);
    });
  });
});
