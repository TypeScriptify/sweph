/*************************************************************
 * swejpl.ts — JPL binary ephemeris reader
 * Translated from swejpl.c
 *
 * Reads JPL DE binary files (DE200–DE441). Provides Chebyshev
 * interpolation of planetary positions from JPL ephemeris data.
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

import { SE1FileReader } from './file-reader';
import {
  OK, ERR, NOT_AVAILABLE, BEYOND_EPH_LIMITS,
  J_MERCURY, J_VENUS, J_EARTH, J_MARS, J_JUPITER,
  J_SATURN, J_URANUS, J_NEPTUNE, J_PLUTO,
  J_MOON, J_SUN, J_SBARY, J_EMB, J_NUT, J_LIB,
  AS_MAXCH,
} from './constants';

import type { SweData, JplSave } from './types';
import { createJplSave } from './types';

/* ================================================================
 * fsizer: read header and determine record size (ksize)
 * ================================================================ */
function fsizer(js: JplSave, serr: string[]): number {
  const reader = js.jplReader!;
  reader.seekSet(0);
  /* ttl = ephemeris title (252 bytes) */
  if (reader.length < 252) { serr[0] = 'JPL file too short'; return NOT_AVAILABLE; }
  reader.seekCur(252);
  /* cnam = names of constants (6*400 = 2400 bytes) */
  if (reader.position + 2400 > reader.length) { serr[0] = 'JPL file too short'; return NOT_AVAILABLE; }
  const cnamBytes = reader.readBytes(2400);
  js.chCnam = new TextDecoder('ascii').decode(cnamBytes);
  /* ss[0..2]: start, end, segment size */
  if (reader.position + 24 > reader.length) { serr[0] = 'JPL file too short'; return NOT_AVAILABLE; }
  const ss0 = reader.readFloat64();
  const ss1 = reader.readFloat64();
  const ss2 = reader.readFloat64();
  /* detect endianness from ss[2] (segment size must be 1..200) */
  if (ss2 < 1 || ss2 > 200) {
    /* try opposite endianness */
    reader.setLittleEndian(!reader.isLittleEndian);
    reader.seekSet(252 + 2400);
    const ss0r = reader.readFloat64();
    const ss1r = reader.readFloat64();
    const ss2r = reader.readFloat64();
    if (ss2r < 1 || ss2r > 200) {
      serr[0] = 'alleged ephemeris file has invalid format.';
      return NOT_AVAILABLE;
    }
    js.ehSs[0] = ss0r; js.ehSs[1] = ss1r; js.ehSs[2] = ss2r;
  } else {
    js.ehSs[0] = ss0; js.ehSs[1] = ss1; js.ehSs[2] = ss2;
  }
  /* plausibility check */
  if (js.ehSs[0] < -5583942 || js.ehSs[1] > 9025909 || js.ehSs[2] < 1 || js.ehSs[2] > 200) {
    serr[0] = 'alleged ephemeris file has invalid format.';
    return NOT_AVAILABLE;
  }
  /* ncon */
  if (reader.position + 4 > reader.length) return NOT_AVAILABLE;
  const ncon = reader.readInt32();
  /* au */
  if (reader.position + 8 > reader.length) return NOT_AVAILABLE;
  const au = reader.readFloat64();
  /* emrat */
  if (reader.position + 8 > reader.length) return NOT_AVAILABLE;
  const emrat = reader.readFloat64();
  /* ipt[0..35] */
  if (reader.position + 36 * 4 > reader.length) return NOT_AVAILABLE;
  for (let i = 0; i < 36; i++) js.ehIpt[i] = reader.readInt32();
  /* numde */
  if (reader.position + 4 > reader.length) return NOT_AVAILABLE;
  const numde = reader.readInt32();
  /* lpt[0..2] (librations) */
  if (reader.position + 12 > reader.length) return NOT_AVAILABLE;
  const lpt0 = reader.readInt32();
  const lpt1 = reader.readInt32();
  const lpt2 = reader.readInt32();
  js.ehIpt[36] = lpt0;
  js.ehIpt[37] = lpt1;
  js.ehIpt[38] = lpt2;
  /* compute ksize from pointers */
  let kmx = 0;
  let khi = 0;
  for (let i = 0; i < 13; i++) {
    if (js.ehIpt[i * 3] > kmx) {
      kmx = js.ehIpt[i * 3];
      khi = i + 1;
    }
  }
  const nd = (khi === 12) ? 2 : 3;
  let ksize = (js.ehIpt[khi * 3 - 3] + nd * js.ehIpt[khi * 3 - 2] * js.ehIpt[khi * 3 - 1] - 1) * 2;
  /* de102 fix */
  if (ksize === 1546) ksize = 1652;
  if (ksize < 1000 || ksize > 5000) {
    serr[0] = `JPL ephemeris file does not provide valid ksize (${ksize})`;
    return NOT_AVAILABLE;
  }
  return ksize;
}

/* ================================================================
 * interp: Chebyshev interpolation (position, velocity, acceleration, jerk)
 * ================================================================ */
function interp(
  buf: Float64Array, bufOff: number,
  t: number, intv: number,
  ncfin: number, ncmin: number, nain: number, ifl: number,
  pv: Float64Array, pvOff: number,
  js: JplSave,
): void {
  const pc = js.pc;
  const vc = js.vc;
  const ac = js.ac;
  const jc = js.jc;
  const ncf = ncfin;
  const ncm = ncmin;
  const na = nain;
  /* get correct sub-interval number and normalized chebyshev time */
  const dt1 = t >= 0 ? Math.floor(t) : -Math.floor(-t);
  const temp = na * t;
  const ni = Math.trunc(temp - dt1);
  /* tc is the normalized chebyshev time (-1 <= tc <= 1) */
  const tc = (((temp % 1.0) + 1.0) % 1.0 + dt1) * 2.0 - 1.0;
  /* check if chebyshev time has changed */
  if (tc !== pc[1]) {
    js.interpNp = 2;
    js.interpNv = 3;
    js.interpNac = 4;
    js.interpNjk = 5;
    pc[1] = tc;
    js.interpTwot = tc + tc;
  }
  const twot = js.interpTwot;
  /* evaluate chebyshev polynomials */
  if (js.interpNp < ncf) {
    for (let i = js.interpNp; i < ncf; i++) {
      pc[i] = twot * pc[i - 1] - pc[i - 2];
    }
    js.interpNp = ncf;
  }
  /* interpolate position for each component */
  for (let i = 0; i < ncm; i++) {
    pv[pvOff + i] = 0;
    for (let j = ncf - 1; j >= 0; j--) {
      pv[pvOff + i] += pc[j] * buf[bufOff + j + (i + ni * ncm) * ncf];
    }
  }
  if (ifl <= 1) return;
  /* velocity */
  const bma = (na + na) / intv;
  vc[2] = twot + twot;
  if (js.interpNv < ncf) {
    for (let i = js.interpNv; i < ncf; i++) {
      vc[i] = twot * vc[i - 1] + pc[i - 1] + pc[i - 1] - vc[i - 2];
    }
    js.interpNv = ncf;
  }
  for (let i = 0; i < ncm; i++) {
    pv[pvOff + i + ncm] = 0;
    for (let j = ncf - 1; j >= 1; j--) {
      pv[pvOff + i + ncm] += vc[j] * buf[bufOff + j + (i + ni * ncm) * ncf];
    }
    pv[pvOff + i + ncm] *= bma;
  }
  if (ifl === 2) return;
  /* acceleration */
  const bma2 = bma * bma;
  ac[3] = pc[1] * 24.0;
  if (js.interpNac < ncf) {
    for (let i = js.interpNac; i < ncf; i++) {
      ac[i] = twot * ac[i - 1] + vc[i - 1] * 4.0 - ac[i - 2];
    }
    js.interpNac = ncf;
  }
  for (let i = 0; i < ncm; i++) {
    pv[pvOff + i + ncm * 2] = 0;
    for (let j = ncf - 1; j >= 2; j--) {
      pv[pvOff + i + ncm * 2] += ac[j] * buf[bufOff + j + (i + ni * ncm) * ncf];
    }
    pv[pvOff + i + ncm * 2] *= bma2;
  }
  if (ifl === 3) return;
  /* jerk */
  const bma3 = bma * bma2;
  jc[4] = pc[1] * 192.0;
  if (js.interpNjk < ncf) {
    for (let i = js.interpNjk; i < ncf; i++) {
      jc[i] = twot * jc[i - 1] + ac[i - 1] * 6.0 - jc[i - 2];
    }
    js.interpNjk = ncf;
  }
  for (let i = 0; i < ncm; i++) {
    pv[pvOff + i + ncm * 3] = 0;
    for (let j = ncf - 1; j >= 3; j--) {
      pv[pvOff + i + ncm * 3] += jc[j] * buf[bufOff + j + (i + ni * ncm) * ncf];
    }
    pv[pvOff + i + ncm * 3] *= bma3;
  }
}

/* ================================================================
 * state: main read/interpolate engine
 * ================================================================ */
function state(
  et: number, list: Int32Array | null, doBary: boolean,
  pv: Float64Array, pvsun: Float64Array, nut: Float64Array | null,
  js: JplSave, serr: string[],
): number {
  const reader = js.jplReader!;
  const buf = js.buf;
  const ipt = js.ehIpt;
  if (js.stateIrecsz === 0) {
    /* first call: read header */
    const ksize = fsizer(js, serr);
    if (ksize === NOT_AVAILABLE) return NOT_AVAILABLE;
    const nrecl = 4;
    js.stateIrecsz = nrecl * ksize;
    js.stateNcoeffs = Math.trunc(ksize / 2);
    /* re-read header from beginning */
    reader.seekSet(0);
    /* ttl */
    reader.seekCur(252);
    /* cnam */
    const cnamBytes = reader.readBytes(2400);
    js.chCnam = new TextDecoder('ascii').decode(cnamBytes);
    /* ss */
    js.ehSs[0] = reader.readFloat64();
    js.ehSs[1] = reader.readFloat64();
    js.ehSs[2] = reader.readFloat64();
    /* ncon */
    js.ehNcon = reader.readInt32();
    /* au */
    js.ehAu = reader.readFloat64();
    /* emrat */
    js.ehEmrat = reader.readFloat64();
    /* ipt[0..35] */
    for (let i = 0; i < 36; i++) ipt[i] = reader.readInt32();
    /* denum */
    js.ehDenum = reader.readInt32();
    /* lpt */
    js.stateLpt[0] = reader.readInt32();
    js.stateLpt[1] = reader.readInt32();
    js.stateLpt[2] = reader.readInt32();
    /* cval: constants in second record */
    reader.seekSet(js.stateIrecsz);
    for (let i = 0; i < 400; i++) js.ehCval[i] = reader.readFloat64();
    /* fill librations */
    for (let i = 0; i < 3; i++) ipt[i + 36] = js.stateLpt[i];
    js.stateNrl = 0;
    /* verify file length */
    const flen = reader.length;
    const nseg = Math.trunc((js.ehSs[1] - js.ehSs[0]) / js.ehSs[2]);
    let nb = 0;
    for (let i = 0; i < 13; i++) {
      const k = (i === 11) ? 2 : 3;
      nb += (ipt[i * 3 + 1] * ipt[i * 3 + 2]) * k * nseg;
    }
    nb += 2 * nseg;
    nb *= 8;
    nb += 2 * ksize * nrecl;
    if (flen !== nb && flen - nb !== ksize * nrecl) {
      serr[0] = `JPL ephemeris file is mutilated; length = ${flen} instead of ${nb}.`;
      return NOT_AVAILABLE;
    }
    /* verify start/end dates in segments */
    reader.seekSet(2 * js.stateIrecsz);
    const ts0 = reader.readFloat64();
    reader.readFloat64(); // skip
    reader.seekSet((nseg + 2 - 1) * js.stateIrecsz);
    reader.readFloat64(); // skip
    const ts3 = reader.readFloat64();
    if (ts0 !== js.ehSs[0] || ts3 !== js.ehSs[1]) {
      serr[0] = `JPL ephemeris file is corrupt; start/end date check failed. ${ts0} != ${js.ehSs[0]} || ${ts3} != ${js.ehSs[1]}`;
      return NOT_AVAILABLE;
    }
  }
  if (list === null) return OK;
  const s = et - 0.5;
  const etMn = Math.floor(s) + 0.5;
  const etFr = s - Math.floor(s);
  /* error if out of range */
  if (et < js.ehSs[0] || et > js.ehSs[1]) {
    serr[0] = `jd ${et} outside JPL eph. range ${js.ehSs[0].toFixed(2)} .. ${js.ehSs[1].toFixed(2)};`;
    return BEYOND_EPH_LIMITS;
  }
  /* calculate record number and relative time */
  let nr = Math.trunc((etMn - js.ehSs[0]) / js.ehSs[2]) + 2;
  if (etMn === js.ehSs[1]) nr--;
  const t = (etMn - ((nr - 2) * js.ehSs[2] + js.ehSs[0]) + etFr) / js.ehSs[2];
  /* read correct record if not already in buffer */
  if (nr !== js.stateNrl) {
    js.stateNrl = nr;
    const seekPos = nr * js.stateIrecsz;
    if (seekPos + js.stateNcoeffs * 8 > reader.length) {
      serr[0] = `Read error in JPL eph. at ${et}`;
      return NOT_AVAILABLE;
    }
    reader.seekSet(seekPos);
    for (let k = 0; k < js.stateNcoeffs; k++) {
      buf[k] = reader.readFloat64();
    }
  }
  let aufac: number;
  let intv: number;
  if (js.doKm) {
    intv = js.ehSs[2] * 86400.0;
    aufac = 1.0;
  } else {
    intv = js.ehSs[2];
    aufac = 1.0 / js.ehAu;
  }
  /* interpolate ssbary sun */
  interp(buf, ipt[30] - 1, t, intv, ipt[31], 3, ipt[32], 2, pvsun, 0, js);
  for (let i = 0; i < 6; i++) pvsun[i] *= aufac;
  /* interpolate requested bodies */
  for (let i = 0; i < 10; i++) {
    if (list[i] > 0) {
      interp(buf, ipt[i * 3] - 1, t, intv, ipt[i * 3 + 1], 3,
             ipt[i * 3 + 2], list[i], pv, i * 6, js);
      for (let j = 0; j < 6; j++) {
        if (i < 9 && !doBary) {
          pv[j + i * 6] = pv[j + i * 6] * aufac - pvsun[j];
        } else {
          pv[j + i * 6] *= aufac;
        }
      }
    }
  }
  /* nutations */
  if (nut !== null && list[10] > 0 && ipt[34] > 0) {
    interp(buf, ipt[33] - 1, t, intv, ipt[34], 2, ipt[35], list[10], nut, 0, js);
  }
  /* librations */
  if (list[11] > 0 && ipt[37] > 0) {
    interp(buf, ipt[36] - 1, t, intv, ipt[37], 3, ipt[38], list[1], pv, 60, js);
  }
  return OK;
}

/* ================================================================
 * readConstJpl: initialize header by calling state with null list
 * ================================================================ */
function readConstJpl(js: JplSave, ss: Float64Array, serr: string[]): number {
  const retc = state(0.0, null, false, js.pv, js.pvsun, null, js, serr);
  if (retc !== OK) return retc;
  for (let i = 0; i < 3; i++) ss[i] = js.ehSs[i];
  return OK;
}

/* ================================================================
 * swiOpenJplFile: open and validate JPL file
 * ================================================================ */
export function swiOpenJplFile(
  swed: SweData, ss: Float64Array, reader: SE1FileReader, serr: string[],
): number {
  /* if already open, return */
  if (swed.jplSave !== null && swed.jplSave.jplReader !== null) return OK;
  const js = createJplSave();
  js.jplReader = reader;
  /* Try little-endian first (most common on modern systems) */
  reader.setLittleEndian(true);
  const retc = readConstJpl(js, ss, serr);
  if (retc !== OK) {
    swed.jplSave = null;
    return retc;
  }
  /* initialize interpolation polynomial basis */
  js.pc[0] = 1;
  js.pc[1] = 2;
  js.vc[1] = 1;
  js.ac[2] = 4;
  js.jc[3] = 24;
  swed.jplSave = js;
  return OK;
}

/* ================================================================
 * swiCloseJplFile: release JPL resources
 * ================================================================ */
export function swiCloseJplFile(swed: SweData): void {
  swed.jplSave = null;
}

/* ================================================================
 * swiPleph: interpolate position at time et for ntarg relative to ncent
 * ================================================================ */
export function swiPleph(
  swed: SweData, et: number, ntarg: number, ncent: number,
  rrd: Float64Array, serr: string[],
): number {
  const js = swed.jplSave;
  if (js === null) {
    serr[0] = 'JPL ephemeris file not loaded';
    return NOT_AVAILABLE;
  }
  for (let i = 0; i < 6; i++) rrd[i] = 0;
  if (ntarg === ncent) return OK;
  const list = new Int32Array(12);
  /* check for nutation call */
  if (ntarg === J_NUT) {
    if (js.ehIpt[34] > 0) {
      list[10] = 2;
      return state(et, list, false, js.pv, js.pvsun, rrd, js, serr);
    } else {
      serr[0] = 'No nutations on the JPL ephemeris file;';
      return NOT_AVAILABLE;
    }
  }
  if (ntarg === J_LIB) {
    if (js.ehIpt[37] > 0) {
      list[11] = 2;
      const retc = state(et, list, false, js.pv, js.pvsun, rrd, js, serr);
      if (retc !== OK) return retc;
      for (let i = 0; i < 6; i++) rrd[i] = js.pv[i + 60];
      return OK;
    } else {
      serr[0] = 'No librations on the ephemeris file;';
      return NOT_AVAILABLE;
    }
  }
  /* set up list entries */
  if (ntarg < J_SUN) list[ntarg] = 2;
  if (ntarg === J_MOON) list[J_EARTH] = 2;
  if (ntarg === J_EARTH) list[J_MOON] = 2;
  if (ntarg === J_EMB) list[J_EARTH] = 2;
  if (ncent < J_SUN) list[ncent] = 2;
  if (ncent === J_MOON) list[J_EARTH] = 2;
  if (ncent === J_EARTH) list[J_MOON] = 2;
  if (ncent === J_EMB) list[J_EARTH] = 2;
  const pv = js.pv;
  const pvsun = js.pvsun;
  const retc = state(et, list, true, pv, pvsun, rrd, js, serr);
  if (retc !== OK) return retc;
  if (ntarg === J_SUN || ncent === J_SUN) {
    for (let i = 0; i < 6; i++) pv[i + 6 * J_SUN] = pvsun[i];
  }
  if (ntarg === J_SBARY || ncent === J_SBARY) {
    for (let i = 0; i < 6; i++) pv[i + 6 * J_SBARY] = 0;
  }
  if (ntarg === J_EMB || ncent === J_EMB) {
    for (let i = 0; i < 6; i++) pv[i + 6 * J_EMB] = pv[i + 6 * J_EARTH];
  }
  if ((ntarg === J_EARTH && ncent === J_MOON) || (ntarg === J_MOON && ncent === J_EARTH)) {
    for (let i = 0; i < 6; i++) pv[i + 6 * J_EARTH] = 0;
  } else {
    if (list[J_EARTH] === 2) {
      for (let i = 0; i < 6; i++) {
        pv[i + 6 * J_EARTH] -= pv[i + 6 * J_MOON] / (js.ehEmrat + 1.0);
      }
    }
    if (list[J_MOON] === 2) {
      for (let i = 0; i < 6; i++) {
        pv[i + 6 * J_MOON] += pv[i + 6 * J_EARTH];
      }
    }
  }
  for (let i = 0; i < 6; i++) rrd[i] = pv[i + ntarg * 6] - pv[i + ncent * 6];
  return OK;
}

/* ================================================================
 * swiGetJplDenum: return DE number
 * ================================================================ */
export function swiGetJplDenum(swed: SweData): number {
  return swed.jplSave?.ehDenum ?? 0;
}
