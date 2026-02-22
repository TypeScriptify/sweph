import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_MARS } from '../../src/constants';

describe('Eclipses (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('Solar eclipse — 2024 Apr 8', () => {
    const eclJd = SwissEph.julianDay(2024, 4, 1, 0);

    it('should find the eclipse', () => {
      const ecl = swe.solarEclipseGlobal(eclJd);
      assert.ok(ecl.maximum > eclJd);
    });

    it('should occur on Apr 8', () => {
      const ecl = swe.solarEclipseGlobal(eclJd);
      const d = SwissEph.fromJulianDay(ecl.maximum);
      assert.strictEqual(d.month, 4);
      assert.strictEqual(d.day, 8);
    });

    it('central path should be near lon -104', () => {
      const ecl = swe.solarEclipseGlobal(eclJd);
      const where = swe.solarEclipseWhere(ecl.maximum);
      near(where.geopos.longitude, -104, 20);
    });

    it('solarEclipseHow should return attributes', () => {
      const ecl = swe.solarEclipseGlobal(eclJd);
      const how = swe.solarEclipseHow(ecl.maximum, { longitude: -104, latitude: 25 });
      assert.ok(typeof how.type === 'number');
      assert.ok(typeof how.attributes.magnitude === 'number');
    });

    it('solarEclipseLocal should find eclipse', () => {
      const ecl = swe.solarEclipseLocal(eclJd, { longitude: -104, latitude: 25 });
      assert.ok(ecl.maximum > eclJd);
    });
  });

  describe('Lunar eclipse — 2025 Mar 14', () => {
    const lunJd = SwissEph.julianDay(2025, 3, 1, 0);

    it('should find the eclipse', () => {
      const lun = swe.lunarEclipseGlobal(lunJd);
      assert.ok(lun.maximum > lunJd);
    });

    it('should occur on Mar 14', () => {
      const lun = swe.lunarEclipseGlobal(lunJd);
      const d = SwissEph.fromJulianDay(lun.maximum);
      assert.strictEqual(d.month, 3);
      assert.strictEqual(d.day, 14);
    });

    it('umbral magnitude should be ~1.176', () => {
      const lun = swe.lunarEclipseGlobal(lunJd);
      const how = swe.lunarEclipseHow(lun.maximum);
      near(how.umbraMagnitude, 1.176, 0.05);
    });

    it('lunarEclipseLocal should return', () => {
      const lun = swe.lunarEclipseLocal(lunJd, LONDON);
      assert.ok(typeof lun.maximum === 'number');
    });
  });

  describe('Occultation', () => {
    it('should search for Mars occultation', () => {
      const start = SwissEph.julianDay(2024, 1, 1, 0);
      const r = swe.occultationGlobal(start, SE_MARS);
      assert.ok(typeof r.type === 'number');
    });
  });
});
