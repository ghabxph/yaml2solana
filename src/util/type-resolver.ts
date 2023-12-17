import { snakeCase } from 'lodash';
import { sha256 } from "js-sha256";
import * as web3 from '@solana/web3.js';

/**
 * Resolve type
 *
 * @param data
 * @param params
 * @param accounts
 * @param pda
 * @returns
 */
export function resolveType(
  data: string,
  params: Record<string, any>,
  accounts: Record<string, web3.PublicKey>,
  pda: Record<string, any>,
  testWallets: Record<string, web3.Keypair | undefined>,
): Buffer {
  const _sighash = /sighash\([a-zA-Z0-9]+\)/;
  const _u8 = /\$[a-zA-Z0-9_]+:u8/;
  const _u16 = /\$[a-zA-Z0-9_]+:u16/;
  const _u32 = /\$[a-zA-Z0-9_]+:u32/;
  const _u64 = /\$[a-zA-Z0-9_]+:u64/;
  const _usize = /\$[a-zA-Z0-9_]+:usize/
  const _i8 = /\$[a-zA-Z0-9_]+:i8/;
  const _i16 = /\$[a-zA-Z0-9_]+:i16/;
  const _i32 = /\$[a-zA-Z0-9_]+:i32/;
  const _i64 = /\$[a-zA-Z0-9_]+:i64/;
  const _bool = /\$[a-zA-Z0-9_]+:bool/;
  const _pubkey = /\$[a-zA-Z0-9_]+:pubkey/;
  const _bytes = /bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/;
  const _fromBase64 = /fromBase64\([^)]*\)/g;

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
    return resolvePubkey(data, params, accounts, pda, testWallets);
  }

  // Resolve bytes type
  else if (_bytes.test(data)) {
    return resolveRawBytes(data);
  }

  else if (_fromBase64.test(data)) {
    return resolveBase64(data);
  }

  // Pattern is not correct.
  else {
    throw `$${data} is not a valid pattern.`;
  }
}

/**
 * Resolve account meta
 *
 * @param accountMeta
 * @param params
 * @param accounts
 */
export function resolveAccountMeta(
  accountMeta: string,
  params: Record<string, string>,
  accounts: Record<string, web3.PublicKey>,
  pda: Record<string, any>,
  testWallets: Record<string, web3.Keypair | undefined>,
): web3.AccountMeta {
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
      }
    } else if (accounts[key] !== undefined) {
      return {
        pubkey: accounts[key],
        isSigner,
        isWritable
      }
    } else if (pda[key] !== undefined) {
      return {
        pubkey: pda[key]({ ...params }),
        isSigner,
        isWritable
      }
    } else if (testWallets[key] !== undefined) {
      return {
        pubkey: testWallets[key]!.publicKey,
        isSigner,
        isWritable
      }
    } else {
      throw `Cannot find $${key} on accounts in schema, or in parameter.`;
    }
  } else {
    return {
      pubkey: new web3.PublicKey(_accountMetaString[0]),
      isSigner,
      isWritable,
    }
  }
}

/**
 * Anchor sighash function
 *
 * @param ixName
 * @returns
 */
function sighash(ixName: string): Buffer {
  const name = snakeCase(ixName);
  const preimage = `global:${name}`;
  return Buffer.from(sha256.digest(preimage)).slice(0, 8);
}

/**
 * Resolve sighash to Buffer
 *
 * @param data
 */
export function resolveSighash(data: string): Buffer {
  return sighash(
    data.replace(/sighash\(([^)]+)\)/, "$1")
  )
}

/**
 * Resolve unsigned 8-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU8(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):u8/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "number") {
      if (params[key] >= 0 && params[key] <= 255) {
        return Buffer.from([params[key]])
      } else {
        throw `Parameter $${key} is not a valid u8. Valid u8 can only between 0 to 255.`
      }
    } else {
      throw `Parameter $${key} is not a number.`
    }
  } else {
    throw `Parameter $${key} is not set`;
  }
}

/**
 * Resolve unsigned 16-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU16(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):u16/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "number") {
      if (params[key] >= 0 && params[key] <= 65535) { // 2^16 - 1
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16LE(params[key]); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid u16. Valid u16 can only be between 0 to 65535.`;
      }
    } else {
      throw `Parameter $${key} is not a number.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve unsigned 32-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU32(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):u32/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "number") {
      if (params[key] >= 0 && params[key] <= 4294967295) { // 2^32 - 1
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32LE(params[key]); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid u32. Valid u32 can only be between 0 to 4294967295.`;
      }
    } else {
      throw `Parameter $${key} is not a number.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve unsigned 64-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveU64(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):u64/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "bigint" || typeof params[key] === "number") {
      if (params[key] >= 0 && params[key] <= BigInt("18446744073709551615")) { // 2^64 - 1
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(params[key])); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid u64. Valid u64 can only be between 0 to 18446744073709551615.`;
      }
    } else {
      throw `Parameter $${key} is not a valid number or bigint.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve usize to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveUsize(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):usize/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "bigint" || typeof params[key] === "number") {
      if (params[key] >= 0 && params[key] <= BigInt("18446744073709551615")) { // 2^64 - 1
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64LE(BigInt(params[key])); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`;
      }
    } else {
      throw `Parameter $${key} is not a valid number or bigint.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve signed 8-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI8(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):i8/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "number") {
      if (params[key] >= -128 && params[key] <= 127) { // Range for i8
        const buffer = Buffer.alloc(1);
        buffer.writeInt8(params[key]);
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid i8. Valid i8 can only be between -128 to 127.`;
      }
    } else {
      throw `Parameter $${key} is not a number.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve signed 16-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI16(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):i16/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "number") {
      if (params[key] >= -32768 && params[key] <= 32767) { // Range for i16
        const buffer = Buffer.alloc(2);
        buffer.writeInt16LE(params[key]); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid i16. Valid i16 can only be between -32768 to 32767.`;
      }
    } else {
      throw `Parameter $${key} is not a number.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve signed 32-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI32(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):i32/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "number") {
      if (params[key] >= -2147483648 && params[key] <= 2147483647) { // Range for i32
        const buffer = Buffer.alloc(4);
        buffer.writeInt32LE(params[key]); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid i32. Valid i32 can only be between -2147483648 to 2147483647.`;
      }
    } else {
      throw `Parameter $${key} is not a number.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve signed 64-bit integer to Buffer
 *
 * @param data
 * @param params Parameters from function in object form
 */
function resolveI64(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):i64/, "$1");
  if (params[key] !== undefined) {
    if (typeof params[key] === "bigint" || typeof params[key] === "number") {
      if (
        params[key] >= BigInt("-9223372036854775808") && // -2^63
        params[key] <= BigInt("9223372036854775807") // 2^63 - 1
      ) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64LE(BigInt(params[key])); // Write as little-endian
        return buffer;
      } else {
        throw `Parameter $${key} is not a valid i64. Valid i64 can only be between -9223372036854775808 to 9223372036854775807.`;
      }
    } else {
      throw `Parameter $${key} is not a valid number or bigint.`;
    }
  } else {
    throw `Parameter $${key} is not set.`;
  }
}

/**
 * Resolve boolean to Buffer
 *
 * @param data
 * @param params
 */
function resolveBool(data: string, params: Record<string, any>): Buffer {
  const key = data.replace(/\$([^:]+):bool/, "$1");
  if (params[key] === true) {
    return Buffer.from([1]);
  } else if (params[key] === false) {
    return Buffer.from([0]);
  } else if (params[key] === undefined) {
    throw `Parameter $${key} is not set`;
  } else {
    throw `The value of $${key} is not a valid boolean. Value: ${params[key]}`;
  }
}

/**
 * Resolve public key from account definition or given parameters
 *
 * @param data
 * @param params
 * @param accounts
 * @param pda
 * @returns
 */
function resolvePubkey(
  data: string,
  params: Record<string, any>,
  accounts: Record<string, web3.PublicKey>,
  pda: Record<string, any>,
  testWallets: Record<string, web3.Keypair | undefined>
): Buffer {
  const key = data.replace(/\$([^:]+):pubkey/, "$1");
  if (params[key] !== undefined) {
    return new web3.PublicKey(params[key]).toBuffer();
  } else if (accounts[key] !== undefined) {
    return accounts[key].toBuffer();
  } else if (pda[key] !== undefined) {
    return pda[key]({ ...params });
  } else if (testWallets[key] !== undefined) {
    return testWallets[key]!.publicKey.toBuffer();
  } else {
    throw `Cannot find $${key} on accounts in schema, or in parameter.`;
  }
}

/**
 * Resolve raw bytes
 *
 * @param data
 */
function resolveRawBytes(data: string): Buffer {
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
function resolveBase64(data: string): Buffer {
  const bytes = data.replace(/fromBase64\((.*?)\)/g, '$1');
  return Buffer.from(bytes, "base64");
}
