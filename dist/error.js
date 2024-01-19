"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwErrorWithTrace = void 0;
/**
 * Throws error with stacktrace for debugging purposes
 *
 * @param message
 */
function throwErrorWithTrace(message) {
    // console.trace();
    throw Error(message);
    ;
}
exports.throwErrorWithTrace = throwErrorWithTrace;
process.on('unhandledRejection', (e) => {
    console.error();
    console.error(`${e.stack}`);
    console.error();
});
