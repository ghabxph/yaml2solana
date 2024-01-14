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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const util = __importStar(require("../../util"));
const web3 = __importStar(require("@solana/web3.js"));
const utilUi_1 = require("./utilUi");
const __1 = require("../..");
const DOWNLOAD_SOLANA_ACCOUNTS = 'Download solana accounts defined in schema';
const CHOICE_RUN_TEST_VALIDATOR = 'Run test validator';
const CHOICE_RUN_INSTRUCTION = 'Run an instruction';
const CHOICE_RUN_TEST = 'Run a test';
const CHOICE_UTILS = 'Utility / Debugging Tools';
function mainUi(schemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        const { choice } = yield inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'choice',
                message: '-=Yaml2Solana Main UI=-\n\n [Choose Action]',
                choices: [
                    DOWNLOAD_SOLANA_ACCOUNTS,
                    CHOICE_RUN_TEST_VALIDATOR,
                    CHOICE_RUN_INSTRUCTION,
                    CHOICE_RUN_TEST,
                    CHOICE_UTILS,
                ],
            },
        ]);
        if (choice === DOWNLOAD_SOLANA_ACCOUNTS) {
            yield downloadSolanaAccounts(schemaFile);
            return;
        }
        if (choice === CHOICE_RUN_TEST_VALIDATOR) {
            yield runTestValidator(schemaFile);
            return;
        }
        // Assuming here that test validator is already running.
        if (choice === CHOICE_RUN_INSTRUCTION) {
            return yield runInstruction(schemaFile);
        }
        // Assuming here that test validator is already running.
        if (choice === CHOICE_RUN_TEST) {
            // 1. Confirm first if localnet is running
            if (!(yield util.test.checkIfLocalnetIsRunning())) {
                console.log('Localnet seems not running. http://127.0.0.1:8899/health doesn\'t return a healthy status.');
                return;
            }
            // Confirm messae that localnet is running
            console.log('Localnet seems running. http://127.0.0.1:8899/health returns \'ok\' state');
            // 2. Select what test to execute
            // 3. Check if there are missing parameters
            // 4. Run test validator
            // 5. Run instruction from test
            return;
        }
        // Debugging Tools
        if (choice === CHOICE_UTILS) {
            yield (0, utilUi_1.utilUi)();
            return;
        }
    });
}
exports.mainUi = mainUi;
/**
 * Download solana accounts and update cache
 */
function downloadSolanaAccounts(schemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create yaml2solana v2 instance
        const yaml2solana = (0, __1.Yaml2Solana)(schemaFile);
        // Download accounts from mainnet
        return yield yaml2solana.downloadAccountsFromMainnet([]);
    });
}
/**
 * Run solana test validator
 */
function runTestValidator(schemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create yaml2solana v2 instance
        const yaml2solana = (0, __1.Yaml2Solana)(schemaFile);
        // Run test validator using v2
        return yield yaml2solana.runTestValidator();
    });
}
function runInstruction(schemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Create yaml2solana v2 instance
        const yaml2solana = (0, __1.Yaml2Solana)(schemaFile);
        // 2. Select what instruction to execute
        const choices = yaml2solana.getInstructions();
        const { instructionToExecute } = yield inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'instructionToExecute',
                message: 'Choose instruction to execute:',
                choices,
            },
        ]);
        // 3. Resolve variables (from data)
        for (const param of yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].data) {
            try {
                yaml2solana.resolveInstruction(instructionToExecute);
            }
            catch (_a) { }
            finally {
                const varInfo = yaml2solana.extractVarInfo(param);
                if (varInfo.isVariable) {
                    if (varInfo.type === 'bool') {
                        yield inquirer_1.default.prompt({
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
                        yield inquirer_1.default.prompt({
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
        for (const param of yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].accounts) {
            try {
                yaml2solana.resolveInstruction(instructionToExecute);
            }
            catch (_b) { }
            finally {
                const [account] = param.split(',');
                let defaultValue = yaml2solana.getVar(account);
                if (defaultValue !== undefined && defaultValue.publicKey !== undefined) {
                    defaultValue = defaultValue.publicKey;
                }
                const { value } = yield inquirer_1.default.prompt({
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
            yaml2solana.resolveInstruction(instructionToExecute);
        }
        catch (_c) { }
        finally {
            const account = yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].payer;
            const kp = yaml2solana.getVar(account);
            let defaultValue;
            if (kp === undefined) {
                const { value } = yield inquirer_1.default.prompt({
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
            yaml2solana.resolveInstruction(instructionToExecute);
        }
        catch (_d) { }
        // 6. Execute instruction
        console.log();
        yield yaml2solana.executeTransactionsLocally({
            txns: [
                yaml2solana.createLocalnetTransaction(instructionToExecute, [`$${instructionToExecute}`], [], yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].payer, yaml2solana.getSignersFromIx(instructionToExecute))
            ],
            runFromExistingLocalnet: yield util.test.checkIfLocalnetIsRunning(),
        });
    });
}