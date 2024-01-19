"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfLocalnetIsRunning = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Curls to localnet cluster health checker to check if local test validator is running
 */
async function checkIfLocalnetIsRunning() {
    try {
        const response = await axios_1.default.get('http://127.0.0.1:8899/health');
        return response.data === 'ok';
    }
    catch {
        return false;
    }
}
exports.checkIfLocalnetIsRunning = checkIfLocalnetIsRunning;
