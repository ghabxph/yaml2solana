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
exports.AccountDecoder = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const bn_js_1 = __importDefault(require("bn.js"));
const typeSize = {
    bool: 1, // 1 byte as boolean
    u8: 1, // 1 byte as unsigned integer
    u16: 2, // 2 byte as unsigned integer
    u32: 4, // 4 byte as unsigned integer
    u64: 8, // 8 byte as unsigned integer
    u128: 16, // 16 byte as unsigned integer
    i32: 4, // 4 byte as signed integer
    PublicKey: 32, // 32 bytes as anchor.web3.PublicKey
};
class AccountDecoder {
    constructor(
    /**
     * Schema name
     */
    name, 
    /**
     * Schema offsets
     */
    offsets) {
        this.name = name;
        /**
         * Account info data
         */
        this.data = Buffer.alloc(0);
        this.offsets = {};
        for (const offset of offsets) {
            const [label, typeOffset] = offset.split(':');
            const [type, _offset] = typeOffset.split(',');
            this.offsets[label] = {
                label,
                type: type,
                offset: parseInt(_offset),
            };
        }
    }
    /**
     * Get data value
     *
     * @param label
     * @returns
     */
    getValue(label) {
        const offset = this.offsets[label];
        if (this.data.length === 0)
            return undefined;
        switch (offset.type) {
            case 'PublicKey':
                return this.getPublicKey(offset.offset);
            case 'bool':
                return this.getBool(offset.offset);
            case 'u8':
                return this.getU8(offset.offset);
            case 'u16':
                return this.getU16(offset.offset);
            case 'u32':
                return this.getU32(offset.offset);
            case 'u64':
                return this.getU64(offset.offset);
            case 'u128':
                return this.getU128(offset.offset);
            case 'i32':
                return this.getI32(offset.offset);
        }
    }
    /**
     * Get public key starting from given offset
     *
     * @param offset Offset of public key
     * @returns
     */
    getPublicKey(offset) {
        const data = this.data;
        const size = typeSize.PublicKey;
        if (offset + size >= data.length) {
            throw Error(`Offset exceeded account info data size: ${offset + size} > ${data.length}`);
        }
        return new web3.PublicKey(data.subarray(offset, offset + size));
    }
    /**
     * Gets boolean value from given offset
     *
     * @param offset
     */
    getBool(offset) {
        const value = this.getU8(offset);
        if (value > 1) {
            throw Error(`Value is not boolean: ${value}`);
        }
        return value === 1;
    }
    /**
     * Gets unsigned integer (1-byte) starting from given offset
     *
     * @param offset
     */
    getU8(offset) {
        return this.number(offset, typeSize.u8).toNumber();
    }
    /**
     * Get unsigned integer (2-bytes) starting from given offset
     *
     * @param offset
     */
    getU16(offset) {
        return this.number(offset, typeSize.u16).toNumber();
    }
    /**
     * Get unsigned integer (2-bytes) starting from given offset
     *
     * @param offset
     */
    getU32(offset) {
        return this.number(offset, typeSize.u32).toNumber();
    }
    /**
     * Get unsigned integer (64-bytes) starting from given offset
     *
     * @param offset
     */
    getU64(offset) {
        return this.number(offset, typeSize.u64);
    }
    /**
     * Get unsigned integer (64-bytes) starting from given offset
     *
     * @param offset
     */
    getU128(offset) {
        return this.number(offset, typeSize.u128);
    }
    /**
     * Get signed integer (4-bytes) starting from given offset
     *
     * @param offset
     */
    getI32(offset) {
        const number = this.number(offset, typeSize.i32).toNumber();
        const negative = 4294967296 - number;
        const isNegative = number >= 2147483648;
        return isNegative ? negative * -1 : number;
    }
    /**
     *
     * @param offset
     * @param size
     * @returns
     */
    number(offset, size) {
        const data = this.data;
        if (offset + size >= data.length) {
            throw Error(`Offset exceeded account info data size: ${offset + size} > ${data.length}`);
        }
        return new bn_js_1.default(data.subarray(offset, offset + size), "le");
    }
}
exports.AccountDecoder = AccountDecoder;
