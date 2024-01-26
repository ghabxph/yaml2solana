import inquirer from "inquirer";
import * as util from "../../util";
import { utilUi } from "./utilUi";
import { Yaml2Solana } from "../..";
import { runInstructionUi } from "./runInstructionUi";
import { Yaml2SolanaClass } from "../../sdk/Yaml2Solana";
import { USER_WALLET, hasWallet, setupUserWalletUi, walletOptionsUi } from "./setupUserWalletUi";
import clear from "ts-clear-screen";
import { runTxGeneratorUi } from "./runTransactionUi";

const CHOICE_SETUP_USER_WALLET = 'Setup a password-protected wallet in yaml2solana';
const CHOICE_WALLET_OPTIONS = 'Wallet options';
const DOWNLOAD_SOLANA_ACCOUNTS = 'Download solana accounts defined in schema';
const CHOICE_RUN_TEST_VALIDATOR = 'Run test validator';
const CHOICE_RUN_INSTRUCTION = 'Run an instruction';
const CHOICE_RUN_TXGEN = 'Run Tx Generator';
const CHOICE_RUN_TEST = 'Run a test';
const CHOICE_UTILS = 'Utility / Debugging Tools';

export async function mainUi(schemaFile: string, y2s?: Yaml2SolanaClass) {
  let programLoop = [true];
  while (programLoop[0]) {
    clear();
    let walletState: string = '';
    if (hasWallet()) {
      if (USER_WALLET === undefined) {
        walletState = 'User wallet state: Locked\n\n';
      } else {
        walletState = 
          'User wallet state: Unlocked\n' +
          `Wallet address: ${USER_WALLET.publicKey}\n\n`;
      }
    }
    const { choice } = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'choice',
          message: `${walletState}-=Yaml2Solana Main UI=-\n\n [Choose Action] \n\n`,
          choices: [
            hasWallet() ? CHOICE_WALLET_OPTIONS : CHOICE_SETUP_USER_WALLET,
            DOWNLOAD_SOLANA_ACCOUNTS,
            CHOICE_RUN_TEST_VALIDATOR,
            CHOICE_RUN_INSTRUCTION,
            CHOICE_RUN_TXGEN,
            CHOICE_RUN_TEST,
            CHOICE_UTILS,
          ],
        },
      ]
    );
  
    if (choice === CHOICE_SETUP_USER_WALLET) {
      await setupUserWalletUi();
    }
  
    if (choice === CHOICE_WALLET_OPTIONS) {
      await walletOptionsUi(schemaFile, y2s);
    }
  
    if (choice === DOWNLOAD_SOLANA_ACCOUNTS) {
      return await downloadSolanaAccounts(schemaFile, y2s);
    }
  
    if (choice === CHOICE_RUN_TEST_VALIDATOR) {
      return await runTestValidator(schemaFile, y2s);
    }
  
    // Assuming here that test validator is already running.
    if (choice === CHOICE_RUN_INSTRUCTION) {
      return await runInstructionUi(schemaFile, y2s);
    }

    // Assuming here that test validator is already running.
    if (choice === CHOICE_RUN_TXGEN) {
      return await runTxGeneratorUi(schemaFile, y2s);
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
      await utilUi(schemaFile, y2s);
      return;
    }
  }
}

/**
 * Download solana accounts and update cache
 */
async function downloadSolanaAccounts(schemaFile: string, y2s?: Yaml2SolanaClass): Promise<Record<string, string | null>> {

  // Create yaml2solana v2 instance
  const yaml2solana = y2s !== undefined ? y2s : Yaml2Solana(schemaFile);

  // Download accounts from mainnet
  return await yaml2solana.downloadAccountsFromMainnet([]);
}

/**
 * Run solana test validator
 */
async function runTestValidator(schemaFile: string, y2s?: Yaml2SolanaClass) {

  // Create yaml2solana v2 instance
  const yaml2solana = y2s !== undefined ? y2s : Yaml2Solana(schemaFile);

  // Run test validator using v2
  return await yaml2solana.runTestValidator();
}
