import * as util from "../util";
import * as web3 from "@solana/web3.js";
import { Yaml2SolanaClass } from "./Yaml2Solana";
import BN from "bn.js";

type DynamicInstructionVariableType = {
  id: string,
  type: util.typeResolver.VariableType
}

export type GenerateIxsFn = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction[]>;
export type GenerateIxFn = (params: any, y2s?: Yaml2SolanaClass) => Promise<web3.TransactionInstruction>;

export class DynamicInstruction {

  readonly isDynamicInstruction = true;

  readonly varType: Record<string, DynamicInstructionVariableType> = {};

  private _generateIxs?: GenerateIxsFn;

  private _generateIx?: GenerateIxFn;

  private _payer?: web3.PublicKey;

  private _alts: web3.PublicKey[] = [];

  private _ixs?: web3.TransactionInstruction[];

  private _ix?: web3.TransactionInstruction;

  constructor(
    public readonly y2s: Yaml2SolanaClass,
    params: string[]
  ) {
    for (const param of params) {
      if (!param.startsWith('$')) {
        throw `${param} must start with '$' dollar symbol.`;
      }
      const [id, type] = param.split(':');
      if (util.typeResolver.variableTypes.includes(type)) {
        this.varType[id] = { id, type: type as util.typeResolver.VariableType };
      } else {
        throw `Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`;
      }
    }
  }

  setPayer(payer: web3.PublicKey) {
    this._payer = new web3.PublicKey(payer);
  }

  setAlts(alts: web3.PublicKey[]) {
    this._alts = [];
    this._alts = alts.map(p => new web3.PublicKey(p));
  }

  get payer(): web3.PublicKey {
    return this._payer as web3.PublicKey;
  }

  get alts(): web3.PublicKey[] {
    return this._alts;
  }

  async resolve() {
    if (this._generateIxs !== undefined) {
      const params: Record<string, any> = {};
      for (const id in this.varType) {
        const _var = this.varType[id];
        params[id.substring(1)] = this.getValue(_var.id, _var.type as any);
      }
      this._ixs = await this._generateIxs(params, this.y2s);
    }
    if (this._generateIx !== undefined) {
      const params: Record<string, any> = {}
      for (const id in this.varType) {
        const _var = this.varType[id];
        params[id.substring(1)] = this.getValue(_var.id, _var.type as any);
      }
      this._ix = await this._generateIx(params, this.y2s);
    }
  }

  get ixs(): web3.TransactionInstruction[] | undefined {
    return this._ixs;
  }

  get ix(): web3.TransactionInstruction | undefined {
    return this._ix;
  }

  extend<T extends GenerateIxsFn>(ixFn: T): void;
  extend<T extends GenerateIxFn>(ixFn: T): void;

  /**
   * Set dynamic instruction function
   *
   * @param ixFn
   */
  extend<T extends GenerateIxsFn | GenerateIxFn>(ixFn: T) {
    if (this.isGenerateIxsFn(ixFn)) {
      this._generateIxs = ixFn as GenerateIxsFn;
    } else if (this.isGenerateIxFn(ixFn)) {
      this._generateIx = ixFn as GenerateIxFn;
    }
  }

  // User-defined type guard for GenerateIxsFn
  private isGenerateIxsFn(fn: GenerateIxsFn | GenerateIxFn): fn is GenerateIxsFn {
    return 'length' in fn;
  }

  // User-defined type guard for GenerateIxFn
  private isGenerateIxFn(fn: GenerateIxsFn | GenerateIxFn): fn is GenerateIxFn {
    return 'call' in fn;
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
      else throw `${id} is not a valid integer.`;
    } else if (["u64", "u128", "i64", "i128"].includes(type)) {
      const v = this.y2s.getParam(id);
      if (INTEGERS.includes(v.type)) return new BN(v.value as number);
      else if (BIG_INTEGERS.includes(v.type)) return v.value as BN;
      else throw `${id} is not a valid integer.`;
    } else if (type === "pubkey") {
      const v = this.y2s.getParam(id);
      if (v.type === 'pubkey') return v.value;
      else throw `${id} is not a valid pubkey.`
    } else if (type === "string") {
      const v = this.y2s.getParam(id);
      if (v.type === 'string') return v.value;
      else throw `${id} is not a valid string.`
    } else throw `Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`;
  }
}