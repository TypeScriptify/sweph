import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import {
  sweSetSidMode, sweGetAyanamsa, sweGetAyanamsaUt,
  sweGetAyanamsaEx, sweGetAyanamsaExUt, sweGetAyanamsaName, sweClose,
} from '../../src/sweph';
import { SE_SIDM_LAHIRI, SE_SIDM_TRUE_CITRA, SE_SIDM_FAGAN_BRADLEY, SEFLG_MOSEPH } from '../../src/constants';

describe('Ayanamsa (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('Lahiri', () => {
    it('should be ~23.86 at J2000', () => {
      sweSetSidMode(swed, SE_SIDM_LAHIRI, 0, 0);
      const aya = sweGetAyanamsa(swed, J2000);
      near(aya, 23.86, 0.1);
    });

    it('UT variant should be close to ET', () => {
      sweSetSidMode(swed, SE_SIDM_LAHIRI, 0, 0);
      const et = sweGetAyanamsa(swed, J2000);
      const ut = sweGetAyanamsaUt(swed, J2000);
      near(et, ut, 0.01);
    });

    it('Ex variant should match basic', () => {
      sweSetSidMode(swed, SE_SIDM_LAHIRI, 0, 0);
      const basic = sweGetAyanamsa(swed, J2000);
      const ex = sweGetAyanamsaEx(swed, J2000, SEFLG_MOSEPH);
      near(ex.daya, basic, 0.001);
    });

    it('ExUt variant should match basic', () => {
      sweSetSidMode(swed, SE_SIDM_LAHIRI, 0, 0);
      const basic = sweGetAyanamsa(swed, J2000);
      const exUt = sweGetAyanamsaExUt(swed, J2000, SEFLG_MOSEPH);
      near(exUt.daya, basic, 0.01);
    });
  });

  describe('True Citra', () => {
    it('should be ~23.84 at J2000', () => {
      sweSetSidMode(swed, SE_SIDM_TRUE_CITRA, 0, 0);
      const aya = sweGetAyanamsa(swed, J2000);
      near(aya, 23.84, 0.2);
    });
  });

  describe('sweGetAyanamsaName', () => {
    it('should return "Lahiri" for SE_SIDM_LAHIRI', () => {
      assert.strictEqual(sweGetAyanamsaName(SE_SIDM_LAHIRI), 'Lahiri');
    });

    it('should return "Fagan/Bradley" for SE_SIDM_FAGAN_BRADLEY', () => {
      assert.strictEqual(sweGetAyanamsaName(SE_SIDM_FAGAN_BRADLEY), 'Fagan/Bradley');
    });
  });
});
