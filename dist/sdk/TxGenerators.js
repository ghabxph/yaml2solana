"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxGeneratorClass = void 0;
const util = __importStar(require("../util"));
const web3 = __importStar(require("@solana/web3.js"));
const bn_js_1 = __importDefault(require("bn.js"));
const error_1 = require("../error");
class TxGeneratorClass {
    constructor(y2s, params, name) {
        this.y2s = y2s;
        this.name = name;
        this.varType = {};
        this._alts = [];
        for (const param of params) {
            if (!param.startsWith('$')) {
                return (0, error_1.throwErrorWithTrace)(`${param} must start with '$' dollar symbol.`);
            }
            const [id, type] = param.split(':');
            if (util.typeResolver.variableTypes.includes(type)) {
                this.varType[id] = { id, type: type };
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`);
            }
        }
    }
    setAlts(alts) {
        this._alts = [];
        this._alts = alts.map(p => new web3.PublicKey(p));
    }
    get alts() {
        return this._alts;
    }
    get txs() {
        return this._txs;
    }
    get signers() {
        const txs = this._txs;
        const signers = [];
        const resultUnfiltered = [];
        if (txs === undefined)
            return (0, error_1.throwErrorWithTrace)(`Resolve transaction first by running resolve() method`);
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
            if (variable.type !== 'keypair')
                continue;
            if (signers.includes(variable.value.publicKey.toString())) {
                resultUnfiltered.push(variable.value);
            }
        }
        const resultFinal = resultUnfiltered.filter((v, i, s) => s.indexOf(v) === i);
        return resultFinal;
    }
    /**
     * Set dynamic instruction function
     *
     * @param ixFn
     */
    extend(ixFn) {
        this._generateTxs = ixFn;
    }
    /**
     * Resolve transaction generator
     *
     * @returns
     */
    async resolve() {
        if (this._generateTxs !== undefined) {
            const params = {};
            for (const id in this.varType) {
                const _var = this.varType[id];
                params[id.substring(1)] = this.getValue(_var.id, _var.type);
            }
            this._txs = await this._generateTxs(params, this.y2s);
            return this._txs;
        }
        return (0, error_1.throwErrorWithTrace)(`Tx Generator ${this.name} is not yet implemented.`);
    }
    getValue(id, type) {
        const INTEGERS = ["u8", "u16", "u32", "usize", "i8", "i16", "i32"];
        const BIG_INTEGERS = ["u64", "u128", "i64", "i128"];
        if (INTEGERS.includes(type)) {
            const v = this.y2s.getParam(id);
            if (INTEGERS.includes(v.type))
                return v.value;
            else if (BIG_INTEGERS.includes(v.type))
                return v.value.toNumber();
            else
                return (0, error_1.throwErrorWithTrace)(`${id} is not a valid integer.`);
        }
        else if (["u64", "u128", "i64", "i128"].includes(type)) {
            const v = this.y2s.getParam(id);
            if (INTEGERS.includes(v.type))
                return new bn_js_1.default(v.value);
            else if (BIG_INTEGERS.includes(v.type))
                return v.value;
            else
                return (0, error_1.throwErrorWithTrace)(`${id} is not a valid integer.`);
        }
        else if (type === "pubkey") {
            const v = this.y2s.getParam(id);
            if (v.type === 'pubkey')
                return v.value;
            else
                return (0, error_1.throwErrorWithTrace)(`${id} is not a valid pubkey.`);
        }
        else if (type === "string") {
            const v = this.y2s.getParam(id);
            if (v.type === 'string')
                return v.value;
            else
                return (0, error_1.throwErrorWithTrace)(`${id} is not a valid string.`);
        }
        else
            return (0, error_1.throwErrorWithTrace)(`Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`);
    }
}
exports.TxGeneratorClass = TxGeneratorClass;
