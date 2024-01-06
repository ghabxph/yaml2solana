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
exports.InstructionDefinition = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
const util = __importStar(require("../util"));
class InstructionDefinitionClass {
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config, 
    /**
     * Accounts definition
     */
    accounts, 
    /**
     * PDA definition
     */
    pda, 
    /**
     * Local development setup
     */
    localDevelopment) {
        // Read the YAML file.
        const yamlContent = fs.readFileSync(config, 'utf8');
        // Parse the YAML content into a JavaScript object.
        this.instructionDefinition = yaml.parse(yamlContent).instructionDefinition;
        // Create a Proxy to handle property access dynamically.
        return new Proxy(this, {
            get(target, prop) {
                const propName = prop;
                const instructionDefinition = target.instructionDefinition[propName];
                /**
                 * InstructionDefinitionClass.getInstruction() method
                 *
                 * Returns instruction keys
                 */
                if (prop === 'getInstructions') {
                    return () => {
                        const instructions = [];
                        for (const instruction in target.instructionDefinition) {
                            instructions.push(instruction);
                        }
                        return instructions;
                    };
                }
                /**
                 * InstructionDefinitionClass.getParametersOf() method
                 *
                 * @param $targetInstruction The instruction key
                 * Returns available parameters that can be overriden for target instruction
                 */
                if (prop === 'getParametersOf') {
                    return (instructionToExecute) => {
                        return util.typeResolver.getVariablesFromInstructionDefinition(instructionToExecute, target.instructionDefinition, accounts, pda, localDevelopment.testWallets);
                    };
                }
                /**
                 * InstructionDefinitionClass.getSigners() method
                 *
                 * @param $targetInstruction The instruction key
                 * Returns localnet instruction signers
                 */
                if (prop === 'getSigners') {
                    return (instructionToExecute) => {
                        const accountsMeta = target.instructionDefinition[instructionToExecute].accounts;
                        const signers = [];
                        for (const accountMeta of accountsMeta) {
                            const _accountMeta = accountMeta.split(',');
                            const name = _accountMeta[0].substring(1);
                            if (_accountMeta.includes('signer')) {
                                const signer = localDevelopment.testWallets[name];
                                if (signer !== undefined) {
                                    signers.push(signer);
                                }
                                else {
                                    throw `${name} signer is not defined in the localDevelopment.testWallets`;
                                }
                            }
                        }
                        return signers;
                    };
                }
                /**
                 * InstructionDefinitionClass.getPayer() method
                 *
                 * @param $targetInstruction The instruction key
                 * Returns transaction payer
                 */
                if (prop === 'getPayer') {
                    return (instructionToExecute) => {
                        const payerVar = target.instructionDefinition[instructionToExecute].payer;
                        if (payerVar.startsWith('$')) {
                            const payerKp = localDevelopment.testWallets[payerVar.substring(1)];
                            return payerKp.publicKey;
                        }
                        else {
                            throw 'Payer must start with \'$\' and it should exist in test wallet.';
                        }
                    };
                }
                return instructionDefinition === undefined ? () => {
                    throw `Cannot find \`${propName}\` instruction definition from ${config}.`;
                } : (params) => {
                    if (params === undefined) {
                        params = {};
                    }
                    // Resolve program id
                    let programId;
                    if (instructionDefinition.programId.startsWith('$')) {
                        const key = instructionDefinition.programId.replace('$', '');
                        if (params[key] !== undefined) {
                            programId = new web3.PublicKey(params[key]);
                        }
                        else if (accounts[key] !== undefined) {
                            programId = new web3.PublicKey(accounts[key]);
                        }
                        else {
                            throw `$${key} param does not exist in account definition`;
                        }
                    }
                    else {
                        programId = new web3.PublicKey(instructionDefinition.programId);
                    }
                    // Resolve data (instruction parameters)
                    let data = Buffer.alloc(0);
                    for (const _data of instructionDefinition.data) {
                        const value = util.resolveType(_data, params, accounts, pda, localDevelopment.testWallets);
                        data = Buffer.concat([data, value]);
                    }
                    // Resolve account metas
                    const keys = [];
                    for (const account of instructionDefinition.accounts) {
                        keys.push(util.resolveAccountMeta(account, params, accounts, pda, localDevelopment.testWallets));
                    }
                    return new web3.TransactionInstruction({
                        keys,
                        programId,
                        data,
                    });
                };
            },
        });
    }
}
/**
 * Create instance of PdaClass
 * @param config yaml2solana.yaml config file
 * @returns
 */
function InstructionDefinition(config, accounts, pda, localDevelopment) {
    return new InstructionDefinitionClass(config, accounts, pda, localDevelopment);
}
exports.InstructionDefinition = InstructionDefinition;
