"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Pda_1 = require("../../src/sdk/Pda");
const Accounts_1 = require("../../src/sdk/Accounts");
const LocalDevelopment_1 = require("../../src/sdk/LocalDevelopment");
test('Create "Pda" instance. Creating instance should not produce any error', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    const localDevelopment = new LocalDevelopment_1.LocalDevelopment("test/yaml2solana.yaml");
    (0, Pda_1.Pda)("test/yaml2solana.yaml", accounts, localDevelopment);
});
test('Should be able to generate PDA from yaml2solana.yaml', () => {
    const accounts = (0, Accounts_1.Accounts)("test/yaml2solana.yaml");
    const localDevelopment = new LocalDevelopment_1.LocalDevelopment("test/yaml2solana.yaml");
    const pda = (0, Pda_1.Pda)("test/yaml2solana.yaml", accounts, localDevelopment);
    expect(pda.somePda({
        userWallet1: "38w9ZPy4wxNwjHSEazqAb74kJ8GhyfuvwXu8uCYqWSPr"
    }).toString()).toBe("DJG9JsZQybnP3DWmEaMKEfeM15t9pVbGicp7tnovbmCZ");
});
