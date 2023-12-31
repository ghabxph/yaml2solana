import inquirer from "inquirer";
import * as bip39 from 'bip39';
import * as web3 from "@solana/web3.js";
import { derivePath } from 'ed25519-hd-key';

const CHOICE_GENERATE_PDA = 'Generate PDA';
const CHOICE_ANALYZE_TRANSACTION = 'Analyze Transaction';
const SHOW_KP_FROM_BIP39_SEEDPHRASE = 'Show keypair from given bip39 seedphrase';

export async function utilUi() {
  const { choice } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'choice',
        message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
        choices: [
          CHOICE_GENERATE_PDA,
          CHOICE_ANALYZE_TRANSACTION,
          SHOW_KP_FROM_BIP39_SEEDPHRASE,
        ],
      },
    ]
  );

  if (choice === CHOICE_GENERATE_PDA) {
    await inquirer
      .prompt([
        {
          type: 'input',
          name: 'programId',
          message: 'Program ID:'
        }
      ])
    const { choice } = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Do you wish to add more seeds?',
          choices: ['yes', 'no']
        }
      ]);
    return;
  }

  if (choice === SHOW_KP_FROM_BIP39_SEEDPHRASE) {
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
}