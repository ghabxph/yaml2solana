import * as web3 from '@solana/web3.js';
import * as util from '../util';
export declare class Yaml2SolanaClass2 {
    /**
     * yaml config path
     */
    private config;
    /**
     * Localnet connection instance
     */
    readonly localnetConnection: web3.Connection;
    /**
     * Project directory is where yaml2solana.yaml file is found.
     */
    readonly projectDir: string;
    /**
     * Global variable
     */
    private global;
    /**
     * Parsed yaml
     */
    private _parsedYaml;
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
     * Parsed yaml file
     */
    get parsedYaml(): ParsedYaml;
    /**
     * Resolve variables
     * @param params
     */
    resolve(params: ResolveParams): void;
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
     * Get signers from given instruction
     *
     * @param ixLabel
     */
    getSignersFromIx(ixLabel: string): web3.Signer[];
    /**
     * @returns instructions defined in yaml
     */
    getInstructions(): string[];
    /**
     * @returns accounts from schema
     */
    getAccounts(): web3.PublicKey[];
    /**
     * @returns program accounts from schema
     */
    getProgramAccounts(): AccountFile[];
    /**
     * @returns json accounts from schema
     */
    getJsonAccounts(): AccountFile[];
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
        runFromExistingLocalnet?: boolean;
    }): Promise<Array<{
        txid: string;
        transactionResponse: web3.VersionedTransactionResponse | null;
    }>>;
    /**
     * Run test validator
     *
     * @param txns
     * @param skipRedownload
     * @returns
     */
    runTestValidator(txns?: Transaction[], skipRedownload?: web3.PublicKey[]): Promise<void>;
    /**
     * Kill test validator
     */
    killTestValidator(): void;
    /**
     * Gets resolved instruction
     *
     * @param name
     * @returns
     */
    getInstruction(name: string): web3.TransactionInstruction;
    /**
     * Resolve given instruction
     *
     * @param ixLabel Instruction to execute
     * @returns available parameters that can be overriden for target instruction
     */
    resolveInstruction(ixLabel: string): void;
    /**
     * Extract variable info
     *
     * @param pattern
     */
    extractVarInfo(pattern: string): util.VariableInfo;
    /**
     * Find PDAs involved from given instruction
     *
     * @param ixLabel
     */
    private findPdasInvolvedInInstruction;
    /**
     * Set parameter value
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
     * @param extension File extension to check
     * @returns
     */
    private getFileAccount;
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
    private runTestValidator2;
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
     * Set named accounts to global variable
     *
     * @param parsedYaml
     */
    private setNamedAccountsToGlobal;
    /**
     * Set known solana accounts
     *
     * @param parsedYaml
     */
    private setKnownAccounts;
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
    payer: string;
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
export type AccountFile = {
    key: web3.PublicKey;
    path: string;
};
//# sourceMappingURL=Yaml2Solana2.d.ts.map