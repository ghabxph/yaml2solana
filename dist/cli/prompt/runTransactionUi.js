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
exports.runTxGeneratorUi = void 0;
const util = __importStar(require("../../util"));
const inquirer_1 = __importDefault(require("inquirer"));
const __1 = require("../..");
async function runTxGeneratorUi(schemaFile, y2s) {
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
    // 6. Choose whether to execute transaction in localnet or mainnet
    const cluster = await getCluster(yaml2solana);
    // 7. Execute instruction in localnet
    console.log();
    await yaml2solana.executeTransactionsLocally({
        txns: [tx],
        runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning(),
        cluster,
    });
}
exports.runTxGeneratorUi = runTxGeneratorUi;
async function getCluster(y2s) {
    if (y2s.parsedYaml.mainnetRpc) {
        const { cluster } = await inquirer_1.default.prompt({
            type: 'list',
            name: 'cluster',
            message: 'Execute transaction in?',
            choices: [
                'http://127.0.0.1:8899',
                ...y2s.parsedYaml.mainnetRpc,
            ],
        });
        return cluster;
    }
    return 'http://127.0.0.1:8899';
}
