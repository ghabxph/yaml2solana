import { LocalDevelopment } from './LocalDevelopment';
import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as util from "../util";

class InstructionDefinitionClass {
  private instructionDefinition: util.typeResolver.InstructionDefinitions;

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

        /**
         * InstructionDefinitionClass.getInstruction() method
         * 
         * Returns instruction keys
         */
        if (prop === 'getInstructions') {
          return (): string[] => {
            const instructions: string[] = [];
            for (const instruction in target.instructionDefinition) {
              instructions.push(instruction);
            }
            return instructions;
          }
        }

        /**
         * InstructionDefinitionClass.getParametersOf() method
         * 
         * @param $targetInstruction The instruction key
         * Returns available parameters that can be overriden for target instruction
         */
        if (prop === 'getParametersOf') {
          return (instructionToExecute: string): Record<string, util.typeResolver.VariableInfo> => {
            return util.typeResolver.getVariablesFromInstructionDefinition(
              instructionToExecute,
              target.instructionDefinition,
              accounts,
              pda,
              localDevelopment.testWallets
            );
          }
        }

        /**
         * InstructionDefinitionClass.getSigners() method
         * 
         * @param $targetInstruction The instruction key
         * Returns localnet instruction signers
         */
        if (prop === 'getSigners') {
          return (instructionToExecute: string): web3.Signer[] => {
            const accountsMeta = target.instructionDefinition[instructionToExecute].accounts;
            const signers: web3.Signer[] = [];
            for (const accountMeta of accountsMeta) {
              const _accountMeta = accountMeta.split(',');
              const name = _accountMeta[0].substring(1);
              if (_accountMeta.includes('signer')) {
                const signer = localDevelopment.testWallets[name]
                if (signer !== undefined) {
                  signers.push(signer)
                } else {
                  throw `${name} signer is not defined in the localDevelopment.testWallets`
                }
              }
            }
            return signers;
          }
        }

        /**
         * InstructionDefinitionClass.getPayer() method
         * 
         * @param $targetInstruction The instruction key
         * Returns transaction payer
         */
        if (prop === 'getPayer') {
          return (instructionToExecute: string): web3.PublicKey => {
            const payerVar = target.instructionDefinition[instructionToExecute].payer;
            if (payerVar.startsWith('$')) {
              const payerKp = localDevelopment.testWallets[payerVar.substring(1)]
              return payerKp!.publicKey;
            } else {
              throw 'Payer must start with \'$\' and it should exist in test wallet.'
            }
          }
        }

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
