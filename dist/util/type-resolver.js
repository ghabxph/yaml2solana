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
exports.resolveBool = exports.resolveI64 = exports.resolveI32 = exports.resolveI16 = exports.resolveI8 = exports.resolveUsize = exports.resolveU64 = exports.resolveU32 = exports.resolveU16 = exports.resolveU8 = exports.resolveSighash = exports.sighash = exports.resolveAccountMeta = exports.resolveType2 = exports.extractVariableInfo = exports.variableTypes = void 0;
const lodash_1 = require("lodash");
const js_sha256_1 = require("js-sha256");
const web3 = __importStar(require("@solana/web3.js"));
const error_1 = require("../error");
const INVALID_KEY = new web3.PublicKey('123456789abcdefghijkLmnopqrstuvwxyz123456789');
exports.variableTypes = [
    "u8",
    "u16",
    "u32",
    "u64",
    "u128",
    "usize",
    "i8",
    "i16",
    "i32",
    "i64",
    "i128",
    "bool",
    "pubkey",
    "string",
];
function extractVariableInfo(pattern, params) {
    const _sighash = /sighash\([a-zA-Z0-9_]+\)/;
    const _u8 = /\$[a-zA-Z0-9_]+:u8/;
    const _u16 = /\$[a-zA-Z0-9_]+:u16/;
    const _u32 = /\$[a-zA-Z0-9_]+:u32/;
    const _u64 = /\$[a-zA-Z0-9_]+:u64/;
    const _usize = /\$[a-zA-Z0-9_]+:usize/;
    const _i8 = /\$[a-zA-Z0-9_]+:i8/;
    const _i16 = /\$[a-zA-Z0-9_]+:i16/;
    const _i32 = /\$[a-zA-Z0-9_]+:i32/;
    const _i64 = /\$[a-zA-Z0-9_]+:i64/;
    const _bool = /\$[a-zA-Z0-9_]+:bool/;
    const _bytes = /bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/;
    const _fromBase64 = /fromBase64\([^)]*\)/g;
    const _pubkey = /\$[a-zA-Z0-9_]+:pubkey/;
    const _hex = /hex\([a-fA-F0-9_]+\)/;
    // Resolve sighash
    if (_sighash.test(pattern)) {
        const result = resolveSighash(pattern);
        return {
            isVariable: false,
            name: "",
            type: "sighash",
            defaultValue: result,
        };
    }
    // Resolve u8 type
    else if (_u8.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):u8/, "$1");
        return {
            isVariable: true,
            name,
            type: "u8",
        };
    }
    // Resolve u16 type
    else if (_u16.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):u16/, "$1");
        return {
            isVariable: true,
            name,
            type: "u16",
        };
    }
    // Resolve u32 type
    else if (_u32.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):u32/, "$1");
        return {
            isVariable: true,
            name,
            type: "u32",
        };
    }
    // Resolve u64 type
    else if (_u64.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):u64/, "$1");
        return {
            isVariable: true,
            name,
            type: "u64",
        };
    }
    // Resolve usize type
    else if (_usize.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):usize/, "$1");
        return {
            isVariable: true,
            name,
            type: "usize",
        };
    }
    // Resolve i8 type
    else if (_i8.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):i8/, "$1");
        return {
            isVariable: true,
            name,
            type: "i8",
        };
    }
    // Resolve i16 type
    else if (_i16.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):i16/, "$1");
        return {
            isVariable: true,
            name,
            type: "i16",
        };
    }
    // Resolve i32 type
    else if (_i32.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):i32/, "$1");
        return {
            isVariable: true,
            name,
            type: "i32",
        };
    }
    // Resolve i64 type
    else if (_i64.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):i64/, "$1");
        return {
            isVariable: true,
            name,
            type: "i64",
        };
    }
    // Resolve bool type
    else if (_bool.test(pattern)) {
        let name = pattern.replace(/\$([^:]+):bool/, "$1");
        return {
            isVariable: true,
            name,
            type: "bool",
        };
    }
    // Resolve bytes type
    else if (_bytes.test(pattern)) {
        return {
            isVariable: false,
            name: "",
            type: "bytes",
            defaultValue: resolveRawBytes(pattern)
        };
    }
    else if (_fromBase64.test(pattern)) {
        return {
            isVariable: false,
            name: "",
            type: "fromBase64",
            defaultValue: resolveBase64(pattern)
        };
    }
    else if (_hex.test(pattern)) {
        return {
            isVariable: false,
            name: "",
            type: "hex",
            defaultValue: resolveHex(pattern)
        };
    }
    // Resolve pubkey type
    else if (_pubkey.test(pattern)) {
        const name = pattern.replace(/\$([^:]+):pubkey/, "$1");
        const defaultValue = resolvePubkey3(pattern, params);
        return {
            isVariable: true,
            name,
            type: "pubkey",
            defaultValue: defaultValue.equals(INVALID_KEY.toBytes()) ? undefined : new web3.PublicKey(defaultValue)
        };
    }
    // Variables syntax is not correct.
    else {
        return (0, error_1.throwErrorWithTrace)(`$${pattern} is not a valid variable syntax.`);
    }
}
exports.extractVariableInfo = extractVariableInfo;
/**
 * Resolve type
 *
 * @param data
 * @param params
 * @param accounts
 * @param pda
 * @returns
 */
function resolveType2(data, params) {
    const _sighash = /sighash\([a-zA-Z0-9_]+\)/;
    const _u8 = /\$[a-zA-Z0-9_]+:u8/;
    const _u16 = /\$[a-zA-Z0-9_]+:u16/;
    const _u32 = /\$[a-zA-Z0-9_]+:u32/;
    const _u64 = /\$[a-zA-Z0-9_]+:u64/;
    const _usize = /\$[a-zA-Z0-9_]+:usize/;
    const _i8 = /\$[a-zA-Z0-9_]+:i8/;
    const _i16 = /\$[a-zA-Z0-9_]+:i16/;
    const _i32 = /\$[a-zA-Z0-9_]+:i32/;
    const _i64 = /\$[a-zA-Z0-9_]+:i64/;
    const _bool = /\$[a-zA-Z0-9_]+:bool/;
    const _pubkey = /\$[a-zA-Z0-9_]+:pubkey/;
    const _bytes = /bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/;
    const _fromBase64 = /fromBase64\([^)]*\)/g;
    const _hex = /hex\([a-fA-F0-9_]+\)/;
    const __usize = /usize\([^)]*\)/g;
    const __u32 = /u32\([^)]*\)/g;
    // Resolve sighash
    if (_sighash.test(data)) {
        return resolveSighash(data);
    }
    // Resolve u8 type
    else if (_u8.test(data)) {
        return resolveU8(data, params);
    }
    // Resolve u16 type
    else if (_u16.test(data)) {
        return resolveU16(data, params);
    }
    // Resolve u32 type
    else if (_u32.test(data)) {
        return resolveU32(data, params);
    }
    // Resolve u64 type
    else if (_u64.test(data)) {
        return resolveU64(data, params);
    }
    // Resolve usize type
    else if (_usize.test(data)) {
        return resolveUsize(data, params);
    }
    // Resolve i8 type
    else if (_i8.test(data)) {
        return resolveI8(data, params);
    }
    // Resolve i16 type
    else if (_i16.test(data)) {
        return resolveI16(data, params);
    }
    // Resolve i32 type
    else if (_i32.test(data)) {
        return resolveI32(data, params);
    }
    // Resolve i64 type
    else if (_i64.test(data)) {
        return resolveI64(data, params);
    }
    // Resolve bool type
    else if (_bool.test(data)) {
        return resolveBool(data, params);
    }
    // Resolve pubkey type
    else if (_pubkey.test(data)) {
        return resolvePubkey3(data, params);
    }
    // Resolve bytes type
    else if (_bytes.test(data)) {
        return resolveRawBytes(data);
    }
    else if (_fromBase64.test(data)) {
        return resolveBase64(data);
    }
    else if (_hex.test(data)) {
        return resolveHex(data);
    }
    else if (__usize.test(data)) {
        return resolveUsizeFunc(data);
    }
    else if (__u32.test(data)) {
        return resolveU32Func(data);
    }
    // Variable syntax is not correct.
    else {
        return (0, error_1.throwErrorWithTrace)(`$${data} is not a valid variable syntax.`);
    }
}
exports.resolveType2 = resolveType2;
/**
 * Resolve account meta
 *
 * @param accountMeta
 * @param params
 * @param accounts
 */
function resolveAccountMeta(accountMeta, params, accounts, pda, testWallets) {
    const _accountMetaString = accountMeta.split(',');
    const isSigner = _accountMetaString.includes("signer");
    const isWritable = _accountMetaString.includes("mut");
    if (_accountMetaString[0].startsWith('$')) {
        const key = _accountMetaString[0].replace('$', '');
        if (params[key] !== undefined) {
            return {
                pubkey: new web3.PublicKey(params[key]),
                isSigner,
                isWritable
            };
        }
        else if (accounts[key] !== undefined) {
            return {
                pubkey: accounts[key],
                isSigner,
                isWritable
            };
        }
        else if (pda[key] !== undefined) {
            return {
                pubkey: pda[key]({ ...params }),
                isSigner,
                isWritable
            };
        }
        else if (testWallets[key] !== undefined) {
            return {
                pubkey: testWallets[key].publicKey,
                isSigner,
                isWritable
            };
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot find $${key} on accounts in schema, or in parameter.`);
        }
    }
    else {
        return {
            pubkey: new web3.PublicKey(_accountMetaString[0]),
            isSigner,
            isWritable,
        };
    }
}
exports.resolveAccountMeta = resolveAccountMeta;
/**
 * Anchor sighash function
 *
 * @param ixName
 * @returns
 */
function sighash(ixName) {
    const name = (0, lodash_1.snakeCase)(ixName);
    const preimage = `global:${name}`;
    return Buffer.from(js_sha256_1.sha256.digest(preimage)).slice(0, 8);
}
exports.sighash = sighash;
/**
 * Resolve sighash to Buffer
 *
 * @param data
 */
function resolveSighash(data) {
    return sighash(data.replace(/sighash\(([^)]+)\)/, "$1"));
}
exports.resolveSighash = resolveSighash;
/**
 * Resolve unsigned 8-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU8(data, params) {
    const key = data.replace(/\$([^:]+):u8/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "number") {
            if (params[key] >= 0 && params[key] <= 255) {
                return Buffer.from([params[key]]);
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid u8. Valid u8 can only between 0 to 255.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a number.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set`);
    }
}
exports.resolveU8 = resolveU8;
/**
 * Resolve unsigned 16-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU16(data, params) {
    const key = data.replace(/\$([^:]+):u16/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "number") {
            if (params[key] >= 0 && params[key] <= 65535) { // 2^16 - 1
                const buffer = Buffer.alloc(2);
                buffer.writeUInt16LE(params[key]); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid u16. Valid u16 can only be between 0 to 65535.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a number.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveU16 = resolveU16;
/**
 * Resolve unsigned 32-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU32(data, params) {
    const key = data.replace(/\$([^:]+):u32/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "number") {
            if (params[key] >= 0 && params[key] <= 4294967295) { // 2^32 - 1
                const buffer = Buffer.alloc(4);
                buffer.writeUInt32LE(params[key]); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid u32. Valid u32 can only be between 0 to 4294967295.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a number.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveU32 = resolveU32;
/**
 * Resolve unsigned 64-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU64(data, params) {
    const key = data.replace(/\$([^:]+):u64/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "bigint" || typeof params[key] === "number") {
            if (params[key] >= 0 && params[key] <= BigInt("18446744073709551615")) { // 2^64 - 1
                const buffer = Buffer.alloc(8);
                buffer.writeBigUInt64LE(BigInt(params[key])); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid u64. Valid u64 can only be between 0 to 18446744073709551615.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid number or bigint.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveU64 = resolveU64;
/**
 * Resolve usize to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveUsize(data, params) {
    const key = data.replace(/\$([^:]+):usize/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "bigint" || typeof params[key] === "number") {
            if (params[key] >= 0 && params[key] <= BigInt("18446744073709551615")) { // 2^64 - 1
                const buffer = Buffer.alloc(8);
                buffer.writeBigUInt64LE(BigInt(params[key])); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid number or bigint.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveUsize = resolveUsize;
/**
 * Resolve signed 8-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI8(data, params) {
    const key = data.replace(/\$([^:]+):i8/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "number") {
            if (params[key] >= -128 && params[key] <= 127) { // Range for i8
                const buffer = Buffer.alloc(1);
                buffer.writeInt8(params[key]);
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid i8. Valid i8 can only be between -128 to 127.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a number.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveI8 = resolveI8;
/**
 * Resolve signed 16-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI16(data, params) {
    const key = data.replace(/\$([^:]+):i16/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "number") {
            if (params[key] >= -32768 && params[key] <= 32767) { // Range for i16
                const buffer = Buffer.alloc(2);
                buffer.writeInt16LE(params[key]); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid i16. Valid i16 can only be between -32768 to 32767.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a number.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveI16 = resolveI16;
/**
 * Resolve signed 32-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI32(data, params) {
    const key = data.replace(/\$([^:]+):i32/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "number") {
            if (params[key] >= -2147483648 && params[key] <= 2147483647) { // Range for i32
                const buffer = Buffer.alloc(4);
                buffer.writeInt32LE(params[key]); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid i32. Valid i32 can only be between -2147483648 to 2147483647.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a number.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveI32 = resolveI32;
/**
 * Resolve signed 64-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI64(data, params) {
    const key = data.replace(/\$([^:]+):i64/, "$1");
    if (params[key] !== undefined) {
        if (typeof params[key] === "bigint" || typeof params[key] === "number") {
            if (params[key] >= BigInt("-9223372036854775808") && // -2^63
                params[key] <= BigInt("9223372036854775807") // 2^63 - 1
            ) {
                const buffer = Buffer.alloc(8);
                buffer.writeBigInt64LE(BigInt(params[key])); // Write as little-endian
                return buffer;
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid i64. Valid i64 can only be between -9223372036854775808 to 9223372036854775807.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not a valid number or bigint.`);
        }
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set.`);
    }
}
exports.resolveI64 = resolveI64;
/**
 * Resolve boolean to Buffer
 *
 * @param data
 * @param params
 */
function resolveBool(data, params) {
    const key = data.replace(/\$([^:]+):bool/, "$1");
    if (params[key] === true) {
        return Buffer.from([1]);
    }
    else if (params[key] === false) {
        return Buffer.from([0]);
    }
    else if (params[key] === undefined) {
        return (0, error_1.throwErrorWithTrace)(`Parameter $${key} is not set`);
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`The value of $${key} is not a valid boolean. Value: ${params[key]}`);
    }
}
exports.resolveBool = resolveBool;
/**
 * Resolve public key from account definition or given parameters
 *
 * @param data
 * @param params
 * @returns
 */
function resolvePubkey3(data, params) {
    const key = data.replace(/\$([^:]+):pubkey/, "$1");
    if (params[key] !== undefined && params[key] instanceof web3.PublicKey) {
        return new web3.PublicKey(params[key]).toBuffer();
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Cannot find $${key} variable`);
    }
}
/**
 * Resolve raw bytes
 *
 * @param data
 */
function resolveRawBytes(data) {
    const value = data
        .replace(/bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/, match => match.replace(/bytes\(|\)/g, ''))
        .split(',').map(value => parseInt(value.trim(), 10));
    return Buffer.from(value);
}
/**
 * Resolve base64 encoded string to raw bytes
 *
 * @param data
 */
function resolveBase64(data) {
    const bytes = data.replace(/fromBase64\((.*?)\)/g, '$1');
    return Buffer.from(bytes, "base64");
}
/**
 * Resolve hex encoded string to raw bytes
 *
 * @param data
 */
function resolveHex(data) {
    const bytes = data.replace(/hex\((.*?)\)/g, '$1');
    return Buffer.from(bytes, "hex");
}
/**
 * Resolve hex encoded string to raw bytes
 *
 * @param data
 */
function resolveUsizeFunc(data) {
    const value = data.replace(/usize\((.*?)\)/g, '$1');
    const number = BigInt(value);
    if (number >= BigInt("0") && number <= BigInt("18446744073709551615")) { // 2^64 - 1
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(number); // Write as little-endian
        return buffer;
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Value ${value} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`);
    }
}
/**
 * Resolve hex encoded string to raw bytes
 *
 * @param data
 */
function resolveU32Func(data) {
    const value = data.replace(/u32\((.*?)\)/g, '$1');
    const number = parseInt(value);
    if (number >= 0 && number <= 4294967295) { // 2^32 - 1
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(number); // Write as little-endian
        return buffer;
    }
    else {
        return (0, error_1.throwErrorWithTrace)(`Value ${value} is not a valid u32. Valid usize can only be between 0 to 4294967295.`);
    }
}
