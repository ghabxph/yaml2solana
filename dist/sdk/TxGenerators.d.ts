import { Yaml2SolanaClass } from "./Yaml2Solana";
import * as util from "../util";
import * as web3 from "@solana/web3.js";
type TxGeneratorVariableType = {
    id: string;
    type: util.typeResolver.VariableType;
};
export type GenerateTxs = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction[][]>;
export declare class TxGeneratorClass {
    readonly y2s: Yaml2SolanaClass;
    readonly varType: Record<string, TxGeneratorVariableType>;
    private _alts;
    private _generateTxs?;
    constructor(y2s: Yaml2SolanaClass, params: string[]);
    setAlts(alts: web3.PublicKey[]): void;
    get alts(): web3.PublicKey[];
    /**
     * Set dynamic instruction function
     *
     * @param ixFn
     */
    extend(ixFn: GenerateTxs): void;
}
export {};
//# sourceMappingURL=TxGenerators.d.ts.map