"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Global = void 0;
/**
 * Global variable record
 */
const GLOBAL_VARIABLES = {};
/**
 * Global variable class
 */
class Global {
    constructor() { }
    /**
     * Set value to global variable
     *
     * @param name
     * @param value
     */
    static set(name, value) {
        GLOBAL_VARIABLES[name] = value;
    }
    /**
     * Get value from global variable
     *
     * @param name
     * @returns
     */
    static get(name) {
        return GLOBAL_VARIABLES[name];
    }
}
exports.Global = Global;
