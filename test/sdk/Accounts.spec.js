"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Accounts_1 = require("../../src/sdk/Accounts");
test('Create "Accounts" instance. Creating instance should not produce any error', () => {
    (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
});
test('Should be able to access accounts directly from yaml2solana.yaml schema', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    expect(accounts.TOKEN_PROGRAM.toString()).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    expect(accounts.ASSOCIATED_TOKEN_PROGRAM.toString()).toBe("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
    expect(accounts.SYSTEM_PROGRAM.toString()).toBe("11111111111111111111111111111111");
    expect(accounts.USDT_MINT.toString()).toBe("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    expect(accounts.USDC_MINT.toString()).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(accounts.USDH_MINT.toString()).toBe("USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX");
    expect(accounts.WSOL_MINT.toString()).toBe("So11111111111111111111111111111111111111112");
});
test('Should be able to fetch only the address from accounts', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    expect(accounts.SOME_PROGRAM.toString()).toBe("DM6UM8DELAKBH2VcypUoNMjuR9yJ5FfhSzhD5GLav22n");
});
test('Should be able to access _PROGRAM_PATH', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    expect(accounts.SOME_PROGRAM_PROGRAM_PATH).toBe("target/deploy/some_program.so");
});
