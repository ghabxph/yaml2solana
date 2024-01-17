import * as web3 from "@solana/web3.js";
import { Yaml2SolanaClass } from "./Yaml2Solana";
import BN from "bn.js";
export type GenerateIxsFn = (y2s: Yaml2SolanaClass, params: any) => web3.TransactionInstruction[];
export type GenerateIxFn = (y2s: Yaml2SolanaClass, params: any) => web3.TransactionInstruction;
export declare class DynamicInstruction {
    readonly y2s: Yaml2SolanaClass;
    private varType;
    private _generateIxs?;
    private _generateIx?;
    constructor(y2s: Yaml2SolanaClass, params: string[]);
    get generateIxs(): GenerateIxsFn | undefined;
    get generateIx(): GenerateIxFn | undefined;
    extend<T extends GenerateIxsFn>(ixFn: T): void;
    extend<T extends GenerateIxFn>(ixFn: T): void;
    private isGenerateIxsFn;
    private isGenerateIxFn;
    getValue(id: string, type: "u8"): number;
    getValue(id: string, type: "u16"): number;
    getValue(id: string, type: "u32"): number;
    getValue(id: string, type: "u64"): BN;
    getValue(id: string, type: "u64"): BN;
    getValue(id: string, type: "u128"): BN;
    getValue(id: string, type: "usize"): BN;
    getValue(id: string, type: "i8"): number;
    getValue(id: string, type: "i16"): number;
    getValue(id: string, type: "i32"): number;
    getValue(id: string, type: "i64"): BN;
    getValue(id: string, type: "i64"): BN;
    getValue(id: string, type: "i128"): BN;
    getValue(id: string, type: "pubkey"): web3.PublicKey;
    getValue(id: string, type: "string"): web3.PublicKey;
}
//# sourceMappingURL=DynamicInstruction.d.ts.map