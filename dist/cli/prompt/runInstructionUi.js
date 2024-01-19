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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInstructionUi = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const util = __importStar(require("../../util"));
const inquirer_1 = __importDefault(require("inquirer"));
const __1 = require("../..");
const CHOICE_SINGLE = 'Run single instruction';
const CHOICE_BUNDLE = 'Run bundled instructions';
async function runInstructionUi(schemaFile, y2s) {
    const yaml2solana = y2s !== undefined ? y2s : (0, __1.Yaml2Solana)(schemaFile);
    if (yaml2solana.parsedYaml.instructionBundle !== undefined) {
        const { choice } = await inquirer_1.default.prompt({
            type: 'list',
            name: 'choice',
            choices: [
                CHOICE_SINGLE,
                CHOICE_BUNDLE,
            ]
        });
        if (choice === CHOICE_SINGLE) {
            return await runSingleInstruction(schemaFile, y2s);
        }
        else if (choice === CHOICE_BUNDLE) {
            return await runBundledInstructions(schemaFile, y2s);
        }
    }
    else {
        runSingleInstruction(schemaFile, y2s);
    }
}
exports.runInstructionUi = runInstructionUi;
async function runSingleInstruction(schemaFile, y2s) {
    // 1. Create yaml2solana v2 instance
    const yaml2solana = y2s !== undefined ? y2s : (0, __1.Yaml2Solana)(schemaFile);
    // 2. Select what instruction to execute
    const choices = yaml2solana.getInstructions();
    const { instructionToExecute } = await inquirer_1.default
        .prompt([
        {
            type: 'list',
            name: 'instructionToExecute',
            message: 'Choose instruction to execute:',
            choices,
        },
    ]);
    // 3. Resolve variables (from data)
    const ixDef = yaml2solana.getIxDefinition(instructionToExecute);
    for (const param of ixDef.data) {
        try {
            await yaml2solana.resolveInstruction(instructionToExecute);
        }
        catch { }
        finally {
            const varInfo = yaml2solana.extractVarInfo(param);
            if (varInfo.isVariable) {
                if (varInfo.type === 'bool') {
                    await inquirer_1.default.prompt({
                        type: 'list',
                        name: varInfo.name,
                        message: `Value for ${varInfo.name}`,
                        choices: ['true', 'false'],
                        filter: (input) => {
                            return input === 'true';
                        }
                    });
                }
                else {
                    await inquirer_1.default.prompt({
                        type: 'input',
                        name: varInfo.name,
                        message: `Value for ${varInfo.name}`,
                        default: varInfo.defaultValue,
                        filter: (input) => {
                            if (varInfo.type === 'pubkey') {
                                if (typeof input === 'string') {
                                    return new web3.PublicKey(input);
                                }
                                else {
                                    return input;
                                }
                            }
                            const numberTypes = ['u8', 'u16', 'u32', 'u64', 'usize', 'i8', 'i16', 'i32', 'i64'];
                            if (numberTypes.includes(varInfo.type)) {
                                if (Math.round(Number(input)) === Number(input)) {
                                    return Number(input);
                                }
                                else {
                                    throw `${varInfo.name} is not a valid integer value.`;
                                }
                            }
                            return input;
                        }
                    });
                }
            }
        }
    }
    // 4. Resolve params (from meta)
    for (const param of ixDef.accounts) {
        try {
            await yaml2solana.resolveInstruction(instructionToExecute);
        }
        catch { }
        finally {
            const [account] = param.split(',');
            let defaultValue;
            let v = yaml2solana.getParam(account);
            if (v.type === 'keypair') {
                defaultValue = v.value.publicKey;
            }
            else if (v.type === 'pubkey') {
                defaultValue = v.value;
            }
            else {
                throw `${account} is not a valid public key.`;
            }
            const { value } = await inquirer_1.default.prompt({
                type: 'input',
                name: 'value',
                message: `Value for ${account}`,
                default: defaultValue,
                filter: (input) => {
                    if (typeof input === 'string') {
                        return new web3.PublicKey(input);
                    }
                    else {
                        return input;
                    }
                }
            });
            yaml2solana.setParam(account, value);
        }
    }
    // 5. Resolve transaction payer
    try {
        await yaml2solana.resolveInstruction(instructionToExecute);
    }
    catch { }
    finally {
        const account = ixDef.payer;
        const kp = yaml2solana.getParam(account);
        let defaultValue;
        if (kp === undefined) {
            const { value } = await inquirer_1.default.prompt({
                type: 'input',
                name: 'value',
                message: `Value for transaction payer ${account} (base64 encoded):`,
                default: defaultValue,
                filter: (input) => {
                    web3.Keypair.fromSecretKey(Buffer.from(input, 'base64'));
                    return input;
                }
            });
            yaml2solana.setParam(account, web3.Keypair.fromSecretKey(Buffer.from(value, 'base64')));
        }
    }
    // 5. Resolve instruction
    try {
        await yaml2solana.resolveInstruction(instructionToExecute);
    }
    catch { }
    // 6. Execute instruction
    console.log();
    await yaml2solana.executeTransactionsLocally({
        txns: [
            yaml2solana.createTransaction(instructionToExecute, [`$${instructionToExecute}`], [], ixDef.payer, yaml2solana.getSignersFromIx(instructionToExecute))
        ],
        runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning(),
    });
}
async function runBundledInstructions(schemaFile, y2s) {
    // 1. Create yaml2solana v2 instance
    const yaml2solana = y2s !== undefined ? y2s : (0, __1.Yaml2Solana)(schemaFile);
    // 2. Get choices
    const choices = yaml2solana.getInstructionBundles();
    // 3. Choose bundle to execute
    const { choice } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'choice',
        message: 'Choose bundle to execute:',
        choices,
    });
    // 4. Resolve
    await yaml2solana.resolve({
        onlyResolve: {
            thesePdas: [],
            theseInstructions: [],
            theseInstructionBundles: [choice]
        }
    });
    // 5. Create localnet transaction
    const signers = yaml2solana.resolveInstructionBundleSigners(`$${choice}`);
    const tx = yaml2solana.createTransaction(choice, [`$${choice}`], yaml2solana.parsedYaml.instructionBundle[choice].alts, yaml2solana.parsedYaml.instructionBundle[choice].payer, signers);
    //   // 6. Choose whether to execute transaction in localnet or mainnet
    //   const cluster = await getCluster(yaml2solana);
    //   // 7. Execute instruction in localnet
    //   console.log();
    //   await yaml2solana.executeTransactionsLocally({
    //     txns: [tx],
    //     runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning(),
    //     cluster,
    //   });
    // }
    // async function getCluster(y2s: Yaml2SolanaClass): Promise<string> {
    //   if (y2s.parsedYaml.mainnetRpc) {
    //     const { cluster } = await inquirer.prompt({
    //       type: 'list',
    //       name: 'cluster',
    //       message: 'Execute transaction in?',
    //       choices: [
    //         'http://127.0.0.1:8899',
    //         ...y2s.parsedYaml.mainnetRpc,
    //       ],
    //     });
    //     return cluster;
    //   }
    //   return 'http://127.0.0.1:8899';
}
