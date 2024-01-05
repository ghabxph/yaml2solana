import * as fs from 'fs';
import * as path from 'path';
import * as web3 from '@solana/web3.js';
import { Yaml2SolanaClass } from '../sdk/Yaml2Solana';
import { FullAccountInfo } from './solana';

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
 * Read yaml2solana schema config yaml file
 */
export function readSchema(schemaFile: string): Yaml2SolanaClass {
  return new Yaml2SolanaClass(schemaFile)
}

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
export function writeAccountsToCacheFolder(schema: Yaml2SolanaClass, accountInfos: FullAccountInfo) {
  const cacheFolder = path.resolve(schema.projectDir, schema.localDevelopment.accountsFolder);
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
          rentEpoch: accountInfo.rentEpoch,
        }
      }, null, 2))
    }
  }
}

/**
 * Skip accounts that are already downloaded
 *
 * @param schema
 * @param accounts
 * @returns
 */
export function skipDownloadedAccounts(schema: Yaml2SolanaClass, accounts: web3.PublicKey[]) {
  const cacheFolder = path.resolve(schema.projectDir, schema.localDevelopment.accountsFolder);
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
  return fs.readFileSync(`${__dirname}/../../../templates/solana-test-validator.template.sh`).toString('utf-8');
}

/**
 * Map cached accounts to accounts list
 */
export function mapAccountsFromCache(schema: Yaml2SolanaClass, downloadedAccounts: FullAccountInfo): Record<string, string | null> {
  const cacheFolder = path.resolve(schema.projectDir, schema.localDevelopment.accountsFolder);
  cacheFolderMustExist(cacheFolder);
  const accounts = schema.accounts.getAccounts();
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