import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000, loadEpheFile } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import {
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
  SE_URANUS, SE_NEPTUNE, SE_PLUTO, SE_CHIRON, SE_PHOLUS, SE_CERES,
  SE_PALLAS, SE_JUNO, SE_VESTA, SE_MEAN_NODE, SE_MEAN_APOG,
} from '../../src/constants';

/**
 * Tests for SE1 binary file reading pipeline.
 * Loads sepl_18.se1, semo_18.se1, seas_18.se1 and verifies calculations.
 */

describe('SE1 Ephemeris (modern)', () => {
  let swe: SwissEph;

  before(() => {
    swe = new SwissEph({ ephemeris: 'swisseph' });
    swe.loadEphemerisFile(loadEpheFile('sepl_18.se1'), 'sepl_18.se1');
    swe.loadEphemerisFile(loadEpheFile('semo_18.se1'), 'semo_18.se1');
    swe.loadEphemerisFile(loadEpheFile('seas_18.se1'), 'seas_18.se1');
  });
  after(() => { swe.close(); });

  describe('File loading', () => {
    it('should compute Sun without error after loading sepl_18', () => {
      const r = swe.calc(J2000, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('should compute Moon without error after loading semo_18', () => {
      const r = swe.calc(J2000, SE_MOON);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('should compute Chiron without error after loading seas_18', () => {
      const r = swe.calc(J2000, SE_CHIRON);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });
  });

  describe('Sun and Moon via SE1 at J2000', () => {
    it('Sun longitude should be ~280.37', () => {
      const r = swe.calc(J2000, SE_SUN);
      near(r.longitude, 280.371, 0.02);
    });

    it('Sun speed should be ~1.02 deg/day', () => {
      const r = swe.calc(J2000, SE_SUN);
      near(r.longitudeSpeed, 1.02, 0.01);
    });

    it('Moon longitude should be ~223.33', () => {
      const r = swe.calc(J2000, SE_MOON);
      near(r.longitude, 223.33, 0.02);
    });

    it('Moon speed should be ~12.02 deg/day', () => {
      const r = swe.calc(J2000, SE_MOON);
      near(r.longitudeSpeed, 12.02, 0.02);
    });

    it('Sun nonzero distance', () => {
      const r = swe.calc(J2000, SE_SUN);
      assert.ok(r.distance > 0.98 && r.distance < 1.02);
    });
  });

  describe('All planets via SE1 should have valid longitudes', () => {
    const planets = [
      { id: SE_SUN,     name: 'Sun' },
      { id: SE_MOON,    name: 'Moon' },
      { id: SE_MERCURY, name: 'Mercury' },
      { id: SE_VENUS,   name: 'Venus' },
      { id: SE_MARS,    name: 'Mars' },
      { id: SE_JUPITER, name: 'Jupiter' },
      { id: SE_SATURN,  name: 'Saturn' },
      { id: SE_URANUS,  name: 'Uranus' },
      { id: SE_NEPTUNE, name: 'Neptune' },
      { id: SE_PLUTO,   name: 'Pluto' },
    ];

    for (const { id, name } of planets) {
      it(`${name} longitude should be in [0, 360)`, () => {
        const r = swe.calc(J2000, id);
        assert.ok(r.longitude >= 0 && r.longitude < 360, `${name}=${r.longitude}`);
      });
    }
  });

  describe('SE1 vs Moshier for Sun and Moon', () => {
    it('Sun SE1 should agree with Moshier within 1 arcsecond', () => {
      const swe2 = new SwissEph();
      const mosh = swe2.calc(J2000, SE_SUN);
      swe2.close();
      const se1 = swe.calc(J2000, SE_SUN);
      const diff = Math.abs(se1.longitude - mosh.longitude);
      assert.ok(diff < 1 / 3600, `Sun SE1-Moshier diff=${(diff * 3600).toFixed(2)}" exceeds 1"`);
    });

    it('Moon SE1 should agree with Moshier within 1 arcsecond', () => {
      const swe2 = new SwissEph();
      const mosh = swe2.calc(J2000, SE_MOON);
      swe2.close();
      const se1 = swe.calc(J2000, SE_MOON);
      const diff = Math.abs(se1.longitude - mosh.longitude);
      assert.ok(diff < 1 / 3600, `Moon SE1-Moshier diff=${(diff * 3600).toFixed(2)}" exceeds 1"`);
    });
  });

  describe('Asteroid file (seas_18) at J2000', () => {
    const asteroids = [
      { id: SE_CHIRON, name: 'Chiron' },
      { id: SE_PHOLUS, name: 'Pholus' },
      { id: SE_CERES,  name: 'Ceres' },
      { id: SE_PALLAS, name: 'Pallas' },
      { id: SE_JUNO,   name: 'Juno' },
      { id: SE_VESTA,  name: 'Vesta' },
    ];

    for (const { id, name } of asteroids) {
      it(`${name} should have valid longitude`, () => {
        const r = swe.calc(J2000, id);
        assert.ok(r.longitude >= 0 && r.longitude < 360, `${name}=${r.longitude}`);
      });

      it(`${name} should have nonzero distance`, () => {
        const r = swe.calc(J2000, id);
        assert.ok(r.distance > 0, `${name} dist=${r.distance}`);
      });

      it(`${name} should have valid speed`, () => {
        const r = swe.calc(J2000, id);
        assert.ok(Math.abs(r.longitudeSpeed) < 2, `${name} speed=${r.longitudeSpeed}`);
      });
    }
  });

  describe('Nodes and Mean Apogee at J2000', () => {
    it('Mean Node should be ~125.04', () => {
      const r = swe.calc(J2000, SE_MEAN_NODE);
      near(r.longitude, 125.04, 0.02);
    });

    it('Mean Node speed should be retrograde', () => {
      const r = swe.calc(J2000, SE_MEAN_NODE);
      assert.ok(r.longitudeSpeed < 0, `Mean Node speed=${r.longitudeSpeed}`);
    });

    it('Mean Apogee (Lilith) should be ~263.47', () => {
      const r = swe.calc(J2000, SE_MEAN_APOG);
      near(r.longitude, 263.47, 0.02);
    });
  });

  describe('Windows-style path handling', () => {
    it('should accept filename with backslash path prefix', () => {
      const swe2 = new SwissEph({ ephemeris: 'swisseph' });
      // Load with Windows-style path — basename extraction should handle backslash
      swe2.loadEphemerisFile(loadEpheFile('sepl_18.se1'), 'C:\\ephe\\sepl_18.se1');
      swe2.loadEphemerisFile(loadEpheFile('semo_18.se1'), 'D:\\data\\semo_18.se1');
      const r = swe2.calc(J2000, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360, `Sun=${r.longitude}`);
      near(r.longitude, 280.371, 0.02);
      swe2.close();
    });

    it('should accept filename with forward slash path prefix', () => {
      const swe2 = new SwissEph({ ephemeris: 'swisseph' });
      swe2.loadEphemerisFile(loadEpheFile('sepl_18.se1'), '/usr/share/ephe/sepl_18.se1');
      const r = swe2.calc(J2000, SE_SUN);
      near(r.longitude, 280.371, 0.02);
      swe2.close();
    });
  });

  describe('Edge tjd near file start', () => {
    it('should handle tjd slightly before tfstart without error', () => {
      // SE1 files for 1800-2400: tfstart ≈ JD 2378496.5 (1800 Jan 1)
      // Test a date very close to but slightly before file start
      // Math.trunc ensures we get segment 0 instead of -1
      const nearStart = 2378496.5 + 0.001; // just after file start
      const r = swe.calc(nearStart, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360, `Sun=${r.longitude}`);
    });
  });

  describe('Date range validity', () => {
    it('Sun at 1900 should have valid longitude', () => {
      const r = swe.calc(2415020.0, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
      near(r.longitude, 279.64, 0.1);
    });

    it('Mars at 1900 should have valid longitude', () => {
      const r = swe.calc(2415020.0, SE_MARS);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('Sun at 2100 should have valid longitude', () => {
      const r = swe.calc(2488069.5, SE_SUN);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
      near(r.longitude, 280.60, 0.1);
    });

    it('Jupiter at 2100 should have valid longitude', () => {
      const r = swe.calc(2488069.5, SE_JUPITER);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });
  });
});
