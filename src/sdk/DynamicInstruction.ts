import * as util from "../util";
import * as web3 from "@solana/web3.js";
import { Yaml2SolanaClass } from "./Yaml2Solana";
import BN from "bn.js";

type DynamicInstructionVariableType = {
  id: string,
  type: util.typeResolver.VariableType
}

export type GenerateIxsFn = (y2s: Yaml2SolanaClass, params: any) => web3.TransactionInstruction[];
export type GenerateIxFn = (y2s: Yaml2SolanaClass, params: any) => web3.TransactionInstruction;

export class DynamicInstruction {

  readonly isDynamicInstruction = true;

  private varType: Record<string, DynamicInstructionVariableType> = {};

  private _generateIxs?: GenerateIxsFn;

  private _generateIx?: GenerateIxFn;

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

  get ixs(): web3.TransactionInstruction[] | undefined {
    if (this._generateIxs === undefined) return undefined;
    const params: Record<string, any> = {};
    for (const id in this.varType) {
      const _var = this.varType[id];
      params[id] = this.getValue(_var.id, _var.type as any);
    }
    return this._generateIxs(this.y2s, params);
  }

  get ix(): web3.TransactionInstruction | undefined {
    if (this._generateIx === undefined) return undefined;
    const params: Record<string, any> = {}
    for (const id in this.varType) {
      const _var = this.varType[id];
      params[id] = this.getValue(_var.id, _var.type as any);
    }
    return this._generateIx(this.y2s, params);
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
    if (["u8", "u16", "u32", "usize", "i8", "i16", "i32"].includes(type)) {
      return this.y2s.getParam<number>(id);
    } else if (["u64", "u128", "i64", "i128"].includes(type)) {
      return this.y2s.getParam<BN>(id);
    } else if (type === "pubkey") {
      return this.y2s.getParam<web3.PublicKey>(id);
    } else if (type === "string") {
      return this.y2s.getParam<string>(id);
    } else {
      throw `Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`;
    }
  }
}