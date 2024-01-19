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
exports.utilUi = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const web3 = __importStar(require("@solana/web3.js"));
const ts_clear_screen_1 = __importDefault(require("ts-clear-screen"));
const keypairUi_1 = require("./keypairUi");
const util = __importStar(require("../../util"));
const accountDecoderUi_1 = require("./accountDecoderUi");
const CHOICE_GENERATE_PDA = 'Generate PDA';
const CHOICE_ANALYZE_TRANSACTION = 'Analyze Transaction';
const CHOICE_KEYPAIR_GENERATION = 'Generate Keypair';
const CHOICE_SIGHASH = 'Generate sighash';
const CHOICE_ACCOUNT_DECODER = 'Account Decoder';
async function utilUi(schemaFile, y2s) {
    (0, ts_clear_screen_1.default)();
    const { choice } = await inquirer_1.default
        .prompt([
        {
            type: 'list',
            name: 'choice',
            message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
            choices: [
                CHOICE_GENERATE_PDA,
                CHOICE_ANALYZE_TRANSACTION,
                CHOICE_KEYPAIR_GENERATION,
                CHOICE_SIGHASH,
                CHOICE_ACCOUNT_DECODER,
            ],
        },
    ]);
    if (choice === CHOICE_GENERATE_PDA) {
        return await generatePda();
    }
    if (choice === CHOICE_ANALYZE_TRANSACTION) {
        // do something
    }
    if (choice === CHOICE_KEYPAIR_GENERATION) {
        return await (0, keypairUi_1.keypairUi)();
    }
    if (choice === CHOICE_SIGHASH) {
        return await generateSighash();
    }
    if (choice === CHOICE_ACCOUNT_DECODER) {
        return await (0, accountDecoderUi_1.accountDecoderUi)(schemaFile, y2s);
    }
}
exports.utilUi = utilUi;
/**
 * Generate PDA CLI
 */
async function generatePda() {
    const { programId, numSeeds } = await inquirer_1.default
        .prompt([
        {
            type: 'input',
            name: 'programId',
            message: 'Program ID:',
            filter: programId => new web3.PublicKey(programId)
        },
        {
            type: 'input',
            name: 'numSeeds',
            message: 'Enter number of seeds:',
            filter: numSeeds => parseInt(numSeeds)
        }
    ]);
    const CHOICE_STRING = 'String (utf-8, max 32 bytes)';
    const CHOICE_PUBLIC_KEY = 'Solana Public Key (32-byte base58 string)';
    const CHOICE_RAW_BYTES = 'Raw bytes (base64 encoded, max 32 bytes)';
    const CHOICE_MAP = {};
    CHOICE_MAP[CHOICE_STRING] = 'String (utf-8)';
    CHOICE_MAP[CHOICE_PUBLIC_KEY] = 'Solana Public Key';
    CHOICE_MAP[CHOICE_RAW_BYTES] = 'Raw Bytes, base64 encoded';
    const seeds = [];
    for (let i = 0; i < numSeeds; i++) {
        const { seedType } = await inquirer_1.default
            .prompt([
            {
                type: 'list',
                name: 'seedType',
                message: 'Type of seed',
                choices: [
                    CHOICE_STRING,
                    CHOICE_PUBLIC_KEY,
                    CHOICE_RAW_BYTES,
                ],
            }
        ]);
        const { seedValue } = await inquirer_1.default
            .prompt([
            {
                type: 'input',
                name: 'seedValue',
                message: `Enter seed value (${CHOICE_MAP[seedType]})`,
                filter: seedValue => {
                    if (seedType === CHOICE_STRING) {
                        const seed = Buffer.from(seedValue, 'utf-8');
                        if (seed.length > 32) {
                            throw 'String seed cannot be greater than 32 bytes';
                        }
                        return seedValue;
                    }
                    else if (seedType === CHOICE_PUBLIC_KEY) {
                        new web3.PublicKey(seedValue);
                        return seedValue;
                    }
                    else {
                        const seed = Buffer.from(seedValue, 'base64');
                        if (seed.length > 32) {
                            throw 'String seed cannot be greater than 32 bytes';
                        }
                        return seedValue;
                    }
                }
            }
        ]);
        if (seedType === CHOICE_STRING) {
            seeds.push(Buffer.from(seedValue, 'utf-8'));
        }
        else if (seedType === CHOICE_PUBLIC_KEY) {
            seeds.push(new web3.PublicKey(seedValue).toBuffer());
        }
        else {
            seeds.push(Buffer.from(seedValue, 'base64'));
        }
    }
    const [pda, bump] = web3.PublicKey.findProgramAddressSync(seeds, programId);
    console.log(`PDA: ${pda}`);
    console.log(`Bump: ${bump}`);
}
/**
 * Generate sighash
 */
async function generateSighash() {
    const { value } = await inquirer_1.default
        .prompt({
        type: 'input',
        name: 'value',
        message: 'Enter value:'
    });
    const hexValue = util.typeResolver.sighash(value).toString('hex');
    console.log(`Hex value: ${hexValue}`);
}
