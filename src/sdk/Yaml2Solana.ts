import { Accounts } from "./Accounts";
import { Pda } from "./Pda";
import { Instructions } from "./Instructions";

export class Yaml2SolanaClass {

  /**
   * Accounts definition loaded from config
   */
  readonly accounts: Accounts;

  /**
   * PDA definition loaded from config
   */
  readonly pda: Pda;

  /**
   * Instructions definition loaded from config
   */
  readonly instructions: Instructions;

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    private config: string
  ) {

    this.accounts = new Accounts(this.config);
    this.pda = new Pda(config, this.accounts);
    this.instructions = new Instructions(config, this.accounts);
  }
}
