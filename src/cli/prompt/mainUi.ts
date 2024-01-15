import inquirer from "inquirer";
import * as util from "../../util";
import * as web3 from '@solana/web3.js';
import { utilUi } from "./utilUi";
import { Yaml2Solana } from "../..";
import { runInstructionUi } from "./runInstructionUi";

const DOWNLOAD_SOLANA_ACCOUNTS = 'Download solana accounts defined in schema';
const CHOICE_RUN_TEST_VALIDATOR = 'Run test validator';
const CHOICE_RUN_INSTRUCTION = 'Run an instruction';
const CHOICE_RUN_TEST = 'Run a test';
const CHOICE_UTILS = 'Utility / Debugging Tools';

export async function mainUi(schemaFile: string) {
  const { choice } = await inquirer
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
    ]
  );

  if (choice === DOWNLOAD_SOLANA_ACCOUNTS) {
    await downloadSolanaAccounts(schemaFile);
    return;
  }

  if (choice === CHOICE_RUN_TEST_VALIDATOR) {
    await runTestValidator(schemaFile);
    return;
  }

  // Assuming here that test validator is already running.
  if (choice === CHOICE_RUN_INSTRUCTION) {
    return await runInstructionUi(schemaFile);
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
    await utilUi();
    return;
  }
}

/**
 * Download solana accounts and update cache
 */
async function downloadSolanaAccounts(schemaFile: string): Promise<Record<string, string | null>> {

  // Create yaml2solana v2 instance
  const yaml2solana = Yaml2Solana(schemaFile);

  // Download accounts from mainnet
  return await yaml2solana.downloadAccountsFromMainnet([]);
}

/**
 * Run solana test validator
 */
async function runTestValidator(schemaFile: string) {

  // Create yaml2solana v2 instance
  const yaml2solana = Yaml2Solana(schemaFile);

  // Run test validator using v2
  return await yaml2solana.runTestValidator();
}
