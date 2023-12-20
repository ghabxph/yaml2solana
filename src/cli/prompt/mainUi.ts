import inquirer from "inquirer";
import * as util from "../../util";
import { spawn } from 'child_process';
import * as web3 from '@solana/web3.js';
import { Yaml2SolanaClass } from "../../sdk/Yaml2Solana";

const DOWNLOAD_SOLANA_ACCOUNTS = 'Download solana accounts defined in schema';
const CHOICE_RUN_TEST_VALIDATOR = 'Run test validator';
const CHOICE_RUN_INSTRUCTION = 'Run an instruction';
const CHOICE_RUN_TEST = 'Run a test';

export async function mainUi(schemaFile: string) {
  const { choice } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Choose Action',
        choices: [
          DOWNLOAD_SOLANA_ACCOUNTS,
          CHOICE_RUN_TEST_VALIDATOR,
          CHOICE_RUN_INSTRUCTION,
          CHOICE_RUN_TEST,
        ],
      },
    ]
  );

  if (choice === DOWNLOAD_SOLANA_ACCOUNTS) {
    await downloadSolanaAccounts(schemaFile);
    return;
  }

  // Read schema
  const schema = util.fs.readSchema(schemaFile);

  if (choice === CHOICE_RUN_TEST_VALIDATOR) {
    // 1. Update cache (download solana accounts)
    const mapping = await downloadSolanaAccounts(schemaFile);
    // 2. Run test validator with accounts
    await runTestValidator(mapping, schema);

    return;
  }

  // Assuming here that test validator is already running.
  if (choice === CHOICE_RUN_INSTRUCTION) {
    // 1. Confirm first if localnet is running
    if (!await util.test.checkIfLocalnetIsRunning()) {
      console.log('Localnet seems not running. http://127.0.0.1:8899/health doesn\'t return a healthy status.');

      return;
    }

    // Confirm messae that localnet is running
    console.log('Localnet seems running. http://127.0.0.1:8899/health returns \'ok\' state');

    // 2. Select what instruction to execute
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
    
    // 3. Resolve variables
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
              return new web3.PublicKey(input);
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

    // 4. Create instruction instance based on given parameters
    const ix = schema.instructionDefinition[instructionToExecute](params);

    // 5. Choose whether to use transaction legacy or v0
    const { txVersion } = await inquirer.prompt([{
      type: 'list',
      name: 'txVersion',
      message: 'What transaction format version to use?',
      choices: [
        'Legacy',
        'v0',
      ]
    }]);
    if (txVersion === 'v0') {
      console.log('v0 not yet supported. Will be supported soon.');
      return;
    }

    // 5. Create transaction and execute instruction
    const connection = new web3.Connection("http://127.0.0.1:8899");
    const { blockhash: recentBlockhash } = await connection.getLatestBlockhash();
    const tx = new web3.Transaction().add(ix);
    tx.recentBlockhash = recentBlockhash;
    const signers = schema.instructionDefinition.getSigners(instructionToExecute);
    tx.sign(...signers);
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      tx,
      signers
    );

    console.log(`tx signature: ${signature}`);
    return;
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
}

/**
 * Download solana accounts and update cache
 */
async function downloadSolanaAccounts(schemaFile: string): Promise<Record<string, string | null>> {
  // 1. Read schema
  const schema = util.fs.readSchema(schemaFile);

  // 2. Get accounts from schema
  const accounts = schema.accounts.getAccounts();

  // 3. Skip accounts that are already downloaded
  const accounts1 = util.fs.skipDownloadedAccounts(schema, accounts);

  // 3. Fetch multiple accounts from mainnet at batches of 100
  const accountInfos = await util.solana.getMultipleAccountsInfo(accounts1);

  // 4. Write downloaded account infos from mainnet in designated cache folder
  util.fs.writeAccountsToCacheFolder(schema, accountInfos);

  // 5. Map accounts to downloaded to .accounts
  return util.fs.mapAccountsFromCache(schema);
}

/**
 * Run solana test validator
 */
async function runTestValidator(mapping: Record<string, string | null>, schema: Yaml2SolanaClass) {
  // 1. Read solana-test-validator.template.sh to project base folder
  let template = util.fs.readTestValidatorTemplate();

  // 2. Update accounts and replace ==ACCOUNTS==
  const accounts = [];
  for (const account in mapping) {
    accounts.push(
      mapping[account] ?

        // If has mapping, then use cached account
        `\t--account ${account} ${mapping[account]} \\` :

        // Otherwise, clone account from target cluster
        `\t--maybe-clone ${account} \\`
    )
  }
  if (accounts.length === 0) {
    template = template.replace('==ACCOUNTS==\n', '')
  } else {
    template = template.replace('==ACCOUNTS==', accounts.join('\n')) + '\n';
  }

  // 3. Update programs and replace ==PROGRAMS==
  const programAccounts = [];
  for (let account of schema.accounts.getProgramAccounts()) {
    programAccounts.push(`\t--bpf-program ${account.key} ${account.path} \\`);
  }
  if (programAccounts.length === 0) {
    template = template.replace('==PROGRAMS==\n', '')
  } else {
    template = template.replace('==PROGRAMS==', programAccounts.join('\n')) + '\n';
  }

  // 3. Update json accounts and replace ==JSON_ACCOUNTS==
  const jsonAccounts = [];
  for (let account of schema.accounts.getJsonAccounts()) {
    jsonAccounts.push(`\t--account ${account.key} ${account.path} \\`);
  }
  if (jsonAccounts.length === 0) {
    template = template.replace('==JSON_ACCOUNTS==\n', '')
  } else {
    template = template.replace('==JSON_ACCOUNTS==', programAccounts.join('\n')) + '\n';
  }

  // 4. Update ==WARP_SLOT==
  template = template.replace('==WARP_SLOT==', `${await util.solana.getSlot()}`);

  // 5. Update ==CLUSTER==
  template = template.replace('==CLUSTER==', 'https://api.mainnet-beta.solana.com');

  // 6. Create solana-test-validator.ingnore.sh file
  util.fs.createScript('solana-test-validator.ignore.sh', template);

  // 7. Remove test-ledger folder first
  util.fs.deleteFolderRecursive('test-ledger');

  // 8. Run solana-test-validator.ignore.sh
  const test_validator = spawn('./solana-test-validator.ignore.sh', [], { shell: true });
  test_validator.stderr.on('data', data => console.log(`${data}`));
  let state = 'init';
  test_validator.stdout.on('data', data => {
      if (state === 'init') {
          console.log(`${data}`);
      }
      if (data.includes('Genesis Hash') && state === 'init') {
          state = 'done';
          console.log(`Solana test validator is now running!`);
      }
  });
}
