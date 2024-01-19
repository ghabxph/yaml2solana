
/**
 * Throws error with stacktrace for debugging purposes
 *
 * @param message
 */
export function throwErrorWithTrace(message: any): any {
  // console.trace();
  throw Error(message);;
}

process.on('unhandledRejection', (e) => {
  console.error();
  console.error(`${(e as Error).stack}`)
  console.error();
});
