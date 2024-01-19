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
exports.keypairUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const bip39 = __importStar(require("bip39"));
const web3 = __importStar(require("@solana/web3.js"));
const ed25519_hd_key_1 = require("ed25519-hd-key");
const ts_clear_screen_1 = __importDefault(require("ts-clear-screen"));
const CHOICE_RANDOM_KEYPAIR = 'Generate random keypair';
const CHOICE_SHOW_KP_FROM_BIP39_SEEDPHRASE = 'Generate keypair from given bip39 seedphrase';
const CHOICE_SHOW_KP_FROM_B64 = 'Generate keypair from secret key (base64 encoded)';
async function keypairUi() {
    (0, ts_clear_screen_1.default)();
    const { choice } = await inquirer_1.default
        .prompt([
        {
            type: 'list',
            name: 'choice',
            message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
            choices: [
                CHOICE_RANDOM_KEYPAIR,
                CHOICE_SHOW_KP_FROM_BIP39_SEEDPHRASE,
                CHOICE_SHOW_KP_FROM_B64,
            ],
        },
    ]);
    if (choice === CHOICE_RANDOM_KEYPAIR) {
        return await generateRandomKeypair();
    }
    if (choice === CHOICE_SHOW_KP_FROM_BIP39_SEEDPHRASE) {
        return await generateKpFromBip39SeedPhrase();
    }
    if (choice === CHOICE_SHOW_KP_FROM_B64) {
        return await generateKpFromB64();
    }
}
exports.keypairUi = keypairUi;
/**
 * Generate random solana keypair
 */
async function generateRandomKeypair() {
    const kp = web3.Keypair.generate();
    console.log(`Public key: ${kp.publicKey}`);
    console.log(`Secret key (base64): ${Buffer.from(kp.secretKey).toString('base64')}`);
}
/**
 * Generate keypair from BIP39 Seed Phrase
 */
async function generateKpFromBip39SeedPhrase() {
    const { seedPhrase } = await inquirer_1.default
        .prompt([
        {
            type: 'input',
            name: 'seedPhrase',
            message: 'Type 24-word seephrase here:'
        }
    ]);
    const seed = bip39.mnemonicToSeedSync(seedPhrase);
    const seedBuffer = Buffer.from(seed).toString('hex');
    const path44change = `m/44'/501'/0'/0'`;
    const deriveSeed = (0, ed25519_hd_key_1.derivePath)(path44change, seedBuffer).key;
    const keypair = web3.Keypair.fromSeed(deriveSeed);
    console.log(`privkey: ${Buffer.from(keypair.secretKey).toString('base64')}`);
    console.log(`pubkey: ${keypair.publicKey}`);
}
async function generateKpFromB64() {
    const { b64 } = await inquirer_1.default.prompt({
        type: 'input',
        name: 'b64',
        message: 'Type base64 secret here',
        filter: input => {
            web3.Keypair.fromSecretKey(Buffer.from(input, 'base64'));
            return input;
        }
    });
    const kp = web3.Keypair.fromSecretKey(Buffer.from(b64, 'base64'));
    console.log(`privkey: ${Buffer.from(kp.secretKey).toString('base64')}`);
    console.log(`pubkey: ${kp.publicKey}`);
}
