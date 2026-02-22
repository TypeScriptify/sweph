/**
 * Error thrown by SwissEph wrapper methods when the underlying
 * Swiss Ephemeris engine returns ERR (-1).
 */
export class SwissEphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwissEphError';
  }
}
