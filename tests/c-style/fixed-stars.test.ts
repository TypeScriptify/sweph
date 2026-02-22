import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import {
  sweFixstar, sweFixstarUt, sweFixstarMag,
  sweFixstar2, sweFixstar2Ut, sweFixstar2Mag, sweClose,
} from '../../src/sweph';
import { SEFLG_MOSEPH } from '../../src/constants';

describe('Fixed Stars (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('sweFixstar', () => {
    it('Spica should have longitude ~203.84 at J2000', () => {
      const r = sweFixstar(swed, 'Spica', J2000, SEFLG_MOSEPH);
      near(r.xx[0], 203.84, 0.2);
    });

    it('should return canonical star name', () => {
      const r = sweFixstar(swed, 'Spica', J2000, SEFLG_MOSEPH);
      assert.ok(r.starOut.includes('Spica'), `starOut=${r.starOut}`);
    });
  });

  describe('sweFixstarUt', () => {
    it('should produce position close to ET variant', () => {
      const et = sweFixstar(swed, 'Spica', J2000, SEFLG_MOSEPH);
      const ut = sweFixstarUt(swed, 'Spica', J2000, SEFLG_MOSEPH);
      near(ut.xx[0], et.xx[0], 0.01);
    });
  });

  describe('sweFixstarMag', () => {
    it('Spica should have magnitude ~0.98', () => {
      const r = sweFixstarMag(swed, 'Spica');
      assert.ok(r.mag !== undefined, 'magnitude should be defined');
      near(r.mag, 0.98, 0.1);
    });
  });

  describe('sweFixstar2', () => {
    it('should match sweFixstar result', () => {
      const r1 = sweFixstar(swed, 'Spica', J2000, SEFLG_MOSEPH);
      const r2 = sweFixstar2(swed, 'Spica', J2000, SEFLG_MOSEPH);
      near(r2.xx[0], r1.xx[0], 0.001);
    });
  });

  describe('sweFixstar2Ut', () => {
    it('should return valid position', () => {
      const r = sweFixstar2Ut(swed, 'Spica', J2000, SEFLG_MOSEPH);
      assert.ok(r.xx[0] > 0);
    });
  });

  describe('sweFixstar2Mag', () => {
    it('should return valid magnitude', () => {
      const r = sweFixstar2Mag(swed, 'Spica');
      assert.ok(r.mag !== undefined);
    });
  });
});
