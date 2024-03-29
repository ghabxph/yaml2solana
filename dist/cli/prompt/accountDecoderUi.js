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
exports.accountDecoderUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const web3 = __importStar(require("@solana/web3.js"));
const ts_clear_screen_1 = __importDefault(require("ts-clear-screen"));
const util = __importStar(require("../../util"));
const __1 = require("../..");
const path_1 = __importDefault(require("path"));
const error_1 = require("../../error");
const CHOICE_MAINNET = 'Decode account from mainnet';
const CHOICE_LOCAL = 'Decode account from local machine';
async function accountDecoderUi(schemaFile, y2s) {
    (0, ts_clear_screen_1.default)();
    // 1. Enter address to decode
    const { address } = await inquirer_1.default.prompt({
        type: 'input',
        name: 'address',
        message: '-=[Account Decoder]=-\n\n Enter solana address (account to decode)',
        filter: input => {
            new web3.PublicKey(input);
            return input;
        }
    });
    // 2. Choose decoder:
    const yaml2solana = y2s !== undefined ? y2s : (0, __1.Yaml2Solana)(schemaFile);
    const { _decoder } = await inquirer_1.default.prompt({
        type: 'list',
        name: '_decoder',
        message: 'Choose account decoder',
        choices: yaml2solana.accountDecoders,
    });
    const v = yaml2solana.getParam(`$${_decoder}`);
    let decoder;
    if (v.type === 'account_decoder') {
        decoder = v.value;
    }
    else {
        (0, error_1.throwErrorWithTrace)(`Unexpected error`);
        return;
    }
    // 3. Choose whether to decode account from mainnet or local storage
    const { where } = await inquirer_1.default
        .prompt([
        {
            type: 'list',
            name: 'where',
            message: 'Mainnet or local?',
            choices: [
                CHOICE_MAINNET,
                CHOICE_LOCAL,
            ],
        },
    ]);
    let accountData;
    if (where === CHOICE_MAINNET) {
        accountData = await readFromMainnet(address);
    }
    else if (where === CHOICE_LOCAL) {
        const cacheFolder = path_1.default.resolve(yaml2solana.projectDir, yaml2solana.parsedYaml.localDevelopment.accountsFolder);
        accountData = decodeFromLocalStorage(cacheFolder, address);
    }
    else {
        (0, error_1.throwErrorWithTrace)('Invalid choice (unexpected error)');
        return;
    }
    // 4. Decode and print result
    decoder.data = accountData;
    console.log(`Decoder result: `, decoder.values);
}
exports.accountDecoderUi = accountDecoderUi;
/**
 * Read account from mainnet
 */
async function readFromMainnet(address) {
    const connection = new web3.Connection('https://api.mainnet-beta.solana.com');
    const accountInfo = await connection.getAccountInfo(new web3.PublicKey(address));
    const data = accountInfo === null || accountInfo === void 0 ? void 0 : accountInfo.data;
    if (data === undefined) {
        (0, error_1.throwErrorWithTrace)('Target account does not exist.');
        return Promise.reject();
    }
    return data;
}
/**
 * Read account from local storage
 */
function decodeFromLocalStorage(cacheFolder, address) {
    const account = util.fs.readAccount(cacheFolder, address);
    if (account[address] === undefined) {
        (0, error_1.throwErrorWithTrace)('Account does not exist in local storage');
    }
    return account[address].data;
}
