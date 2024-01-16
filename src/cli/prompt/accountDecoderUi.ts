import inquirer from "inquirer";
import * as web3 from "@solana/web3.js";
import clear from "ts-clear-screen";
import { keypairUi } from "./keypairUi";
import * as util from "../../util";
import { Yaml2Solana } from "../..";
import { AccountDecoder } from "../../sdk/AccountDecoder";
import path from "path";

const CHOICE_MAINNET = 'Decode account from mainnet';
const CHOICE_LOCAL = 'Decode account from local machine';

export async function accountDecoderUi(schemaFile: string) {
  clear();
  // 1. Enter address to decode
  const { address } = await inquirer.prompt({
    type: 'input',
    name: 'address',
    message: '-=[Account Decoder]=-\n\n Enter solana address (account to decode)',
    filter: input => {
      new web3.PublicKey(input);
      return input;
    }
  });

  // 2. Choose decoder:
  const yaml2solana = Yaml2Solana(schemaFile);
  const { _decoder } = await inquirer.prompt({
    type: 'list',
    name: '_decoder',
    message: 'Choose account decoder',
    choices: yaml2solana.accountDecoders,
  });
  const decoder = yaml2solana.getParam<AccountDecoder>(`$${_decoder}`);

  // 3. Choose whether to decode account from mainnet or local storage
  const { where } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'where',
        message: 'Mainnet or local?',
        choices: [
          CHOICE_MAINNET,
          CHOICE_LOCAL,
        ],
      },
    ]
  );
  let accountData: Buffer;
  if (where === CHOICE_MAINNET) {
    accountData = await readFromMainnet(address);
  } else if (where === CHOICE_LOCAL) {
    const cacheFolder = path.resolve(yaml2solana.projectDir, yaml2solana.parsedYaml.localDevelopment.accountsFolder);
    accountData = decodeFromLocalStorage(cacheFolder, address);
  } else {
    throw 'Invalid choice (unexpected error)';
  }

  // 4. Decode and print result
  decoder.data = accountData;
  console.log(`Decoder result: `, decoder.values);
}

/**
 * Read account from mainnet
 */
async function readFromMainnet(address: string): Promise<Buffer> {
  const connection = new web3.Connection('https://api.mainnet-beta.solana.com');
  const accountInfo = await connection.getAccountInfo(new web3.PublicKey(address));
  const data = accountInfo?.data;
  if (data === undefined) {
    throw 'Target account does not exist.';
  }
  return data;
}

/**
 * Read account from local storage
 */
function decodeFromLocalStorage(cacheFolder: string, address: string): Buffer {
  const account = util.fs.readAccount(cacheFolder, address);
  if (account[address] === undefined) {
    throw 'Account does not exist in local storage';
  }
  return account[address]!.data;
}
