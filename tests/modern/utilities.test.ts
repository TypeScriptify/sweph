import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN, SE_MARS, SE_TRUE_TO_APP } from '../../src/constants';

describe('Utilities (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('deltaT', () => {
    it('should be positive at J2000', () => {
      const dt = swe.deltaT(J2000);
      assert.ok(dt > 0);
      assert.ok(dt < 0.01);
    });
  });

  describe('siderealTime', () => {
    it('should return 0-24 hours at J2000', () => {
      const st = swe.siderealTime(J2000);
      assert.ok(st > 0 && st < 24, `st=${st}`);
    });
  });

  describe('timeEquation', () => {
    it('should return a number', () => {
      const teq = swe.timeEquation(J2000);
      assert.ok(typeof teq === 'number');
    });
  });

  describe('refraction', () => {
    it('true-to-apparent should return different value', () => {
      const ref = swe.refraction(10, 1013.25, 15, SE_TRUE_TO_APP);
      assert.ok(typeof ref === 'number');
      assert.ok(ref !== 0);
    });
  });

  describe('splitDegrees', () => {
    it('should split 123.456 correctly', () => {
      const r = swe.splitDegrees(123.456, 0);
      assert.strictEqual(r.deg, 123);
      assert.strictEqual(r.min, 27);
    });
  });

  describe('difDeg2n', () => {
    it('10,350 -> 20', () => {
      near(swe.difDeg2n(10, 350), 20, 0.001);
    });

    it('350,10 -> -20', () => {
      near(swe.difDeg2n(350, 10), -20, 0.001);
    });
  });

  describe('getPlanetName', () => {
    it('should return Sun for SE_SUN', () => {
      assert.strictEqual(swe.getPlanetName(SE_SUN), 'Sun');
    });

    it('should return Mars for SE_MARS', () => {
      assert.strictEqual(swe.getPlanetName(SE_MARS), 'Mars');
    });
  });
});
