import { Accounts } from "./Accounts";
import { Pda } from "./Pda";
import { InstructionDefinition } from "./InstructionDefinition";
import { LocalDevelopment } from "./LocalDevelopment";
import * as web3 from '@solana/web3.js';
import * as path from 'path';

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

  /**
   * Project directory is where yaml2solana.yaml file is found.
   */
  public readonly projectDir: string

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    private config: string
  ) {
    this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');
    this.accounts = Accounts(this.config);
    this.localDevelopment = new LocalDevelopment(config);
    this.pda = Pda(config, this.accounts, this.localDevelopment);
    this.instructionDefinition = InstructionDefinition(config, this.accounts, this.pda, this.localDevelopment);
  }
}

export type Account = {
  file: string,
}

export type Pda = () => web3.PublicKey | { missingVars: string[], errors: string[] };

