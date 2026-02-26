import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';

/**
 * Tests all house systems not covered by the existing houses.test.ts.
 * Reference values from swetest -ut -bj2451545.0 -house-0.1278,51.5074,<sys> -fPl -head
 * Houses use sidereal time (UT-based), so values are the same regardless of UT/ET mode.
 */

describe('Houses extended (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  // House systems with expected cusp[1] and cusp[4] from swetest
  const systems: Array<{
    sys: string;
    name: string;
    cusp1: number;
    cusp4: number;
    cusps: number;
  }> = [
    { sys: 'A', name: 'Equal (Asc)',          cusp1:  24.0145904, cusp4: 114.0145904, cusps: 12 },
    { sys: 'D', name: 'Equal (MC)',            cusp1:   9.4932253, cusp4:  99.4932253, cusps: 12 },
    { sys: 'F', name: 'Carter',               cusp1:  24.0145904, cusp4: 110.5584401, cusps: 12 },
    { sys: 'G', name: 'Gauquelin',            cusp1:  24.0145904, cusp4: 327.4854873, cusps: 36 },
    { sys: 'H', name: 'Azimuthal/Horizontal', cusp1:   8.3682358, cusp4:  99.4932253, cusps: 12 },
    { sys: 'I', name: 'Sunshine',             cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
    { sys: 'J', name: 'Sunshine/Treindl',     cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
    { sys: 'L', name: 'Pullen SD',            cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
    { sys: 'N', name: 'Equal/Whole (0 Ari)',   cusp1:   0.0000000, cusp4:  90.0000000, cusps: 12 },
    { sys: 'O', name: 'Porphyry',             cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
    { sys: 'Q', name: 'Pullen SR',            cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
    { sys: 'S', name: 'Sripati',              cusp1:   6.5943629, cusp4:  86.9134528, cusps: 12 },
    { sys: 'U', name: 'Krusinski',            cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
    { sys: 'V', name: 'Vehlow Equal',         cusp1:   9.0145904, cusp4:  99.0145904, cusps: 12 },
    { sys: 'X', name: 'Meridian/Axial',       cusp1:  11.2354538, cusp4:  99.4932253, cusps: 12 },
    { sys: 'Y', name: 'APC houses',           cusp1:  24.0145904, cusp4:  99.4932253, cusps: 12 },
  ];

  for (const { sys, name, cusp1, cusp4, cusps } of systems) {
    describe(`System ${sys} (${name})`, () => {
      it('cusp[1] should match swetest', () => {
        const h = swe.houses(J2000, LONDON, sys);
        near(h.cusps[1], cusp1, 0.001);
      });

      it('cusp[4] should match swetest', () => {
        const h = swe.houses(J2000, LONDON, sys);
        near(h.cusps[4], cusp4, 0.001);
      });

      it(`should produce valid cusps 1-${cusps}`, () => {
        const h = swe.houses(J2000, LONDON, sys);
        for (let i = 1; i <= cusps; i++) {
          assert.ok(
            h.cusps[i] >= 0 && h.cusps[i] < 360,
            `${name} cusp[${i}] = ${h.cusps[i]} invalid`,
          );
        }
      });
    });
  }

  describe('Specific house system properties', () => {
    it('Equal/Whole (N) cusp[1] should be 0 (Aries)', () => {
      const h = swe.houses(J2000, LONDON, 'N');
      near(h.cusps[1], 0.0, 0.001);
    });

    it('Equal/Whole (N) cusps should be 30 degrees apart', () => {
      const h = swe.houses(J2000, LONDON, 'N');
      for (let i = 1; i <= 12; i++) {
        near(h.cusps[i], (i - 1) * 30.0, 0.001);
      }
    });

    it('Equal (A) cusps should be 30 degrees apart', () => {
      const h = swe.houses(J2000, LONDON, 'A');
      for (let i = 2; i <= 12; i++) {
        const expected = (h.cusps[1] + (i - 1) * 30.0) % 360;
        near(h.cusps[i], expected, 0.001);
      }
    });

    it('Equal MC (D) cusps should be 30 degrees apart', () => {
      const h = swe.houses(J2000, LONDON, 'D');
      for (let i = 2; i <= 12; i++) {
        const expected = (h.cusps[1] + (i - 1) * 30.0) % 360;
        near(h.cusps[i], expected, 0.001);
      }
    });

    it('Vehlow (V) cusp[1] = ASC - 15 degrees', () => {
      const hP = swe.houses(J2000, LONDON, 'P');
      const hV = swe.houses(J2000, LONDON, 'V');
      const expected = (hP.cusps[1] - 15 + 360) % 360;
      near(hV.cusps[1], expected, 0.01);
    });

    it('Gauquelin (G) should have 36 valid sectors', () => {
      const h = swe.houses(J2000, LONDON, 'G');
      let validSectors = 0;
      for (let i = 1; i <= 36; i++) {
        if (h.cusps[i] >= 0 && h.cusps[i] < 360) validSectors++;
      }
      assert.strictEqual(validSectors, 36);
    });
  });

  describe('House system names', () => {
    const nameTests = [
      { sys: 'A', expected: 'equal' },
      { sys: 'D', expected: 'equal' },
      { sys: 'F', expected: 'carter' },
      { sys: 'G', expected: 'gauquelin' },
      { sys: 'H', expected: 'horizon' },
      { sys: 'N', expected: 'equal' },
      { sys: 'V', expected: 'vehlow' },
      { sys: 'X', expected: 'meridian' },
    ];

    for (const { sys, expected } of nameTests) {
      it(`houseName('${sys}') should contain '${expected}'`, () => {
        const name = swe.houseName(sys);
        assert.ok(
          name.toLowerCase().includes(expected),
          `Expected "${name}" to contain "${expected}"`,
        );
      });
    }
  });
});
