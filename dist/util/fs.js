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
exports.mapAccountsFromCache = exports.readTestValidatorTemplate = exports.skipDownloadedAccounts = exports.createEmptyAccount = exports.readAccount = exports.writeAccountsToCacheFolder = exports.deleteFolderRecursive = exports.createScript = exports.createFile = exports.findFilesRecursively = exports.compileIgnoreFiles = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const web3 = __importStar(require("@solana/web3.js"));
/**
 * Find all .gitignore instances and compile files to ignore for scanning
 */
function compileIgnoreFiles(startDir) {
    const ignoreFiles = [];
    function searchDirectory(dir) {
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
exports.compileIgnoreFiles = compileIgnoreFiles;
/**
 * Recursively search for a file name in a directory and its subdirectories.
 * @param startDir The directory to start the search from.
 * @param fileNames The name of file(s) to search for.
 * @returns An array of file paths matching the given file name.
 */
function findFilesRecursively(startDir, fileNames, ignore = []) {
    const foundFiles = [];
    function searchDirectory(dir) {
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
            }
            else if (fileNames.includes(file)) {
                // If the file name matches, add it to the results
                foundFiles.push(filePath);
            }
        }
    }
    searchDirectory(startDir);
    return foundFiles;
}
exports.findFilesRecursively = findFilesRecursively;
/**
 * Create a file with the specified file name and content synchronously.
 *
 * @param fileName The name of the file to be created.
 * @param templatePath The path of template to be copied.
 */
function createFile(fileName, templatePath) {
    const fileContent = fs.readFileSync(templatePath);
    fs.writeFileSync(fileName, fileContent);
}
exports.createFile = createFile;
/**
 * Create executable file from given content
 *
 * @param fileName
 * @param content
 */
function createScript(fileName, content) {
    fs.writeFileSync(fileName, content, { mode: 0o755 });
}
exports.createScript = createScript;
/**
 * Remove files and folders recursively
 *
 * @param folderPath
 */
function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // Recursive call for subdirectories
                deleteFolderRecursive(curPath);
            }
            else {
                // Delete the file
                fs.unlinkSync(curPath);
            }
        });
        // Delete the folder itself
        fs.rmdirSync(folderPath);
    }
}
exports.deleteFolderRecursive = deleteFolderRecursive;
/**
 * Cache folder must exist (create if not exist)
 *
 * @param cacheFolder
 */
function cacheFolderMustExist(cacheFolder) {
    try {
        fs.accessSync(cacheFolder);
    }
    catch {
        fs.mkdirSync(cacheFolder, { recursive: true });
    }
}
/**
 * Write accounts to cache folder
 *
 * @param schema
 * @param accountInfos
 */
function writeAccountsToCacheFolder(cacheFolder, accountInfos) {
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
            }, null, 2));
        }
    }
}
exports.writeAccountsToCacheFolder = writeAccountsToCacheFolder;
/**
 * Read account from cache
 *
 * @param cacheFolder
 * @param address
 */
function readAccount(cacheFolder, address) {
    cacheFolderMustExist(cacheFolder);
    const filePath = path.resolve(cacheFolder, `${address}.json`);
    const file = fs.readFileSync(filePath).toString('utf-8');
    const json = JSON.parse(file);
    const result = {};
    result[json.pubkey] = {
        ...json.account,
        data: Buffer.from(json.account.data[0], 'base64'),
        owner: new web3.PublicKey(json.account.owner),
    };
    return result;
}
exports.readAccount = readAccount;
function createEmptyAccount(cacheFolder, address, accountSize, owner, lamports) {
    cacheFolderMustExist(cacheFolder);
    const account = {};
    account[address] = {
        executable: false,
        owner,
        lamports,
        data: Buffer.alloc(accountSize),
        rentEpoch: 0,
    };
    writeAccountsToCacheFolder(cacheFolder, account);
}
exports.createEmptyAccount = createEmptyAccount;
/**
 * Skip accounts that are already downloaded
 *
 * @param schema
 * @param accounts
 * @returns
 */
function skipDownloadedAccounts(cacheFolder, accounts) {
    cacheFolderMustExist(cacheFolder);
    const files = fs.readdirSync(cacheFolder);
    const fileNames = files.map(v => v.split('.')[0]);
    const filtered = [];
    for (const account of accounts) {
        if (!fileNames.includes(account.toString())) {
            filtered.push(account);
        }
    }
    return filtered;
}
exports.skipDownloadedAccounts = skipDownloadedAccounts;
/**
 * Read solana test validator template
 */
function readTestValidatorTemplate() {
    const target = path.resolve(`${__dirname}/../../templates/solana-test-validator.template.sh`);
    return fs.readFileSync(target).toString('utf-8');
}
exports.readTestValidatorTemplate = readTestValidatorTemplate;
/**
 * Map cached accounts to accounts list
 */
function mapAccountsFromCache(cacheFolder, accounts) {
    cacheFolderMustExist(cacheFolder);
    const files = fs.readdirSync(cacheFolder);
    const fileNames = files.map(v => v.split('.')[0]);
    const mapping = {};
    for (const account of accounts) {
        if (fileNames.includes(account.toString())) {
            mapping[account.toString()] = `${cacheFolder}/${account.toString()}.json`;
        }
        else {
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
exports.mapAccountsFromCache = mapAccountsFromCache;
