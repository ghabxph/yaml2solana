import * as web3 from "@solana/web3.js";
import { Yaml2SolanaClass } from "./Yaml2Solana";
import BN from "bn.js";
export declare class DynamicInstruction {
    readonly y2s: Yaml2SolanaClass;
    private varType;
    constructor(y2s: Yaml2SolanaClass, params: string[]);
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