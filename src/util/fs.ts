import * as fs from 'fs';
import * as path from 'path';
import * as web3 from '@solana/web3.js';
import { FullAccountInfo, FullAccountInfoFile } from './solana';

/**
 * Find all .gitignore instances and compile files to ignore for scanning
 */
export function compileIgnoreFiles(startDir: string) {
  const ignoreFiles: string[] = [];

  function searchDirectory(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (file === '.gitignore') {
        const gitignore = fs.readFileSync(file).toString().split('\n').map(v => v.trim());
        for (const ignoreFile of gitignore) {
          if (!ignoreFiles.includes(ignoreFile)) {
            ignoreFiles.push(ignoreFile);
          }
        }
      }
    }
  }

  searchDirectory(startDir);
  return ignoreFiles;
}

/**
 * Recursively search for a file name in a directory and its subdirectories.
 * @param startDir The directory to start the search from.
 * @param fileNames The name of file(s) to search for.
 * @returns An array of file paths matching the given file name.
 */
export function findFilesRecursively(
  startDir: string,
  fileNames: string[],
  ignore: string[] = [],
): string[] {
  const foundFiles: string[] = [];
  function searchDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = fs.statSync(filePath);
      // Ignore file if marked as ignore
      if (ignore.includes(file)) {
        continue;
      }
      if (fileStat.isDirectory()) {
        // Recursively search subdirectories
        searchDirectory(filePath);
      } else if (fileNames.includes(file)) {
        // If the file name matches, add it to the results
        foundFiles.push(filePath);
      }
    }
  }

  searchDirectory(startDir);
  return foundFiles;
}

/**
 * Create a file with the specified file name and content synchronously.
 *
 * @param fileName The name of the file to be created.
 * @param templatePath The path of template to be copied.
 */
export function createFile(fileName: string, templatePath: string): void {
  const fileContent = fs.readFileSync(templatePath);
  fs.writeFileSync(fileName, fileContent);
}

/**
 * Create executable file from given content
 *
 * @param fileName
 * @param content
 */
export function createScript(fileName: string, content: string) {
  fs.writeFileSync(fileName, content, { mode: 0o755 });
}

/**
 * Remove files and folders recursively
 *
 * @param folderPath
 */
export function deleteFolderRecursive(folderPath: string): void {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);

      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for subdirectories
        deleteFolderRecursive(curPath);
      } else {
        // Delete the file
        fs.unlinkSync(curPath);
      }
    });

    // Delete the folder itself
    fs.rmdirSync(folderPath);
  }
}

export type Pda = {
  program: string,
  seeds: string[],
}

export type Schema = {
  version: string,
  accounts: Record<string, string>,
  pda: Record<string, Pda>
};

/**
 * Cache folder must exist (create if not exist)
 *
 * @param cacheFolder
 */
function cacheFolderMustExist(cacheFolder: string) {
  try {
    fs.accessSync(cacheFolder);
  } catch {
    fs.mkdirSync(cacheFolder, { recursive: true });
  }
}

/**
 * Write accounts to cache folder
 *
 * @param schema
 * @param accountInfos
 */
export function writeAccountsToCacheFolder(cacheFolder: string, accountInfos: FullAccountInfo) {
  cacheFolderMustExist(cacheFolder);
  for (let key in accountInfos) {
    const accountInfo = accountInfos[key];
    const file = `${cacheFolder}/${key}.json`;
    if (accountInfo !== null) {
      fs.writeFileSync(file, JSON.stringify({
        pubkey: key,
        account: {
          lamports: accountInfo.lamports,
          data: [
            accountInfo.data.toString('base64'),
            "base64"
          ],
          owner: accountInfo.owner,
          executable: accountInfo.executable,
          rentEpoch: 0,
        }
      }, null, 2))
    }
  }
}

/**
 * Read account from cache
 *
 * @param cacheFolder
 * @param address
 */
export function readAccount(cacheFolder: string, address: string): FullAccountInfo {
  cacheFolderMustExist(cacheFolder);
  const filePath = path.resolve(cacheFolder, `${address}.json`);
  const file = fs.readFileSync(filePath).toString('utf-8');
  const json: FullAccountInfoFile = JSON.parse(file);
  const result: FullAccountInfo = {};
  result[json.pubkey] = {
    ...json.account,
    data: Buffer.from(json.account.data[0], 'base64'),
    owner: new web3.PublicKey(json.account.owner),
  }
  return result;
}

export function createEmptyAccount(cacheFolder: string, address: string, accountSize: number, owner: web3.PublicKey, lamports: number) {
  cacheFolderMustExist(cacheFolder);
  const account: FullAccountInfo = {};
  account[address] = {
    executable: false,
    owner,
    lamports,
    data: Buffer.alloc(accountSize),
    rentEpoch: 0,
  }
  writeAccountsToCacheFolder(cacheFolder, account);
}

/**
 * Skip accounts that are already downloaded
 *
 * @param schema
 * @param accounts
 * @returns
 */
export function skipDownloadedAccounts(cacheFolder: string, accounts: web3.PublicKey[]) {
  cacheFolderMustExist(cacheFolder);
  const files = fs.readdirSync(cacheFolder);
  const fileNames = files.map(v => v.split('.')[0]);
  const filtered: web3.PublicKey[] = [];
  for (const account of accounts) {
    if (!fileNames.includes(account.toString())) {
      filtered.push(account);
    }
  }
  return filtered;
}

/**
 * Read solana test validator template
 */
export function readTestValidatorTemplate(): string {
  const target = path.resolve(`${__dirname}/../../templates/solana-test-validator.template.sh`);
  return fs.readFileSync(target).toString('utf-8');
}

/**
 * Map cached accounts to accounts list
 */
export function mapAccountsFromCache(cacheFolder: string, accounts: web3.PublicKey[]): Record<string, string | null> {
  cacheFolderMustExist(cacheFolder);
  const files = fs.readdirSync(cacheFolder);
  const fileNames = files.map(v => v.split('.')[0]);
  const mapping: Record<string, string | null> = {}
  for (const account of accounts) {
    if (fileNames.includes(account.toString())) {
      mapping[account.toString()] = `${cacheFolder}/${account.toString()}.json`
    } else {
      mapping[account.toString()] = null;
    }
  }
  for (const file of files) {
    const [key, ext] = file.split('.');
    if (ext === 'json') {
      mapping[key] = `${cacheFolder}/${file}`;
    }
  }
  return mapping;
}