import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000, LONDON_ARR } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweClose } from '../../src/sweph';
import { swePheno, swePhenoUt, sweGauquelinSector } from '../../src/swecl';
import { SE_SUN, SE_MARS, SEFLG_MOSEPH } from '../../src/constants';

describe('Phenomena (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  describe('swePheno', () => {
    it('Mars phase angle should be 0-180', () => {
      const r = swePheno(swed, J2000, SE_MARS, SEFLG_MOSEPH, null);
      assert.ok(r.attr[0] >= 0 && r.attr[0] < 180, `phase=${r.attr[0]}`);
    });

    it('Mars should have elongation > 0', () => {
      const r = swePheno(swed, J2000, SE_MARS, SEFLG_MOSEPH, null);
      assert.ok(r.attr[2] >= 0, `elongation=${r.attr[2]}`);
    });
  });

  describe('swePhenoUt', () => {
    it('should return valid phase angle', () => {
      const r = swePhenoUt(swed, J2000, SE_MARS, SEFLG_MOSEPH, null);
      assert.ok(r.attr[0] >= 0);
    });
  });

  describe('sweGauquelinSector', () => {
    it('Sun sector should be 1-36', () => {
      const r = sweGauquelinSector(swed, J2000, SE_SUN, null, SEFLG_MOSEPH, 0,
        LONDON_ARR, 1013.25, 10, null);
      assert.ok(r.retval >= 0);
      assert.ok(r.dgsect > 0 && r.dgsect <= 36, `sector=${r.dgsect}`);
    });
  });
});
