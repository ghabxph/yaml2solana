import inquirer from "inquirer";
import * as bip39 from 'bip39';
import * as web3 from "@solana/web3.js";
import { derivePath } from 'ed25519-hd-key';
import clear from "ts-clear-screen";

const CHOICE_RANDOM_KEYPAIR = 'Generate random keypair';
const CHOICE_SHOW_KP_FROM_BIP39_SEEDPHRASE = 'Generate keypair from given bip39 seedphrase';

export async function keypairUi() {
  clear();
  const { choice } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'choice',
        message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
        choices: [
          CHOICE_RANDOM_KEYPAIR,
          CHOICE_SHOW_KP_FROM_BIP39_SEEDPHRASE,
        ],
      },
    ]);

  if (choice === CHOICE_RANDOM_KEYPAIR) {
    return await generateRandomKeypair();
  }

  if (choice === CHOICE_SHOW_KP_FROM_BIP39_SEEDPHRASE) {
    return await generateKpFromBip39SeedPhrase();
  }
}

/**
 * Generate random solana keypair
 */
async function generateRandomKeypair() {
  const kp = web3.Keypair.generate();
  console.log(`Public key: ${kp.publicKey}`);
  console.log(`Secret key (base64): ${Buffer.from(kp.secretKey).toString('base64')}`);
}

/**
 * Generate keypair from BIP39 Seed Phrase
 */
async function generateKpFromBip39SeedPhrase() {
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
  const path44change = `m/44'/501'/0'/0'`;
  const deriveSeed = derivePath(path44change, seedBuffer).key;
  const keypair = web3.Keypair.fromSeed(deriveSeed);

  console.log(`privkey: ${Buffer.from(keypair.secretKey).toString('base64')}`);
  console.log(`pubkey: ${keypair.publicKey}`);
}