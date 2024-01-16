/// <reference types="node" />
import * as web3 from '@solana/web3.js';
export type InstructionDefinitions = Record<string, {
    programId: string;
    data: string[];
    accounts: string[];
    payer: string;
}>;
export type VariableType = "u8" | "u16" | "u32" | "u64" | "u128" | "usize" | "i8" | "i16" | "i32" | "i64" | "i128" | "bool" | "pubkey" | "string";
export declare const variableTypes: string[];
export type DataVariableType = "sighash" | "bytes" | "hex" | "fromBase64" | VariableType;
export type VariableInfo = {
    isVariable: boolean;
    name: string;
    type: DataVariableType;
    defaultValue?: any;
};
export declare function extractVariableInfo(pattern: string, params: Record<string, any>): VariableInfo;
/**
 * Resolve type
 *
 * @param data
 * @param params
 * @param accounts
 * @param pda
 * @returns
 */
export declare function resolveType2(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve account meta
 *
 * @param accountMeta
 * @param params
 * @param accounts
 */
export declare function resolveAccountMeta(accountMeta: string, params: Record<string, string>, accounts: Record<string, web3.PublicKey>, pda: Record<string, any>, testWallets: Record<string, web3.Keypair | undefined>): web3.AccountMeta;
/**
 * Anchor sighash function
 *
 * @param ixName
 * @returns
 */
export declare function sighash(ixName: string): Buffer;
/**
 * Resolve sighash to Buffer
 *
 * @param data
 */
export declare function resolveSighash(data: string): Buffer;
/**
 * Resolve unsigned 8-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveU8(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve unsigned 16-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveU16(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve unsigned 32-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveU32(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve unsigned 64-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveU64(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve usize to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveUsize(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve signed 8-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveI8(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve signed 16-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveI16(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve signed 32-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveI32(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve signed 64-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
export declare function resolveI64(data: string, params: Record<string, any>): Buffer;
/**
 * Resolve boolean to Buffer
 *
 * @param data
 * @param params
 */
export declare function resolveBool(data: string, params: Record<string, any>): Buffer;
//# sourceMappingURL=type-resolver.d.ts.map