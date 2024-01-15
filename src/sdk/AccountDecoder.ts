import * as web3 from "@solana/web3.js";
import BN from "bn.js";

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

export type AccountDataType = 
  'bool' |
  'u8' |
  'u16' |
  'u32' |
  'u64' |
  'u128' |
  'i32' |
  'PublicKey';

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
   * Get data value
   *
   * @param label
   * @returns
   */
  getValue<T>(label: string): T | undefined {
    const offset = this.offsets[label];
    if (this.data.length === 0) return undefined;
    switch(offset.type) {
      case 'PublicKey':
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
      case 'i32':
        return this.getI32(offset.offset) as T;
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
    if (offset + size >= data.length) {
      throw Error(
        `Offset exceeded account info data size: ${offset + size} > ${
          data.length
        }`,
      );
    }
    return new web3.PublicKey(data.subarray(offset, offset + size));
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
}
