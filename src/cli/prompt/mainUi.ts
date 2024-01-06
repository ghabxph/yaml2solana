import inquirer from "inquirer";
import * as util from "../../util";
import * as web3 from '@solana/web3.js';
import { utilUi } from "./utilUi";
import { Yaml2Solana2 } from "../..";
import { Transaction } from "../../sdk/Yaml2Solana2";

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
    return await runInstruction(schemaFile);
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
  const yaml2solana = Yaml2Solana2(schemaFile);

  // Download accounts from mainnet
  return await yaml2solana.downloadAccountsFromMainnet([]);
}

/**
 * Run solana test validator
 */
async function runTestValidator(schemaFile: string) {

  // Create yaml2solana v2 instance
  const yaml2solana = Yaml2Solana2(schemaFile);

  // Run test validator using v2
  return await yaml2solana.runTestValidator();
}

async function runInstruction(schemaFile: string) {

  // Create yaml2solana v2 instance
  const yaml2solana = Yaml2Solana2(schemaFile);

  // Read schema
  const schema = util.fs.readSchema(schemaFile);

  // Whether to run from existing running localnet instance
  let runFromExistingLocalnet = await util.test.checkIfLocalnetIsRunning();

  // 1. Select what instruction to execute
  const choices = schema.instructionDefinition.getInstructions();
  const { instructionToExecute } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'instructionToExecute',
        message: 'Choose instruction to execute:',
        choices,
      },
    ]
  );

  // 2. Resolve variables
  const variables = schema.instructionDefinition.getParametersOf(instructionToExecute);
  const prompt = [];
  for (const key in variables) {
    if (variables[key].type === 'bool') {
      prompt.push({
        type: 'list',
        name: key,
        message: `Value for ${key}`,
        choices: ['true', 'false'],
        filter: (input: string) => {
          return input === 'true';
        }
      })
    } else {
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
        filter: (input: string) => {
          if (variables[key].type === 'pubkey') {
            if (typeof input === 'string') {
              return new web3.PublicKey(input);
            } else {
              return input;
            }
          }
          const numberTypes = ['u8', 'u16', 'u32', 'u64', 'usize', 'i8', 'i16', 'i32', 'i64'];
          if (numberTypes.includes(variables[key].type)) {
            if (Math.round(Number(input)) === Number(input)) {
              return Number(input)
            } else {
              throw `${key} is not a valid integer value.`
            }
          }
          return input;
        }
      });
    }
  }
  const params = await inquirer.prompt(prompt);

  // 3. Create instruction instance based on given parameters
  const ix: web3.TransactionInstruction = schema.instructionDefinition[instructionToExecute](params);

  const signers = schema.instructionDefinition.getSigners(instructionToExecute);
  await yaml2solana.executeTransactionsLocally({
    txns: [
      new Transaction(
        instructionToExecute,
        yaml2solana.localnetConnection,
        [ix],
        [], // Alt accounts
        payer, // TODO: Define payer in yaml
        signers,
      )
    ],
    runFromExistingLocalnet,
  });
}