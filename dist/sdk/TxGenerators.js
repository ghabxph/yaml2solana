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
exports.TxGeneratorClass = void 0;
const util = __importStar(require("../util"));
const web3 = __importStar(require("@solana/web3.js"));
const error_1 = require("../error");
class TxGeneratorClass {
    constructor(y2s, params) {
        this.y2s = y2s;
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
    /**
     * Set dynamic instruction function
     *
     * @param ixFn
     */
    extend(ixFn) {
        this._generateTxs = ixFn;
    }
}
exports.TxGeneratorClass = TxGeneratorClass;
