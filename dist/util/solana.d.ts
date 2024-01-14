/// <reference types="node" />
import * as web3 from "@solana/web3.js";
export type FullAccountInfo = Record<string, web3.AccountInfo<Buffer> | null>;
/**
 * Get multiple solana accounts at once, handling 100 accounts per batch.
 *
 * @param accounts An array of PublicKey instances representing the accounts to fetch.
 * @returns A promise that resolves to a record of PublicKey to AccountInfo.
 */
export declare function getMultipleAccountsInfo(accounts: web3.PublicKey[]): Promise<FullAccountInfo>;
export declare function getSlot(): Promise<number>;
//# sourceMappingURL=solana.d.ts.map