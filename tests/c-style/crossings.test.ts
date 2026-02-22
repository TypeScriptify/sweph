import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { julDay, revJul } from '../../src/swedate';
import {
  sweSolcross, sweSolcrossUt,
  sweMooncross, sweMooncrossUt,
  sweMooncrossNode, sweMooncrossNodeUt,
  sweHelioCross, sweHelioCrossUt,
  sweClose,
} from '../../src/sweph';
import { SE_MARS, SEFLG_MOSEPH, SE_GREG_CAL } from '../../src/constants';

describe('Crossings (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('sweSolcross (vernal equinox 2000)', () => {
    it('should find equinox on Mar 20', () => {
      const start = julDay(2000, 3, 1, 0, SE_GREG_CAL);
      const r = sweSolcross(swed, 0, start, SEFLG_MOSEPH);
      assert.ok(r.jd > start);
      const d = revJul(r.jd, SE_GREG_CAL);
      assert.strictEqual(d.month, 3);
      assert.strictEqual(d.day, 20);
    });
  });

  describe('sweSolcrossUt', () => {
    it('should find equinox after start', () => {
      const start = julDay(2000, 3, 1, 0, SE_GREG_CAL);
      const r = sweSolcrossUt(swed, 0, start, SEFLG_MOSEPH);
      assert.ok(r.jd > start);
    });
  });

  describe('sweMooncross', () => {
    it('should find Moon crossing 0 deg', () => {
      const r = sweMooncross(swed, 0, J2000, SEFLG_MOSEPH);
      assert.ok(r.jd > 0);
    });
  });

  describe('sweMooncrossUt', () => {
    it('should find Moon crossing 0 deg (UT)', () => {
      const r = sweMooncrossUt(swed, 0, J2000, SEFLG_MOSEPH);
      assert.ok(r.jd > 0);
    });
  });

  describe('sweMooncrossNode', () => {
    it('should find next node crossing', () => {
      const r = sweMooncrossNode(swed, J2000, SEFLG_MOSEPH);
      assert.ok(r.jd > 0);
    });
  });

  describe('sweMooncrossNodeUt', () => {
    it('should find next node crossing (UT)', () => {
      const r = sweMooncrossNodeUt(swed, J2000, SEFLG_MOSEPH);
      assert.ok(r.jd > 0);
    });
  });

  describe('sweHelioCross', () => {
    it('Mars helio cross should succeed', () => {
      const r = sweHelioCross(swed, SE_MARS, 0, J2000, SEFLG_MOSEPH, 1);
      assert.ok(r.retval >= 0);
    });
  });

  describe('sweHelioCrossUt', () => {
    it('Mars helio cross UT should succeed', () => {
      const r = sweHelioCrossUt(swed, SE_MARS, 0, J2000, SEFLG_MOSEPH, 1);
      assert.ok(r.retval >= 0);
    });
  });
});
