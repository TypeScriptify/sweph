/**
 * Shared test helpers, constants, and assertions.
 */
import { strict as assert } from 'node:assert';

/** Assert that `a` is within `tol` of `b`. */
export function near(a: number, b: number, tol: number): void {
  assert.ok(
    Math.abs(a - b) < tol,
    `Expected ${a} to be within ${tol} of ${b} (diff: ${Math.abs(a - b)})`,
  );
}

/** J2000.0 epoch — 2000 Jan 1.5 UT */
export const J2000 = 2451545.0;

/** London geographic position */
export const LONDON = { longitude: -0.1278, latitude: 51.5074, altitude: 0 };

/** London as [lon, lat, alt] array for C-style functions */
export const LONDON_ARR: [number, number, number] = [-0.1278, 51.5074, 0];
