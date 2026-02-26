import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000, loadEpheFile } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import {
  SE_CHIRON, SE_PHOLUS, SE_CERES, SE_PALLAS, SE_JUNO, SE_VESTA,
  SE_MEAN_APOG, SE_INTP_APOG, SE_INTP_PERG,
  SE_CUPIDO, SE_HADES, SE_ZEUS, SE_KRONOS, SE_APOLLON,
  SE_ADMETOS, SE_VULKANUS, SE_POSEIDON,
  SE_MEAN_NODE, SE_TRUE_NODE, SE_OSCU_APOG,
} from '../../src/constants';

/**
 * Tests for minor bodies (asteroids), Lilith variants, nodes, and fictitious/Uranian bodies.
 * Asteroids require SE1 file (seas_18.se1) since Moshier asteroids need file data.
 * Fictitious bodies use built-in analytical ephemeris (no files needed).
 */

describe('Minor bodies (modern)', () => {
  let swe: SwissEph;

  before(() => {
    // Load SE1 files for asteroids
    swe = new SwissEph({ ephemeris: 'swisseph' });
    swe.loadEphemerisFile(loadEpheFile('sepl_18.se1'), 'sepl_18.se1');
    swe.loadEphemerisFile(loadEpheFile('semo_18.se1'), 'semo_18.se1');
    swe.loadEphemerisFile(loadEpheFile('seas_18.se1'), 'seas_18.se1');
  });
  after(() => { swe.close(); });

  describe('Asteroids at J2000', () => {
    // Reference: swetest -ut -bj2451545.0 -pDEFGHI -edir. -fPls
    const asteroids = [
      { id: SE_CHIRON, name: 'Chiron', lon: 251.62, speed: 0.114 },
      { id: SE_PHOLUS, name: 'Pholus', lon: 215.49, speed: 0.048 },
      { id: SE_CERES,  name: 'Ceres',  lon: 184.45, speed: 0.220 },
      { id: SE_PALLAS, name: 'Pallas', lon: 134.04, speed: -0.196 },
      { id: SE_JUNO,   name: 'Juno',   lon: 278.00, speed: 0.372 },
      { id: SE_VESTA,  name: 'Vesta',  lon: 245.97, speed: 0.520 },
    ];

    for (const { id, name, lon, speed } of asteroids) {
      it(`${name} longitude should be ~${lon.toFixed(1)}`, () => {
        const r = swe.calc(J2000, id);
        near(r.longitude, lon, 0.1);
      });

      it(`${name} speed should be ~${speed}`, () => {
        const r = swe.calc(J2000, id);
        near(r.longitudeSpeed, speed, 0.01);
      });

      it(`${name} should have valid distance`, () => {
        const r = swe.calc(J2000, id);
        assert.ok(r.distance > 0, `${name} distance=${r.distance}`);
      });
    }
  });

  describe('Lilith variants at J2000', () => {
    it('Mean Apogee (Mean Lilith) should be ~263.47', () => {
      const r = swe.calc(J2000, SE_MEAN_APOG);
      near(r.longitude, 263.47, 0.02);
    });

    it('Mean Apogee speed ~0.11 deg/day', () => {
      const r = swe.calc(J2000, SE_MEAN_APOG);
      near(r.longitudeSpeed, 0.111, 0.01);
    });

    it('Interpolated Apogee should be ~259.17', () => {
      const r = swe.calc(J2000, SE_INTP_APOG);
      near(r.longitude, 259.17, 0.1);
    });

    it('Interpolated Perigee should have valid longitude', () => {
      const r = swe.calc(J2000, SE_INTP_PERG);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });

    it('Interpolated Perigee speed should be positive', () => {
      const r = swe.calc(J2000, SE_INTP_PERG);
      assert.ok(r.longitudeSpeed > 0, `IntpPerig speed=${r.longitudeSpeed}`);
    });
  });

  describe('Mean Node at J2000', () => {
    it('Mean Node should be ~125.04', () => {
      const r = swe.calc(J2000, SE_MEAN_NODE);
      near(r.longitude, 125.04, 0.02);
    });

    it('Mean Node speed should be retrograde (~-0.053)', () => {
      const r = swe.calc(J2000, SE_MEAN_NODE);
      near(r.longitudeSpeed, -0.053, 0.005);
    });
  });

  describe('True Node at J2000', () => {
    // Reference: swetest -ut -bj2451545.0 -pt -flbRss -emos
    // lon=123.9529, lat=0.0, dist=0.002445, speed=-0.0544
    // NOTE: Moshier true node has ~0.03° tolerance due to Moon analytical theory
    // differences being amplified by the z-projection formula (fac ≈ 36x).
    it('True Node longitude should be ~123.95', () => {
      const r = swe.calc(J2000, SE_TRUE_NODE);
      near(r.longitude, 123.953, 0.05);
    });

    it('True Node latitude should be 0', () => {
      const r = swe.calc(J2000, SE_TRUE_NODE);
      near(r.latitude, 0.0, 0.001);
    });

    it('True Node speed should be retrograde (~-0.054)', () => {
      const r = swe.calc(J2000, SE_TRUE_NODE);
      near(r.longitudeSpeed, -0.054, 0.005);
    });

    it('True Node distance should be valid', () => {
      const r = swe.calc(J2000, SE_TRUE_NODE);
      assert.ok(r.distance > 0.001 && r.distance < 0.005,
        `True Node dist=${r.distance} AU`);
    });
  });

  describe('Osculating Apogee at J2000', () => {
    // Reference: swetest -ut -bj2451545.0 -pB -flbRss -emos
    // lon=252.9794, lat=4.0755, dist=0.002714, speed=1.6468
    it('Osc Apogee longitude should be ~252.98', () => {
      const r = swe.calc(J2000, SE_OSCU_APOG);
      near(r.longitude, 252.979, 0.01);
    });

    it('Osc Apogee latitude should be ~4.08', () => {
      const r = swe.calc(J2000, SE_OSCU_APOG);
      near(r.latitude, 4.076, 0.01);
    });

    it('Osc Apogee speed should be ~1.65 deg/day', () => {
      const r = swe.calc(J2000, SE_OSCU_APOG);
      near(r.longitudeSpeed, 1.647, 0.01);
    });

    it('Osc Apogee distance should be ~0.00271 AU', () => {
      const r = swe.calc(J2000, SE_OSCU_APOG);
      near(r.distance, 0.002714, 0.0001);
    });
  });

  describe('Uranian / Fictitious bodies at J2000', () => {
    // Reference: swetest -ut -bj2451545.0 -pJKLMNOPQ -fPls
    // TS Moshier values match swetest within ~0.02°
    const uranians = [
      { id: SE_CUPIDO,   name: 'Cupido',   lon: 243.90, spd:  0.023 },
      { id: SE_HADES,    name: 'Hades',    lon:  78.19, spd: -0.016 },
      { id: SE_ZEUS,     name: 'Zeus',     lon: 185.40, spd:  0.001 },
      { id: SE_KRONOS,   name: 'Kronos',   lon:  87.81, spd: -0.013 },
      { id: SE_APOLLON,  name: 'Apollon',  lon: 201.31, spd:  0.004 },
      { id: SE_ADMETOS,  name: 'Admetos',  lon:  49.13, spd: -0.007 },
      { id: SE_VULKANUS, name: 'Vulkanus', lon: 110.45, spd: -0.011 },
      { id: SE_POSEIDON, name: 'Poseidon', lon: 214.56, spd:  0.006 },
    ];

    for (const { id, name, lon, spd } of uranians) {
      it(`${name} longitude should be ~${lon.toFixed(1)}`, () => {
        const r = swe.calc(J2000, id);
        near(r.longitude, lon, 0.02);
      });

      it(`${name} speed should have correct sign`, () => {
        const r = swe.calc(J2000, id);
        if (spd >= 0) {
          assert.ok(r.longitudeSpeed >= -0.01, `${name} speed=${r.longitudeSpeed} expected >=0`);
        } else {
          assert.ok(r.longitudeSpeed <= 0.01, `${name} speed=${r.longitudeSpeed} expected <=0`);
        }
      });
    }
  });

  describe('Planet names', () => {
    const nameTests = [
      { id: SE_CHIRON,    expected: 'Chiron' },
      { id: SE_PHOLUS,    expected: 'Pholus' },
      { id: SE_CERES,     expected: 'Ceres' },
      { id: SE_PALLAS,    expected: 'Pallas' },
      { id: SE_JUNO,      expected: 'Juno' },
      { id: SE_VESTA,     expected: 'Vesta' },
      { id: SE_MEAN_APOG, expected: 'Apogee' },
      { id: SE_CUPIDO,    expected: 'Cupido' },
      { id: SE_POSEIDON,  expected: 'Poseidon' },
    ];

    for (const { id, expected } of nameTests) {
      it(`getPlanetName(${id}) should contain "${expected}"`, () => {
        const name = swe.getPlanetName(id);
        assert.ok(
          name.toLowerCase().includes(expected.toLowerCase()),
          `Expected "${name}" to contain "${expected}"`,
        );
      });
    }
  });
});
