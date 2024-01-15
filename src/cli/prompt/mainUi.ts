import inquirer from "inquirer";
import * as util from "../../util";
import * as web3 from '@solana/web3.js';
import { utilUi } from "./utilUi";
import { Yaml2Solana } from "../..";

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

async function runInstruction(schemaFile: string) {

  // 1. Create yaml2solana v2 instance
  const yaml2solana = Yaml2Solana(schemaFile);

  // 2. Select what instruction to execute
  const choices = yaml2solana.getInstructions();
  const { instructionToExecute }: { instructionToExecute: string} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'instructionToExecute',
        message: 'Choose instruction to execute:',
        choices,
      },
    ]
  );

  // 3. Resolve variables (from data)
  for (const param of yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].data) {
    try {
      yaml2solana.resolveInstruction(instructionToExecute);
    } catch {} finally {
      const varInfo = yaml2solana.extractVarInfo(param);
      if (varInfo.isVariable) {
        if (varInfo.type === 'bool') {
          await inquirer.prompt({
            type: 'list',
            name: varInfo.name,
            message: `Value for ${varInfo.name}`,
            choices: ['true', 'false'],
            filter: (input: string) => {
              return input === 'true';
            }
          });
        } else {
          await inquirer.prompt({
            type: 'input',
            name: varInfo.name,
            message: `Value for ${varInfo.name}`,
            default: varInfo.defaultValue,
            filter: (input: string) => {
              if (varInfo.type === 'pubkey') {
                if (typeof input === 'string') {
                  return new web3.PublicKey(input);
                } else {
                  return input;
                }
              }
              const numberTypes = ['u8', 'u16', 'u32', 'u64', 'usize', 'i8', 'i16', 'i32', 'i64'];
              if (numberTypes.includes(varInfo.type)) {
                if (Math.round(Number(input)) === Number(input)) {
                  return Number(input)
                } else {
                  throw `${varInfo.name} is not a valid integer value.`
                }
              }
              return input;
            }
          })
        }
      }
    }
  }

  // 4. Resolve params (from meta)
  for (const param of yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].accounts) {
    try {
      yaml2solana.resolveInstruction(instructionToExecute);
    } catch {} finally {
      const [account] = param.split(',');
      let defaultValue = yaml2solana.getParam<web3.PublicKey | web3.Keypair>(account);
      if (defaultValue !== undefined && (defaultValue as web3.Keypair).publicKey !== undefined) {
        defaultValue = (defaultValue as web3.Keypair).publicKey;
      }
      const { value } = await inquirer.prompt({
        type: 'input',
        name: 'value',
        message: `Value for ${account}`,
        default: defaultValue,
        filter: (input: string) => {
          if (typeof input === 'string') {
            return new web3.PublicKey(input);
          } else {
            return input;
          }
        }
      });
      yaml2solana.setParam<web3.PublicKey>(account, value);
    }
  }

  // 5. Resolve transaction payer
  try {
    yaml2solana.resolveInstruction(instructionToExecute);
  } catch {} finally {
    const account = yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].payer;
    const kp = yaml2solana.getParam<web3.Keypair>(account);
    let defaultValue: string | undefined;
    if (kp === undefined) {
      const { value } = await inquirer.prompt({
        type: 'input',
        name: 'value',
        message: `Value for transaction payer ${account} (base64 encoded):`,
        default: defaultValue,
        filter: (input: string) => {
          web3.Keypair.fromSecretKey(
            Buffer.from(input, 'base64')
          );
          return input;
        }
      });
      yaml2solana.setParam<web3.Keypair>(
        account,
        web3.Keypair.fromSecretKey(
          Buffer.from(value, 'base64')
        )
      );
    }
  }

  // 5. Resolve instruction
  try {
    yaml2solana.resolveInstruction(instructionToExecute);
  } catch {}

  // 6. Execute instruction
  console.log();
  await yaml2solana.executeTransactionsLocally({
    txns: [
      yaml2solana.createLocalnetTransaction(
        instructionToExecute,
        [`$${instructionToExecute}`],
        [],
        yaml2solana.parsedYaml.instructionDefinition[instructionToExecute].payer,
        yaml2solana.getSignersFromIx(instructionToExecute)
      )
    ],
    runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning(),
  });
}