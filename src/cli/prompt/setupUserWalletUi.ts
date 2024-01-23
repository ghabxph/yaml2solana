import fs from "fs";
import os from "os";
import path from "path";
import inquirer from "inquirer";
import * as web3 from '@solana/web3.js';
import * as bip39 from 'bip39';
import { AES, enc } from "crypto-ts";
import { derivePath } from 'ed25519-hd-key';
import { Yaml2Solana } from "../..";
import { Yaml2SolanaClass } from "../../sdk/Yaml2Solana";

const CHOICE_GENERATE_RANDOM = 'Generate a random wallet';
const CHOICE_GENERATE_FROM_BIP39 = 'Generate from bip39 passphrase';
const keyPath = path.resolve(os.homedir(), '.wallet-yaml2solana.dat');
export let USER_WALLET: undefined | web3.Keypair;

export async function setupUserWalletUi() {
  const { password } = await inquirer.prompt({
    type: 'password',
    name: 'password',
    message: 'Enter password to secure your wallet:'
  });
  const { confirmPassword } = await inquirer.prompt({
    type: 'password',
    name: 'confirmPassword',
    message: 'Confirm:'
  });
  if (password !== confirmPassword) {
    console.log('Password does not match!');
    return;
  }
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: 'Choose action',
    choices: [
      CHOICE_GENERATE_RANDOM,
      CHOICE_GENERATE_FROM_BIP39,
    ]
  });

  if (choice === CHOICE_GENERATE_RANDOM) {
    await generateRandomWallet(keyPath, password)
  } else if (choice === CHOICE_GENERATE_FROM_BIP39) {
    await generateFromBip39Wallet(keyPath, password);
  }
}

async function generateRandomWallet(keyPath: string, password: string) {
  const kp = web3.Keypair.generate();
  const secret = Buffer.from(kp.secretKey).toString('base64');
  const encrypted = AES.encrypt(secret, password).toString();
  fs.writeFileSync(keyPath, encrypted);
  console.log('Your public key: ', kp.publicKey.toBase58());
  console.log(`Created ${keyPath}\nRun yaml2solana program again!\n\n`);
}

async function generateFromBip39Wallet(keyPath: string, password: string) {
  const { seedPhrase } = await inquirer
    .prompt([
      {
        type: 'input',
        name: 'seedPhrase',
        message: 'Type 24-word seephrase here:'
      }
    ]);

  const seed = bip39.mnemonicToSeedSync(seedPhrase);
  const seedBuffer = Buffer.from(seed).toString('hex');
  const derivationPath = `m/44'/501'/0'/0'`; // TODO: Be able to choose derivation path
  const deriveSeed = derivePath(derivationPath, seedBuffer).key;
  const kp = web3.Keypair.fromSeed(deriveSeed);
  const secret = Buffer.from(kp.secretKey).toString('base64');
  const e = AES.encrypt(secret, password);
  const encrypted = e.toString();
  fs.writeFileSync(keyPath, encrypted);

  console.log(`Derivation path: ${derivationPath}`);
  console.log(`Your public key: ${kp.publicKey}`);
  console.log(`Created ${keyPath}\nRun yaml2solana program again!\n\n`);
}

export function hasWallet(): boolean {
  try {
    fs.readFileSync(keyPath);
    return true;
  } catch {
    return false;
  }
}

const CHOICE_REMOVE_WALLET = 'Remove user wallet';
const CHOICE_UNLOCK_WALLET = 'Unlock wallet so that you can use it';

export async function walletOptionsUi(schemaFile: string, y2s?: Yaml2SolanaClass) {
  const yaml2solana = y2s !== undefined ? y2s : Yaml2Solana(schemaFile);
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: 'Wallet options:',
    choices: [
      CHOICE_UNLOCK_WALLET,
      CHOICE_REMOVE_WALLET,
    ]
  });

  if (choice === CHOICE_REMOVE_WALLET) {
    fs.unlinkSync(keyPath);
    console.log(`Key ${keyPath} has been removed successfully.`);
  } else if (choice === CHOICE_UNLOCK_WALLET) {
    const { password } = await inquirer.prompt({
      type: 'password',
      name: 'password',
      message: 'Enter password to unlock wallet:'
    });
    const encrypted = fs.readFileSync(keyPath).toString('utf-8');
    const wallet = AES.decrypt(encrypted, password).toString(enc.Utf8);
    try {
      const kp = web3.Keypair.fromSecretKey(Buffer.from(wallet, 'base64'));
      console.log(`Your public key: ${kp.publicKey}`);
      console.log(`Wallet has been unlocked successfully!`);
      USER_WALLET = kp;
    } catch {
      console.log('Invalid password!');
      process.exit(-1);
    } finally {
      yaml2solana.reloadTestWallets();
    }
  }
}
