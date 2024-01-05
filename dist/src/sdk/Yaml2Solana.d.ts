import { LocalDevelopment } from "./LocalDevelopment";
import * as web3 from '@solana/web3.js';
export declare class Yaml2SolanaClass {
    /**
     * yaml2solana.yaml config file
     */
    private config;
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
    readonly localDevelopment: LocalDevelopment;
    /**
     * Project directory is where yaml2solana.yaml file is found.
     */
    readonly projectDir: string;
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string);
}
export type Account = {
    file: string;
};
export type Pda = () => web3.PublicKey | {
    missingVars: string[];
    errors: string[];
};
//# sourceMappingURL=Yaml2Solana.d.ts.map