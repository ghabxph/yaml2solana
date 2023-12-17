import { LocalDevelopment } from './LocalDevelopment';
import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as util from "../util";

class InstructionDefinitionClass {
  private instructionDefinition: Record<string, {
    programId: string,
    data: string[]
    accounts: string[]
  }>;

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string,

    /**
     * Accounts definition
     */
    accounts: any,

    /**
     * PDA definition
     */
    pda: any,

    /**
     * Local development setup
     */
    localDevelopment: LocalDevelopment,
  ) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Parse the YAML content into a JavaScript object.
    this.instructionDefinition = yaml.parse(yamlContent).instructionDefinition;

    // Create a Proxy to handle property access dynamically.
    return new Proxy(this, {
      get(target, prop) {
        const propName = prop as string;
        const instructionDefinition = target.instructionDefinition[propName];
        return instructionDefinition === undefined ? () => {
          throw `Cannot find \`${propName}\` instruction definition from ${config}.`
        } : (params: any) => {
          if (params === undefined) {
            params = {};
          }
          // Resolve program id
          let programId;
          if (instructionDefinition.programId.startsWith('$')) {
            const key = instructionDefinition.programId.replace('$', '');
            if (params[key] !== undefined) {
              programId = new web3.PublicKey(params[key]);
            } else if (accounts[key] !== undefined) {
              programId = new web3.PublicKey(accounts[key]);
            } else {
              throw `$${key} param does not exist in account definition`;
            }
          } else {
            programId = new web3.PublicKey(instructionDefinition.programId);
          }

          // Resolve data (instruction parameters)
          let data: Buffer = Buffer.alloc(0);
          for (const _data of instructionDefinition.data) {
            const value = util.resolveType(_data, params, accounts, pda, localDevelopment.testWallets);
            data = Buffer.concat([data, value])
          }

          // Resolve account metas
          const keys: web3.AccountMeta[] = [];
          for (const account of instructionDefinition.accounts) {
            keys.push(
              util.resolveAccountMeta(account, params, accounts, pda, localDevelopment.testWallets)
            );
          }

          return new web3.TransactionInstruction({
            keys,
            programId,
            data,
          });
        }
      },
    });
  }
}

/**
 * Create instance of PdaClass
 * @param config yaml2solana.yaml config file
 * @returns 
 */
export function InstructionDefinition(config: string, accounts: any, pda: any, localDevelopment: LocalDevelopment): any {
  return new InstructionDefinitionClass(config, accounts, pda, localDevelopment) as any;
}
