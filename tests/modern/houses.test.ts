import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN } from '../../src/constants';

describe('Houses (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('houses (Placidus, London, J2000)', () => {
    it('ascendant should be ~24.03', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      near(h.ascendant, 24.03, 0.5);
    });

    it('MC should be ~279.50', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      near(h.mc, 279.50, 0.5);
    });

    it('cusps should have 37 elements', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      assert.strictEqual(h.cusps.length, 37);
    });

    it('cusp[1] should equal ascendant', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      near(h.cusps[1], h.ascendant, 0.001);
    });

    it('should have vertex', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      assert.ok(h.vertex >= 0 && h.vertex < 360);
    });
  });

  describe('housesFromArmc', () => {
    it('should match houses result', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      const h2 = swe.housesFromArmc(h.armc, LONDON.latitude, 23.44, 'P');
      near(h2.ascendant, h.ascendant, 0.5);
    });
  });

  describe('housePosition', () => {
    it('Sun should be in house ~10.05', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      const sun = swe.calc(J2000, SE_SUN);
      const pos = swe.housePosition(h.armc, LONDON.latitude, 23.44, 'P',
        sun.longitude, sun.latitude);
      near(pos, 10.05, 0.2);
    });

    it('should return value between 1 and 12', () => {
      const h = swe.houses(J2000, LONDON, 'P');
      const sun = swe.calc(J2000, SE_SUN);
      const pos = swe.housePosition(h.armc, LONDON.latitude, 23.44, 'P',
        sun.longitude, sun.latitude);
      assert.ok(pos >= 1 && pos <= 13);
    });
  });

  describe('houseName', () => {
    it('should return name containing Placidus for P', () => {
      assert.ok(swe.houseName('P').toLowerCase().includes('placidus'));
    });

    it('should return Koch for K', () => {
      assert.ok(swe.houseName('K').toLowerCase().includes('koch'));
    });
  });

  describe('All house systems', () => {
    const systems = ['P', 'K', 'E', 'W', 'C', 'R', 'T', 'B', 'M', 'O'];

    for (const sys of systems) {
      it(`System ${sys} should produce valid result`, () => {
        const h = swe.houses(J2000, LONDON, sys);
        assert.ok(h.ascendant >= 0 && h.ascendant < 360);
        assert.ok(h.mc >= 0 && h.mc < 360);
      });
    }
  });
});
