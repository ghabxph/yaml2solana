import * as util from "../util";
import * as web3 from "@solana/web3.js";
import { Yaml2SolanaClass } from "./Yaml2Solana";
import BN from "bn.js";
type DynamicInstructionVariableType = {
    id: string;
    type: util.typeResolver.VariableType;
};
export type GenerateIxsFn = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction[]>;
export type GenerateIxFn = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction>;
export declare class DynamicInstruction {
    readonly y2s: Yaml2SolanaClass;
    readonly isDynamicInstruction = true;
    readonly varType: Record<string, DynamicInstructionVariableType>;
    private _generateIxs?;
    private _generateIx?;
    private _payer?;
    private _alts;
    constructor(y2s: Yaml2SolanaClass, params: string[]);
    setPayer(payer: web3.PublicKey): void;
    setAlts(alts: web3.PublicKey[]): void;
    get payer(): web3.PublicKey;
    get alts(): web3.PublicKey[];
    get ixs(): Promise<web3.TransactionInstruction[]> | undefined;
    get ix(): Promise<web3.TransactionInstruction> | undefined;
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
    getValue(id: string, type: "string"): string;
}
export {};
//# sourceMappingURL=DynamicInstruction.d.ts.map