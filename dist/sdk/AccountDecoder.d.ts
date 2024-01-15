/// <reference types="node" />
export type AccountDataType = 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'i32' | 'PublicKey';
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
     * Get data value
     *
     * @param label
     * @returns
     */
    getValue<T>(label: string): T | undefined;
    /**
     * Get public key starting from given offset
     *
     * @param offset Offset of public key
     * @returns
     */
    private getPublicKey;
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
     * Get signed integer (4-bytes) starting from given offset
     *
     * @param offset
     */
    private getI32;
    /**
     *
     * @param offset
     * @param size
     * @returns
     */
    private number;
}
//# sourceMappingURL=AccountDecoder.d.ts.map