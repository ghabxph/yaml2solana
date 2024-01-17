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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicInstruction = void 0;
const util = __importStar(require("../util"));
class DynamicInstruction {
    constructor(y2s, params) {
        this.y2s = y2s;
        this.isDynamicInstruction = true;
        this.varType = {};
        for (const param of params) {
            if (!param.startsWith('$')) {
                throw `${param} must start with '$' dollar symbol.`;
            }
            const [id, type] = param.split(':');
            if (util.typeResolver.variableTypes.includes(type)) {
                this.varType[id] = { id, type: type };
            }
            else {
                throw `Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`;
            }
        }
    }
    get ixs() {
        if (this._generateIxs === undefined)
            return undefined;
        const params = {};
        for (const id in this.varType) {
            const _var = this.varType[id];
            params[id] = this.getValue(_var.id, _var.type);
        }
        return this._generateIxs(this.y2s, params);
    }
    get ix() {
        if (this._generateIx === undefined)
            return undefined;
        const params = {};
        for (const id in this.varType) {
            const _var = this.varType[id];
            params[id] = this.getValue(_var.id, _var.type);
        }
        return this._generateIx(this.y2s, params);
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
        if (["u8", "u16", "u32", "usize", "i8", "i16", "i32"].includes(type)) {
            return this.y2s.getParam(id);
        }
        else if (["u64", "u128", "i64", "i128"].includes(type)) {
            return this.y2s.getParam(id);
        }
        else if (type === "pubkey") {
            return this.y2s.getParam(id);
        }
        else if (type === "string") {
            return this.y2s.getParam(id);
        }
        else {
            throw `Invalid type ${type}. Valid types: ${util.typeResolver.variableTypes.join(',')}`;
        }
    }
}
exports.DynamicInstruction = DynamicInstruction;
