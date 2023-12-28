import { Accounts } from "./Accounts";
import { Pda } from "./Pda";
import { InstructionDefinition } from "./InstructionDefinition";
import { LocalDevelopment } from "./LocalDevelopment";

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
  }
}