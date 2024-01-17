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
exports.walletOptionsUi = exports.hasWallet = exports.setupUserWalletUi = exports.USER_WALLET = void 0;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const web3 = __importStar(require("@solana/web3.js"));
const bip39 = __importStar(require("bip39"));
const crypto_ts_1 = require("crypto-ts");
const ed25519_hd_key_1 = require("ed25519-hd-key");
const CHOICE_GENERATE_RANDOM = 'Generate a random wallet';
const CHOICE_GENERATE_FROM_BIP39 = 'Generate from bip39 passphrase';
const keyPath = path_1.default.resolve(os_1.default.homedir(), '.wallet-yaml2solana.dat');
function setupUserWalletUi() {
    return __awaiter(this, void 0, void 0, function* () {
        const { password } = yield inquirer_1.default.prompt({
            type: 'password',
            name: 'password',
            message: 'Enter password to secure your wallet:'
        });
        const { confirmPassword } = yield inquirer_1.default.prompt({
            type: 'password',
            name: 'confirmPassword',
            message: 'Confirm:'
        });
        if (password !== confirmPassword) {
            console.log('Password does not match!');
            return;
        }
        const { choice } = yield inquirer_1.default.prompt({
            type: 'list',
            name: 'choice',
            message: 'Choose action',
            choices: [
                CHOICE_GENERATE_RANDOM,
                CHOICE_GENERATE_FROM_BIP39,
            ]
        });
        if (choice === CHOICE_GENERATE_RANDOM) {
            yield generateRandomWallet(keyPath, password);
        }
        else if (choice === CHOICE_GENERATE_FROM_BIP39) {
            yield generateFromBip39Wallet(keyPath, password);
        }
    });
}
exports.setupUserWalletUi = setupUserWalletUi;
function generateRandomWallet(keyPath, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const kp = web3.Keypair.generate();
        const secret = Buffer.from(kp.secretKey).toString('base64');
        const encrypted = crypto_ts_1.AES.encrypt(secret, password).toString();
        fs_1.default.writeFileSync(keyPath, encrypted);
        console.log('Your public key: ', kp.publicKey.toBase58());
        console.log(`Created ${keyPath}\nRun yaml2solana program again!\n\n`);
    });
}
function generateFromBip39Wallet(keyPath, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const { seedPhrase } = yield inquirer_1.default
            .prompt([
            {
                type: 'input',
                name: 'seedPhrase',
                message: 'Type 24-word seephrase here:'
            }
        ]);
        const seed = bip39.mnemonicToSeedSync(seedPhrase);
        const seedBuffer = Buffer.from(seed).toString('hex');
        const derivationPath = `m/44'/501'/0'/0'`; // TODO: Be able to choose derivation path
        const deriveSeed = (0, ed25519_hd_key_1.derivePath)(derivationPath, seedBuffer).key;
        const kp = web3.Keypair.fromSeed(deriveSeed);
        const secret = Buffer.from(kp.secretKey).toString('base64');
        const e = crypto_ts_1.AES.encrypt(secret, password);
        const encrypted = e.toString();
        fs_1.default.writeFileSync(keyPath, encrypted);
        console.log(`Derivation path: ${derivationPath}`);
        console.log(`Your public key: ${kp.publicKey}`);
        console.log(`Created ${keyPath}\nRun yaml2solana program again!\n\n`);
    });
}
function hasWallet() {
    try {
        fs_1.default.readFileSync(keyPath);
        return true;
    }
    catch (_a) {
        return false;
    }
}
exports.hasWallet = hasWallet;
const CHOICE_REMOVE_WALLET = 'Remove user wallet';
const CHOICE_UNLOCK_WALLET = 'Unlock wallet so that you can use it';
function walletOptionsUi() {
    return __awaiter(this, void 0, void 0, function* () {
        const { choice } = yield inquirer_1.default.prompt({
            type: 'list',
            name: 'choice',
            message: 'Wallet options:',
            choices: [
                CHOICE_UNLOCK_WALLET,
                CHOICE_REMOVE_WALLET,
            ]
        });
        if (choice === CHOICE_REMOVE_WALLET) {
            fs_1.default.unlinkSync(keyPath);
            console.log(`Key ${keyPath} has been removed successfully.`);
        }
        else if (choice === CHOICE_UNLOCK_WALLET) {
            const { password } = yield inquirer_1.default.prompt({
                type: 'password',
                name: 'password',
                message: 'Enter password to unlock wallet:'
            });
            const encrypted = fs_1.default.readFileSync(keyPath).toString('utf-8');
            const wallet = crypto_ts_1.AES.decrypt(encrypted, password).toString(crypto_ts_1.enc.Utf8);
            try {
                const kp = web3.Keypair.fromSecretKey(Buffer.from(wallet, 'base64'));
                console.log(`Your public key: ${kp.publicKey}`);
                console.log(`Wallet has been unlocked successfully!`);
                exports.USER_WALLET = kp;
            }
            catch (_a) {
                console.log('Invalid password!');
                process.exit(-1);
            }
        }
    });
}
exports.walletOptionsUi = walletOptionsUi;
