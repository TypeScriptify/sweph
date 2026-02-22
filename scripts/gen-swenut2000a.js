#!/usr/bin/env node
/**
 * Parse swenut2000a.h and generate swenut2000a.ts with actual coefficient data.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'originalCode', 'swisseph', 'swenut2000a.h'),
  'utf8'
);

const lines = src.split('\n');

function extractNumbers(startLine, endLine) {
  const nums = [];
  for (let i = startLine - 1; i < endLine - 1; i++) {
    const line = lines[i];
    // Extract all numbers (integers or floats, possibly negative)
    const matches = line.match(/-?\d+(\.\d+)?/g);
    if (matches) {
      nums.push(...matches.map(Number));
    }
  }
  return nums;
}

// nls: lines 72-749 (data between { on line 71 and }; on line 750)
const nlsData = extractNumbers(72, 750);
// cls: lines 755-1432
const clsData = extractNumbers(755, 1433);
// npl: lines 1439-2125
const nplData = extractNumbers(1439, 2126);
// icpl: lines 2131-2817
const icplData = extractNumbers(2131, 2818);

console.log(`nls: ${nlsData.length} values (expected ${678 * 5} = 3390)`);
console.log(`cls: ${clsData.length} values (expected ${678 * 6} = 4068)`);
console.log(`npl: ${nplData.length} values (expected ${687 * 14} = 9618)`);
console.log(`icpl: ${icplData.length} values (expected ${687 * 4} = 2748)`);

// Format array as rows
function formatIntArray(data, cols) {
  const rows = [];
  for (let i = 0; i < data.length; i += cols) {
    const row = data.slice(i, i + cols).map(v => String(v)).join(',');
    rows.push(row + ',');
  }
  return rows.join('\n');
}

function formatFloatArray(data, cols) {
  const rows = [];
  for (let i = 0; i < data.length; i += cols) {
    const row = data.slice(i, i + cols).map(v => {
      // Preserve decimal point for floats
      const s = String(v);
      return s.includes('.') ? s : s + '.0';
    }).join(',');
    rows.push(row + ',');
  }
  return rows.join('\n');
}

const output = `/*************************************************************
 * swenut2000a.ts — IAU 2000A nutation model coefficient tables
 * Auto-generated from swenut2000a.h
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

/** 0.1 microarcsecond to degrees */
export const O1MAS2DEG = 1 / 3600.0 / 10000000.0;

/** Number of terms in luni-solar nutation model */
export const NLS = 678;
export const NLS_2000B = 77;

/** Number of terms in planetary nutation model */
export const NPL = 687;

/** Luni-solar argument multipliers: NLS * 5 values (L, L', F, D, Om) */
export const nls = new Int16Array([
${formatIntArray(nlsData, 5)}
]);

/** Luni-solar nutation coefficients: NLS * 6 values
 *  (S_i, Sdot_i, C_i, Cprime_i, Cdot_i, S_i) in units of 0.1 microarcsec */
export const cls = new Float64Array([
${formatFloatArray(clsData, 6)}
]);

/** Planetary argument multipliers: NPL * 14 values */
export const npl = new Int32Array([
${formatIntArray(nplData, 14)}
]);

/** Planetary nutation coefficients: NPL * 4 values */
export const icpl = new Int32Array([
${formatIntArray(icplData, 4)}
]);
`;

const outPath = path.join(__dirname, '..', 'src', 'swenut2000a.ts');
fs.writeFileSync(outPath, output);
console.log(`Wrote ${outPath}`);
