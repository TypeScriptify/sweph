import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { near } from '../helpers';
import {
  sweDegnorm, sweRadnorm, sweDegMidp, sweRadMidp,
  sweCotrans, sweCotransSp, sweSplitDeg, sweD2l,
  sweCsnorm, sweDifcsn, sweDifcs2n, sweDifdegn, sweDifrad2n,
  sweCsroundsec,
  sweCs2timestr, sweCs2lonlatstr, sweCs2degstr,
  swiCutstr, swiRightTrim, swiStrcpy, swiOpenTrace,
} from '../../src/swephlib';
import { sweDifdeg2n } from '../../src/sweph';
import { SE_SPLIT_DEG_ZODIACAL, SE_SPLIT_DEG_ROUND_SEC } from '../../src/constants';

describe('Math Utilities (C-style)', () => {
  describe('sweDegnorm', () => {
    it('370 -> 10', () => { near(sweDegnorm(370), 10, 0.001); });
    it('-10 -> 350', () => { near(sweDegnorm(-10), 350, 0.001); });
    it('0 -> 0', () => { near(sweDegnorm(0), 0, 0.001); });
    it('360 -> 0', () => { near(sweDegnorm(360), 0, 0.001); });
  });

  describe('sweRadnorm', () => {
    it('7 -> 7-2pi', () => {
      near(sweRadnorm(7), 7 - 2 * Math.PI, 0.001);
    });
  });

  describe('sweDegMidp', () => {
    it('midpoint of 10,350 -> 0', () => {
      near(sweDegMidp(10, 350), 0, 0.001);
    });

    it('midpoint of 90,270 -> 0 or 180', () => {
      const m = sweDegMidp(90, 270);
      assert.ok(Math.abs(m) < 0.001 || Math.abs(m - 180) < 0.001,
        `midpoint=${m}`);
    });
  });

  describe('sweRadMidp', () => {
    it('should return positive value', () => {
      assert.ok(sweRadMidp(0.1, 6.1) >= 0);
    });
  });

  describe('sweCotrans', () => {
    it('should transform ecliptic to equatorial', () => {
      const xpo = [280.0, -0.5, 1.0];
      const xpn = [0, 0, 0];
      sweCotrans(xpo, xpn, 23.44);
      assert.ok(xpn[0] !== 0 || xpn[1] !== 0);
    });
  });

  describe('sweCotransSp', () => {
    it('should transform with speed', () => {
      const xpo = [280.0, -0.5, 1.0, 1.0, 0.1, 0];
      const xpn = [0, 0, 0, 0, 0, 0];
      sweCotransSp(xpo, xpn, 23.44);
      assert.ok(xpn[0] !== 0);
    });
  });

  describe('sweDifdeg2n', () => {
    it('10,350 -> 20', () => { near(sweDifdeg2n(10, 350), 20, 0.001); });
    it('350,10 -> -20', () => { near(sweDifdeg2n(350, 10), -20, 0.001); });
  });

  describe('sweDifdegn', () => {
    it('10,350 -> 20', () => { near(sweDifdegn(10, 350), 20, 0.001); });
  });

  describe('sweDifrad2n', () => {
    it('pi,0 -> -pi', () => { near(sweDifrad2n(Math.PI, 0), -Math.PI, 0.001); });
  });

  describe('sweD2l', () => {
    it('2.5 -> 3', () => { assert.strictEqual(sweD2l(2.5), 3); });
    it('-2.5 -> -3', () => { assert.strictEqual(sweD2l(-2.5), -3); });
    it('2.4 -> 2', () => { assert.strictEqual(sweD2l(2.4), 2); });
  });

  describe('sweSplitDeg', () => {
    it('should split 123.456', () => {
      const sp = sweSplitDeg(123.456, SE_SPLIT_DEG_ZODIACAL | SE_SPLIT_DEG_ROUND_SEC);
      assert.ok(sp.deg >= 0 && sp.deg < 30);
      assert.ok(sp.min >= 0 && sp.min < 60);
      assert.ok(sp.sec >= 0 && sp.sec < 60);
    });
  });

  describe('sweCsnorm', () => {
    it('should normalize centiseconds', () => {
      assert.strictEqual(sweCsnorm(360 * 360000 + 100), 100);
    });
  });

  describe('sweDifcsn / sweDifcs2n / sweCsroundsec', () => {
    it('should return numbers', () => {
      assert.strictEqual(typeof sweDifcsn(100, 200), 'number');
      assert.strictEqual(typeof sweDifcs2n(100, 200), 'number');
      assert.strictEqual(typeof sweCsroundsec(12345), 'number');
    });
  });

  describe('Formatting', () => {
    it('sweCs2timestr noon', () => {
      const ts = sweCs2timestr(12 * 3600 * 100, ':', false);
      assert.ok(ts.includes('12'), ts);
    });

    it('sweCs2lonlatstr 90 deg', () => {
      const s = sweCs2lonlatstr(90 * 3600 * 100, 'E', 'W');
      assert.ok(s.includes('90'), s);
    });

    it('sweCs2degstr 15 deg', () => {
      const s = sweCs2degstr(15 * 3600 * 100);
      assert.ok(s.includes('15'), s);
    });
  });

  describe('String utilities', () => {
    it('swiCutstr basic split', () => {
      const r = swiCutstr('hello,world,foo', ',');
      assert.strictEqual(r.length, 3);
      assert.strictEqual(r[0], 'hello');
      assert.strictEqual(r[2], 'foo');
    });

    it('swiCutstr collapses separators', () => {
      const r = swiCutstr('a,,b,,c', ',');
      assert.strictEqual(r.length, 3);
      assert.strictEqual(r[1], 'b');
    });

    it('swiCutstr nmax', () => {
      const r = swiCutstr('a,b,c,d,e', ',', 3);
      assert.strictEqual(r.length, 3);
      assert.strictEqual(r[2], 'c,d,e');
    });

    it('swiRightTrim trims spaces', () => {
      assert.strictEqual(swiRightTrim('hello   '), 'hello');
    });

    it('swiRightTrim trims tabs', () => {
      assert.strictEqual(swiRightTrim('hello\t \n'), 'hello');
    });

    it('swiStrcpy identity', () => {
      assert.strictEqual(swiStrcpy('test'), 'test');
    });

    it('swiOpenTrace should not throw', () => {
      swiOpenTrace();
    });
  });
});
