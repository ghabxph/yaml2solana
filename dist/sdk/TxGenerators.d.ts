import { Yaml2SolanaClass } from "./Yaml2Solana";
import * as util from "../util";
import * as web3 from "@solana/web3.js";
import BN from "bn.js";
type TxGeneratorVariableType = {
    id: string;
    type: util.typeResolver.VariableType;
};
export type GenerateTxs = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction[][]>;
export declare class TxGeneratorClass {
    readonly y2s: Yaml2SolanaClass;
    readonly name: string;
    readonly varType: Record<string, TxGeneratorVariableType>;
    private _alts;
    private _generateTxs?;
    private _txs?;
    constructor(y2s: Yaml2SolanaClass, params: string[], name: string);
    setAlts(alts: web3.PublicKey[]): void;
    get alts(): web3.PublicKey[];
    get txs(): web3.TransactionInstruction[][];
    get signers(): web3.Signer[];
    /**
     * Set dynamic instruction function
     *
     * @param ixFn
     */
    extend(ixFn: GenerateTxs): void;
    /**
     * Resolve transaction generator
     *
     * @returns
     */
    resolve(): Promise<web3.TransactionInstruction[][]>;
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
    getValue(id: string, type: "bool"): string;
}
export {};
//# sourceMappingURL=TxGenerators.d.ts.map