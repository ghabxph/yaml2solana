"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Yaml2Solana = void 0;
const Yaml2Solana_1 = require("./sdk/Yaml2Solana");
/**
 * Creates an instance of Yaml2Solana class
 *
 * @param config yaml2solana.yaml file
 */
function Yaml2Solana(config) {
    return new Yaml2Solana_1.Yaml2SolanaClass(config);
}
exports.Yaml2Solana = Yaml2Solana;
