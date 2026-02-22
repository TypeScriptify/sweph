import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000, LONDON } from '../helpers';
import { SwissEph } from '../../src/SwissEph';
import { SE_HELIACAL_RISING } from '../../src/constants';

describe('Heliacal (modern)', () => {
  let swe: SwissEph;

  before(() => {
    swe = new SwissEph({ topo: LONDON });
  });
  after(() => { swe.close(); });

  describe('heliacalEvent', () => {
    it('Venus heliacal rising should return result', () => {
      const r = swe.heliacalEvent(J2000, LONDON, 'Venus', SE_HELIACAL_RISING);
      assert.ok(typeof r.startVisible === 'number');
      assert.ok(typeof r.bestVisible === 'number');
      assert.ok(typeof r.endVisible === 'number');
    });
  });

  describe('visualLimitMagnitude', () => {
    it('should return limiting magnitude for Venus', () => {
      const r = swe.visualLimitMagnitude(J2000, LONDON, 'Venus');
      assert.ok(typeof r.limitingMagnitude === 'number');
    });
  });
});
