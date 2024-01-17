import * as web3 from '@solana/web3.js';
import { FullAccountInfo } from './solana';
/**
 * Find all .gitignore instances and compile files to ignore for scanning
 */
export declare function compileIgnoreFiles(startDir: string): string[];
/**
 * Recursively search for a file name in a directory and its subdirectories.
 * @param startDir The directory to start the search from.
 * @param fileNames The name of file(s) to search for.
 * @returns An array of file paths matching the given file name.
 */
export declare function findFilesRecursively(startDir: string, fileNames: string[], ignore?: string[]): string[];
/**
 * Create a file with the specified file name and content synchronously.
 *
 * @param fileName The name of the file to be created.
 * @param templatePath The path of template to be copied.
 */
export declare function createFile(fileName: string, templatePath: string): void;
/**
 * Create executable file from given content
 *
 * @param fileName
 * @param content
 */
export declare function createScript(fileName: string, content: string): void;
/**
 * Remove files and folders recursively
 *
 * @param folderPath
 */
export declare function deleteFolderRecursive(folderPath: string): void;
export type Pda = {
    program: string;
    seeds: string[];
};
export type Schema = {
    version: string;
    accounts: Record<string, string>;
    pda: Record<string, Pda>;
};
/**
 * Write accounts to cache folder
 *
 * @param schema
 * @param accountInfos
 */
export declare function writeAccountsToCacheFolder(cacheFolder: string, accountInfos: FullAccountInfo): void;
/**
 * Read account from cache
 *
 * @param cacheFolder
 * @param address
 */
export declare function readAccount(cacheFolder: string, address: string): FullAccountInfo;
export declare function createEmptyAccount(cacheFolder: string, address: string, accountSize: number, owner: web3.PublicKey, lamports: number): void;
/**
 * Skip accounts that are already downloaded
 *
 * @param schema
 * @param accounts
 * @returns
 */
export declare function skipDownloadedAccounts(cacheFolder: string, accounts: web3.PublicKey[]): web3.PublicKey[];
/**
 * Read solana test validator template
 */
export declare function readTestValidatorTemplate(): string;
/**
 * Map cached accounts to accounts list
 */
export declare function mapAccountsFromCache(cacheFolder: string, accounts: web3.PublicKey[]): Record<string, string | null>;
//# sourceMappingURL=fs.d.ts.map