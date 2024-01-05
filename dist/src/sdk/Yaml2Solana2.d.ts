import * as web3 from '@solana/web3.js';
export declare class Yaml2SolanaClass2 {
    /**
     * yaml config path
     */
    private config;
    /**
     * Global variable
     */
    private global;
    /**
     * Parsed yaml
     */
    private parsedYaml;
    /**
     * Localnet connection instance
     */
    readonly localnetConnection: web3.Connection;
    /**
     * Project directory is where yaml2solana.yaml file is found.
     */
    readonly projectDir: string;
    /**
     * Test validator runnin PID
     */
    private testValidatorPid?;
    constructor(
    /**
     * yaml config path
     */
    config: string);
    /**
     * Resolve variables
     * @param params
     */
    resolve(params: ResolveParams): void;
    /**
     * Resolve test wallets
     *
     * @param parsedYaml
     */
    private resolveTestWallets;
    /**
     * Prints lamports out of thin air in given test wallet key from yaml
     *
     * @param key
     */
    private fundLocalnetWalletFromYaml;
    /**
     * Get accounts from solana instructions
     *
     * @param ix
     */
    getAccountsFromInstruction(ixs: web3.TransactionInstruction[]): web3.PublicKey[];
    /**
     * Create localnet transaction
     *
     * @param description
     * @param ixns
     * @param alts
     * @param payer
     * @param signers
     * @returns
     */
    createLocalnetTransaction(description: string, ixns: (string | web3.TransactionInstruction)[], alts: string[], payer: string | web3.PublicKey, signers: (string | web3.Signer)[]): Transaction;
    /**
     * Batch download accounts from mainnet
     *
     * @param forceDownload
     */
    downloadAccountsFromMainnet(forceDownload: web3.PublicKey[]): Promise<Record<string, string | null>>;
    /**
     * Find running instance of solana-test-validator and get its PID
     */
    findTestValidatorProcess(): Promise<number>;
    /**
     * Execute transactions locally
     *
     * @param txns Transactions to execute
     * @param skipRedownload Skip these accounts for re-download
     * @param keepRunning Whether to keep test validator running
     */
    executeTransactionsLocally(params: {
        txns: Transaction[];
        skipRedownload?: web3.PublicKey[];
        keepRunning?: boolean;
        cluster?: string;
    }): Promise<void>;
    /**
     * Run test validator
     *
     * @param txns
     * @param skipRedownload
     * @returns
     */
    runTestValidator(txns?: Transaction[], skipRedownload?: web3.PublicKey[]): Promise<void>;
    private runTestValidator2;
    killTestValidator(): void;
    /**
     * Gets resolved instruction
     *
     * @param name
     * @returns
     */
    getInstruction(name: string): web3.TransactionInstruction;
    /**
     * Resolve transaction instructions
     *
     * @param parsedYaml
     * @param onlyResolve
     */
    private resolveInstructions;
    /**
     * Resolve instruction data
     *
     * @param data
     */
    private resolveInstructionData;
    private resolveInstructionAccounts;
    /**
     * Set parameter value (alias to setVar method)
     *
     * @param name
     * @param value
     */
    setParam<T>(name: string, value: T): void;
    /**
     * Store value to global variable
     *
     * @param name
     * @param value
     */
    setVar<T>(name: string, value: T): void;
    /**
     * Alias to getVar
     *
     * @param name
     */
    getParam<T>(name: string): T;
    /**
     * Retrieve value from global variable
     *
     * @param name
     * @returns
     */
    getVar<T>(name: string): T;
    /**
     * Set named accounts to global variable
     *
     * @param parsedYaml
     */
    private setNamedAccountsToGlobal;
    /**
     * Resolve PDAs
     *
     * @param parsedYaml
     * @param onlyResolve Only resolve these PDAs
     */
    private resolvePda;
}
export declare class Transaction {
    readonly description: string;
    readonly connection: web3.Connection;
    readonly ixns: web3.TransactionInstruction[];
    readonly alts: string[];
    readonly payer: web3.PublicKey;
    readonly signers: web3.Signer[];
    constructor(description: string, connection: web3.Connection, ixns: web3.TransactionInstruction[], alts: string[], payer: web3.PublicKey, signers: web3.Signer[]);
    compileToVersionedTransaction(): Promise<web3.VersionedTransaction>;
    /**
     * Get all accounts from instructions
     */
    getAccountsFromInstructions(): web3.PublicKey[];
}
export type ResolveParams = {
    onlyResolve: {
        thesePdas?: string[];
        theseInstructions?: string[];
    };
};
export type Account = {
    file: string;
};
export type ComputeLimitSettings = {
    units: string;
    microLamports: string;
};
export type Pda = {
    programId: string;
    seeds: string[];
};
export type InstructionDefinition = {
    programId: string;
    data: string[];
    accounts: string[];
};
export type TestAccount = {
    schema: string;
    params: Record<string, string>;
};
export type TestWallet = {
    privateKey: string;
    solAmount: string;
};
export type Test = {
    instruction: string;
    description: string;
    params: Record<string, string>;
};
export type ParsedYaml = {
    addressLookupTables?: string[];
    computeLimitSettings?: Record<string, ComputeLimitSettings>;
    accounts: Record<string, string>;
    accountsNoLabel: string[];
    pda: Record<string, Pda>;
    instructionDefinition: Record<string, InstructionDefinition>;
    localDevelopment: {
        accountsFolder: string;
        skipCache: string[];
        testAccounts: TestWallet[];
        testWallets: Record<string, TestWallet>;
        tests: Test[];
    };
};
//# sourceMappingURL=Yaml2Solana2.d.ts.map