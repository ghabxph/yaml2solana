"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Accounts_1 = require("../../src/sdk/Accounts");
const Pda_1 = require("../../src/sdk/Pda");
const InstructionDefinition_1 = require("../../src/sdk/InstructionDefinition");
const LocalDevelopment_1 = require("../../src/sdk/LocalDevelopment");
const web3 = __importStar(require("@solana/web3.js"));
test('Create "Yaml2SolanaClass" instance. Creating instance should not produce any error', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    const localDevelopment = new LocalDevelopment_1.LocalDevelopment("test/yaml2solana.yaml");
    const pda = (0, Pda_1.Pda)("test/yaml2solana.yaml", accounts, localDevelopment);
    (0, InstructionDefinition_1.InstructionDefinition)("test/yaml2solana.yaml", accounts, pda, localDevelopment);
});
test('Create `someInstructionA` instruction from yaml2solana.yaml', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    const localDevelopment = new LocalDevelopment_1.LocalDevelopment("test/yaml2solana.yaml");
    const pda = (0, Pda_1.Pda)("test/yaml2solana.yaml", accounts, localDevelopment);
    const instructionDefinition = (0, InstructionDefinition_1.InstructionDefinition)("test/yaml2solana.yaml", accounts, pda, localDevelopment);
    const ix = instructionDefinition.someInstructionA({
        amount: 10000,
        slippage: 10,
    });
    expect(ix).toBeDefined();
    expect(ix).toBeInstanceOf(web3.TransactionInstruction);
});
