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
const error_1 = require("../error");
const typeSize = {
    bool: 1, // 1 byte as boolean
    u8: 1, // 1 byte as unsigned integer
    u16: 2, // 2 byte as unsigned integer
    u32: 4, // 4 byte as unsigned integer
    u64: 8, // 8 byte as unsigned integer
    u128: 16, // 16 byte as unsigned integer
    i8: 1, // 1 byte as signed integer
    i16: 2, // 2 byte as signed integer
    i32: 4, // 4 byte as signed integer
    i64: 8, // 8 byte as signed integer
    i128: 16, // 16 byte as signed integer
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
     * Return decoded values
     */
    get values() {
        const result = {};
        for (const id in this.offsets) {
            const offset = this.offsets[id];
            const _result = this.getValue(offset.label);
            if (typeof _result.cmp === 'function') {
                try {
                    result[offset.label] = _result.toNumber();
                }
                catch {
                    result[offset.label] = BigInt(_result.toString());
                }
            }
            else if (typeof _result.toBase58 === 'function') {
                result[offset.label] = _result.toBase58();
            }
            else {
                result[offset.label] = _result;
            }
        }
        return result;
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
            case 'pubkey':
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
            case 'i8':
                return this.getI8(offset.offset);
            case 'i16':
                return this.getI16(offset.offset);
            case 'i32':
                return this.getI32(offset.offset);
            case 'i64':
                return this.getI64(offset.offset);
            case 'i128':
                return this.getI128(offset.offset);
        }
    }
    setValue(label, value) {
        const offset = this.offsets[label];
        if (this.data.length === 0)
            return (0, error_1.throwErrorWithTrace)('Account data is empty');
        switch (offset.type) {
            case 'pubkey':
                const publicKey = new web3.PublicKey(value);
                return this.setPublicKey(offset.offset, publicKey);
            case 'bool':
                const boolValue = typeof value === 'boolean' ? value : value === 'true';
                return this.setUnsignedNumber(offset.offset, typeSize.u8, boolValue ? 1 : 0);
            case 'u8':
                if (typeof value === 'number') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u8, value);
                }
                else if (typeof value.cmp === 'function') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u8, value.toNumber());
                }
                else if (typeof value === 'string') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u8, parseInt(value));
                }
            case 'u16':
                if (typeof value === 'number') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u16, value);
                }
                else if (typeof value.cmp === 'function') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u16, value.toNumber());
                }
                else if (typeof value === 'string') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u16, parseInt(value));
                }
            case 'u32':
                if (typeof value === 'number') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u32, value);
                }
                else if (typeof value.cmp === 'function') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u32, value.toNumber());
                }
                else if (typeof value === 'string') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u32, parseInt(value));
                }
            case 'u64':
                if (typeof value === 'number') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u64, new bn_js_1.default(value));
                }
                else if (typeof value.cmp === 'function') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u64, value);
                }
                else if (typeof value === 'string') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u64, new bn_js_1.default(value));
                }
            case 'u128':
                if (typeof value === 'number') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u128, new bn_js_1.default(value));
                }
                else if (typeof value.cmp === 'function') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u128, value);
                }
                else if (typeof value === 'string') {
                    return this.setUnsignedNumber(offset.offset, typeSize.u128, new bn_js_1.default(value));
                }
            case 'i8':
                if (typeof value === 'number') {
                    return this.setSignedNumber(offset.offset, typeSize.i8, value);
                }
                else if (typeof value.cmp === 'function') {
                    return this.setSignedNumber(offset.offset, typeSize.i8, value.toNumber());
                }
                else if (typeof value === 'string') {
                    return this.setSignedNumber(offset.offset, typeSize.i8, Number(value));
                }
            case 'i16':
                if (typeof value === 'number') {
                    return this.setSignedNumber(offset.offset, typeSize.i16, value);
                }
                else if (typeof value.cmp === 'function') {
                    return this.setSignedNumber(offset.offset, typeSize.i16, value.toNumber());
                }
                else if (typeof value === 'string') {
                    return this.setSignedNumber(offset.offset, typeSize.i16, Number(value));
                }
            case 'i32':
                if (typeof value === 'number') {
                    return this.setSignedNumber(offset.offset, typeSize.i32, value);
                }
                else if (typeof value.cmp === 'function') {
                    return this.setSignedNumber(offset.offset, typeSize.i32, value.toNumber());
                }
                else if (typeof value === 'string') {
                    return this.setSignedNumber(offset.offset, typeSize.i32, Number(value));
                }
            case 'i64':
                if (typeof value === 'number') {
                    return this.setSignedNumber(offset.offset, typeSize.i64, new bn_js_1.default(value));
                }
                else if (typeof value.cmp === 'function') {
                    return this.setSignedNumber(offset.offset, typeSize.i64, value);
                }
                else if (typeof value === 'string') {
                    return this.setSignedNumber(offset.offset, typeSize.i64, new bn_js_1.default(value));
                }
            case 'i128':
                if (typeof value === 'number') {
                    return this.setSignedNumber(offset.offset, typeSize.i128, new bn_js_1.default(value));
                }
                else if (typeof value.cmp === 'function') {
                    return this.setSignedNumber(offset.offset, typeSize.i128, value);
                }
                else if (typeof value === 'string') {
                    return this.setSignedNumber(offset.offset, typeSize.i128, new bn_js_1.default(value));
                }
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
        if (offset + size > data.length) {
            return (0, error_1.throwErrorWithTrace)(Error(`Offset exceeded account info data size: ${offset + size} > ${data.length}`));
        }
        return new web3.PublicKey(data.subarray(offset, offset + size));
    }
    /**
     * Set public key to given offset
     *
     * @param offset
     * @param value
     */
    setPublicKey(offset, value) {
        const size = typeSize.PublicKey;
        if (offset + size > this.data.length) {
            return (0, error_1.throwErrorWithTrace)(Error(`Offset exceeded account info data size: ${offset + size} > ${this.data.length}`));
        }
        this.data.write(value.toBuffer().toString('base64'), offset, 'base64');
    }
    /**
     * Gets boolean value from given offset
     *
     * @param offset
     */
    getBool(offset) {
        const value = this.getU8(offset);
        if (value > 1) {
            return (0, error_1.throwErrorWithTrace)(Error(`Value is not boolean: ${value}`));
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
     * Get signed 8-bit integer starting from given offset
     *
     * @param offset
     */
    getI8(offset) {
        const number = this.number(offset, typeSize.i8).toNumber();
        const negative = 256 - number;
        const isNegative = number >= 128;
        return isNegative ? negative * -1 : number;
    }
    /**
     * Get signed 16-bit integer starting from given offset
     *
     * @param offset
     */
    getI16(offset) {
        const number = this.number(offset, typeSize.i16).toNumber();
        const negative = 65536 - number;
        const isNegative = number >= 32768;
        return isNegative ? negative * -1 : number;
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
     * Get signed 64-bit integer starting from given offset
     *
     * @param offset
     */
    getI64(offset) {
        const numberBuffer = this.data.subarray(offset, offset + typeSize.i64);
        const isNegative = numberBuffer[7] & 0x80; // Check the sign bit
        if (isNegative) {
            // If the sign bit is set, it's a negative number, so calculate two's complement
            const twosComplement = new bn_js_1.default(numberBuffer).notn(64).addn(1);
            return twosComplement.neg();
        }
        else {
            return new bn_js_1.default(numberBuffer);
        }
    }
    /**
     * Get signed 128-bit integer starting from given offset
     *
     * @param offset
     */
    getI128(offset) {
        const numberBuffer = this.data.subarray(offset, offset + typeSize.i128);
        const isNegative = numberBuffer[15] & 0x80; // Check the sign bit
        if (isNegative) {
            // If the sign bit is set, it's a negative number, so calculate two's complement
            const twosComplement = new bn_js_1.default(numberBuffer).notn(128).addn(1);
            return twosComplement.neg();
        }
        else {
            return new bn_js_1.default(numberBuffer);
        }
    }
    /**
     * Get number from given offset
     *
     * @param offset
     * @param size
     * @returns
     */
    number(offset, size) {
        const data = this.data;
        if (offset + size >= data.length) {
            return (0, error_1.throwErrorWithTrace)(Error(`Offset exceeded account info data size: ${offset + size} > ${data.length}`));
        }
        return new bn_js_1.default(data.subarray(offset, offset + size), "le");
    }
    /**
     * Set signed number to given offset
     *
     * @param offset
     * @param size
     * @param value
     */
    setSignedNumber(offset, size, value) {
        if (!(typeof value.cmp === 'function' || typeof value === 'number')) {
            return (0, error_1.throwErrorWithTrace)(Error('Value must be a number or a BN instance.'));
        }
        if (typeof value === 'number') {
            value = new bn_js_1.default(value);
        }
        if (size === typeSize.i8 || size === typeSize.i16 || size === typeSize.i32) {
            const maxValue = size === typeSize.i64 ? new bn_js_1.default('18446744073709551616') : new bn_js_1.default('340282366920938463463374607431768211456');
            const unsignedValue = value.lt(new bn_js_1.default(0)) ? value.add(maxValue) : value;
            this.setUnsignedNumber(offset, size, unsignedValue.toNumber());
        }
        else if (size === typeSize.i64 || size === typeSize.i128) {
            if (value.gte(new bn_js_1.default(0))) {
                this.setUnsignedNumber(offset, size, value);
            }
            else {
                const maxValue = size === typeSize.i64 ? new bn_js_1.default('18446744073709551616') : new bn_js_1.default('340282366920938463463374607431768211456');
                const twoComplement = value.add(maxValue).mod(maxValue);
                this.setUnsignedNumber(offset, size, twoComplement);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(Error('Unsupported size for signed number.'));
        }
    }
    /**
     * Set unsigned number to given offset
     *
     * @param offset
     * @param size
     * @param value
     */
    setUnsignedNumber(offset, size, value) {
        if (offset + size > this.data.length) {
            return (0, error_1.throwErrorWithTrace)(Error(`Offset exceeded account info data size: ${offset + size} > ${this.data.length}`));
        }
        if (size === typeSize.u8) {
            this.data.writeUint8(value, offset);
        }
        else if (size === typeSize.u16) {
            this.data.writeUint16LE(value, offset);
        }
        else if (size === typeSize.u32) {
            this.data.writeUint32LE(value, offset);
        }
        else if (size === typeSize.u64) {
            const _value = BigInt(value.toString());
            this.data.writeBigUint64LE(_value, offset);
        }
        else if (size === typeSize.u128) {
            const _value = BigInt(value.toString());
            this.writeBigUInt128LE(_value, offset);
        }
    }
    /**
     * Set unsigned u128-bit number to given offset
     *
     * @param value
     * @param offset
     */
    writeBigUInt128LE(value, offset) {
        const buffer = Buffer.alloc(16); // 128-bit buffer
        buffer.writeUInt32LE(Number(value & BigInt(0xFFFFFFFF)), 0);
        buffer.writeUInt32LE(Number((value >> BigInt(32)) & BigInt(0xFFFFFFFF)), 4);
        buffer.writeUInt32LE(Number((value >> BigInt(64)) & BigInt(0xFFFFFFFF)), 8);
        buffer.writeUInt32LE(Number((value >> BigInt(96)) & BigInt(0xFFFFFFFF)), 12);
        for (let i = 0; i < 16; i++) {
            this.data.writeUInt8(buffer.readUInt8(i), offset + i);
        }
    }
}
exports.AccountDecoder = AccountDecoder;
