import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000, LONDON_ARR } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweSetTopo, sweClose } from '../../src/sweph';
import { sweHeliacalUt, sweHeliacalPhenoUt, sweVisLimitMag } from '../../src/swehel';
import { SEFLG_MOSEPH } from '../../src/constants';

describe('Heliacal (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => {
    swed = createDefaultSweData();
    sweSetTopo(swed, LONDON_ARR[0], LONDON_ARR[1], LONDON_ARR[2]);
  });
  after(() => { sweClose(swed); });

  const datm = [1013.25, 10, 50, 0.25, 0, 0];
  const dobs = [0, 0, 0, 0, 0, 0];

  describe('sweHeliacalUt', () => {
    it('Venus heliacal rising should return result', () => {
      const r = sweHeliacalUt(swed, J2000, LONDON_ARR, datm, dobs, 'Venus', 1, SEFLG_MOSEPH);
      assert.ok(typeof r.retval === 'number');
    });
  });

  describe('sweVisLimitMag', () => {
    it('should return a result for Venus', () => {
      const r = sweVisLimitMag(swed, J2000, LONDON_ARR, datm, dobs, 'Venus', SEFLG_MOSEPH);
      assert.ok(typeof r.retval === 'number');
    });
  });
});
