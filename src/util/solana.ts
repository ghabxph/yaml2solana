import * as web3 from "@solana/web3.js";

const connection = new web3.Connection("https://api.mainnet-beta.solana.com");

/**
 * Splits an array into chunks of a specific size.
 *
 * @param array The input array to be chunked
 * @param size The size of every chunk
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunkedArr = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
}

export type FullAccountInfo = Record<string, web3.AccountInfo<Buffer> | null>;

/**
 * Get multiple solana accounts at once, handling 100 accounts per batch.
 *
 * @param accounts An array of PublicKey instances representing the accounts to fetch.
 * @returns A promise that resolves to a record of PublicKey to AccountInfo.
 */
export async function getMultipleAccountsInfo(accounts: web3.PublicKey[]): Promise<FullAccountInfo> {
  // Split the accounts array into chunks of 100
  const accountChunks = chunkArray(accounts, 100);

  console.log();
  console.log('Downloading solana accounts:');
  console.log('--------------------------------------------------------------');

  // Create a promise for each chunk to fetch its accounts info
  const promises = accountChunks.map(async (chunk, index) => {
    const accountInfos = await connection.getMultipleAccountsInfo(chunk);
    return accountInfos.map((info, idx) => {
      if (info === null) {
        console.log(`Account ${chunk[idx].toString()} does not exist.`);
      } else {
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

  // Transform the array of results into a record (map) of PublicKey to AccountInfo
  const record: Record<string, web3.AccountInfo<Buffer> | null> = {};
  for (const { publicKey, accountInfo } of results) {
    record[publicKey] = accountInfo;
  }

  console.log();

  return record;
}

export async function getSlot(): Promise<number> {
  // Try to get mainnet slot
  return await connection.getSlot().catch(() => {
    console.log('Failed to fetch recent slot. Using the fallback value: 145945910');
    return 157121934;
  });
}