#!/usr/bin/env node
/**
 * Parse swemptab.h and generate swemptab.ts with actual coefficient data.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'originalCode', 'swisseph', 'swemptab.h'),
  'utf8'
);

const lines = src.split('\n');

// Planet prefixes in order
const planets = [
  { prefix: 'mer', name: 'Mercury', varName: 'mer404' },
  { prefix: 'ven', name: 'Venus', varName: 'ven404' },
  { prefix: 'ear', name: 'Earth', varName: 'ear404' },
  { prefix: 'mar', name: 'Mars', varName: 'mar404' },
  { prefix: 'jup', name: 'Jupiter', varName: 'jup404' },
  { prefix: 'sat', name: 'Saturn', varName: 'sat404' },
  { prefix: 'ura', name: 'Uranus', varName: 'ura404' },
  { prefix: 'nep', name: 'Neptune', varName: 'nep404' },
  { prefix: 'plu', name: 'Pluto', varName: 'plu404' },
];

// Find line numbers for each array
function findArrayBounds(name) {
  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^static (double|signed char|const signed char)\\s+${name}\\[\\]`))) {
      start = i + 1; // next line after declaration
    }
    if (start >= 0 && end < 0 && lines[i].trim() === '};') {
      end = i;
      break;
    }
    // also handle -1 as last element (for args arrays)
    if (start >= 0 && end < 0 && lines[i].trim().match(/^-1$/)) {
      end = i + 1; // include the -1 line
      break;
    }
  }
  return { start, end };
}

function findStructBounds(name) {
  let start = -1, end = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(new RegExp(`^static struct plantbl\\s+${name}`))) {
      start = i;
    }
    if (start >= 0 && end < 0 && lines[i].trim() === '};') {
      end = i;
      break;
    }
  }
  return { start, end };
}

function extractNumbers(startLine, endLine) {
  const nums = [];
  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];
    // Extract all numbers (integers, floats, scientific notation, possibly negative)
    const matches = line.match(/-?\d+(\.\d+)?(e[+-]?\d+)?/gi);
    if (matches) {
      nums.push(...matches.map(Number));
    }
  }
  return nums;
}

function extractSignedChars(startLine, endLine) {
  const nums = [];
  for (let i = startLine; i < endLine; i++) {
    const line = lines[i];
    const matches = line.match(/-?\d+/g);
    if (matches) {
      nums.push(...matches.map(Number));
    }
  }
  return nums;
}

function formatDoubleArray(data, cols = 4) {
  const rows = [];
  for (let i = 0; i < data.length; i += cols) {
    const chunk = data.slice(i, i + cols);
    rows.push(chunk.map(v => String(v)).join(',') + ',');
  }
  return rows.join('\n');
}

function formatIntArray(data, cols = 10) {
  const rows = [];
  for (let i = 0; i < data.length; i += cols) {
    const chunk = data.slice(i, i + cols);
    rows.push(chunk.map(v => String(v)).join(',') + ',');
  }
  return rows.join('\n');
}

// Parse struct plantbl
function parseStruct(name) {
  const bounds = findStructBounds(name);
  if (bounds.start < 0) throw new Error(`Struct ${name} not found`);
  const structLines = lines.slice(bounds.start, bounds.end + 1).join('\n');

  // Extract max_harmonic array
  const mhMatch = structLines.match(/\{\s*([\d,\s]+)\s*\}/);
  const maxHarmonic = mhMatch[1].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

  // Extract max_power_of_t (single digit after the closing brace of max_harmonic)
  const afterMh = structLines.slice(mhMatch.index + mhMatch[0].length);
  const mptMatch = afterMh.match(/(\d+)/);
  const maxPowerOfT = parseInt(mptMatch[1]);

  // Extract distance (last number before };, may or may not be scientific notation)
  // Get all numbers from the struct text
  const allNums = structLines.match(/-?\d+(\.\d+)?(e[+-]?\d+)?/gi);
  // Distance is the last one before the closing brace
  const distance = parseFloat(allNums[allNums.length - 1]);

  return { maxHarmonic, maxPowerOfT, distance };
}

let output = `/*************************************************************
 * swemptab.ts — Moshier semi-analytical planetary ephemeris tables
 * Auto-generated from swemptab.h
 *
 * Copyright (C) 1997 - 2021 Astrodienst AG, Switzerland. (AGPL)
 *************************************************************/

import type { Plantbl } from './types';

`;

for (const planet of planets) {
  console.log(`Processing ${planet.name}...`);

  // Find and extract all arrays
  const tablBounds = findArrayBounds(`${planet.prefix}tabl`);
  const tabbBounds = findArrayBounds(`${planet.prefix}tabb`);
  const tabrBounds = findArrayBounds(`${planet.prefix}tabr`);
  const argsBounds = findArrayBounds(`${planet.prefix}args`);

  const tabl = extractNumbers(tablBounds.start, tablBounds.end);
  const tabb = extractNumbers(tabbBounds.start, tabbBounds.end);
  const tabr = extractNumbers(tabrBounds.start, tabrBounds.end);
  const args = extractSignedChars(argsBounds.start, argsBounds.end);

  const struct = parseStruct(planet.varName);

  console.log(`  tabl: ${tabl.length}, tabb: ${tabb.length}, tabr: ${tabr.length}, args: ${args.length}`);
  console.log(`  maxHarmonic: [${struct.maxHarmonic}], maxPowerOfT: ${struct.maxPowerOfT}, distance: ${struct.distance}`);

  output += `/* ---- ${planet.name} ---- */\n`;
  output += `const ${planet.prefix}Tabl = new Float64Array([\n${formatDoubleArray(tabl)}\n]);\n\n`;
  output += `const ${planet.prefix}Tabb = new Float64Array([\n${formatDoubleArray(tabb)}\n]);\n\n`;
  output += `const ${planet.prefix}Tabr = new Float64Array([\n${formatDoubleArray(tabr)}\n]);\n\n`;
  output += `const ${planet.prefix}Args = new Int8Array([\n${formatIntArray(args)}\n]);\n\n`;
  output += `export const ${planet.varName}: Plantbl = {\n`;
  output += `  maxHarmonic: [${struct.maxHarmonic.join(', ')}],\n`;
  output += `  maxPowerOfT: ${struct.maxPowerOfT},\n`;
  output += `  argTbl: ${planet.prefix}Args,\n`;
  output += `  lonTbl: ${planet.prefix}Tabl,\n`;
  output += `  latTbl: ${planet.prefix}Tabb,\n`;
  output += `  radTbl: ${planet.prefix}Tabr,\n`;
  output += `  distance: ${struct.distance},\n`;
  output += `};\n\n`;
}

const outPath = path.join(__dirname, '..', 'src', 'swemptab.ts');
fs.writeFileSync(outPath, output);
console.log(`\nWrote ${outPath}`);
