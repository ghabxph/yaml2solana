
/**
 * Throws error with stacktrace for debugging purposes
 *
 * @param message
 */
export function throwErrorWithTrace(message: any): any {
  console.trace();
  throw message;
}