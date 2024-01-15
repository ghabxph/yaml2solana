import inquirer from "inquirer";
import * as web3 from "@solana/web3.js";
import clear from "ts-clear-screen";
import { keypairUi } from "./keypairUi";
import * as util from "../../util";

const CHOICE_GENERATE_PDA = 'Generate PDA';
const CHOICE_ANALYZE_TRANSACTION = 'Analyze Transaction';
const CHOICE_KEYPAIR_GENERATION = 'Generate Keypair';
const CHOICE_SIGHASH = 'Generate sighash';

export async function utilUi() {
  clear();
  const { choice } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'choice',
        message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
        choices: [
          CHOICE_GENERATE_PDA,
          CHOICE_ANALYZE_TRANSACTION,
          CHOICE_KEYPAIR_GENERATION,
          CHOICE_SIGHASH,
        ],
      },
    ]
  );

  if (choice === CHOICE_GENERATE_PDA) {
    return await generatePda();
  }

  if (choice === CHOICE_ANALYZE_TRANSACTION) {
    // do something
  }

  if (choice === CHOICE_KEYPAIR_GENERATION) {
    return await keypairUi();
  }

  if (choice === CHOICE_SIGHASH) {
    return await generateSighash();
  }
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

/**
 * Generate sighash
 */
async function generateSighash() {
  const { value } = await inquirer
    .prompt({
      type: 'input',
      name: 'value',
      message: 'Enter value:'
    });
  
  const hexValue = util.typeResolver.sighash(value).toString('hex');
  console.log(`Hex value: ${hexValue}`);
}