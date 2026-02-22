import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_SIDM_LAHIRI, SE_SIDM_TRUE_CITRA, SE_SIDM_FAGAN_BRADLEY } from '../../src/constants';

describe('Ayanamsa (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('Lahiri', () => {
    it('should be ~23.86 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_LAHIRI);
      const aya = swe.getAyanamsa(J2000);
      near(aya, 23.86, 0.1);
    });
  });

  describe('True Citra', () => {
    it('should be ~23.84 at J2000', () => {
      swe.setSiderealMode(SE_SIDM_TRUE_CITRA);
      const aya = swe.getAyanamsa(J2000);
      near(aya, 23.84, 0.2);
    });
  });

  describe('getAyanamsaName', () => {
    it('should return Lahiri', () => {
      assert.strictEqual(swe.getAyanamsaName(SE_SIDM_LAHIRI), 'Lahiri');
    });

    it('should return Fagan/Bradley', () => {
      assert.strictEqual(swe.getAyanamsaName(SE_SIDM_FAGAN_BRADLEY), 'Fagan/Bradley');
    });
  });

  describe('Constructor siderealMode', () => {
    it('should accept siderealMode in options', () => {
      const swe2 = new SwissEph({ siderealMode: SE_SIDM_LAHIRI });
      const aya = swe2.getAyanamsa(J2000);
      near(aya, 23.86, 0.1);
      swe2.close();
    });
  });
});
