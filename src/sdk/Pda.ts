import { Accounts } from "./Accounts";

export class Pda {
  constructor(
    /**
     * yaml2solana.yaml config file
     */
    private config: string,

    /**
     * Accounts definition
     */
    private accounts: Accounts,
  ) {}
}