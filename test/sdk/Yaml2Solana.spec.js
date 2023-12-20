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
const Yaml2Solana_1 = require("../../src/sdk/Yaml2Solana");
const web3 = __importStar(require("@solana/web3.js"));
test('Create "Yaml2SolanaClass" instance. Creating instance should not produce any error', () => {
    new Yaml2Solana_1.Yaml2SolanaClass("test/yaml2solana.yaml");
});
test('Should be able to access accounts directly from yaml2solana.yaml schema', () => {
    const y2s = new Yaml2Solana_1.Yaml2SolanaClass("test/yaml2solana.yaml");
    expect(y2s.accounts.TOKEN_PROGRAM.toString()).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    expect(y2s.accounts.ASSOCIATED_TOKEN_PROGRAM.toString()).toBe("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    expect(y2s.accounts.SYSTEM_PROGRAM.toString()).toBe("11111111111111111111111111111111");
    expect(y2s.accounts.USDT_MINT.toString()).toBe("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    expect(y2s.accounts.USDC_MINT.toString()).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(y2s.accounts.USDH_MINT.toString()).toBe("USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX");
    expect(y2s.accounts.WSOL_MINT.toString()).toBe("So11111111111111111111111111111111111111112");
});
test('Should be able to fetch only the address from accounts', () => {
    const y2s = new Yaml2Solana_1.Yaml2SolanaClass("test/yaml2solana.yaml");
    expect(y2s.accounts.SOME_PROGRAM.toString()).toBe("DM6UM8DELAKBH2VcypUoNMjuR9yJ5FfhSzhD5GLav22n");
});
test('Should be able to access _PROGRAM_PATH', () => {
    const y2s = new Yaml2Solana_1.Yaml2SolanaClass("test/yaml2solana.yaml");
    expect(y2s.accounts.SOME_PROGRAM_PROGRAM_PATH).toBe("target/deploy/some_program.so");
});
test('Should be able to generate PDA from yaml2solana.yaml', () => {
    const y2s = new Yaml2Solana_1.Yaml2SolanaClass("test/yaml2solana.yaml");
    expect(y2s.pda.somePda({
        userWallet1: "38w9ZPy4wxNwjHSEazqAb74kJ8GhyfuvwXu8uCYqWSPr"
    }).toString()).toBe("DJG9JsZQybnP3DWmEaMKEfeM15t9pVbGicp7tnovbmCZ");
});
test('Create `someInstructionA` instruction from yaml2solana.yaml', () => {
    const y2s = new Yaml2Solana_1.Yaml2SolanaClass("test/yaml2solana.yaml");
    const ix = y2s.instructionDefinition.someInstructionA({
        amount: 10000,
        slippage: 10,
    });
    expect(ix).toBeDefined();
    expect(ix).toBeInstanceOf(web3.TransactionInstruction);
});
