import * as web3 from '@solana/web3.js';
export declare class LocalDevelopment {
    readonly accountsFolder: string;
    readonly testWallets: Record<string, web3.Keypair | undefined>;
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string);
}
//# sourceMappingURL=LocalDevelopment.d.ts.map