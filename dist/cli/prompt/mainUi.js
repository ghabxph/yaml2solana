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
exports.mainUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const util = __importStar(require("../../util"));
const utilUi_1 = require("./utilUi");
const __1 = require("../..");
const runInstructionUi_1 = require("./runInstructionUi");
const setupUserWalletUi_1 = require("./setupUserWalletUi");
const ts_clear_screen_1 = __importDefault(require("ts-clear-screen"));
const CHOICE_SETUP_USER_WALLET = 'Setup a password-protected wallet in yaml2solana';
const CHOICE_WALLET_OPTIONS = 'Wallet options';
const DOWNLOAD_SOLANA_ACCOUNTS = 'Download solana accounts defined in schema';
const CHOICE_RUN_TEST_VALIDATOR = 'Run test validator';
const CHOICE_RUN_INSTRUCTION = 'Run an instruction';
const CHOICE_RUN_TEST = 'Run a test';
const CHOICE_UTILS = 'Utility / Debugging Tools';
async function mainUi(schemaFile, y2s) {
    let programLoop = [true];
    while (programLoop[0]) {
        (0, ts_clear_screen_1.default)();
        let walletState = '';
        if ((0, setupUserWalletUi_1.hasWallet)()) {
            if (setupUserWalletUi_1.USER_WALLET === undefined) {
                walletState = 'User wallet state: Locked\n\n';
            }
            else {
                walletState =
                    'User wallet state: Unlocked\n' +
                        `Wallet address: ${setupUserWalletUi_1.USER_WALLET.publicKey}\n\n`;
            }
        }
        const { choice } = await inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'choice',
                message: `${walletState}-=Yaml2Solana Main UI=-\n\n [Choose Action] \n\n`,
                choices: [
                    (0, setupUserWalletUi_1.hasWallet)() ? CHOICE_WALLET_OPTIONS : CHOICE_SETUP_USER_WALLET,
                    DOWNLOAD_SOLANA_ACCOUNTS,
                    CHOICE_RUN_TEST_VALIDATOR,
                    CHOICE_RUN_INSTRUCTION,
                    CHOICE_RUN_TEST,
                    CHOICE_UTILS,
                ],
            },
        ]);
        if (choice === CHOICE_SETUP_USER_WALLET) {
            await (0, setupUserWalletUi_1.setupUserWalletUi)();
        }
        if (choice === CHOICE_WALLET_OPTIONS) {
            await (0, setupUserWalletUi_1.walletOptionsUi)(schemaFile, y2s);
        }
        if (choice === DOWNLOAD_SOLANA_ACCOUNTS) {
            return await downloadSolanaAccounts(schemaFile, y2s);
        }
        if (choice === CHOICE_RUN_TEST_VALIDATOR) {
            return await runTestValidator(schemaFile, y2s);
        }
        // Assuming here that test validator is already running.
        if (choice === CHOICE_RUN_INSTRUCTION) {
            return await (0, runInstructionUi_1.runInstructionUi)(schemaFile, y2s);
        }
        // Assuming here that test validator is already running.
        if (choice === CHOICE_RUN_TEST) {
            // 1. Confirm first if localnet is running
            if (!await util.test.checkIfLocalnetIsRunning()) {
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
            await (0, utilUi_1.utilUi)(schemaFile, y2s);
            return;
        }
    }
}
exports.mainUi = mainUi;
/**
 * Download solana accounts and update cache
 */
async function downloadSolanaAccounts(schemaFile, y2s) {
    // Create yaml2solana v2 instance
    const yaml2solana = y2s !== undefined ? y2s : (0, __1.Yaml2Solana)(schemaFile);
    // Download accounts from mainnet
    return await yaml2solana.downloadAccountsFromMainnet([]);
}
/**
 * Run solana test validator
 */
async function runTestValidator(schemaFile, y2s) {
    // Create yaml2solana v2 instance
    const yaml2solana = y2s !== undefined ? y2s : (0, __1.Yaml2Solana)(schemaFile);
    // Run test validator using v2
    return await yaml2solana.runTestValidator();
}
