import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { julDay, revJul, dateConversion, utcTimeZone, utcToJd, jdetToUtc, jdut1ToUtc } from '../../src/swedate';
import { sweDeltat, sweDeltatEx, sweSidtime, sweSidtime0, sweDayOfWeek } from '../../src/swephlib';
import { SE_GREG_CAL, SE_JUL_CAL, SEFLG_MOSEPH } from '../../src/constants';

const swed = createDefaultSweData();
const deltatFn = (tjd: number, iflag: number) => sweDeltatEx(tjd, iflag, swed);

describe('Date/Time (C-style)', () => {
  describe('julDay / revJul', () => {
    it('should return J2000 = 2451545.0', () => {
      assert.strictEqual(julDay(2000, 1, 1, 12, SE_GREG_CAL), J2000);
    });

    it('should round-trip through revJul', () => {
      const rv = revJul(J2000, SE_GREG_CAL);
      assert.strictEqual(rv.year, 2000);
      assert.strictEqual(rv.month, 1);
      assert.strictEqual(rv.day, 1);
      assert.strictEqual(rv.hour, 12);
    });

    it('should handle Julian calendar', () => {
      const jd = julDay(2000, 1, 1, 12, SE_JUL_CAL);
      assert.ok(jd !== J2000, 'Julian and Gregorian should differ');
      const rv = revJul(jd, SE_JUL_CAL);
      assert.strictEqual(rv.year, 2000);
      assert.strictEqual(rv.month, 1);
      assert.strictEqual(rv.day, 1);
    });

    it('should handle negative years (BCE)', () => {
      const jd = julDay(-4712, 1, 1, 12, SE_JUL_CAL);
      assert.ok(jd >= 0 && jd < 1, `JD epoch should be near 0, got ${jd}`);
    });
  });

  describe('dateConversion', () => {
    it('should validate a valid Gregorian date', () => {
      const dc = dateConversion(2000, 1, 1, 12, 'g');
      assert.ok(dc.ok);
      near(dc.jd, J2000, 0.001);
    });
  });

  describe('utcTimeZone', () => {
    it('should offset by timezone', () => {
      const tz = utcTimeZone(2000, 1, 1, 12, 0, 0, -5);
      assert.strictEqual(tz.hour, 17);
    });
  });

  describe('utcToJd / jdetToUtc / jdut1ToUtc', () => {
    it('should convert UTC to JD', () => {
      const r = utcToJd(2000, 1, 1, 12, 0, 0, SE_GREG_CAL, deltatFn);
      near(r.tjdUt, J2000, 0.001);
      assert.ok(r.tjdEt > r.tjdUt, 'ET should be ahead of UT');
    });

    it('should round-trip through jdetToUtc', () => {
      const r = utcToJd(2000, 1, 1, 12, 0, 0, SE_GREG_CAL, deltatFn);
      const utc = jdetToUtc(r.tjdEt, SE_GREG_CAL, deltatFn);
      assert.strictEqual(utc.year, 2000);
      assert.strictEqual(utc.month, 1);
      assert.strictEqual(utc.day, 1);
    });

    it('should round-trip through jdut1ToUtc', () => {
      const r = utcToJd(2000, 1, 1, 12, 0, 0, SE_GREG_CAL, deltatFn);
      const utc = jdut1ToUtc(r.tjdUt, SE_GREG_CAL, deltatFn);
      assert.strictEqual(utc.year, 2000);
    });
  });

  describe('deltaT', () => {
    it('should return positive value at J2000', () => {
      const dt = sweDeltat(J2000, swed);
      assert.ok(dt > 0, `deltaT should be > 0, got ${dt}`);
      assert.ok(dt < 0.01, `deltaT should be < 0.01 days, got ${dt}`);
    });

    it('should match sweDeltatEx', () => {
      const dt = sweDeltat(J2000, swed);
      const dtEx = sweDeltatEx(J2000, SEFLG_MOSEPH, swed);
      near(dt, dtEx, 0.0001);
    });
  });

  describe('sidereal time', () => {
    it('sweSidtime should return 0-24 hours', () => {
      const st = sweSidtime(swed, J2000);
      assert.ok(st > 0 && st < 24, `sidtime=${st}`);
    });

    it('sweSidtime0 should return 0-24 hours', () => {
      const st = sweSidtime0(swed, J2000, 23.44, 0);
      assert.ok(st > 0 && st < 24);
    });
  });

  describe('dayOfWeek', () => {
    it('J2000 should be Saturday (5)', () => {
      assert.strictEqual(sweDayOfWeek(J2000), 5);
    });

    it('2024-01-01 should be Monday (0)', () => {
      const jd = julDay(2024, 1, 1, 12, SE_GREG_CAL);
      assert.strictEqual(sweDayOfWeek(jd), 0);
    });
  });
});
