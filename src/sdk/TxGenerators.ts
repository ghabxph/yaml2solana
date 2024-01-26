import { Yaml2SolanaClass } from "./Yaml2Solana";
import * as util from "../util";
import * as web3 from "@solana/web3.js";
import BN from "bn.js";
import { throwErrorWithTrace } from "../error";

type TxGeneratorVariableType = {
  id: string,
  type: util.typeResolver.VariableType
};
export type GenerateTxs = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction[][]>;

export class TxGeneratorClass {

  readonly varType: Record<string, TxGeneratorVariableType> = {};
  private _alts: web3.PublicKey[] = [];
  private _generateTxs?: GenerateTxs;
  
  constructor(
    public readonly y2s: Yaml2SolanaClass,
    params: string[]
  ) {
    for (const param of params) {
      if (!param.startsWith('$')) {
        return throwErrorWithTrace(`${param} must start with '$' dollar symbol.`);
      }
      const [id, type] = param.split(':');
      if (util.typeResolver.variableTypes.includes(type)) {
        this.varType[id] = { id, type: type as util.typeResolver.VariableType };
      } else {
        return throwErrorWithTrace(`Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`);
      }
    }
  }

  setAlts(alts: web3.PublicKey[]) {
    this._alts = [];
    this._alts = alts.map(p => new web3.PublicKey(p));
  }

  get alts(): web3.PublicKey[] {
    return this._alts;
  }

  /**
   * Set dynamic instruction function
   *
   * @param ixFn
   */
  extend(ixFn: GenerateTxs) {
    this._generateTxs = ixFn;
  }
}
