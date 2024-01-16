/// <reference types="node" />
import * as web3 from "@solana/web3.js";
export type FullAccountInfo = Record<string, web3.AccountInfo<Buffer> | null>;
export type FullAccountInfoFile = {
    pubkey: string;
    account: {
        /** `true` if this account's data contains a loaded program */
        executable: boolean;
        /** Identifier of the program that owns the account */
        owner: string;
        /** Number of lamports assigned to the account */
        lamports: number;
        /** Optional data assigned to the account */
        data: [string, string];
        /** Optional rent epoch info for account */
        rentEpoch: number;
    };
};
/**
 * Get multiple solana accounts at once, handling 100 accounts per batch.
 *
 * @param accounts An array of PublicKey instances representing the accounts to fetch.
 * @returns A promise that resolves to a record of PublicKey to AccountInfo.
 */
export declare function getMultipleAccountsInfo(accounts: web3.PublicKey[]): Promise<FullAccountInfo>;
export declare function getSlot(): Promise<number>;
//# sourceMappingURL=solana.d.ts.map