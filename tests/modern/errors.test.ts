import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { J2000 } from '../helpers';
import { SwissEph, SwissEphError } from '../../src/SwissEph';

describe('Error Handling (modern)', () => {
  let swe: SwissEph;

  before(() => { swe = new SwissEph(); });
  after(() => { swe.close(); });

  describe('SwissEphError', () => {
    it('should be thrown for bad planet ID', () => {
      assert.throws(
        () => swe.calc(J2000, 999),
        (err: any) => err.name === 'SwissEphError',
      );
    });

    it('should be an instance of Error', () => {
      try {
        swe.calc(J2000, 999);
        assert.fail('Should have thrown');
      } catch (e: any) {
        assert.ok(e instanceof SwissEphError);
        assert.ok(e instanceof Error);
        assert.strictEqual(e.name, 'SwissEphError');
      }
    });

    it('should have a message', () => {
      try {
        swe.calc(J2000, 999);
        assert.fail('Should have thrown');
      } catch (e: any) {
        assert.ok(e.message.length > 0);
      }
    });
  });

  describe('Invalid star name', () => {
    it('should throw for nonexistent star', () => {
      assert.throws(
        () => swe.fixedStarMagnitude('ZZZNOTASTAR'),
        (err: any) => err.name === 'SwissEphError',
      );
    });
  });

  describe('Constructor options', () => {
    it('should create with default options', () => {
      const s = new SwissEph();
      assert.ok(s);
      s.close();
    });

    it('should accept timeMode et', () => {
      const s = new SwissEph({ timeMode: 'et' });
      // ET calc should still work
      const sun = s.calc(J2000, 0);
      assert.ok(sun.longitude > 0);
      s.close();
    });

    it('should accept topo option', () => {
      const s = new SwissEph({ topo: { longitude: -0.1278, latitude: 51.5074 } });
      assert.ok(s);
      s.close();
    });
  });
});
