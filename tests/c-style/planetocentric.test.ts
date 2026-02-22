import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { near, J2000 } from '../helpers';
import { createDefaultSweData } from '../../src/types';
import { sweCalc, sweCalcPctr, sweClose } from '../../src/sweph';
import { SE_MARS, SE_EARTH, SEFLG_MOSEPH } from '../../src/constants';

describe('Planetocentric (C-style)', () => {
  let swed: ReturnType<typeof createDefaultSweData>;

  before(() => { swed = createDefaultSweData(); });
  after(() => { sweClose(swed); });

  it('Mars from Earth should match geocentric Mars', () => {
    const geo = sweCalc(swed, J2000, SE_MARS, SEFLG_MOSEPH);
    const pctr = sweCalcPctr(swed, J2000, SE_MARS, SE_EARTH, SEFLG_MOSEPH);
    assert.ok(pctr.xx[0] >= 0 && pctr.xx[0] < 360);
    near(pctr.xx[0], geo.xx[0], 0.1);
  });

  it('should produce valid longitude and latitude', () => {
    const pctr = sweCalcPctr(swed, J2000, SE_MARS, SE_EARTH, SEFLG_MOSEPH);
    assert.ok(pctr.xx[0] >= 0 && pctr.xx[0] < 360);
    assert.ok(pctr.xx[1] >= -90 && pctr.xx[1] <= 90);
  });
});
