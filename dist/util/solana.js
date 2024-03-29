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
exports.getSlot = exports.getMultipleAccountsInfo = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const connection = new web3.Connection("https://api.mainnet-beta.solana.com");
/**
 * Splits an array into chunks of a specific size.
 *
 * @param array The input array to be chunked
 * @param size The size of every chunk
 */
function chunkArray(array, size) {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
}
/**
 * Get multiple solana accounts at once, handling 100 accounts per batch.
 *
 * @param accounts An array of PublicKey instances representing the accounts to fetch.
 * @returns A promise that resolves to a record of PublicKey to AccountInfo.
 */
async function getMultipleAccountsInfo(accounts) {
    // Split the accounts array into chunks of 100
    const accountChunks = chunkArray(accounts, 100);
    // Create a promise for each chunk to fetch its accounts info
    const promises = accountChunks.map(async (chunk) => {
        const accountInfos = await connection.getMultipleAccountsInfo(chunk);
        return accountInfos.map((info, idx) => {
            if (info === null) {
                console.log(`Account ${chunk[idx].toString()} does not exist.`);
            }
            else {
                console.log(`Account ${chunk[idx].toString()} downloaded successfully.`);
            }
            return ({
                publicKey: chunk[idx].toString(), // Convert PublicKey to string for the map key
                accountInfo: info,
            });
        });
    });
    // Wait for all promises to resolve and flatten the results
    const results = (await Promise.all(promises)).flat();
    // const results = ([] as typeof promises[number][]).concat(...promises);
    // Transform the array of results into a record (map) of PublicKey to AccountInfo
    const record = {};
    for (const { publicKey, accountInfo } of results) {
        record[publicKey] = accountInfo;
    }
    console.log();
    return record;
}
exports.getMultipleAccountsInfo = getMultipleAccountsInfo;
async function getSlot() {
    // Try to get mainnet slot
    return await connection.getSlot().catch(() => {
        console.log('Failed to fetch recent slot. Using the fallback value: 145945910');
        return 157121934;
    });
}
exports.getSlot = getSlot;
