"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Yaml2Solana = exports.sighash = exports.DynamicInstruction = void 0;
var DynamicInstruction_1 = require("./sdk/DynamicInstruction");
Object.defineProperty(exports, "DynamicInstruction", { enumerable: true, get: function () { return DynamicInstruction_1.DynamicInstruction; } });
const Yaml2Solana_1 = require("./sdk/Yaml2Solana");
var type_resolver_1 = require("./util/type-resolver");
Object.defineProperty(exports, "sighash", { enumerable: true, get: function () { return type_resolver_1.sighash; } });
/**
 * Creates an instance of Yaml2Solana class
 *
 * @param config yaml2solana.yaml file
 * @returns Yaml2Solana version 2
 */
function Yaml2Solana(config) {
    return new Yaml2Solana_1.Yaml2SolanaClass(config);
}
exports.Yaml2Solana = Yaml2Solana;
