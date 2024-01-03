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
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
const global_1 = require("../global");
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
        // Read the YAML file.
        const yamlFile = fs.readFileSync(config, 'utf8');
        const parsedYaml = yaml.parse(yamlFile);
        // Loop through accounts
        for (const key in parsedYaml.accounts) {
            const split = parsedYaml.accounts[key].split(',');
            const address = split[0];
            const file = split[1];
            // Set named account in global
            global_1.Global.set(key, new web3.PublicKey(address));
            // Set file if 2nd parameter defined is valid (should be .so or .json)
            if (file !== undefined && typeof file === 'string' && ['json', 'so'].includes(file.split('.')[file.split('.').length - 1])) {
                global_1.Global.set(address, { file });
            }
        }
        // Loop through PDA
        for (const key in parsedYaml.pda) {
            global_1.Global.set(key, () => {
                const pdaParams = parsedYaml.pda[key];
                const missingVars = [];
                const errors = [];
                const seeds = [];
                let programId;
                try {
                    programId = pdaParams.programId.startsWith('$') ? global_1.Global.get(pdaParams.programId) : new web3.PublicKey(pdaParams.programId);
                }
                catch (_a) {
                    errors.push(`Invalid programId: ${pdaParams.programId}`);
                    programId = undefined;
                }
                for (const seed of pdaParams.seeds) {
                    let _seed;
                    if (seed.startsWith('$')) {
                        const p = global_1.Global.get(seed);
                        if (typeof p === 'undefined') {
                            missingVars.push(seed);
                            continue;
                        }
                        else {
                            _seed = p.toBuffer();
                        }
                    }
                    else {
                        _seed = Buffer.from(seed, 'utf-8');
                    }
                    seeds.push(_seed);
                }
                if (missingVars.length > 0 || typeof programId === 'undefined') {
                    return { missingVars, errors };
                }
                else {
                    const [pda] = web3.PublicKey.findProgramAddressSync(seeds, programId);
                    return pda;
                }
            });
        }
    }
}
exports.Yaml2SolanaClass = Yaml2SolanaClass;
