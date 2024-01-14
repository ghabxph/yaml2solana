/// <reference types="node" />
import * as web3 from '@solana/web3.js';
export type InstructionDefinitions = Record<string, {
    programId: string;
    data: string[];
    accounts: string[];
    payer: string;
}>;
export type VariableType = "sighash" | "u8" | "u16" | "u32" | "u64" | "usize" | "i8" | "i16" | "i32" | "i64" | "bool" | "pubkey" | "bytes" | "fromBase64";
export type VariableInfo = {
    isVariable: boolean;
    name: string;
    type: VariableType;
    defaultValue?: any;
};
export declare function extractVariableInfo(pattern: string, accounts: Record<string, web3.PublicKey>, pda: Record<string, any>, testWallets: Record<string, web3.Keypair | undefined>): VariableInfo;
export declare function extractVariableInfo2(pattern: string, params: Record<string, any>): VariableInfo;
export declare function getVariablesFromInstructionDefinition(instructionToExecute: string, instructionDefinitions: InstructionDefinitions, accounts: any, pda: any, testWallets: Record<string, web3.Keypair | undefined>): Record<string, VariableInfo>;
export declare function getVariablesFromInstructionDefinition2(): Record<string, VariableInfo>;
/**
 * Resolve type
 *
 * @param data
 * @param params
 * @param accounts
 * @param pda
 * @returns
 */
export declare function resolveType(data: string, params: Record<string, any>, accounts: Record<string, web3.PublicKey>, pda: Record<string, any>, testWallets: Record<string, web3.Keypair | undefined>): Buffer;
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
 * Resolve sighash to Buffer
 *
 * @param data
 */
export declare function resolveSighash(data: string): Buffer;
//# sourceMappingURL=type-resolver.d.ts.map