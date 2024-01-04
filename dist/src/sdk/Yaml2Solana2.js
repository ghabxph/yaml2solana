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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = exports.Yaml2SolanaClass2 = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const util = __importStar(require("../util"));
const child_process_1 = require("child_process");
class Yaml2SolanaClass2 {
    constructor(
    /**
     * yaml config path
     */
    config) {
        this.config = config;
        /**
         * Global variable
         */
        this.global = {};
        this.localnetConnection = new web3.Connection("http://127.0.0.1:8899");
        // Read the YAML file.
        const yamlFile = fs.readFileSync(config, 'utf8');
        this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');
        this.parsedYaml = yaml.parse(yamlFile);
        // Set named accounts to global variable
        this.setNamedAccountsToGlobal(this.parsedYaml);
    }
    /**
     * Resolve variables
     * @param params
     */
    resolve(params) {
        // Resolve test wallets
        this.resolveTestWallets(this.parsedYaml);
        // Resolve PDAs
        this.resolvePda(this.parsedYaml, params.onlyResolve.thesePdas);
        // Resolve instructions
        this.resolveInstructions(this.parsedYaml, params.onlyResolve.theseInstructions);
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
    /**
     * Prints lamports out of thin air in given test wallet key from yaml
     *
     * @param key
     */
    fundLocalnetWalletFromYaml(key) {
        const SOL = 1000000000;
        const solAmount = parseFloat(this.parsedYaml.localDevelopment.testWallets[key].solAmount);
        const keypair = this.getVar(key);
        const y = util.fs.readSchema(this.config);
        const account = {};
        account[keypair.publicKey.toString()] = {
            lamports: Math.floor(solAmount * SOL),
            data: Buffer.alloc(0),
            owner: new web3.PublicKey('11111111111111111111111111111111'),
            executable: false,
            rentEpoch: 0
        };
        util.fs.writeAccountsToCacheFolder(y, account);
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
     * Create localnet transaction
     *
     * @param description
     * @param ixns
     * @param alts
     * @param payer
     * @param signers
     * @returns
     */
    createLocalnetTransaction(description, ixns, alts, payer, signers) {
        const _ixns = ixns.map(ix => {
            if (ix instanceof web3.TransactionInstruction) {
                return ix;
            }
            else if (typeof ix === 'string') {
                const _ix = this.getVar(ix);
                if (!(_ix instanceof web3.TransactionInstruction)) {
                    throw `Variable ${ix} is not a valid transaction instruction`;
                }
                return _ix;
            }
            else {
                throw 'Invalid solana transaction instruction';
            }
        });
        let _payer;
        if (typeof payer === 'string') {
            _payer = this.getVar(payer);
            if (!(_payer instanceof web3.PublicKey)) {
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
     * Batch download accounts from mainnet
     *
     * @param forceDownload
     */
    downloadAccountsFromMainnet(forceDownload) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. (old code) Read schema
            const schema = util.fs.readSchema(this.config);
            // 2. (old code) Get accounts from schema
            const accounts = schema.accounts.getAccounts();
            // 3. Skip accounts that are already downloaded
            const accounts1 = util.fs.skipDownloadedAccounts(schema, accounts);
            // 4. Force include accounts that are in forceDownloaded
            accounts1.push(...forceDownload);
            const accounts2 = accounts1.filter((v, i, s) => s.indexOf(v) === i);
            // 5. Fetch multiple accounts from mainnet at batches of 100
            const accountInfos = yield util.solana.getMultipleAccountsInfo(accounts2);
            // 6. Write downloaded account infos from mainnet in designated cache folder
            util.fs.writeAccountsToCacheFolder(schema, accountInfos);
            // 7. Map accounts to downloaded to .accounts
            return util.fs.mapAccountsFromCache(schema);
        });
    }
    /**
     * Execute transactions locally
     *
     * @param txns Transactions to execute
     * @param skipRedownload Skip these accounts for re-download
     * @param keepRunning Whether to keep test validator running
     */
    executeTransactionsLocally(txns, skipRedownload = [], keepRunning = true, cluster = 'http://127.0.0.1:8899') {
        return __awaiter(this, void 0, void 0, function* () {
            // Step 1: Run test validator
            const testValidator = yield this.runTestValidator(txns, skipRedownload);
            // Step 2: Execute transactions
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
                }
                else {
                    const sig = yield connection.sendTransaction(tx);
                    console.log(`TX: ${txns[key].description}`);
                    console.log(`-------------------------------------------------------------------`);
                    console.log(`tx sig ${sig}`);
                }
            }
            // Terminate test validator if specified to die after running transactions
            if (!keepRunning) {
                testValidator.kill();
            }
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
            txns.map(tx => accountsToDownload.push(...tx.getAccountsFromInstructions()));
            accountsToDownload = accountsToDownload.filter((v, i, s) => s.indexOf(v) === i && !skipRedownload.includes(v));
            const mapping = yield this.downloadAccountsFromMainnet(accountsToDownload);
            // Step 2: Run test validator
            return yield this.runTestValidator2(mapping, util.fs.readSchema(this.config));
        });
    }
    runTestValidator2(mapping, schema) {
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
            for (let account of schema.accounts.getProgramAccounts()) {
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
            for (let account of schema.accounts.getJsonAccounts()) {
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
            util.fs.createScript('solana-test-validator.ignore.sh', template);
            // 7. Remove test-ledger folder first
            util.fs.deleteFolderRecursive('test-ledger');
            // 8. Run solana-test-validator.ignore.sh
            const test_validator = (0, child_process_1.spawn)('./solana-test-validator.ignore.sh', [], { shell: true });
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
            return test_validator;
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
     * Resolve transaction instructions
     *
     * @param parsedYaml
     * @param onlyResolve
     */
    resolveInstructions(parsedYaml, onlyResolve) {
        // Loop through instructions
        for (const key in parsedYaml.instructionDefinition) {
            // If onlyResolve is defined, skip instructions that aren't defined in onlyResolve
            if (onlyResolve !== undefined && !onlyResolve.includes(key))
                continue;
            const ixDef = parsedYaml.instructionDefinition[key];
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
                catch (_a) {
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
            dataArray.push(util.resolveType2(dataStr, this.global));
        }
        return Buffer.concat(dataArray);
    }
    resolveInstructionAccounts(accounts) {
        const accountMetas = [];
        for (const account in accounts) {
            const arr = account.split(',');
            const key = arr[0];
            let pubkey;
            if (key.startsWith('$')) {
                pubkey = this.getVar(key);
                if (typeof pubkey === 'undefined') {
                    throw `Cannot resolve public key variable ${key}.`;
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
            accountMetas.push({ pubkey, isSigner, isWritable });
        }
        return accountMetas;
    }
    /**
     * Set parameter value (alias to setVar method)
     *
     * @param name
     * @param value
     */
    setParam(name, value) {
        this.setVar(name, value);
    }
    /**
     * Store value to global variable
     *
     * @param name
     * @param value
     */
    setVar(name, value) {
        this.global[name] = value;
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
     * Retrieve value from global variable
     *
     * @param name
     * @returns
     */
    getVar(name) {
        if (name.startsWith('$')) {
            return this.global[name.substring(1)];
        }
        else {
            throw 'Variable should begin with dollar symbol `$`';
        }
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
     * Resolve PDAs
     *
     * @param parsedYaml
     * @param onlyResolve Only resolve these PDAs
     */
    resolvePda(parsedYaml, onlyResolve) {
        // Loop through PDA
        for (const key in parsedYaml.pda) {
            // If onlyResolve is defined, skip PDAs that aren't defined in onlyResolve
            if (onlyResolve !== undefined && !onlyResolve.includes(key))
                continue;
            const pda = parsedYaml.pda[key];
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
}
exports.Yaml2SolanaClass2 = Yaml2SolanaClass2;
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
