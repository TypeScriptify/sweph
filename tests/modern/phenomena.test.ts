import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SUN, SE_MARS } from '../../src/constants';

describe('Phenomena (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('phenomena', () => {
    it('Mars should have phase angle', () => {
      const r = swe.phenomena(J2000, SE_MARS);
      assert.ok(r.phaseAngle >= 0 && r.phaseAngle < 180);
    });

    it('Mars should have elongation', () => {
      const r = swe.phenomena(J2000, SE_MARS);
      assert.ok(typeof r.elongation === 'number');
    });

    it('Mars should have apparent magnitude', () => {
      const r = swe.phenomena(J2000, SE_MARS);
      assert.ok(typeof r.apparentMagnitude === 'number');
    });

    it('Mars should have apparent diameter', () => {
      const r = swe.phenomena(J2000, SE_MARS);
      assert.ok(r.apparentDiameter > 0);
    });
  });

  describe('gauquelinSector', () => {
    it('Sun sector should be 1-36', () => {
      const r = swe.gauquelinSector(J2000, SE_SUN, LONDON);
      assert.ok(r.sector > 0 && r.sector <= 36, `sector=${r.sector}`);
    });
  });
});
