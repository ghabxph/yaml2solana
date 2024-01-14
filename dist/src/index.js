"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Yaml2Solana = void 0;
const Yaml2Solana2_1 = require("./sdk/Yaml2Solana2");
/**
 * Creates an instance of Yaml2Solana class
 *
 * @param config yaml2solana.yaml file
 * @returns Yaml2Solana version 2
 */
function Yaml2Solana(config) {
    return new Yaml2Solana2_1.Yaml2SolanaClass2(config);
}
exports.Yaml2Solana = Yaml2Solana;
