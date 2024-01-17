import * as web3 from "@solana/web3.js";
import * as util from "../../util";
import inquirer from "inquirer";
import { Yaml2Solana } from "../..";
import { Yaml2SolanaClass } from "../../sdk/Yaml2Solana";

const CHOICE_SINGLE = 'Run single instruction';
const CHOICE_BUNDLE = 'Run bundled instructions';

export async function runInstructionUi(schemaFile: string, y2s?: Yaml2SolanaClass) {

  const yaml2solana = Yaml2Solana(schemaFile);
  if (yaml2solana.parsedYaml.instructionBundle !== undefined) {
    const { choice } = await inquirer.prompt({
      type: 'list',
      name: 'choice',
      choices: [
        CHOICE_SINGLE,
        CHOICE_BUNDLE,
      ]
    });
    
    if (choice === CHOICE_SINGLE) {
      return await runSingleInstruction(schemaFile, y2s);
    } else if (choice === CHOICE_BUNDLE) {
      return await runBundledInstructions(schemaFile, y2s);
    }
  } else {
    runSingleInstruction(schemaFile, y2s);
  }
}

async function runSingleInstruction(schemaFile: string, y2s?: Yaml2SolanaClass) {

  // 1. Create yaml2solana v2 instance
  const yaml2solana = y2s !== undefined ? y2s : Yaml2Solana(schemaFile);

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
  const ixDef = yaml2solana.getIxDefinition(instructionToExecute);
  for (const param of ixDef.data) {
    try {
      await yaml2solana.resolveInstruction(instructionToExecute);
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
  for (const param of ixDef.accounts) {
    try {
      await yaml2solana.resolveInstruction(instructionToExecute);
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
    await yaml2solana.resolveInstruction(instructionToExecute);
  } catch {} finally {
    const account = ixDef.payer;
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
    await yaml2solana.resolveInstruction(instructionToExecute);
  } catch {}

  // 6. Execute instruction
  console.log();
  await yaml2solana.executeTransactionsLocally({
    txns: [
      yaml2solana.createTransaction(
        instructionToExecute,
        [`$${instructionToExecute}`],
        [],
        ixDef.payer,
        yaml2solana.getSignersFromIx(instructionToExecute)
      )
    ],
    runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning(),
  });
}

async function runBundledInstructions(schemaFile: string, y2s?: Yaml2SolanaClass) {

  // 1. Create yaml2solana v2 instance
  const yaml2solana = y2s !== undefined ? y2s : Yaml2Solana(schemaFile);

  // 2. Get choices
  const choices = yaml2solana.getInstructionBundles();

  // 3. Choose bundle to execute
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
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
  const tx = yaml2solana.createTransaction(
    choice,
    [`$${choice}`],
    yaml2solana.parsedYaml.instructionBundle![choice].alts,
    yaml2solana.parsedYaml.instructionBundle![choice].payer,
    signers,
  );

  // 7. Execute instruction in localnet
  console.log();
  await yaml2solana.executeTransactionsLocally({
    txns: [tx],
    runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning()
  });
}