import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweClose } from '../../src/sweph';
import { julDay, revJul } from '../../src/swedate';
import {
  sweSolEclipseWhenGlob, sweSolEclipseWhere, sweSolEclipseHow, sweSolEclipseWhenLoc,
  sweLunEclipseWhen, sweLunEclipseHow, sweLunEclipseWhenLoc,
  sweLunOccultWhenGlob,
} from '../../src/swecl';
import { SE_MARS, SEFLG_MOSEPH, SE_GREG_CAL } from '../../src/constants';

describe('Eclipses (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('Solar eclipse — 2024 Apr 8 total', () => {
    it('should find the eclipse', () => {
      const start = julDay(2024, 3, 1, 0, SE_GREG_CAL);
      const r = sweSolEclipseWhenGlob(swed, start, SEFLG_MOSEPH, 0, 0);
      assert.ok(r.retval > 0, `retval=${r.retval}`);
      const d = revJul(r.tret[0], SE_GREG_CAL);
      assert.strictEqual(d.month, 4);
      assert.strictEqual(d.day, 8);
    });

    it('should locate central path near lon -104', () => {
      const start = julDay(2024, 3, 1, 0, SE_GREG_CAL);
      const ecl = sweSolEclipseWhenGlob(swed, start, SEFLG_MOSEPH, 0, 0);
      const where = sweSolEclipseWhere(swed, ecl.tret[0], SEFLG_MOSEPH);
      assert.ok(where.retval > 0);
      near(where.geopos[0], -104, 20);
    });

    it('sweSolEclipseHow should return valid attributes', () => {
      const start = julDay(2024, 3, 1, 0, SE_GREG_CAL);
      const ecl = sweSolEclipseWhenGlob(swed, start, SEFLG_MOSEPH, 0, 0);
      const how = sweSolEclipseHow(swed, ecl.tret[0], SEFLG_MOSEPH, [-104, 25, 0]);
      assert.ok(how.retval >= 0);
    });

    it('sweSolEclipseWhenLoc should find local eclipse', () => {
      const start = julDay(2024, 3, 1, 0, SE_GREG_CAL);
      const r = sweSolEclipseWhenLoc(swed, start, SEFLG_MOSEPH, [-104, 25, 0], 0);
      assert.ok(r.retval > 0);
    });
  });

  describe('Lunar eclipse — 2025 Mar 14 total', () => {
    it('should find the eclipse', () => {
      const start = julDay(2025, 3, 1, 0, SE_GREG_CAL);
      const r = sweLunEclipseWhen(swed, start, SEFLG_MOSEPH, 0, 0);
      assert.ok(r.retval > 0);
      const d = revJul(r.tret[0], SE_GREG_CAL);
      assert.strictEqual(d.month, 3);
      assert.strictEqual(d.day, 14);
    });

    it('should have umbral magnitude ~1.176', () => {
      const start = julDay(2025, 3, 1, 0, SE_GREG_CAL);
      const ecl = sweLunEclipseWhen(swed, start, SEFLG_MOSEPH, 0, 0);
      const how = sweLunEclipseHow(swed, ecl.tret[0], SEFLG_MOSEPH, null);
      assert.ok(how.retval > 0);
      near(how.attr[0], 1.176, 0.05);
    });

    it('sweLunEclipseWhenLoc should return', () => {
      const start = julDay(2025, 3, 1, 0, SE_GREG_CAL);
      const r = sweLunEclipseWhenLoc(swed, start, SEFLG_MOSEPH, [-0.1278, 51.5074, 0], 0);
      assert.ok(typeof r.retval === 'number');
    });
  });

  describe('Occultation', () => {
    it('should search for Mars occultation without error', () => {
      const start = julDay(2024, 1, 1, 0, SE_GREG_CAL);
      const r = sweLunOccultWhenGlob(swed, start, SE_MARS, null, SEFLG_MOSEPH, 0, 0);
      assert.ok(typeof r.retval === 'number');
    });
  });
});
