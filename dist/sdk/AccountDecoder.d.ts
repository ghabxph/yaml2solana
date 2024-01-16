/// <reference types="node" />
export type AccountDataType = 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'i8' | 'i16' | 'i32' | 'i64' | 'i128' | 'pubkey';
export type AccountDataOffset = {
    label: string;
    type: AccountDataType;
    offset: number;
};
export declare class AccountDecoder {
    /**
     * Schema name
     */
    readonly name: string;
    /**
     * Account info data
     */
    data: Buffer;
    private readonly offsets;
    constructor(
    /**
     * Schema name
     */
    name: string, 
    /**
     * Schema offsets
     */
    offsets: string[]);
    /**
     * Return decoded values
     */
    get values(): Record<string, any>;
    /**
     * Get data value
     *
     * @param label
     * @returns
     */
    getValue<T>(label: string): T | undefined;
    setValue(label: string, value: any): void;
    /**
     * Get public key starting from given offset
     *
     * @param offset Offset of public key
     * @returns
     */
    private getPublicKey;
    /**
     * Set public key to given offset
     *
     * @param offset
     * @param value
     */
    private setPublicKey;
    /**
     * Gets boolean value from given offset
     *
     * @param offset
     */
    private getBool;
    /**
     * Gets unsigned integer (1-byte) starting from given offset
     *
     * @param offset
     */
    private getU8;
    /**
     * Get unsigned integer (2-bytes) starting from given offset
     *
     * @param offset
     */
    private getU16;
    /**
     * Get unsigned integer (2-bytes) starting from given offset
     *
     * @param offset
     */
    private getU32;
    /**
     * Get unsigned integer (64-bytes) starting from given offset
     *
     * @param offset
     */
    private getU64;
    /**
     * Get unsigned integer (64-bytes) starting from given offset
     *
     * @param offset
     */
    private getU128;
    /**
     * Get signed 8-bit integer starting from given offset
     *
     * @param offset
     */
    private getI8;
    /**
     * Get signed 16-bit integer starting from given offset
     *
     * @param offset
     */
    private getI16;
    /**
     * Get signed integer (4-bytes) starting from given offset
     *
     * @param offset
     */
    private getI32;
    /**
     * Get signed 64-bit integer starting from given offset
     *
     * @param offset
     */
    private getI64;
    /**
     * Get signed 128-bit integer starting from given offset
     *
     * @param offset
     */
    private getI128;
    /**
     * Get number from given offset
     *
     * @param offset
     * @param size
     * @returns
     */
    private number;
    /**
     * Set signed number to given offset
     *
     * @param offset
     * @param size
     * @param value
     */
    private setSignedNumber;
    /**
     * Set unsigned number to given offset
     *
     * @param offset
     * @param size
     * @param value
     */
    private setUnsignedNumber;
    /**
     * Set unsigned u128-bit number to given offset
     *
     * @param value
     * @param offset
     */
    private writeBigUInt128LE;
}
//# sourceMappingURL=AccountDecoder.d.ts.map