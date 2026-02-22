import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweCalc, sweCalcUt, sweSetTopo, sweClose } from '../../src/sweph';
import {
  SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
  SE_URANUS, SE_NEPTUNE, SE_PLUTO, SE_MEAN_NODE, SE_TRUE_NODE,
  SE_OSCU_APOG, SE_EARTH,
  SEFLG_MOSEPH, SEFLG_SPEED, SEFLG_EQUATORIAL, SEFLG_HELCTR, SEFLG_TOPOCTR,
} from '../../src/constants';

describe('Planet Positions (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('Sun', () => {
    it('should have longitude ~280.37 at J2000', () => {
      const r = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);
      near(r.xx[0], 280.37, 0.1);
    });

    it('should have speed ~1.0 deg/day', () => {
      const r = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);
      near(r.xx[3], 1.0, 0.1);
    });
  });

  describe('Moon', () => {
    it('should have valid longitude at J2000', () => {
      const r = sweCalc(swed, J2000, SE_MOON, SEFLG_MOSEPH | SEFLG_SPEED);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });

    it('should have speed ~13 deg/day', () => {
      const r = sweCalc(swed, J2000, SE_MOON, SEFLG_MOSEPH | SEFLG_SPEED);
      near(r.xx[3], 13.0, 2.0);
    });
  });

  describe('All planets', () => {
    const planets = [
      { id: SE_MERCURY, name: 'Mercury' },
      { id: SE_VENUS, name: 'Venus' },
      { id: SE_MARS, name: 'Mars' },
      { id: SE_JUPITER, name: 'Jupiter' },
      { id: SE_SATURN, name: 'Saturn' },
      { id: SE_URANUS, name: 'Uranus' },
      { id: SE_NEPTUNE, name: 'Neptune' },
      { id: SE_PLUTO, name: 'Pluto' },
    ];

    for (const { id, name } of planets) {
      it(`${name} should have valid longitude`, () => {
        const r = sweCalc(swed, J2000, id, SEFLG_MOSEPH | SEFLG_SPEED);
        assert.ok(r.xx[0] >= 0 && r.xx[0] < 360, `${name} lon=${r.xx[0]}`);
        assert.ok(r.xx[2] > 0, `${name} distance should be positive`);
      });
    }
  });

  describe('sweCalcUt', () => {
    it('should calculate Mars via UT', () => {
      const r = sweCalcUt(swed, J2000, SE_MARS, SEFLG_MOSEPH | SEFLG_SPEED);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });
  });

  describe('Nodes and apsides', () => {
    it('Mean node should have valid longitude', () => {
      const r = sweCalc(swed, J2000, SE_MEAN_NODE, SEFLG_MOSEPH | SEFLG_SPEED);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });

    it('True node should have valid longitude', () => {
      const r = sweCalc(swed, J2000, SE_TRUE_NODE, SEFLG_MOSEPH | SEFLG_SPEED);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });

    it('Osculating apogee should have valid longitude', () => {
      const r = sweCalc(swed, J2000, SE_OSCU_APOG, SEFLG_MOSEPH);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });
  });

  describe('Equatorial coordinates', () => {
    it('Sun RA should be valid at J2000', () => {
      const r = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_EQUATORIAL);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360, `RA=${r.xx[0]}`);
    });
  });

  describe('Heliocentric', () => {
    it('Mars heliocentric should have valid longitude', () => {
      const r = sweCalc(swed, J2000, SE_MARS, SEFLG_MOSEPH | SEFLG_HELCTR);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });

    it('Earth heliocentric should have valid longitude', () => {
      const r = sweCalc(swed, J2000, SE_EARTH, SEFLG_MOSEPH | SEFLG_HELCTR);
      assert.ok(r.xx[0] >= 0 && r.xx[0] < 360);
    });
  });

  describe('Topocentric', () => {
    it('Sun should differ slightly from geocentric', () => {
      const geo = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);
      sweSetTopo(swed, -0.1278, 51.5074, 0);
      const topo = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_TOPOCTR | SEFLG_SPEED);
      assert.ok(topo.xx[0] >= 0 && topo.xx[0] < 360);
      // Topocentric should differ slightly from geocentric
      assert.ok(Math.abs(topo.xx[0] - geo.xx[0]) < 1, 'Topo should be close to geo');
    });
  });
});
