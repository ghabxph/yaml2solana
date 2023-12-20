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
const child_process_1 = require("child_process");
const web3 = __importStar(require("@solana/web3.js"));
const DOWNLOAD_SOLANA_ACCOUNTS = 'Download solana accounts defined in schema';
const CHOICE_RUN_TEST_VALIDATOR = 'Run test validator';
const CHOICE_RUN_INSTRUCTION = 'Run an instruction';
const CHOICE_RUN_TEST = 'Run a test';
function mainUi(schemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        const { choice } = yield inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'Choose Action',
                choices: [
                    DOWNLOAD_SOLANA_ACCOUNTS,
                    CHOICE_RUN_TEST_VALIDATOR,
                    CHOICE_RUN_INSTRUCTION,
                    CHOICE_RUN_TEST,
                ],
            },
        ]);
        if (choice === DOWNLOAD_SOLANA_ACCOUNTS) {
            yield downloadSolanaAccounts(schemaFile);
            return;
        }
        // Read schema
        const schema = util.fs.readSchema(schemaFile);
        if (choice === CHOICE_RUN_TEST_VALIDATOR) {
            // 1. Update cache (download solana accounts)
            const mapping = yield downloadSolanaAccounts(schemaFile);
            // 2. Run test validator with accounts
            yield runTestValidator(mapping, schema);
            return;
        }
        // Assuming here that test validator is already running.
        if (choice === CHOICE_RUN_INSTRUCTION) {
            // 1. Confirm first if localnet is running
            if (!(yield util.test.checkIfLocalnetIsRunning())) {
                console.log('Localnet seems not running. http://127.0.0.1:8899/health doesn\'t return a healthy status.');
                return;
            }
            // Confirm messae that localnet is running
            console.log('Localnet seems running. http://127.0.0.1:8899/health returns \'ok\' state');
            // 2. Select what instruction to execute
            const choices = schema.instructionDefinition.getInstructions();
            const { instructionToExecute } = yield inquirer_1.default
                .prompt([
                {
                    type: 'list',
                    name: 'instructionToExecute',
                    message: 'Choose instruction to execute:',
                    choices,
                },
            ]);
            // 3. Resolve variables
            const variables = schema.instructionDefinition.getParametersOf(instructionToExecute);
            const prompt = [];
            for (const key in variables) {
                if (variables[key].type === 'bool') {
                    prompt.push({
                        type: 'list',
                        name: key,
                        message: `Value for ${key}`,
                        choices: ['true', 'false'],
                        filter: (input) => {
                            return input === 'true';
                        }
                    });
                }
                else {
                    let defaultValue = variables[key].defaultValue;
                    if (variables[key].type === 'pubkey') {
                        switch (key) {
                            case 'RENT_SYSVAR':
                                defaultValue = 'SysvarRent111111111111111111111111111111111';
                                break;
                            case 'CLOCK_SYSVAR':
                                defaultValue = 'SysvarC1ock11111111111111111111111111111111';
                                break;
                            case 'TOKEN_PROGRAM':
                                defaultValue = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
                                break;
                            case 'ASSOCIATED_TOKEN_PROGRAM':
                                defaultValue = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
                                break;
                            case 'SYSTEM_PROGRAM':
                                defaultValue = '11111111111111111111111111111111';
                                break;
                        }
                    }
                    prompt.push({
                        type: 'input',
                        name: key,
                        message: `Value for ${key}:`,
                        default: defaultValue,
                        filter: (input) => {
                            if (variables[key].type === 'pubkey') {
                                return new web3.PublicKey(input);
                            }
                            const numberTypes = ['u8', 'u16', 'u32', 'u64', 'usize', 'i8', 'i16', 'i32', 'i64'];
                            if (numberTypes.includes(variables[key].type)) {
                                if (Math.round(Number(input)) === Number(input)) {
                                    return Number(input);
                                }
                                else {
                                    throw `${key} is not a valid integer value.`;
                                }
                            }
                            return input;
                        }
                    });
                }
            }
            const params = yield inquirer_1.default.prompt(prompt);
            // 4. Create instruction instance based on given parameters
            const ix = schema.instructionDefinition[instructionToExecute](params);
            // 5. Choose whether to use transaction legacy or v0
            const { txVersion } = yield inquirer_1.default.prompt([{
                    type: 'list',
                    name: 'txVersion',
                    message: 'What transaction format version to use?',
                    choices: [
                        'Legacy',
                        'v0',
                    ]
                }]);
            if (txVersion === 'v0') {
                console.log('v0 not yet supported. Will be supported soon.');
                return;
            }
            // 5. Create transaction and execute instruction
            const connection = new web3.Connection("http://127.0.0.1:8899");
            const { blockhash: recentBlockhash } = yield connection.getLatestBlockhash();
            const tx = new web3.Transaction().add(ix);
            tx.recentBlockhash = recentBlockhash;
            const signers = schema.instructionDefinition.getSigners(instructionToExecute);
            tx.sign(...signers);
            const signature = yield web3.sendAndConfirmTransaction(connection, tx, signers);
            console.log(`tx signature: ${signature}`);
            return;
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
    });
}
exports.mainUi = mainUi;
/**
 * Download solana accounts and update cache
 */
function downloadSolanaAccounts(schemaFile) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Read schema
        const schema = util.fs.readSchema(schemaFile);
        // 2. Get accounts from schema
        const accounts = schema.accounts.getAccounts();
        // 3. Skip accounts that are already downloaded
        const accounts1 = util.fs.skipDownloadedAccounts(schema, accounts);
        // 3. Fetch multiple accounts from mainnet at batches of 100
        const accountInfos = yield util.solana.getMultipleAccountsInfo(accounts1);
        // 4. Write downloaded account infos from mainnet in designated cache folder
        util.fs.writeAccountsToCacheFolder(schema, accountInfos);
        // 5. Map accounts to downloaded to .accounts
        return util.fs.mapAccountsFromCache(schema);
    });
}
/**
 * Run solana test validator
 */
function runTestValidator(mapping, schema) {
    return __awaiter(this, void 0, void 0, function* () {
        // 1. Read solana-test-validator.template.sh to project base folder
        let template = util.fs.readTestValidatorTemplate();
        // 2. Update accounts and replace ==ACCOUNTS==
        const accounts = [];
        for (const account in mapping) {
            accounts.push(mapping[account] ?
                // If has mapping, then use cached account
                `\t--account ${account} ${mapping[account]} \\` :
                // Otherwise, clone account from target cluster
                `\t--maybe-clone ${account} \\`);
        }
        if (accounts.length === 0) {
            template = template.replace('==ACCOUNTS==\n', '');
        }
        else {
            template = template.replace('==ACCOUNTS==', accounts.join('\n')) + '\n';
        }
        // 3. Update programs and replace ==PROGRAMS==
        const programAccounts = [];
        for (let account of schema.accounts.getProgramAccounts()) {
            programAccounts.push(`\t--bpf-program ${account.key} ${account.path} \\`);
        }
        if (programAccounts.length === 0) {
            template = template.replace('==PROGRAMS==\n', '');
        }
        else {
            template = template.replace('==PROGRAMS==', programAccounts.join('\n')) + '\n';
        }
        // 3. Update json accounts and replace ==JSON_ACCOUNTS==
        const jsonAccounts = [];
        for (let account of schema.accounts.getJsonAccounts()) {
            jsonAccounts.push(`\t--account ${account.key} ${account.path} \\`);
        }
        if (jsonAccounts.length === 0) {
            template = template.replace('==JSON_ACCOUNTS==\n', '');
        }
        else {
            template = template.replace('==JSON_ACCOUNTS==', programAccounts.join('\n')) + '\n';
        }
        // 4. Update ==WARP_SLOT==
        template = template.replace('==WARP_SLOT==', `${yield util.solana.getSlot()}`);
        // 5. Update ==CLUSTER==
        template = template.replace('==CLUSTER==', 'https://api.mainnet-beta.solana.com');
        // 6. Create solana-test-validator.ingnore.sh file
        util.fs.createScript('solana-test-validator.ignore.sh', template);
        // 7. Remove test-ledger folder first
        util.fs.deleteFolderRecursive('test-ledger');
        // 8. Run solana-test-validator.ignore.sh
        const test_validator = (0, child_process_1.spawn)('./solana-test-validator.ignore.sh', [], { shell: true });
        test_validator.stderr.on('data', data => console.log(`${data}`));
        let state = 'init';
        test_validator.stdout.on('data', data => {
            if (state === 'init') {
                console.log(`${data}`);
            }
            if (data.includes('Genesis Hash') && state === 'init') {
                state = 'done';
                console.log(`Solana test validator is now running!`);
            }
        });
    });
}
