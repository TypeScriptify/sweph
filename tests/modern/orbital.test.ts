import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_MARS, SE_EARTH } from '../../src/constants';

describe('Orbital Elements (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('nodesApsides', () => {
    it('Mars ascending node should be valid', () => {
      const r = swe.nodesApsides(J2000, SE_MARS);
      assert.ok(r.ascendingNode.longitude > 0);
    });

    it('Mars perihelion should be valid', () => {
      const r = swe.nodesApsides(J2000, SE_MARS);
      assert.ok(r.perihelion.longitude > 0);
    });

    it('Mars descending node should differ from ascending', () => {
      const r = swe.nodesApsides(J2000, SE_MARS);
      assert.ok(Math.abs(r.ascendingNode.longitude - r.descendingNode.longitude) > 90);
    });
  });

  describe('orbitalElements', () => {
    it('Mars semi-axis should be ~1.5237 AU', () => {
      const r = swe.orbitalElements(J2000, SE_MARS);
      near(r.semiAxis, 1.5237, 0.01);
    });

    it('Mars eccentricity should be ~0.0933', () => {
      const r = swe.orbitalElements(J2000, SE_MARS);
      near(r.eccentricity, 0.0933, 0.01);
    });

    it('Mars inclination should be ~1.85 deg', () => {
      const r = swe.orbitalElements(J2000, SE_MARS);
      near(r.inclination, 1.85, 0.2);
    });

    it('Mars tropical period should be positive', () => {
      const r = swe.orbitalElements(J2000, SE_MARS);
      assert.ok(r.tropicalPeriod > 0, `period=${r.tropicalPeriod}`);
    });

    it('Earth semi-axis should be ~1.0 AU', () => {
      const r = swe.orbitalElements(J2000, SE_EARTH);
      near(r.semiAxis, 1.0, 0.01);
    });

    it('Earth eccentricity should be ~0.0167', () => {
      const r = swe.orbitalElements(J2000, SE_EARTH);
      near(r.eccentricity, 0.0167, 0.01);
    });
  });

  describe('orbitDistances', () => {
    it('Mars dmin should be ~0.37 AU', () => {
      const r = swe.orbitDistances(J2000, SE_MARS);
      near(r.min, 0.37, 0.1);
    });

    it('Mars dmax should be ~2.68 AU', () => {
      const r = swe.orbitDistances(J2000, SE_MARS);
      near(r.max, 2.68, 0.1);
    });

    it('dmin < dtrue < dmax', () => {
      const r = swe.orbitDistances(J2000, SE_MARS);
      assert.ok(r.min < r.true);
      assert.ok(r.true < r.max);
    });
  });
});
