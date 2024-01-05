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
exports.Yaml2SolanaClass = void 0;
const Accounts_1 = require("./Accounts");
const Pda_1 = require("./Pda");
const InstructionDefinition_1 = require("./InstructionDefinition");
const LocalDevelopment_1 = require("./LocalDevelopment");
const path = __importStar(require("path"));
class Yaml2SolanaClass {
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config) {
        this.config = config;
        this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');
        this.accounts = (0, Accounts_1.Accounts)(this.config);
        this.localDevelopment = new LocalDevelopment_1.LocalDevelopment(config);
        this.pda = (0, Pda_1.Pda)(config, this.accounts, this.localDevelopment);
        this.instructionDefinition = (0, InstructionDefinition_1.InstructionDefinition)(config, this.accounts, this.pda, this.localDevelopment);
    }
}
exports.Yaml2SolanaClass = Yaml2SolanaClass;
