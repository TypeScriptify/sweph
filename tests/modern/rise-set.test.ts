import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN } from '../../src/constants';

describe('Rise/Set/Transit (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('rise', () => {
    it('Sun rise should be after J2000', () => {
      const r = swe.rise(J2000, SE_SUN, LONDON);
      assert.ok(r.jd > J2000);
    });
  });

  describe('set', () => {
    it('Sun set should be after J2000', () => {
      const r = swe.set(J2000, SE_SUN, LONDON);
      assert.ok(r.jd > J2000);
    });
  });

  describe('transit', () => {
    it('Sun transit should return JD', () => {
      const r = swe.transit(J2000, SE_SUN, LONDON);
      assert.ok(r.jd > 0);
    });
  });

  describe('antiTransit', () => {
    it('Sun anti-transit should return JD', () => {
      const r = swe.antiTransit(J2000, SE_SUN, LONDON);
      assert.ok(r.jd > 0);
    });
  });

  describe('azalt', () => {
    it('should compute Sun azimuth and altitude', () => {
      const sun = swe.calc(J2000, SE_SUN);
      const az = swe.azalt(J2000, LONDON, sun.longitude, sun.latitude);
      assert.ok(typeof az.azimuth === 'number');
      assert.ok(typeof az.trueAltitude === 'number');
      assert.ok(typeof az.apparentAltitude === 'number');
    });
  });

  describe('azaltReverse', () => {
    it('should reverse azalt', () => {
      const sun = swe.calc(J2000, SE_SUN);
      const az = swe.azalt(J2000, LONDON, sun.longitude, sun.latitude);
      const rev = swe.azaltReverse(J2000, LONDON, az.azimuth, az.apparentAltitude);
      assert.ok(typeof rev.azimuth === 'number');
      assert.ok(typeof rev.altitude === 'number');
    });
  });
});
