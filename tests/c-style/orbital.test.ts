import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweClose } from '../../src/sweph';
import { sweNodAps, sweNodApsUt, sweGetOrbitalElements, sweOrbitMaxMinTrueDistance } from '../../src/swecl';
import { SE_MARS, SE_EARTH, SEFLG_MOSEPH } from '../../src/constants';

describe('Orbital Elements (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('sweNodAps', () => {
    it('Mars ascending node should be valid', () => {
      const r = sweNodAps(swed, J2000, SE_MARS, SEFLG_MOSEPH, 0);
      assert.ok(r.xnasc[0] >= 0 && r.xnasc[0] < 360);
    });

    it('Mars descending node should differ from ascending', () => {
      const r = sweNodAps(swed, J2000, SE_MARS, SEFLG_MOSEPH, 0);
      assert.ok(Math.abs(r.xnasc[0] - r.xndsc[0]) > 90);
    });
  });

  describe('sweNodApsUt', () => {
    it('should produce valid ascending node', () => {
      const r = sweNodApsUt(swed, J2000, SE_MARS, SEFLG_MOSEPH, 0);
      assert.ok(r.xnasc[0] >= 0);
    });
  });

  describe('sweGetOrbitalElements', () => {
    it('Mars semi-axis should be ~1.5237 AU', () => {
      const r = sweGetOrbitalElements(swed, J2000, SE_MARS, SEFLG_MOSEPH);
      near(r.dret[0], 1.5237, 0.01);
    });

    it('Mars eccentricity should be ~0.0933', () => {
      const r = sweGetOrbitalElements(swed, J2000, SE_MARS, SEFLG_MOSEPH);
      near(r.dret[1], 0.0933, 0.01);
    });

    it('Mars inclination should be ~1.85 deg', () => {
      const r = sweGetOrbitalElements(swed, J2000, SE_MARS, SEFLG_MOSEPH);
      near(r.dret[2], 1.85, 0.2);
    });

    it('Earth semi-axis should be ~1.0 AU', () => {
      const r = sweGetOrbitalElements(swed, J2000, SE_EARTH, SEFLG_MOSEPH);
      near(r.dret[0], 1.0, 0.01);
    });

    it('Earth eccentricity should be ~0.0167', () => {
      const r = sweGetOrbitalElements(swed, J2000, SE_EARTH, SEFLG_MOSEPH);
      near(r.dret[1], 0.0167, 0.01);
    });
  });

  describe('sweOrbitMaxMinTrueDistance', () => {
    it('Mars dmin should be ~0.37 AU', () => {
      const r = sweOrbitMaxMinTrueDistance(swed, J2000, SE_MARS, SEFLG_MOSEPH);
      near(r.dmin, 0.37, 0.1);
    });

    it('Mars dmax should be ~2.68 AU', () => {
      const r = sweOrbitMaxMinTrueDistance(swed, J2000, SE_MARS, SEFLG_MOSEPH);
      near(r.dmax, 2.68, 0.1);
    });

    it('dmin < dtrue < dmax', () => {
      const r = sweOrbitMaxMinTrueDistance(swed, J2000, SE_MARS, SEFLG_MOSEPH);
      assert.ok(r.dmin < r.dtrue);
      assert.ok(r.dtrue < r.dmax);
    });
  });
});
