import { Accounts } from "./Accounts";
import { Pda } from "./Pda";
import { InstructionDefinition } from "./InstructionDefinition";
import { LocalDevelopment } from "./LocalDevelopment";

import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { Global } from "../global";

export class Yaml2SolanaClass {

  /**
   * Accounts definition loaded from config
   */
  readonly accounts: any;

  /**
   * PDA definition loaded from config
   */
  readonly pda: any;

  /**
   * Instructions definition loaded from config
   */
  readonly instructionDefinition: any;

  /**
   * Local development setup
   */
  readonly localDevelopment: LocalDevelopment

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    private config: string
  ) {
    this.accounts = Accounts(this.config);
    this.localDevelopment = new LocalDevelopment(config);
    this.pda = Pda(config, this.accounts, this.localDevelopment);
    this.instructionDefinition = InstructionDefinition(config, this.accounts, this.pda, this.localDevelopment);


    // Read the YAML file.
    const yamlFile = fs.readFileSync(config, 'utf8');
    const parsedYaml = yaml.parse(yamlFile);

    // Loop through accounts
    for (const key in parsedYaml.accounts) {

      const split = parsedYaml.accounts[key].split(',');
      const address = split[0];
      const file = split[1];

      // Set named account in global
      Global.set<web3.PublicKey>(key, new web3.PublicKey(address));

      // Set file if 2nd parameter defined is valid (should be .so or .json)
      if (file !== undefined && typeof file === 'string' && ['json', 'so'].includes(file.split('.')[file.split('.').length - 1])) {
        Global.set<Account>(address, { file });
      }
    }

    // Loop through PDA
    for (const key in parsedYaml.pda) {
      Global.set<Pda>(key, (): web3.PublicKey | { missingVars: string[], errors: string[] } => {
        const pdaParams = parsedYaml.pda[key];
        const missingVars = [];
        const errors = [];
        const seeds: Buffer[] = [];
        let programId: web3.PublicKey | undefined;
        try {
          programId = pdaParams.programId.startsWith('$') ? Global.get<web3.PublicKey>(pdaParams.programId) : new web3.PublicKey(pdaParams.programId);
        } catch {
          errors.push(`Invalid programId: ${pdaParams.programId}`);
          programId = undefined;
        }

        for (const seed of pdaParams.seeds) {
          let _seed: Buffer;
          if (seed.startsWith('$')) {
            const p = Global.get<web3.PublicKey>(seed);
            if (typeof p === 'undefined') {
              missingVars.push(seed as string);
              continue;
            } else {
              _seed = p.toBuffer();
            }
          } else {
            _seed = Buffer.from(seed, 'utf-8');
          }
          seeds.push(_seed);
        }

        if (missingVars.length > 0 || typeof programId === 'undefined') {
          return { missingVars, errors }
        } else {
          const [pda] = web3.PublicKey.findProgramAddressSync(seeds, programId)
          return pda;
        }
      });
    }
  }
}

export type Account = {
  file: string,
}

export type Pda = () => web3.PublicKey | { missingVars: string[], errors: string[] };

