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
exports.DynamicInstruction = void 0;
const util = __importStar(require("../util"));
const web3 = __importStar(require("@solana/web3.js"));
const bn_js_1 = __importDefault(require("bn.js"));
const error_1 = require("../error");
class DynamicInstruction {
    constructor(y2s, params) {
        this.y2s = y2s;
        this.isDynamicInstruction = true;
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
    setPayer(payer) {
        this._payer = new web3.PublicKey(payer);
    }
    setAlts(alts) {
        this._alts = [];
        this._alts = alts.map(p => new web3.PublicKey(p));
    }
    get payer() {
        return this._payer;
    }
    get alts() {
        return this._alts;
    }
    async resolve() {
        if (this._generateIxs !== undefined) {
            const params = {};
            for (const id in this.varType) {
                const _var = this.varType[id];
                params[id.substring(1)] = this.getValue(_var.id, _var.type);
            }
            this._ixs = await this._generateIxs(params, this.y2s);
        }
        if (this._generateIx !== undefined) {
            const params = {};
            for (const id in this.varType) {
                const _var = this.varType[id];
                params[id.substring(1)] = this.getValue(_var.id, _var.type);
            }
            this._ix = await this._generateIx(params, this.y2s);
        }
    }
    get ixs() {
        return this._ixs;
    }
    get ix() {
        return this._ix;
    }
    /**
     * Set dynamic instruction function
     *
     * @param ixFn
     */
    extend(ixFn) {
        if (this.isGenerateIxsFn(ixFn)) {
            this._generateIxs = ixFn;
        }
        else if (this.isGenerateIxFn(ixFn)) {
            this._generateIx = ixFn;
        }
    }
    // User-defined type guard for GenerateIxsFn
    isGenerateIxsFn(fn) {
        return 'length' in fn;
    }
    // User-defined type guard for GenerateIxFn
    isGenerateIxFn(fn) {
        return 'call' in fn;
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
exports.DynamicInstruction = DynamicInstruction;
