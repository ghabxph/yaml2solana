export class Instructions {
  constructor(
    /**
     * yaml2solana.yaml config file
     */
    private config: string,

    /**
     * Accounts definition
     */
    private accounts: any,
  ) {}
}
