/// <reference types="node" />
import * as web3 from '@solana/web3.js';
import { AccountDecoder, Accounts, DynamicInstruction, InstructionBundle, InstructionDefinition, Pda, ResolvedInstructionBundles, TestWallet, Yaml2SolanaClass } from './Yaml2Solana';
import BN from 'bn.js';
import { AccountDecoder as AccountDecoderClass } from './AccountDecoder';
import { DynamicInstruction as DynamicInstructionClass } from './DynamicInstruction';
import { TxGeneratorClass } from './TxGenerators';
export declare class ContextResolver {
    private readonly y2s;
    private readonly context;
    private readonly toResolve;
    private readonly extra?;
    constructor(y2s: Yaml2SolanaClass, context: SyntaxContext, toResolve: Pda | Accounts | TestWallet | InstructionDefinition | DynamicInstruction | AccountDecoder | InstructionBundle, extra?: any);
    resolve(): Type | undefined;
    private accountDeclarationContext;
    private testWalletDeclarationContext;
    private pdaResolutionContext;
    private resolveInstruction;
    private resolveBundledInstruction;
    private dynamicIxDeclarationContext;
    private accountDecoderClassContext;
}
export declare class MainSyntaxResolver {
    /**
     * Pattern string
     */
    readonly pattern: string;
    private readonly y2s;
    constructor(
    /**
     * Pattern string
     */
    pattern: string, y2s: Yaml2SolanaClass);
    /**
     * Performs action based on given pattern and context
     */
    resolve(context: SyntaxContext, param?: any): Type;
    private accountDeclarationContext;
    private addressResolver;
    private basicResolver;
}
export declare abstract class SyntaxResolver {
    readonly pattern: string;
    protected readonly y2s: Yaml2SolanaClass;
    /**
     * Syntax resolver base constructor
     *
     * @param pattern
     * @param y2s
     */
    constructor(pattern: string, y2s: Yaml2SolanaClass);
    /**
     * Resolved value
     */
    abstract get value(): Type;
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    abstract isValid(): boolean;
    /**
     * Resolves the variable
     */
    protected abstract resolve(): void;
}
export declare abstract class TypeFactory {
    static createValue(value: Type): Type;
    static createValue(value: web3.PublicKey): TypePubkey;
    static createValue(value: web3.Keypair): TypeKeypair;
    static createValue(value: string): TypeString;
    static createValue(value: boolean): TypeBoolean;
    static createValue(value: number, type: "u8"): TypeU8;
    static createValue(value: number, type: "u16"): TypeU16;
    static createValue(value: number, type: "u32"): TypeU32;
    static createValue(value: number, type: "i8"): TypeI8;
    static createValue(value: number, type: "i16"): TypeI16;
    static createValue(value: number, type: "i32"): TypeI32;
    static createValue(value: BN, type: "u64"): TypeU64;
    static createValue(value: BN, type: "u128"): TypeU128;
    static createValue(value: BN, type: "usize"): TypeUsize;
    static createValue(value: BN, type: "i64"): TypeI64;
    static createValue(value: BN, type: "i128"): TypeI128;
    static createValue(value: AccountSyntax): TypeAccountSyntax;
    static createValue(value: AccountMetaSyntax): TypeAccountMeta;
    static createValue(value: AccountDecoderClassSyntax): TypeAccountDecoderClassSyntax;
    static createValue(value: AccountDecoderClass): TypeAccountDecoderClass;
    static createValue(value: DynamicInstructionClass): TypeDynamicInstructionClass;
    static createValue(value: TxGeneratorClass): TypeDynamicInstructionClass;
    static createValue(value: Buffer): TypeBuffer;
    static createValue(value: web3.TransactionInstruction): TypeInstruction;
    static createValue(value: TypedVariableSyntax): TypeTypedVariableDeclarationSyntax;
    static createValue(value: FunctionSyntax): TypeFunctionDeclarationSyntax;
    static createValue(value: ResolvedInstructionBundles): TypeResolvedInstructionBundles;
    private static isType;
    private static isPubkey;
    private static isKeypair;
    private static isString;
    private static isBoolean;
    private static isInteger;
    private static isBigInteger;
    private static isAccountMeta;
    private static isAccountSyntax;
    private static isAccountDecoderClassSyntax;
    private static isAccountDecoderClass;
    private static isDynamicInstructionClass;
    private static isTxGeneratorClass;
    private static isBuffer;
    private static isInstruction;
    private static isTypedVariableDeclarationSyntax;
    private static isFunctionDeclarationSyntax;
    private static isResolvedInstructionBundles;
}
export type Type = TypePubkey | TypeKeypair | TypeString | TypeBoolean | TypeU8 | TypeU16 | TypeU32 | TypeU64 | TypeUsize | TypeU128 | TypeI8 | TypeI16 | TypeI32 | TypeI64 | TypeI128 | TypeAccountMeta | TypeAccountSyntax | TypeAccountDecoderClassSyntax | TypeAccountDecoderClass | TypeDynamicInstructionClass | TypeTxGeneratorClass | TypeBuffer | TypeInstruction | TypeTypedVariableDeclarationSyntax | TypeFunctionDeclarationSyntax | TypeResolvedInstructionBundles;
export type TypePubkey = {
    value: web3.PublicKey;
    type: "pubkey";
};
export type TypeKeypair = {
    value: web3.Keypair;
    type: "keypair";
};
export type TypeString = {
    value: string;
    type: "string";
};
export type TypeBoolean = {
    value: boolean;
    type: "boolean";
};
export type TypeAccountMeta = {
    value: AccountMetaSyntax;
    type: "account_meta_syntax";
};
export type TypeAccountSyntax = {
    value: AccountSyntax;
    type: "account_syntax";
};
export type TypeU8 = {
    value: number;
    type: "u8";
};
export type TypeU16 = {
    value: number;
    type: "u16";
};
export type TypeU32 = {
    value: number;
    type: "u32";
};
export type TypeI8 = {
    value: number;
    type: "i8";
};
export type TypeI16 = {
    value: number;
    type: "i16";
};
export type TypeI32 = {
    value: number;
    type: "i32";
};
export type TypeU64 = {
    value: BN;
    type: "u64";
};
export type TypeU128 = {
    value: BN;
    type: "u128";
};
export type TypeUsize = {
    value: BN;
    type: "usize";
};
export type TypeI64 = {
    value: BN;
    type: "i64";
};
export type TypeI128 = {
    value: BN;
    type: "i128";
};
export type TypeAccountDecoderClassSyntax = {
    value: AccountDecoderClassSyntax;
    type: "account_decoder_syntax";
};
export type TypeAccountDecoderClass = {
    value: AccountDecoderClass;
    type: "account_decoder";
};
export type TypeDynamicInstructionClass = {
    value: DynamicInstructionClass;
    type: "dynamic_instruction";
};
export type TypeTxGeneratorClass = {
    value: TxGeneratorClass;
    type: "tx_generator";
};
export type TypeBuffer = {
    value: Buffer;
    type: "buffer";
};
export type TypeInstruction = {
    value: web3.TransactionInstruction;
    type: "instruction";
};
export type TypeTypedVariableDeclarationSyntax = {
    value: TypedVariableSyntax;
    type: "typed_variable_declaration_syntax";
};
export type TypeFunctionDeclarationSyntax = {
    value: FunctionSyntax;
    type: "function_declaration_syntax";
};
export type TypeResolvedInstructionBundles = {
    value: ResolvedInstructionBundles;
    type: 'resolved_instruction_bundles';
};
type AccountDecoderClassSyntax = {
    holder: string;
    type: string;
    offset: number;
};
type AccountMetaSyntax = {
    key: web3.PublicKey;
    isSigner: boolean;
    isWritable: boolean;
};
type AccountSyntax = {
    account: web3.PublicKey;
    path?: AccountPath;
};
type AccountPath = {
    value: string;
    type: AccountPathType;
};
type TypedVariableSyntax = {
    type: "variable";
    dataType: "u8";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "u16";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "u32";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "u64";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "usize";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "i8";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "i16";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "i32";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "i64";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "bool";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "pubkey";
    name: string;
    returns: undefined;
} | {
    type: "variable";
    dataType: "string";
    name: string;
    returns: undefined;
};
type FunctionSyntax = {
    type: "function";
    dataType: "buffer";
    name: "sighash";
    returns: Buffer;
} | {
    type: "function";
    dataType: "buffer";
    name: "bytes";
    returns: Buffer;
} | {
    type: "function";
    dataType: "buffer";
    name: "fromBase64";
    returns: Buffer;
} | {
    type: "function";
    dataType: "buffer";
    name: "hex";
    returns: Buffer;
} | {
    type: "function";
    dataType: "usize";
    name: "usize";
    returns: BN;
} | {
    type: "function";
    dataType: "u32";
    name: "u32";
    returns: number;
};
declare enum AccountPathType {
    EXECUTABLE = 0,
    JSON = 1
}
export declare enum SyntaxContext {
    ACCOUNT_DECLARATION = 0,
    PDA_RESOLUTION = 1,
    ADDRESS_RESOLUTION = 2,
    DATA_RESOLUTION = 3,
    META_RESOLUTION = 4,
    VARIABLE_RESOLUTION = 5,
    ACCOUNT_DECODER_DECLARATION = 6,
    DYNAMIC_IX_DECLARATION = 7,
    TEST_WALLET_DECLARATION = 8,
    IX_RESOLUTION = 9,
    IX_BUNDLE_RESOLUTION = 10,
    DECLARATION_SYNTAX = 11,
    SET_VALUE_SYNTAX = 12,
    LITERALS = 13
}
export {};
//# sourceMappingURL=SyntaxResolver.d.ts.map