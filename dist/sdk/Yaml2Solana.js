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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.Yaml2SolanaClass = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const util = __importStar(require("../util"));
const find_process_1 = __importDefault(require("find-process"));
const child_process_1 = require("child_process");
const child_process_2 = require("child_process");
const AccountDecoder_1 = require("./AccountDecoder");
const DynamicInstruction_1 = require("./DynamicInstruction");
const cli_1 = require("../cli");
class Yaml2SolanaClass {
    constructor(config) {
        /**
         * Global variable
         */
        this._global = {};
        this.localnetConnection = new web3.Connection("http://127.0.0.1:8899");
        // Read the YAML file.
        const yamlFile = fs.readFileSync(config, 'utf8');
        this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');
        this._parsedYaml = yaml.parse(yamlFile);
        // Set named accounts to global variable
        this.setNamedAccountsToGlobal(this._parsedYaml);
        // Set known solana accounts (not meant to be downloaded)
        this.setKnownAccounts();
        // Generate account decoders
        this.generateAccountDecoders();
        // Generate dynamic accoutns
        this.generateDynamicAccounts();
    }
    /**
     * Get all global variables
     */
    get global() {
        return this._global;
    }
    /**
     * Start CLI
     */
    cli() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, cli_1.cliEntrypoint)(this);
        });
    }
    /**
     * Parsed yaml file
     */
    get parsedYaml() {
        return this._parsedYaml;
    }
    /**
     * Get account decoders
     */
    get accountDecoders() {
        const result = [];
        for (const decoder in this.parsedYaml.accountDecoder) {
            result.push(decoder);
        }
        return result;
    }
    /**
     * Resolve variables
     * @param params
     */
    resolve(params) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            let onlyResolve;
            // Resolve test wallets
            this.resolveTestWallets(this._parsedYaml);
            // Resolve PDAs
            onlyResolve = (_a = params.onlyResolve.thesePdas) === null || _a === void 0 ? void 0 : _a.map(v => this.sanitizeDollar(v));
            this.resolvePda(onlyResolve);
            // Resolve instructions
            onlyResolve = (_b = params.onlyResolve.theseInstructions) === null || _b === void 0 ? void 0 : _b.map(v => this.sanitizeDollar(v));
            this.resolveInstructions(onlyResolve);
            // Resolve instruction bundles
            onlyResolve = (_c = params.onlyResolve.theseInstructionBundles) === null || _c === void 0 ? void 0 : _c.map(v => this.sanitizeDollar(v));
            yield this.resolveInstructionBundles(onlyResolve);
        });
    }
    /**
     * Get accounts from solana instructions
     *
     * @param ix
     */
    getAccountsFromInstruction(ixs) {
        const uniqueKeys = {};
        const result = [];
        for (const ix of ixs) {
            uniqueKeys[ix.programId.toString()] = ix.programId;
            for (const accountMeta of ix.keys) {
                uniqueKeys[accountMeta.pubkey.toString()] = accountMeta.pubkey;
            }
        }
        for (const k in uniqueKeys) {
            result.push(uniqueKeys[k]);
        }
        return result;
    }
    /**
     * @param ix
     * @returns
     */
    isObjectInstruction(ix) {
        return typeof ix === 'object' && typeof ix.programId !== 'undefined';
    }
    /**
     * @param ix
     * @returns
     */
    isObjectResolvedInstructionBundles(ix) {
        return ix.resolvedInstructionBundle === true;
    }
    /**
     * Create localnet transaction
     *
     * @param description
     * @param ixns
     * @param alts
     * @param payer
     * @param signers
     * @returns
     */
    createTransaction(description, ixns, alts, payer, signers) {
        const _ixns = [];
        for (const ix of ixns) {
            if (this.isObjectInstruction(ix)) {
                _ixns.push(ix);
            }
            else if (typeof ix === 'string') {
                const _ix = this.getVar(ix);
                if (this.isObjectInstruction(ix)) {
                    _ixns.push(_ix);
                }
                else if (this.isObjectResolvedInstructionBundles(_ix)) {
                    const bundle = _ix;
                    _ixns.push(...bundle.ixs);
                    alts.push(...bundle.alts.map(alt => alt.toString()));
                }
                else {
                    console.log(`${ix}`, _ix);
                    throw `Variable ${ix} is not a valid transaction instruction`;
                }
            }
            else {
                throw 'Invalid solana transaction instruction';
            }
        }
        let _payer;
        if (typeof payer === 'string') {
            const __payer = this.getVar(payer);
            const isPublicKey = typeof __payer === 'object' && typeof __payer.toBuffer === 'function' && __payer.toBuffer().length === 32;
            const isKeypair = typeof __payer === 'object' && typeof __payer.publicKey !== undefined && typeof __payer.secretKey !== undefined;
            if (isPublicKey || isKeypair) {
                if (isPublicKey) {
                    _payer = __payer;
                }
                else {
                    _payer = __payer.publicKey;
                }
            }
            else {
                throw `Variable ${payer} is not a valid public key`;
            }
        }
        else {
            _payer = payer;
        }
        const _signers = signers.map(signer => {
            if (typeof signer === 'string') {
                const _signer = this.getVar(signer);
                if (typeof _signer === 'undefined' || typeof _signer !== 'object') {
                    throw `Variable ${signer} is not a valid Signer instance`;
                }
                return _signer;
            }
            else if (typeof signer === 'object' && typeof signer.publicKey !== 'undefined' && typeof signer.secretKey !== 'undefined') {
                return signer;
            }
            else {
                throw `Invalid solana signer instance`;
            }
        });
        return new Transaction(description, this.localnetConnection, _ixns, alts, _payer, _signers);
    }
    /**
     * Get signers from given instruction
     *
     * @param ixLabel
     */
    getSignersFromIx(ixLabel) {
        const result = [];
        const ixDef = this.getIxDefinition(ixLabel);
        const payer = this.getVar(ixDef.payer);
        let isPayerSigner = false;
        for (const meta of ixDef.accounts) {
            const _meta = meta.split(',');
            const [account] = _meta;
            if (_meta.includes('signer')) {
                const signer = this.getVar(account);
                result.push(signer);
                if (Buffer.from(signer.secretKey).equals(Buffer.from(payer.secretKey))) {
                    isPayerSigner = true;
                }
            }
        }
        if (!isPayerSigner) {
            result.push(payer);
        }
        return result;
    }
    /**
     * @returns instructions defined in yaml
     */
    getInstructions() {
        const instructions = [];
        for (const instruction in this._parsedYaml.instructionDefinition) {
            instructions.push(instruction);
        }
        return instructions;
    }
    /**
     * @returns instruction bundle labels defined in yaml
     */
    getInstructionBundles() {
        const result = [];
        for (const label in this._parsedYaml.instructionBundle) {
            result.push(label);
        }
        return result;
    }
    /**
     * Resolve instruction bundle payer
     *
     * @param label Instruction bundle label
     * @returns
     */
    resolveInstructionBundlePayer(label) {
        const payer = this._parsedYaml.instructionBundle[label].payer;
        let kp;
        if (payer.startsWith('$')) {
            kp = this.getVar(payer);
        }
        else {
            // Assume that value is base64 encoded keypair
            kp = web3.Keypair.fromSecretKey(Buffer.from(payer, 'base64'));
        }
        return kp.publicKey;
    }
    /**
     * Resolve instruction bundle signers from instructions
     *
     * @param label Instruction bundle label
     * @returns
     */
    resolveInstructionBundleSigners(label) {
        const result = [];
        const signers = [];
        const dynIxSigners = [];
        label = label.startsWith('$') ? label.substring(1) : label;
        const ixLabels = this._parsedYaml.instructionBundle[label].instructions.map(v => v.label.startsWith('$') ? v.label.substring(1) : v.label);
        for (const ixLabel of ixLabels) {
            let ixDef;
            try {
                ixDef = this.getIxDefinition(ixLabel);
            }
            catch (_a) {
                this.getDynamicInstruction(ixLabel);
                const dynIx = this.getVar(`$${ixLabel}`);
                const singleIx = dynIx.ix;
                const multipleIx = dynIx.ixs;
                if (singleIx !== undefined) {
                    dynIxSigners.push(...singleIx.keys.filter(meta => meta.isSigner).map(meta => meta.pubkey));
                }
                else if (multipleIx !== undefined) {
                    multipleIx.map(ix => {
                        dynIxSigners.push(...ix.keys.filter(meta => meta.isSigner).map(meta => meta.pubkey));
                    });
                }
                else {
                    throw `Dynamic instruction: ${ixLabel} is not yet defined.`;
                }
                continue;
            }
            ixDef.accounts.map(meta => {
                const _meta = meta.split(',');
                if (_meta.includes('signer')) {
                    const [signer] = _meta;
                    signers.push(signer);
                }
            });
        }
        signers.filter((v, i, s) => s.indexOf(v) === i).map(signer => {
            if (signer.startsWith('$')) {
                result.push(this.getVar(signer));
            }
            else {
                throw `Signer ${signer} must be a variable (starts with '$' symbol)`;
            }
        });
        for (const testWallet in this._parsedYaml.localDevelopment.testWallets) {
            const kp = this.getVar(`$${testWallet}`);
            for (const dynIxSigner of dynIxSigners) {
                if (kp.publicKey.equals(dynIxSigner)) {
                    result.push(kp);
                }
            }
        }
        return result.filter((v, i, s) => s.indexOf(v) === i);
    }
    /**
     * @returns accounts from schema
     */
    getAccounts() {
        const accounts = [];
        for (const key in this._parsedYaml.accounts) {
            const [pk] = this._parsedYaml.accounts[key].split(',');
            accounts.push(new web3.PublicKey(pk));
        }
        this._parsedYaml.accountsNoLabel.map(v => {
            const [pk] = v.split(',');
            accounts.push(new web3.PublicKey(pk));
        });
        return accounts;
    }
    /**
     * @returns program accounts from schema
     */
    getProgramAccounts() {
        return this.getFileAccount('so');
    }
    /**
     * @returns json accounts from schema
     */
    getJsonAccounts() {
        return this.getFileAccount('json');
    }
    /**
     * Batch download accounts from mainnet
     *
     * @param forceDownload
     */
    downloadAccountsFromMainnet(forceDownload) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log();
            console.log('Downloading solana accounts:');
            console.log('--------------------------------------------------------------');
            const cacheFolder = path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder);
            // 1. Get accounts from schema
            let accounts = this.getAccounts();
            // 2. Skip accounts that are already downloaded
            accounts = util.fs.skipDownloadedAccounts(cacheFolder, accounts);
            // 3. Force include accounts that are in forceDownloaded
            accounts.push(...forceDownload);
            accounts = accounts.filter((v, i, s) => s.indexOf(v) === i);
            // 4. Skip accounts that are defined in localDevelopment.skipCache
            accounts = accounts.filter((v, i) => !this._parsedYaml.localDevelopment.skipCache.includes(v.toString()));
            // 5. Fetch multiple accounts from mainnet at batches of 100
            const accountInfos = yield util.solana.getMultipleAccountsInfo(accounts);
            // 6. Find programs that are executable within account infos
            const executables = [];
            for (const key in accountInfos) {
                const accountInfo = accountInfos[key];
                if (accountInfo === null)
                    continue;
                if (accountInfo.executable) {
                    const executable = new web3.PublicKey(accountInfo.data.subarray(4, 36));
                    try {
                        fs.accessSync(path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder, `${executable}.json`));
                    }
                    catch (_a) {
                        executables.push(executable);
                    }
                }
            }
            const executableData = yield util.solana.getMultipleAccountsInfo(executables);
            for (const key in executableData) {
                accountInfos[key] = executableData[key];
            }
            // 7. Write downloaded account infos from mainnet in designated cache folder
            util.fs.writeAccountsToCacheFolder(cacheFolder, accountInfos);
            // 8. Map accounts to downloaded to .accounts
            return util.fs.mapAccountsFromCache(cacheFolder, this.getAccounts());
        });
    }
    /**
     * Find running instance of solana-test-validator and get its PID
     */
    findTestValidatorProcess() {
        return __awaiter(this, void 0, void 0, function* () {
            const list = yield (0, find_process_1.default)('name', 'solana-test-validator');
            for (const item of list) {
                if (item.name === 'solana-test-validator') {
                    return item.pid;
                }
            }
            throw `Cannot find process named \'solana-test-validator\'`;
        });
    }
    /**
     * Execute transactions locally
     *
     * @param txns Transactions to execute
     * @param skipRedownload Skip these accounts for re-download
     * @param keepRunning Whether to keep test validator running
     */
    executeTransactionsLocally(params) {
        return __awaiter(this, void 0, void 0, function* () {
            let { txns, skipRedownload, keepRunning, cluster, runFromExistingLocalnet, } = params;
            skipRedownload = skipRedownload === undefined ? [] : skipRedownload;
            keepRunning = keepRunning === undefined ? true : keepRunning;
            cluster = cluster === undefined ? 'http://127.0.0.1:8899' : cluster;
            runFromExistingLocalnet = runFromExistingLocalnet === undefined ? false : runFromExistingLocalnet;
            if (!runFromExistingLocalnet) {
                // Step 1: Run test validator
                yield this.runTestValidator(txns, skipRedownload);
                yield (() => new Promise(resolve => setTimeout(() => resolve(0), 1000)))();
            }
            // Step 2: Execute transactions
            const response = [];
            for (const key in txns) {
                // Compile tx to versioned transaction
                const tx = yield txns[key].compileToVersionedTransaction();
                const connection = (cluster === 'http://127.0.0.1:8899') ? txns[key].connection : new web3.Connection(cluster);
                // If we like to have test validator running, then we want to have skipPreflight enabled
                if (keepRunning) {
                    const sig = yield connection.sendTransaction(tx, { skipPreflight: true });
                    console.log(`TX: ${txns[key].description}`);
                    console.log(`-------------------------------------------------------------------`);
                    console.log(`tx sig ${sig}`);
                    console.log(`localnet explorer: https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
                    console.log(``);
                    const transactionResponse = (yield connection.getTransaction(sig, {
                        commitment: "confirmed",
                        maxSupportedTransactionVersion: 0,
                    }));
                    response.push({ txid: sig, transactionResponse });
                }
                else {
                    const sig = yield connection.sendTransaction(tx);
                    console.log(`TX: ${txns[key].description}`);
                    console.log(`-------------------------------------------------------------------`);
                    console.log(`tx sig ${sig}`);
                    const transactionResponse = (yield connection.getTransaction(sig, {
                        commitment: "confirmed",
                        maxSupportedTransactionVersion: 0,
                    }));
                    response.push({ txid: sig, transactionResponse });
                }
            }
            // Terminate test validator if specified to die after running transactions
            if (!keepRunning) {
                this.killTestValidator();
            }
            return response;
        });
    }
    /**
     * Run test validator
     *
     * @param txns
     * @param skipRedownload
     * @returns
     */
    runTestValidator(txns = [], skipRedownload = []) {
        return __awaiter(this, void 0, void 0, function* () {
            // Step 1: Force download accounts from instructions on mainnet
            let accountsToDownload = [];
            txns.map(tx => {
                accountsToDownload.push(...tx.getAccountsFromInstructions());
                accountsToDownload.push(...tx.alts.map(alt => new web3.PublicKey(alt)));
            });
            accountsToDownload = accountsToDownload.filter((v, i, s) => s.indexOf(v) === i && !skipRedownload.includes(v));
            const mapping = yield this.downloadAccountsFromMainnet(accountsToDownload);
            // Step 2: Override lamport amount from test wallet
            const cacheFolder = path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder);
            for (const walletId in this._parsedYaml.localDevelopment.testWallets) {
                const testWallet = this._parsedYaml.localDevelopment.testWallets[walletId];
                const kp = web3.Keypair.fromSecretKey(Buffer.from(testWallet.privateKey, 'base64'));
                const pubkey = kp.publicKey;
                const account = {};
                const lamports = parseInt((parseFloat(testWallet.solAmount) * 1000000000).toString());
                account[`${pubkey}`] = {
                    executable: false,
                    owner: web3.SystemProgram.programId,
                    lamports,
                    data: Buffer.alloc(0),
                    rentEpoch: 0,
                };
                util.fs.writeAccountsToCacheFolder(cacheFolder, account);
                const walletPath = path.resolve(cacheFolder, `${pubkey}.json`);
                mapping[`${pubkey}`] = walletPath;
            }
            // Step 3: Override account data
            for (const testAccount of this._parsedYaml.localDevelopment.testAccounts) {
                const decoder = this.getVar(`$${testAccount.schema}`);
                let key;
                if (testAccount.key.startsWith('$')) {
                    const pubkeyOrKp = this.getVar(testAccount.key);
                    if (typeof pubkeyOrKp.publicKey !== 'undefined') {
                        key = pubkeyOrKp.publicKey.toBase58();
                    }
                    else if (typeof pubkeyOrKp.toBase58 === 'function') {
                        key = pubkeyOrKp.toBase58();
                    }
                    else {
                        throw `Cannot resolve ${testAccount.key}`;
                    }
                }
                else {
                    key = testAccount.key;
                }
                if (testAccount.createNew) {
                    util.fs.createEmptyAccount(cacheFolder, key, testAccount.hack.accountSize, new web3.PublicKey(testAccount.hack.owner), testAccount.hack.lamports);
                    for (const override of testAccount.hack.overrides) {
                        const account = util.fs.readAccount(cacheFolder, key);
                        account[key].data.write(override.data, override.offset, 'base64');
                        util.fs.writeAccountsToCacheFolder(cacheFolder, account);
                    }
                }
                const account = util.fs.readAccount(cacheFolder, key);
                decoder.data = account[key].data;
                for (const id in testAccount.params) {
                    const value = testAccount.params[id];
                    if (typeof value === 'string' && value.startsWith('$')) {
                        const _value = this.getVar(value);
                        decoder.setValue(`$${id}`, _value);
                    }
                    else {
                        decoder.setValue(`$${id}`, value);
                    }
                }
                account[key].data = decoder.data;
                util.fs.writeAccountsToCacheFolder(cacheFolder, account);
                const accountPath = path.resolve(cacheFolder, `${key}.json`);
                mapping[`${key}`] = accountPath;
            }
            // Step 4: Run test validator
            return yield this.runTestValidator2(mapping);
        });
    }
    /**
     * Kill test validator
     */
    killTestValidator() {
        const command = `kill -9 ${this.testValidatorPid}`;
        (0, child_process_1.exec)(command, (error, _stdout, stderr) => {
            if (error) {
                // console.error(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                // console.error(`Stderr: ${stderr}`);
                return;
            }
            console.log(`Process with PID ${this.testValidatorPid} has been killed.`);
            this.testValidatorPid = undefined;
        });
    }
    /**
     * Gets resolved instruction
     *
     * @param name
     * @returns
     */
    getInstruction(name) {
        return this.getVar(name);
    }
    /**
     * Resolve given instruction
     *
     * @param ixLabel Instruction to execute
     * @returns available parameters that can be overriden for target instruction
     */
    resolveInstruction(ixLabel) {
        return __awaiter(this, void 0, void 0, function* () {
            // Find PDAs involved from given instruction
            const pdas = this.findPdasInvolvedInInstruction(ixLabel);
            // Then run resolve function
            yield this.resolve({
                onlyResolve: {
                    thesePdas: pdas,
                    theseInstructions: [ixLabel],
                    theseInstructionBundles: [],
                }
            });
        });
    }
    /**
     * Extract variable info
     *
     * @param pattern
     */
    extractVarInfo(pattern) {
        return util.typeResolver.extractVariableInfo(pattern, this._global);
    }
    /**
     * Set parameter value
     *
     * @param name
     * @param value
     */
    setParam(name, value) {
        if (name.startsWith('$')) {
            this.setVar(name.substring(1), value);
        }
        else {
            throw 'Variable should begin with dollar symbol `$`';
        }
    }
    /**
     * Alias to getVar
     *
     * @param name
     */
    getParam(name) {
        return this.getVar(name);
    }
    /**
     * Get ix definition
     *
     * @param ixLabel
     * @returns
     */
    getIxDefinition(ixLabel) {
        const ixDef = this._parsedYaml.instructionDefinition[ixLabel];
        if ('programId' in ixDef && 'data' in ixDef && 'accounts' in ixDef && 'payer' in ixDef) {
            return ixDef;
        }
        throw `${ixLabel} is not an InstructionDefinition`;
    }
    /**
     * Get ix definition
     *
     * @param ixLabel
     * @returns
     */
    getDynamicInstruction(ixLabel) {
        const ixDef = this._parsedYaml.instructionDefinition[ixLabel];
        if ('dynamic' in ixDef && 'params' in ixDef) {
            return ixDef;
        }
        throw `${ixLabel} is not an InstructionDefinition`;
    }
    /**
     * Store value to global variable
     *
     * @param name
     * @param value
     */
    setVar(name, value) {
        this._global[name] = value;
    }
    /**
     * Retrieve value from global variable
     *
     * @param name
     * @returns
     */
    getVar(name) {
        if (name.startsWith('$')) {
            const result = this._global[name.substring(1)];
            return result;
        }
        else {
            throw 'Variable should begin with dollar symbol `$`';
        }
    }
    /**
     * Find PDAs involved from given instruction
     *
     * @param ixLabel
     */
    findPdasInvolvedInInstruction(ixLabel) {
        ixLabel = ixLabel.startsWith('$') ? ixLabel.substring(1) : ixLabel;
        const result = [];
        const ixDef = this.getIxDefinition(ixLabel);
        for (const accountMeta of ixDef.accounts) {
            let [account] = accountMeta.split(',');
            if (!account.startsWith('$'))
                continue;
            account = account.substring(1);
            if (typeof this._parsedYaml.pda[account] !== 'undefined') {
                result.push(account);
            }
        }
        return result;
    }
    /**
     * @param extension File extension to check
     * @returns
     */
    getFileAccount(extension) {
        const accounts = [];
        for (const key in this._parsedYaml.accounts) {
            const [pk, filePath] = this._parsedYaml.accounts[key].split(',');
            if (filePath === undefined)
                continue;
            const filePathSplit = filePath.split('.');
            const _extension = filePathSplit[filePathSplit.length - 1];
            if (_extension === extension) {
                accounts.push({ key: new web3.PublicKey(pk), path: path.resolve(this.projectDir, filePath) });
            }
        }
        this._parsedYaml.accountsNoLabel.map(v => {
            const [pk, filePath] = v.split(',');
            if (filePath === undefined)
                return v;
            const filePathSplit = filePath.split('.');
            const _extension = filePathSplit[filePathSplit.length - 1];
            if (_extension === extension) {
                accounts.push({ key: new web3.PublicKey(pk), path: path.resolve(this.projectDir, filePath) });
            }
        });
        return accounts;
    }
    /**
     * Resolve test wallets
     *
     * @param parsedYaml
     */
    resolveTestWallets(parsedYaml) {
        const testWallets = parsedYaml.localDevelopment.testWallets;
        for (const key in testWallets) {
            this.setVar(key, web3.Keypair.fromSecretKey(Buffer.from(testWallets[key].privateKey, 'base64')));
        }
    }
    runTestValidator2(mapping) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Read solana-test-validator.template.sh to project base folder
            let template = util.fs.readTestValidatorTemplate();
            // 2. Update accounts and replace ==ACCOUNTS==
            const accounts = [];
            for (const account in mapping) {
                accounts.push(mapping[account] ?
                    // If has mapping, then use cached account
                    `\t--account ${account} ${mapping[account]} \\` :
                    // Otherwise, clone account from target cluster
                    `\t--maybe-clone ${account} \\`);
            }
            if (accounts.length === 0) {
                template = template.replace('==ACCOUNTS==\n', '');
            }
            else {
                template = template.replace('==ACCOUNTS==', accounts.join('\n')) + '\n';
            }
            // 3. Update programs and replace ==PROGRAMS==
            const programAccounts = [];
            for (let account of this.getProgramAccounts()) {
                programAccounts.push(`\t--bpf-program ${account.key} ${account.path} \\`);
            }
            if (programAccounts.length === 0) {
                template = template.replace('==PROGRAMS==\n', '');
            }
            else {
                template = template.replace('==PROGRAMS==', programAccounts.join('\n')) + '\n';
            }
            // 3. Update json accounts and replace ==JSON_ACCOUNTS==
            const jsonAccounts = [];
            for (let account of this.getJsonAccounts()) {
                jsonAccounts.push(`\t--account ${account.key} ${account.path} \\`);
            }
            if (jsonAccounts.length === 0) {
                template = template.replace('==JSON_ACCOUNTS==\n', '');
            }
            else {
                template = template.replace('==JSON_ACCOUNTS==', programAccounts.join('\n')) + '\n';
            }
            // 4. Update ==WARP_SLOT==
            template = template.replace('==WARP_SLOT==', `${yield util.solana.getSlot()}`);
            // 5. Update ==CLUSTER==
            template = template.replace('==CLUSTER==', 'https://api.mainnet-beta.solana.com');
            // 6. Create solana-test-validator.ingnore.sh file
            util.fs.createScript(path.resolve(this.projectDir, 'solana-test-validator.ignore.sh'), template);
            // 7. Remove test-ledger folder first
            util.fs.deleteFolderRecursive(path.resolve(this.projectDir, 'test-ledger'));
            // 8. Run solana-test-validator.ignore.sh
            const test_validator = (0, child_process_2.spawn)(path.resolve(this.projectDir, 'solana-test-validator.ignore.sh'), [], { shell: true, cwd: this.projectDir });
            test_validator.stderr.on('data', data => console.log(`${data}`));
            let state = 'init';
            test_validator.stdout.on('data', data => {
                if (state === 'init') {
                    console.log(`${data}`);
                }
                if (data.includes('Genesis Hash') && state === 'init') {
                    state = 'done';
                    console.log(`Solana test validator is now running!`);
                }
            });
            const waitToBeDone = new Promise(resolve => {
                const interval = setInterval(() => {
                    if (state === 'done') {
                        clearInterval(interval);
                        resolve(0);
                    }
                }, 500);
            });
            yield waitToBeDone;
            this.testValidatorPid = yield this.findTestValidatorProcess();
        });
    }
    /**
     * Resolve transaction instructions
     *
     * @param onlyResolve
     */
    resolveInstructions(onlyResolve) {
        // Loop through instructions
        for (const key in this.parsedYaml.instructionDefinition) {
            // If onlyResolve is defined, skip instructions that aren't defined in onlyResolve
            if (onlyResolve !== undefined && !onlyResolve.includes(key))
                continue;
            let ixDef;
            try {
                ixDef = this.getIxDefinition(key);
            }
            catch (_a) {
                continue;
            }
            let programId;
            if (ixDef.programId.startsWith('$')) {
                programId = this.getVar(ixDef.programId);
                if (typeof programId === undefined) {
                    throw `The programId ${ixDef.programId} variable is not defined`;
                }
            }
            else {
                try {
                    programId = new web3.PublicKey(ixDef.programId);
                }
                catch (_b) {
                    throw `The program id value: ${ixDef.programId} is not a valid program id base58 string`;
                }
            }
            const data = this.resolveInstructionData(ixDef.data);
            const keys = this.resolveInstructionAccounts(ixDef.accounts);
            // Store transaction instruction to global variable
            this.setVar(key, new web3.TransactionInstruction({ programId, data, keys }));
        }
    }
    /**
     * Resolve instruction data
     *
     * @param data
     */
    resolveInstructionData(data) {
        const dataArray = [];
        for (const dataStr of data) {
            dataArray.push(util.typeResolver.resolveType2(dataStr, this._global));
        }
        return Buffer.concat(dataArray);
    }
    resolveInstructionAccounts(accounts) {
        const accountMetas = [];
        for (const account of accounts) {
            const arr = account.split(',');
            const key = arr[0];
            let pubkey;
            if (key.startsWith('$')) {
                pubkey = this.getVar(key);
                if (typeof pubkey === 'undefined') {
                    throw `Cannot resolve public key variable ${key}.`;
                }
                else if (typeof pubkey.publicKey !== 'undefined') {
                    pubkey = pubkey.publicKey;
                }
            }
            else {
                try {
                    pubkey = new web3.PublicKey(key);
                }
                catch (_a) {
                    throw `Public key value: ${key} is not a valid base58 solana public key string`;
                }
            }
            const isSigner = arr.includes('signer');
            const isWritable = arr.includes('mut');
            accountMetas.push({ pubkey: pubkey, isSigner, isWritable });
        }
        return accountMetas;
    }
    /**
     * Set named accounts to global variable
     *
     * @param parsedYaml
     */
    setNamedAccountsToGlobal(parsedYaml) {
        // Loop through accounts
        for (const key in parsedYaml.accounts) {
            const split = parsedYaml.accounts[key].split(',');
            const address = split[0];
            const file = split[1];
            // Set named account in global
            this.setVar(key, new web3.PublicKey(address));
            // Set file if 2nd parameter defined is valid (should be .so or .json)
            if (file !== undefined && typeof file === 'string' && ['json', 'so'].includes(file.split('.')[file.split('.').length - 1])) {
                this.setVar(address, { file });
            }
        }
    }
    /**
     * Set known solana accounts
     *
     * @param parsedYaml
     */
    setKnownAccounts() {
        this.setVar('TOKEN_PROGRAM', new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'));
        this.setVar('ASSOCIATED_TOKEN_PROGRAM', new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'));
        this.setVar('SYSTEM_PROGRAM', web3.SystemProgram.programId);
        this.setVar('SYSVAR_CLOCK', web3.SYSVAR_CLOCK_PUBKEY);
        this.setVar('SYSVAR_EPOCH_SCHEDULE', web3.SYSVAR_EPOCH_SCHEDULE_PUBKEY);
        this.setVar('SYSVAR_INSTRUCTIONS', web3.SYSVAR_INSTRUCTIONS_PUBKEY);
        this.setVar('SYSVAR_RECENT_BLOCKHASHES', web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY);
        this.setVar('SYSVAR_RENT', web3.SYSVAR_RENT_PUBKEY);
        this.setVar('SYSVAR_REWARDS', web3.SYSVAR_REWARDS_PUBKEY);
        this.setVar('SYSVAR_SLOT_HASHES', web3.SYSVAR_SLOT_HASHES_PUBKEY);
        this.setVar('SYSVAR_SLOT_HISTORY', web3.SYSVAR_SLOT_HISTORY_PUBKEY);
        this.setVar('SYSVAR_STAKE_HISTORY', web3.SYSVAR_STAKE_HISTORY_PUBKEY);
    }
    /**
     * Resolve PDAs
     *
     * @param onlyResolve Only resolve these PDAs
     */
    resolvePda(onlyResolve) {
        // Loop through PDA
        for (const key in this.parsedYaml.pda) {
            // If onlyResolve is defined, skip PDAs that aren't defined in onlyResolve
            if (onlyResolve !== undefined && !onlyResolve.includes(key))
                continue;
            const pda = this.parsedYaml.pda[key];
            let programId;
            if (pda.programId.startsWith('$')) {
                programId = this.getVar(pda.programId);
                if (typeof programId === undefined) {
                    throw `The programId ${pda.programId} variable is not defined`;
                }
            }
            else {
                try {
                    programId = new web3.PublicKey(pda.programId);
                }
                catch (_a) {
                    throw `The program id value: ${pda.programId} is not a valid program id base58 string`;
                }
            }
            const seeds = [];
            for (const seed of pda.seeds) {
                if (seed.startsWith('$')) {
                    const p = this.getVar(seed);
                    if (typeof p === 'undefined') {
                        throw `The public key ${seed} variable is not defined`;
                    }
                    else if (typeof p.publicKey !== 'undefined') {
                        seeds.push(p.publicKey.toBuffer());
                    }
                    else {
                        try {
                            new web3.PublicKey(p);
                            seeds.push(p.toBuffer());
                        }
                        catch (_b) {
                            throw `The variable ${seed} is not a valid public key`;
                        }
                    }
                }
                else {
                    const _seed = Buffer.from(seed, 'utf-8');
                    if (_seed.length > 32) {
                        throw `The given seed: ${_seed} exceeds 32 bytes`;
                    }
                    else {
                        seeds.push(_seed);
                    }
                }
            }
            // Generate PDA
            const [_pda] = web3.PublicKey.findProgramAddressSync(seeds, programId);
            this.setVar(key, _pda);
        }
    }
    /**
     * Generate account decoder instances
     */
    generateAccountDecoders() {
        if (this._parsedYaml.accountDecoder !== undefined) {
            for (const name in this._parsedYaml.accountDecoder) {
                this.setVar(name, new AccountDecoder_1.AccountDecoder(name, this._parsedYaml.accountDecoder[name]));
            }
        }
    }
    /**
     * Resolve instruction bundles
     *
     * @param onlyResolve
     */
    resolveInstructionBundles(onlyResolve) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const _ixBundle in this._parsedYaml.instructionBundle) {
                // Skip if not included in onlyResolve
                if (onlyResolve !== undefined && !onlyResolve.includes(_ixBundle))
                    continue;
                const ixBundle = this._parsedYaml.instructionBundle[_ixBundle];
                const alts = ixBundle.alts.map(alt => new web3.PublicKey(alt));
                for (const ix of ixBundle.instructions) {
                    // Set global variables
                    for (const key in ix.params) {
                        let value;
                        if (typeof ix.params[key] !== 'string') {
                            value = ix.params[key];
                        }
                        else {
                            const [valueOrVar, type] = ix.params[key].split(':');
                            if (valueOrVar.startsWith('$')) {
                                value = this.getVar(valueOrVar);
                            }
                            else {
                                if (['u8', 'u16', 'u32', 'i8', 'i16', 'i32'].includes(type)) {
                                    value = parseInt(valueOrVar);
                                }
                                else if (['u64', 'usize', 'i64'].includes(type)) {
                                    value = BigInt(valueOrVar);
                                }
                                else if (type === 'bool') {
                                    value = valueOrVar === 'true';
                                }
                                else if (type === 'pubkey') {
                                    value = new web3.PublicKey(valueOrVar);
                                }
                                else if (ix.dynamic) {
                                    const dynamicIx = this.getVar(ix.label);
                                    if (dynamicIx.varType[`$${key}`].type === 'string') {
                                        value = valueOrVar;
                                    }
                                }
                                else {
                                    throw `Type of ${key} is not defined.`;
                                }
                                value = valueOrVar;
                            }
                        }
                        this.setVar(key, value);
                    }
                    const isDynamic = ix.dynamic;
                    if (!isDynamic) {
                        // Assuming here that parameters required by instruction is already set.
                        this.resolveInstruction(ix.label);
                    }
                }
                const ixs = [];
                for (const ix of ixBundle.instructions) {
                    const _ix = this.getVar(ix.label);
                    if (_ix instanceof web3.TransactionInstruction) {
                        ixs.push(_ix);
                    }
                    else if (_ix instanceof DynamicInstruction_1.DynamicInstruction) {
                        yield _ix.resolve();
                        const singleIx = _ix.ix;
                        const multipleIx = _ix.ixs;
                        if (singleIx !== undefined) {
                            ixs.push(singleIx);
                        }
                        else if (multipleIx !== undefined) {
                            ixs.push(...multipleIx);
                        }
                        else {
                            throw `Dynamic instruction ${ix.label} is not yet defined.`;
                        }
                        alts.push(..._ix.alts);
                    }
                    else {
                        throw `${ix.label} is not a valid web3.TransactionInstruction or DynamicInstructionClass instance`;
                    }
                }
                // Lastly, store ix bundle in global
                this.setVar(_ixBundle, {
                    resolvedInstructionBundle: true,
                    alts,
                    payer: this.resolveKeypair(ixBundle.payer),
                    ixs,
                });
            }
        });
    }
    /**
     * Resolve keypair
     *
     * @param idOrVal
     */
    resolveKeypair(idOrVal) {
        if (idOrVal.startsWith('$')) {
            const kp = this.getVar(idOrVal);
            if (typeof kp.publicKey !== 'undefined') {
                return kp;
            }
            else {
                throw `Cannot resolve keypair: ${idOrVal}`;
            }
        }
        else {
            return web3.Keypair.fromSecretKey(Buffer.from(idOrVal, 'base64'));
        }
    }
    sanitizeDollar(pattern) {
        return pattern.startsWith('$') ? pattern.substring(1) : pattern;
    }
    /**
     * Generate dynamic accounts
     */
    generateDynamicAccounts() {
        for (const ixLabel in this._parsedYaml.instructionDefinition) {
            let dynamicIx = { dynamic: true, params: [] };
            try {
                dynamicIx = this.getDynamicInstruction(ixLabel);
            }
            catch (_a) {
                continue;
            }
            if (dynamicIx.dynamic) {
                this.setVar(ixLabel, new DynamicInstruction_1.DynamicInstruction(this, dynamicIx.params));
            }
        }
    }
}
exports.Yaml2SolanaClass = Yaml2SolanaClass;
class Transaction {
    constructor(description, connection, ixns, alts, payer, signers) {
        this.description = description;
        this.connection = connection;
        this.ixns = ixns;
        this.alts = alts;
        this.payer = payer;
        this.signers = signers;
    }
    compileToVersionedTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            const { blockhash: recentBlockhash } = yield this.connection.getLatestBlockhash();
            const alts = [];
            for (const alt of this.alts) {
                alts.push((yield this.connection.getAddressLookupTable(new web3.PublicKey(alt))).value);
            }
            const tx = new web3.VersionedTransaction(new web3.TransactionMessage({
                payerKey: this.payer,
                instructions: this.ixns,
                recentBlockhash,
            }).compileToV0Message(alts));
            tx.sign(this.signers);
            return tx;
        });
    }
    /**
     * Get all accounts from instructions
     */
    getAccountsFromInstructions() {
        let hashmap = {};
        this.ixns.map(ix => {
            hashmap[ix.programId.toString()] = ix.programId;
            ix.keys.map(meta => {
                hashmap[meta.pubkey.toString()] = meta.pubkey;
            });
        });
        const result = [];
        for (const key in hashmap) {
            result.push(hashmap[key]);
        }
        return result;
    }
}
exports.Transaction = Transaction;
