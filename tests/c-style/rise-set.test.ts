import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000, LONDON_ARR } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweCalc, sweClose } from '../../src/sweph';
import { sweRiseTrans, sweAzalt, sweAzaltRev, sweRefrac, sweRefracExtended } from '../../src/swecl';
import {
  SE_SUN, SEFLG_MOSEPH, SEFLG_SPEED,
  SE_CALC_RISE, SE_CALC_SET,
  SE_ECL2HOR, SE_EQU2HOR, SE_TRUE_TO_APP,
} from '../../src/constants';

describe('Rise/Set/Transit (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('sweRiseTrans', () => {
    it('Sun rise should be after J2000', () => {
      const r = sweRiseTrans(swed, J2000, SE_SUN, null, SEFLG_MOSEPH,
        SE_CALC_RISE, LONDON_ARR, 1013.25, 10, null);
      assert.ok(r.retval >= 0);
      assert.ok(r.tret > 0, 'rise time should be positive');
    });

    it('Sun set should be after J2000', () => {
      const r = sweRiseTrans(swed, J2000, SE_SUN, null, SEFLG_MOSEPH,
        SE_CALC_SET, LONDON_ARR, 1013.25, 10, null);
      assert.ok(r.retval >= 0);
      assert.ok(r.tret > J2000, 'set time should be after J2000');
    });
  });

  describe('sweAzalt', () => {
    it('should compute Sun azimuth at J2000', () => {
      const sun = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);
      const xaz = [0, 0, 0];
      sweAzalt(swed, J2000, SE_ECL2HOR, LONDON_ARR, 1013.25, 10,
        [sun.xx[0], sun.xx[1], sun.xx[2]], xaz);
      assert.ok(xaz[0] >= 0 && xaz[0] < 360, `azimuth=${xaz[0]}`);
    });
  });

  describe('sweAzaltRev', () => {
    it('should reverse azalt back to coordinates', () => {
      const sun = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);
      const xaz = [0, 0, 0];
      sweAzalt(swed, J2000, SE_ECL2HOR, LONDON_ARR, 1013.25, 10,
        [sun.xx[0], sun.xx[1], sun.xx[2]], xaz);
      const xout = [0, 0, 0];
      sweAzaltRev(swed, J2000, SE_EQU2HOR, LONDON_ARR, [xaz[0], xaz[2]], xout);
      assert.ok(xout[0] >= 0 && xout[0] < 360);
    });
  });

  describe('sweRefrac', () => {
    it('true-to-apparent should increase altitude', () => {
      const ref = sweRefrac(10, 1013.25, 10, SE_TRUE_TO_APP);
      assert.ok(ref > 10, `refracted=${ref}`);
    });
  });

  describe('sweRefracExtended', () => {
    it('should return positive value', () => {
      const dret = [0, 0, 0, 0];
      const ref = sweRefracExtended(10, 0, 1013.25, 10, 0.0065, SE_TRUE_TO_APP, dret);
      assert.ok(ref > 0);
    });
  });
});
