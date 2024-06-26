import * as web3 from '@solana/web3.js';
import * as util from '../util';
import { GenerateIxFn, GenerateIxsFn } from './DynamicInstruction';
import { Type } from './SyntaxResolver';
import { GenerateTxs } from './TxGenerators';
export declare class Yaml2SolanaClass {
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
    private _global;
    /**
     * Parsed yaml
     */
    private _parsedYaml;
    /**
     * Test validator runnin PID
     */
    private testValidatorPid?;
    constructor(config: string);
    /**
     * Reloads test wallet
     */
    reloadTestWallets(): void;
    /**
     * Get all global variables
     */
    get global(): Record<string, Type>;
    /**
     * Start CLI
     */
    cli(): Promise<void>;
    /**
     * Parsed yaml file
     */
    get parsedYaml(): ParsedYaml;
    /**
     * Get account decoders
     */
    get accountDecoders(): string[];
    /**
     * Resolve variables
     * @param params
     */
    resolve(params: ResolveParams): Promise<void>;
    /**
     * Get transactions from tx generator
     *
     * @param name
     */
    resolveTxGenerators(onlyResolve?: string[]): Promise<any>;
    /**
     * Get accounts from solana instructions
     *
     * @param ix
     */
    getAccountsFromInstruction(ixs: web3.TransactionInstruction[]): web3.PublicKey[];
    /**
     * @param ix
     * @returns
     */
    private isObjectInstruction;
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
    createTransaction(description: string, ixns: (string | web3.TransactionInstruction)[], alts: string[], payer: string | web3.PublicKey, signers: (string | web3.Signer)[], priority?: string): Transaction;
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
     * @returns instruction bundle labels defined in yaml
     */
    getInstructionBundles(): string[];
    /**
     * @returns transaction generators defined in yaml
     */
    getTxGenerators(): string[];
    /**
     * Resolve instruction bundle payer
     *
     * @param label Instruction bundle label
     * @returns
     */
    resolveInstructionBundlePayer(label: string): web3.PublicKey;
    /**
     * Resolve instruction bundle signers from instructions
     *
     * @param label Instruction bundle label
     * @returns
     */
    resolveInstructionBundleSigners(label: string): web3.Signer[];
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
    runTestValidator(txns?: Transaction[], skipRedownload?: web3.PublicKey[]): Promise<any>;
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
    resolveInstruction(ixLabel: string): Promise<void>;
    /**
     * Extract variable info
     *
     * @param pattern
     */
    extractVarInfo(pattern: string): util.typeResolver.VariableInfo;
    /**
     * Set parameter value
     *
     * @param name
     * @param value
     */
    setParam(name: string, value: any): any;
    /**
     * Alias to getVar
     *
     * @param name
     */
    getParam(name: string): Type;
    /**
     * Get ix definition
     *
     * @param ixLabel
     * @returns
     */
    getIxDefinition(ixLabel: string): InstructionDefinition;
    extendDynamicInstruction(params: {
        ixName: string;
        generateFn: GenerateIxFn;
    }): void;
    extendDynamicInstruction(params: {
        ixName: string;
        generateFn: GenerateIxsFn;
    }): void;
    extendTxGenerator(params: {
        name: string;
        generateTxFn: GenerateTxs;
    }): any;
    /**
     * Find PDAs involved from given instruction
     *
     * @param ixLabel
     */
    findPdasInvolvedInInstruction(ixLabel: string): string[];
    /**
     * Get ix definition
     *
     * @param ixLabel
     * @returns
     */
    private getDynamicInstruction;
    /**
     * Store value to global variable
     *
     * @param name
     * @param value
     */
    private setVar;
    /**
     * Retrieve value from global variable
     *
     * @param name
     * @returns
     */
    private getVar;
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
    private runTestValidator2;
    /**
     * Resolve transaction instructions
     *
     * @param onlyResolve
     */
    private resolveInstructions;
    /**
     * Resolve instruction bundles
     *
     * @param onlyResolve
     */
    private resolveInstructionBundles;
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
     * @param onlyResolve Only resolve these PDAs
     */
    private resolvePda;
    /**
     * Generate account decoder instances
     */
    private generateAccountDecoders;
    /**
     * Resolve keypair
     *
     * @param idOrVal
     */
    private resolveKeypair;
    private sanitizeDollar;
    /**
     * Generate dynamic accounts
     */
    private generateDynamicAccounts;
    /**
     * Generate Tx Generators
     */
    private generateTxGenerators;
    /**
     * Find signer from global variable
     *
     * @param idOrValue
     */
    private findSigner;
    /**
     * Get account decoder instance from global
     *
     * @param key
     * @returns
     */
    private getAccountDecoder;
}
export declare class Transaction {
    readonly description: string;
    connection: web3.Connection;
    readonly ixns: web3.TransactionInstruction[];
    readonly alts: string[];
    readonly payer: web3.PublicKey;
    readonly signers: web3.Signer[];
    readonly priority: string;
    constructor(description: string, connection: web3.Connection, ixns: web3.TransactionInstruction[], alts: string[], payer: web3.PublicKey, signers: web3.Signer[], priority: string);
    compileToVersionedTransaction(): Promise<web3.VersionedTransaction>;
    getPriorityFeeEstimate(priorityLevel: string, transaction: web3.VersionedTransaction): Promise<{
        priorityFeeEstimate: number;
    }>;
    addPriorityFees(priorityLevel: string, txMessage: web3.TransactionMessage, lookupTables: web3.AddressLookupTableAccount[], feePayer: web3.PublicKey, blockhash: string): Promise<web3.TransactionMessage>;
    compileToLegacyTx(): Promise<web3.Transaction>;
    /**
     * Get all accounts from instructions
     */
    getAccountsFromInstructions(): web3.PublicKey[];
}
export type ResolvedInstructionBundles = {
    resolvedInstructionBundle: true;
    alts: web3.PublicKey[];
    payer: web3.Keypair;
    ixs: web3.TransactionInstruction[];
};
export type ResolveParams = {
    onlyResolve: {
        thesePdas?: string[];
        theseInstructions?: string[];
        theseInstructionBundles?: string[];
        theseDynamicInstructions?: string[];
        theseTxGenerators?: string[];
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
export type AccountHacker = {
    accountSize: number;
    owner: string;
    lamports: number;
    overrides: {
        offset: number;
        data: string;
    }[];
};
export type TestAccount = {
    key: string;
    schema: string;
    params: Record<string, string>;
    createNew: boolean;
    hack: AccountHacker;
};
export type TestWallet = {
    useUserWallet?: boolean;
    privateKey: string;
    solAmount: string;
};
export type Test = {
    instruction: string;
    description: string;
    params: Record<string, string>;
};
export type InstructionBundleIxs = {
    label: string;
    dynamic?: boolean;
    params: Record<string, string>;
};
export type InstructionBundle = {
    vars?: Record<string, string>;
    alts: string[];
    payer: string;
    instructions: InstructionBundleIxs[];
};
export type DynamicInstruction = {
    dynamic: true;
    params: string[];
};
export type ExecuteTxSettings = {
    skipPreflight?: boolean;
};
export type Accounts = Record<string, string>;
export type AccountDecoder = string[];
export type TxGenerator = {
    params: string[];
};
export type TxGeneratorExecute = {
    vars: Record<string, string>;
    alts: string[];
    payer: string;
    generators: TxGeneratorExecutor[];
};
export type TxGeneratorExecutor = {
    label: string;
    params: Record<string, any>;
};
export type ParsedYaml = {
    mainnetRpc?: string[];
    executeTxSettings: ExecuteTxSettings;
    addressLookupTables?: string[];
    computeLimitSettings?: Record<string, ComputeLimitSettings>;
    accounts: Accounts;
    accountsNoLabel: string[];
    pda: Record<string, Pda>;
    instructionDefinition: Record<string, InstructionDefinition | DynamicInstruction>;
    accountDecoder?: Record<string, AccountDecoder>;
    instructionBundle?: Record<string, InstructionBundle>;
    txGenerator?: Record<string, TxGenerator>;
    txGeneratorExecute?: Record<string, TxGeneratorExecute>;
    localDevelopment: {
        accountsFolder: string;
        skipCache: string[];
        testAccounts: TestAccount[];
        testWallets: Record<string, TestWallet>;
        tests: Test[];
    };
};
export type AccountFile = {
    key: web3.PublicKey;
    path: string;
};
//# sourceMappingURL=Yaml2Solana.d.ts.map