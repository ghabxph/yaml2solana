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
exports.utilUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const bip39 = __importStar(require("bip39"));
const web3 = __importStar(require("@solana/web3.js"));
const ed25519_hd_key_1 = require("ed25519-hd-key");
const CHOICE_GENERATE_PDA = 'Generate PDA';
const CHOICE_ANALYZE_TRANSACTION = 'Analyze Transaction';
const SHOW_KP_FROM_BIP39_SEEDPHRASE = 'Show keypair from given bip39 seedphrase';
function utilUi() {
    return __awaiter(this, void 0, void 0, function* () {
        const { choice } = yield inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'choice',
                message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
                choices: [
                    CHOICE_GENERATE_PDA,
                    CHOICE_ANALYZE_TRANSACTION,
                    SHOW_KP_FROM_BIP39_SEEDPHRASE,
                ],
            },
        ]);
        if (choice === CHOICE_GENERATE_PDA) {
            yield inquirer_1.default
                .prompt([
                {
                    type: 'input',
                    name: 'programId',
                    message: 'Program ID:'
                }
            ]);
            const { choice } = yield inquirer_1.default
                .prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: 'Do you wish to add more seeds?',
                    choices: ['yes', 'no']
                }
            ]);
            return;
        }
        if (choice === SHOW_KP_FROM_BIP39_SEEDPHRASE) {
            const { seedPhrase } = yield inquirer_1.default
                .prompt([
                {
                    type: 'input',
                    name: 'seedPhrase',
                    message: 'Type 24-word seephrase here:'
                }
            ]);
            /// Ga5jNBh26JHh9zyJcdm7vpyVWRgtKS2cLpNgEc5zBv8G
            const seed = bip39.mnemonicToSeedSync(seedPhrase);
            const seedBuffer = Buffer.from(seed).toString('hex');
            const path44change = `m/44'/501'/0'/0'`;
            const deriveSeed = (0, ed25519_hd_key_1.derivePath)(path44change, seedBuffer).key;
            const keypair = web3.Keypair.fromSeed(deriveSeed);
            console.log(`privkey: ${Buffer.from(keypair.secretKey).toString('base64')}`);
            console.log(`pubkey: ${keypair.publicKey}`);
        }
    });
}
exports.utilUi = utilUi;
