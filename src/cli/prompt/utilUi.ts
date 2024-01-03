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
    return await generatePda();
  }

  if (choice === SHOW_KP_FROM_BIP39_SEEDPHRASE) {
    return await generateKpFromBip39SeedPhrase();
  }
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


/**
 * Generate PDA CLI
 */
async function generatePda() {
  const { programId, numSeeds } = await inquirer
    .prompt([
      {
        type: 'input',
        name: 'programId',
        message: 'Program ID:',
        filter: programId => new web3.PublicKey(programId)
      },
      {
        type: 'input',
        name: 'numSeeds',
        message: 'Enter number of seeds:',
        filter: numSeeds => parseInt(numSeeds)
      }
    ]);
  
  const CHOICE_STRING = 'String (utf-8, max 32 bytes)';
  const CHOICE_PUBLIC_KEY = 'Solana Public Key (32-byte base58 string)';
  const CHOICE_RAW_BYTES = 'Raw bytes (base64 encoded, max 32 bytes)';
  const CHOICE_MAP: Record<string, string> = {};
  CHOICE_MAP[CHOICE_STRING] = 'String (utf-8)';
  CHOICE_MAP[CHOICE_PUBLIC_KEY] = 'Solana Public Key';
  CHOICE_MAP[CHOICE_RAW_BYTES] = 'Raw Bytes, base64 encoded';

  const seeds: Buffer[] = [];
  
  for (let i = 0; i < numSeeds; i++) {
    const { seedType } = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'seedType',
          message: 'Type of seed',
          choices: [
            CHOICE_STRING,
            CHOICE_PUBLIC_KEY,
            CHOICE_RAW_BYTES,
          ],
        }
      ]);
    const { seedValue } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'seedValue',
          message: `Enter seed value (${CHOICE_MAP[seedType]})`,
          filter: seedValue => {
            if (seedType === CHOICE_STRING) {
              const seed = Buffer.from(seedValue, 'utf-8');
              if (seed.length > 32) {
                throw 'String seed cannot be greater than 32 bytes';
              }
              return seedValue;
            } else if (seedType === CHOICE_PUBLIC_KEY) {
              new web3.PublicKey(seedValue);
              return seedValue;
            } else {
              const seed = Buffer.from(seedValue, 'base64');
              if (seed.length > 32) {
                throw 'String seed cannot be greater than 32 bytes';
              }
              return seedValue;
            }
          }
        }
      ]);

    if (seedType === CHOICE_STRING) {
      seeds.push(Buffer.from(seedValue, 'utf-8'));
    } else if (seedType === CHOICE_PUBLIC_KEY) {
      seeds.push(new web3.PublicKey(seedValue).toBuffer());
    } else {
      seeds.push(Buffer.from(seedValue, 'base64'));
    }
  }

  const [pda, bump] = web3.PublicKey.findProgramAddressSync(seeds, programId);
  console.log(`PDA: ${pda}`);
  console.log(`Bump: ${bump}`);
}