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
  private _txs?: web3.TransactionInstruction[][];
  
  constructor(
    public readonly y2s: Yaml2SolanaClass,
    params: string[],
    public readonly name: string,
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

  get txs(): web3.TransactionInstruction[][] {
    return this._txs as web3.TransactionInstruction[][];
  }

  get signers(): web3.Signer[] {
    const txs = this._txs;
    const signers: string[] = [];
    const resultUnfiltered: web3.Signer[] = [];
    if (txs === undefined) return throwErrorWithTrace(`Resolve transaction first by running resolve() method`);
    for (const tx of txs) {
      for (const ixs of txs) {
        for (const ix of ixs) {
          for (const meta of ix.keys) {
            if (meta.isSigner) {
              signers.push(meta.pubkey.toString());
            }
          }
        }
      }
    }
    for (const id in this.y2s.global) {
      const variable = this.y2s.global[id];
      if (variable.type !== 'keypair') continue;
      if (signers.includes(variable.value.publicKey.toString())) {
        resultUnfiltered.push(variable.value);
      }
    }
    const resultFinal = resultUnfiltered.filter((v,i,s) => s.indexOf(v) === i);
    return resultFinal;
  }

  /**
   * Set dynamic instruction function
   *
   * @param ixFn
   */
  extend(ixFn: GenerateTxs) {
    this._generateTxs = ixFn;
  }

  /**
   * Resolve transaction generator
   *
   * @returns
   */
  async resolve(): Promise<web3.TransactionInstruction[][]> {
    if (this._generateTxs !== undefined) {
      const params: Record<string, any> = {};
      for (const id in this.varType) {
        const _var = this.varType[id];
        params[id.substring(1)] = this.getValue(_var.id, _var.type as any);
      }
      this._txs = await this._generateTxs(params, this.y2s);
    }
    return throwErrorWithTrace(`Tx Generator ${this.name} is not yet implemented.`);
  }

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
  getValue(id: string, type: util.typeResolver.VariableType): number | BN | web3.PublicKey | string {
    const INTEGERS = ["u8", "u16", "u32", "usize", "i8", "i16", "i32"];
    const BIG_INTEGERS = ["u64", "u128", "i64", "i128"];
    if (INTEGERS.includes(type)) {
      const v = this.y2s.getParam(id);
      if (INTEGERS.includes(v.type)) return v.value as number;
      else if (BIG_INTEGERS.includes(v.type)) return (v.value as BN).toNumber();
      else return throwErrorWithTrace(`${id} is not a valid integer.`);
    } else if (["u64", "u128", "i64", "i128"].includes(type)) {
      const v = this.y2s.getParam(id);
      if (INTEGERS.includes(v.type)) return new BN(v.value as number);
      else if (BIG_INTEGERS.includes(v.type)) return v.value as BN;
      else return throwErrorWithTrace(`${id} is not a valid integer.`);
    } else if (type === "pubkey") {
      const v = this.y2s.getParam(id);
      if (v.type === 'pubkey') return v.value;
      else return throwErrorWithTrace(`${id} is not a valid pubkey.`);
    } else if (type === "string") {
      const v = this.y2s.getParam(id);
      if (v.type === 'string') return v.value;
      else return throwErrorWithTrace(`${id} is not a valid string.`);
    } else return throwErrorWithTrace(`Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`);
  }
}
