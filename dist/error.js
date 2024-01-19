"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwErrorWithTrace = void 0;
/**
 * Throws error with stacktrace for debugging purposes
 *
 * @param message
 */
function throwErrorWithTrace(message) {
    console.trace();
    throw message;
}
exports.throwErrorWithTrace = throwErrorWithTrace;
