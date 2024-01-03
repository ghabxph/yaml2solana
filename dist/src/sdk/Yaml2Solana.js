"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Yaml2SolanaClass = void 0;
const Accounts_1 = require("./Accounts");
const Pda_1 = require("./Pda");
const InstructionDefinition_1 = require("./InstructionDefinition");
const LocalDevelopment_1 = require("./LocalDevelopment");
class Yaml2SolanaClass {
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config) {
        this.config = config;
        this.accounts = (0, Accounts_1.Accounts)(this.config);
        this.localDevelopment = new LocalDevelopment_1.LocalDevelopment(config);
        this.pda = (0, Pda_1.Pda)(config, this.accounts, this.localDevelopment);
        this.instructionDefinition = (0, InstructionDefinition_1.InstructionDefinition)(config, this.accounts, this.pda, this.localDevelopment);
    }
}
exports.Yaml2SolanaClass = Yaml2SolanaClass;
