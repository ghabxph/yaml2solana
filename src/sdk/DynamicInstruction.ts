import * as util from "../util";
import * as web3 from "@solana/web3.js";
import { Yaml2SolanaClass } from "./Yaml2Solana";
import BN from "bn.js";

type DynamicInstructionVariableType = {
  id: string,
  type: util.typeResolver.VariableType
}

export class DynamicInstruction {

  private varType: Record<string, DynamicInstructionVariableType> = {};

  constructor(
    public readonly y2s: Yaml2SolanaClass,
    params: string[]
  ) {
    for (const param of params) {
      if (!param.startsWith('$')) {
        throw `${param} must start with '$' dollar symbol.`;
      }
      const [id, type] = param.split(',');
      if (util.typeResolver.variableTypes.includes(type)) {
        this.varType[id] = { id, type: type as util.typeResolver.VariableType };
      } else {
        throw `Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`;
      }
    }
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
  getValue(id: string, type: "string"): web3.PublicKey;
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