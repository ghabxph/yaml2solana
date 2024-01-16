import * as web3 from "@solana/web3.js";
import BN from "bn.js";

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

export type AccountDataType = 
  'bool' |
  'u8' |
  'u16' |
  'u32' |
  'u64' |
  'u128' |
  'i8' |
  'i16' |
  'i32' |
  'i64' |
  'i128' |
  'pubkey';

export type AccountDataOffset = {
  label: string,
  type: AccountDataType,
  offset: number,
};

export class AccountDecoder {

  /**
   * Account info data
   */
  data: Buffer = Buffer.alloc(0);

  private readonly offsets: Record<string, AccountDataOffset>;

  constructor(
    /**
     * Schema name
     */
    public readonly name: string,

    /**
     * Schema offsets
     */
    offsets: string[],
  ) {
    this.offsets = {};
    for (const offset of offsets) {
      const [label, typeOffset] = offset.split(':');
      const [type, _offset] = typeOffset.split(',');
      this.offsets[label] = {
        label,
        type: type as AccountDataType,
        offset: parseInt(_offset),
      }
    }
  }

  /**
   * Return decoded values
   */
  get values(): Record<string, any> {
    const result: Record<string, any> = {}
    for (const id in this.offsets) {
      const offset = this.offsets[id];
      const _result = this.getValue(offset.label)
      if (typeof (_result as BN).cmp === 'function') {
        try {
          result[offset.label] = (_result as BN).toNumber();
        } catch {
          result[offset.label] = BigInt((_result as BN).toString());
        }
      } else if (typeof (_result as web3.PublicKey).toBase58 === 'function') {
        result[offset.label] = (_result as web3.PublicKey).toBase58();
      } else {
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
  getValue<T>(label: string): T | undefined {
    const offset = this.offsets[label];
    if (this.data.length === 0) return undefined;
    switch(offset.type) {
      case 'pubkey':
        return this.getPublicKey(offset.offset) as T;
      case 'bool':
        return this.getBool(offset.offset) as T;
      case 'u8':
        return this.getU8(offset.offset) as T;
      case 'u16':
        return this.getU16(offset.offset) as T;
      case 'u32':
        return this.getU32(offset.offset) as T;
      case 'u64':
        return this.getU64(offset.offset) as T;
      case 'u128':
        return this.getU128(offset.offset) as T;
      case 'i8':
        return this.getI8(offset.offset) as T;
      case 'i16':
        return this.getI16(offset.offset) as T;
      case 'i32':
        return this.getI32(offset.offset) as T;
      case 'i64':
        return this.getI64(offset.offset) as T;
      case 'i128':
        return this.getI128(offset.offset) as T;
    }
  }

  setValue(label: string, value: any) {
    const offset = this.offsets[label];
    if (this.data.length === 0) throw 'Account data is empty';
    switch(offset.type) {
      case 'pubkey':
        const publicKey = new web3.PublicKey(value);
        return this.setPublicKey(offset.offset, publicKey);
      case 'bool':
        const boolValue = typeof value === 'boolean' ? value : value === 'true';
        return this.setUnsignedNumber(offset.offset, typeSize.u8, boolValue ? 1 : 0);
      case 'u8':
        if (typeof value === 'number') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u8, value);
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u8, value.toNumber())
        } else if (typeof value === 'string') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u8, parseInt(value))
        }
      case 'u16':
        if (typeof value === 'number') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u16, value);
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u16, value.toNumber())
        } else if (typeof value === 'string') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u16, parseInt(value))
        }
      case 'u32':
        if (typeof value === 'number') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u32, value);
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u32, value.toNumber())
        } else if (typeof value === 'string') {
          return this.setUnsignedNumber<number>(offset.offset, typeSize.u32, parseInt(value))
        }
      case 'u64':
        if (typeof value === 'number') {
          return this.setUnsignedNumber<BN>(offset.offset, typeSize.u64, new BN(value));
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setUnsignedNumber<BN>(offset.offset, typeSize.u64, value)
        } else if (typeof value === 'string') {
          return this.setUnsignedNumber<BN>(offset.offset, typeSize.u64, new BN(value))
        }
      case 'u128':
        if (typeof value === 'number') {
          return this.setUnsignedNumber<BN>(offset.offset, typeSize.u128, new BN(value));
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setUnsignedNumber<BN>(offset.offset, typeSize.u128, value)
        } else if (typeof value === 'string') {
          return this.setUnsignedNumber<BN>(offset.offset, typeSize.u128, new BN(value))
        }
      case 'i8':
        if (typeof value === 'number') {
          return this.setSignedNumber(offset.offset, typeSize.i8, value);
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setSignedNumber(offset.offset, typeSize.i8, value.toNumber());
        } else if (typeof value === 'string') {
          return this.setSignedNumber(offset.offset, typeSize.i8, Number(value));
        }
      case 'i16':
        if (typeof value === 'number') {
          return this.setSignedNumber(offset.offset, typeSize.i16, value);
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setSignedNumber(offset.offset, typeSize.i16, value.toNumber());
        } else if (typeof value === 'string') {
          return this.setSignedNumber(offset.offset, typeSize.i16, Number(value));
        }
      case 'i32':
        if (typeof value === 'number') {
          return this.setSignedNumber(offset.offset, typeSize.i32, value);
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setSignedNumber(offset.offset, typeSize.i32, value.toNumber());
        } else if (typeof value === 'string') {
          return this.setSignedNumber(offset.offset, typeSize.i32, Number(value));
        }
      case 'i64':
        if (typeof value === 'number') {
          return this.setSignedNumber(offset.offset, typeSize.i64, new BN(value));
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setSignedNumber(offset.offset, typeSize.i64, value);
        } else if (typeof value === 'string') {
          return this.setSignedNumber(offset.offset, typeSize.i64, new BN(value));
        }
      case 'i128':
        if (typeof value === 'number') {
          return this.setSignedNumber(offset.offset, typeSize.i128, new BN(value));
        } else if (typeof (value as BN).cmp === 'function') {
          return this.setSignedNumber(offset.offset, typeSize.i128, value);
        } else if (typeof value === 'string') {
          return this.setSignedNumber(offset.offset, typeSize.i128, new BN(value));
        }
    }
  }

  /**
   * Get public key starting from given offset
   *
   * @param offset Offset of public key
   * @returns
   */
  private getPublicKey(offset: number): web3.PublicKey {
    const data = this.data;
    const size = typeSize.PublicKey;
    if (offset + size > data.length) {
      throw Error(
        `Offset exceeded account info data size: ${offset + size} > ${
          data.length
        }`,
      );
    }
    return new web3.PublicKey(data.subarray(offset, offset + size));
  }

  /**
   * Set public key to given offset
   *
   * @param offset
   * @param value
   */
  private setPublicKey(offset: number, value: web3.PublicKey) {
    const size = typeSize.PublicKey;
    if (offset + size > this.data.length) {
      throw Error(
        `Offset exceeded account info data size: ${offset + size} > ${
          this.data.length
        }`,
      );
    }
    this.data.write(value.toBuffer().toString('base64'), offset, 'base64');
  }

  /**
   * Gets boolean value from given offset
   *
   * @param offset
   */
  private getBool(offset: number): boolean {
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
  private getU8(offset: number): number {
    return this.number(offset, typeSize.u8).toNumber();
  }

  /**
   * Get unsigned integer (2-bytes) starting from given offset
   *
   * @param offset
   */
  private getU16(offset: number): number {
    return this.number(offset, typeSize.u16).toNumber();
  }

  /**
   * Get unsigned integer (2-bytes) starting from given offset
   *
   * @param offset
   */
  private getU32(offset: number): number {
    return this.number(offset, typeSize.u32).toNumber();
  }

  /**
   * Get unsigned integer (64-bytes) starting from given offset
   *
   * @param offset
   */
  private getU64(offset: number): BN {
    return this.number(offset, typeSize.u64);
  }

  /**
   * Get unsigned integer (64-bytes) starting from given offset
   *
   * @param offset
   */
  private getU128(offset: number): BN {
    return this.number(offset, typeSize.u128);
  }

  /**
   * Get signed 8-bit integer starting from given offset
   *
   * @param offset
   */
  private getI8(offset: number): number {
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
  private getI16(offset: number): number {
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
  private getI32(offset: number): number {
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
  private getI64(offset: number): BN {
    const numberBuffer = this.data.subarray(offset, offset + typeSize.i64);
    const isNegative = numberBuffer[7] & 0x80; // Check the sign bit
    if (isNegative) {
      // If the sign bit is set, it's a negative number, so calculate two's complement
      const twosComplement = new BN(numberBuffer).notn(64).addn(1);
      return twosComplement.neg();
    } else {
      return new BN(numberBuffer);
    }
  }

  /**
   * Get signed 128-bit integer starting from given offset
   *
   * @param offset
   */
  private getI128(offset: number): BN {
    const numberBuffer = this.data.subarray(offset, offset + typeSize.i128);
    const isNegative = numberBuffer[15] & 0x80; // Check the sign bit
    if (isNegative) {
      // If the sign bit is set, it's a negative number, so calculate two's complement
      const twosComplement = new BN(numberBuffer).notn(128).addn(1);
      return twosComplement.neg();
    } else {
      return new BN(numberBuffer);
    }
  }

  /**
   * Get number from given offset
   *
   * @param offset
   * @param size
   * @returns
   */
  private number(offset: number, size: number): BN {
    const data = this.data;
    if (offset + size >= data.length) {
      throw Error(
        `Offset exceeded account info data size: ${offset + size} > ${
          data.length
        }`,
      );
    }
    return new BN(data.subarray(offset, offset + size), "le");
  }

  /**
   * Set signed number to given offset
   *
   * @param offset
   * @param size
   * @param value
   */
  private setSignedNumber(offset: number, size: number, value: number | BN) {
    if (!(typeof (value as BN).cmp === 'function' || typeof value === 'number')) {
      throw Error('Value must be a number or a BN instance.');
    }
    if (typeof value === 'number') {
      value = new BN(value);
    }
    if (size === typeSize.i8 || size === typeSize.i16 || size === typeSize.i32) {
      const maxValue = size === typeSize.i64 ? new BN('18446744073709551616') : new BN('340282366920938463463374607431768211456');
      const unsignedValue = value.lt(new BN(0)) ? value.add(maxValue) : value;
      this.setUnsignedNumber<number>(offset, size, unsignedValue.toNumber());
    } else if (size === typeSize.i64 || size === typeSize.i128) {
      if (value.gte(new BN(0))) {
        this.setUnsignedNumber<BN>(offset, size, value);
      } else {
        const maxValue = size === typeSize.i64 ? new BN('18446744073709551616') : new BN('340282366920938463463374607431768211456');
        const twoComplement = value.add(maxValue).mod(maxValue);
        this.setUnsignedNumber<BN>(offset, size, twoComplement);
      }
    } else {
      throw Error('Unsupported size for signed number.');
    }
  }

  /**
   * Set unsigned number to given offset
   *
   * @param offset
   * @param size
   * @param value
   */
  private setUnsignedNumber<T>(offset: number, size: number, value: T) {
    if (offset + size > this.data.length) {
      throw Error(
        `Offset exceeded account info data size: ${offset + size} > ${
          this.data.length
        }`,
      );
    }
    if (size === typeSize.u8) {
      this.data.writeUint8(value as number, offset);
    } else if (size === typeSize.u16) {
      this.data.writeUint16LE(value as number, offset);
    } else if (size === typeSize.u32) {
      this.data.writeUint32LE(value as number, offset);
    } else if (size === typeSize.u64) {
      const _value = BigInt((value as BN).toString());
      this.data.writeBigUint64LE(_value, offset);
    } else if (size === typeSize.u128) {
      const _value = BigInt((value as BN).toString());
      this.writeBigUInt128LE(_value, offset);
    }
  }

  /**
   * Set unsigned u128-bit number to given offset
   *
   * @param value
   * @param offset
   */
  private writeBigUInt128LE(value: bigint, offset: number) {
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
