import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweCalc, sweClose } from '../../src/sweph';
import {
  sweHouses, sweHousesEx, sweHousesEx2,
  sweHousesArmc, sweHousesArmcEx2,
  sweHousePos, sweHouseName,
} from '../../src/swehouse';
import { SE_SUN, SEFLG_MOSEPH, SEFLG_SPEED } from '../../src/constants';

describe('Houses (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('sweHouses (Placidus, London, J2000)', () => {
    it('should produce valid AC and MC', () => {
      const cusp = new Array(37).fill(0);
      const ascmc = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp, ascmc);
      near(ascmc[0], 24.03, 0.5);
      near(ascmc[1], 279.50, 0.5);
    });

    it('cusp[1] should equal AC', () => {
      const cusp = new Array(37).fill(0);
      const ascmc = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp, ascmc);
      near(cusp[1], ascmc[0], 0.001);
    });
  });

  describe('sweHousesEx', () => {
    it('should match sweHouses', () => {
      const cusp1 = new Array(37).fill(0);
      const ascmc1 = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp1, ascmc1);

      const cusp2 = new Array(37).fill(0);
      const ascmc2 = new Array(10).fill(0);
      sweHousesEx(swed, J2000, SEFLG_MOSEPH, 51.5074, -0.1278, 'P', cusp2, ascmc2);
      near(ascmc2[0], ascmc1[0], 0.001);
    });
  });

  describe('sweHousesEx2', () => {
    it('should match sweHouses', () => {
      const cusp1 = new Array(37).fill(0);
      const ascmc1 = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp1, ascmc1);

      const cusp3 = new Array(37).fill(0);
      const ascmc3 = new Array(10).fill(0);
      sweHousesEx2(swed, J2000, SEFLG_MOSEPH, 51.5074, -0.1278, 'P', cusp3, ascmc3, null, null, null);
      near(ascmc3[0], ascmc1[0], 0.001);
    });
  });

  describe('sweHousesArmc', () => {
    it('should produce AC close to sweHouses', () => {
      const cusp = new Array(37).fill(0);
      const ascmc = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp, ascmc);
      const armc = ascmc[2];

      const cuspA = new Array(37).fill(0);
      const ascmcA = new Array(10).fill(0);
      sweHousesArmc(armc, 51.5074, 23.44, 'P', cuspA, ascmcA);
      near(ascmcA[0], ascmc[0], 0.5);
    });
  });

  describe('sweHousesArmcEx2', () => {
    it('should produce valid AC', () => {
      const cusp = new Array(37).fill(0);
      const ascmc = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp, ascmc);
      const armc = ascmc[2];

      const cuspB = new Array(37).fill(0);
      const ascmcB = new Array(10).fill(0);
      sweHousesArmcEx2(armc, 51.5074, 23.44, 'P', cuspB, ascmcB, null, null, null);
      assert.ok(ascmcB[0] > 0);
    });
  });

  describe('sweHousePos', () => {
    it('Sun should be in house ~10 at J2000 London', () => {
      const cusp = new Array(37).fill(0);
      const ascmc = new Array(10).fill(0);
      sweHouses(swed, J2000, 51.5074, -0.1278, 'P', cusp, ascmc);
      const sun = sweCalc(swed, J2000, SE_SUN, SEFLG_MOSEPH | SEFLG_SPEED);
      const hpos = sweHousePos(ascmc[2], 51.5074, 23.44, 'P', [sun.xx[0], sun.xx[1]], null);
      assert.ok(hpos > 0 && hpos <= 12, `hpos=${hpos}`);
      near(hpos, 10.05, 0.2);
    });
  });

  describe('sweHouseName', () => {
    it('should return Placidus for P', () => {
      assert.strictEqual(sweHouseName('P'), 'Placidus');
    });

    it('should return Koch for K', () => {
      assert.strictEqual(sweHouseName('K'), 'Koch');
    });

    it('should return equal for E', () => {
      assert.ok(sweHouseName('E').toLowerCase().includes('equal'));
    });

    it('should return whole sign for W', () => {
      assert.ok(sweHouseName('W').toLowerCase().includes('whole sign'));
    });
  });

  describe('All house systems produce valid cusps', () => {
    const systems = ['P', 'K', 'E', 'W', 'C', 'R', 'T', 'B', 'M', 'O'];

    for (const sys of systems) {
      it(`System ${sys} should produce 12 valid cusps`, () => {
        const cusp = new Array(37).fill(0);
        const ascmc = new Array(10).fill(0);
        sweHouses(swed, J2000, 51.5074, -0.1278, sys, cusp, ascmc);
        assert.ok(ascmc[0] > 0 && ascmc[0] < 360, `AC invalid for ${sys}`);
        for (let i = 1; i <= 12; i++) {
          assert.ok(cusp[i] >= 0 && cusp[i] < 360, `Cusp ${i} invalid for ${sys}`);
        }
      });
    }
  });
});
