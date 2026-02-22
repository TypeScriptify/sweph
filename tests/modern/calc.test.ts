import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN, SE_MOON, SE_MERCURY, SE_VENUS, SE_MARS, SE_JUPITER, SE_SATURN,
  SE_URANUS, SE_NEPTUNE, SE_PLUTO, SE_EARTH, SE_MEAN_NODE, SE_TRUE_NODE,
  SEFLG_EQUATORIAL, SEFLG_HELCTR,
} from '../../src/constants';

describe('Calculation (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('Sun', () => {
    it('should have longitude ~280.37 at J2000', () => {
      const sun = swe.calc(J2000, SE_SUN);
      near(sun.longitude, 280.37, 0.1);
    });

    it('should have speed ~1.0 deg/day', () => {
      const sun = swe.calc(J2000, SE_SUN);
      near(sun.longitudeSpeed, 1.0, 0.1);
    });

    it('should have nonzero distance', () => {
      const sun = swe.calc(J2000, SE_SUN);
      assert.ok(sun.distance > 0);
    });
  });

  describe('Moon', () => {
    it('should have valid longitude', () => {
      const moon = swe.calc(J2000, SE_MOON);
      assert.ok(moon.longitude >= 0 && moon.longitude < 360);
    });

    it('should have speed ~13 deg/day', () => {
      const moon = swe.calc(J2000, SE_MOON);
      near(moon.longitudeSpeed, 13.0, 2.0);
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
        const r = swe.calc(J2000, id);
        assert.ok(r.longitude >= 0 && r.longitude < 360, `${name}=${r.longitude}`);
      });
    }
  });

  describe('Equatorial', () => {
    it('Sun RA should be valid', () => {
      const r = swe.calc(J2000, SE_SUN, SEFLG_EQUATORIAL);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });
  });

  describe('Heliocentric', () => {
    it('Mars heliocentric should be valid', () => {
      const r = swe.calc(J2000, SE_MARS, SEFLG_HELCTR);
      assert.ok(r.longitude >= 0 && r.longitude < 360);
    });
  });

  describe('calcPlanetocentric', () => {
    it('Mars from Earth should match geocentric', () => {
      const geo = swe.calc(J2000, SE_MARS);
      const pctr = swe.calcPlanetocentric(J2000, SE_MARS, SE_EARTH);
      near(pctr.longitude, geo.longitude, 0.01);
    });
  });

  describe('fixedStar', () => {
    it('Spica should have longitude ~203.84', () => {
      const r = swe.fixedStar('Spica', J2000);
      near(r.longitude, 203.84, 0.5);
    });

    it('should include star name', () => {
      const r = swe.fixedStar('Spica', J2000);
      assert.ok(r.starName.includes('Spica'));
    });
  });

  describe('fixedStar2', () => {
    it('should match fixedStar', () => {
      const r1 = swe.fixedStar('Spica', J2000);
      const r2 = swe.fixedStar2('Spica', J2000);
      near(r2.longitude, r1.longitude, 0.001);
    });
  });

  describe('fixedStarMagnitude', () => {
    it('Spica should have magnitude ~0.98', () => {
      const mag = swe.fixedStarMagnitude('Spica');
      near(mag, 0.98, 0.1);
    });
  });
});
