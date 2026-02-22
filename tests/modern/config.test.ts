import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN, SEFLG_TOPOCTR } from '../../src/constants';

describe('Configuration (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('setTopo', () => {
    it('should set topocentric position without error', () => {
      swe.setTopo(LONDON);
    });

    it('topocentric calc should work after setTopo', () => {
      swe.setTopo(LONDON);
      const r = swe.calc(J2000, SE_SUN, SEFLG_TOPOCTR);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });
  });

  describe('setDeltaTUserDefined', () => {
    it('should not throw', () => {
      swe.setDeltaTUserDefined(0.001);
    });
  });

  describe('setInterpolateNutation', () => {
    it('should not throw', () => {
      swe.setInterpolateNutation(true);
      swe.setInterpolateNutation(false);
    });
  });

  describe('close', () => {
    it('should not crash on double close', () => {
      const s = new SwissEph();
      s.close();
      // Second close should not throw
      s.close();
    });
  });
});
