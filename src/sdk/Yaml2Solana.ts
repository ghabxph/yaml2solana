import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as util from '../util';
import find from 'find-process';
import { exec } from 'child_process';
import { spawn } from 'child_process';

export class Yaml2SolanaClass {

  /**
   * Localnet connection instance
   */
  public readonly localnetConnection: web3.Connection;

  /**
   * Project directory is where yaml2solana.yaml file is found.
   */
  public readonly projectDir: string;

  /**
   * Global variable
   */
  private global: Record<string, any> = {};

  /**
   * Parsed yaml
   */
  private _parsedYaml: ParsedYaml;

  /**
   * Test validator runnin PID
   */
  private testValidatorPid?: number;

  constructor(
    /**
     * yaml config path
     */
    private config: string
  ) {
    this.localnetConnection = new web3.Connection("http://127.0.0.1:8899");

    // Read the YAML file.
    const yamlFile = fs.readFileSync(config, 'utf8');
    this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');
    this._parsedYaml = yaml.parse(yamlFile);

    // Set named accounts to global variable
    this.setNamedAccountsToGlobal(this._parsedYaml);

    // Set known solana accounts (not meant to be downloaded)
    this.setKnownAccounts();
  }

  /**
   * Parsed yaml file
   */
  get parsedYaml(): ParsedYaml {
    return this._parsedYaml;
  }

  /**
   * Resolve variables
   * @param params
   */
  resolve(params: ResolveParams) {
    // Resolve test wallets
    this.resolveTestWallets(this._parsedYaml);

    // Resolve PDAs
    this.resolvePda(this._parsedYaml, params.onlyResolve.thesePdas);

    // Resolve instructions
    this.resolveInstructions(this._parsedYaml, params.onlyResolve.theseInstructions)
  }

  /**
   * Get accounts from solana instructions
   *
   * @param ix
   */
  getAccountsFromInstruction(ixs: web3.TransactionInstruction[]): web3.PublicKey[] {
    const uniqueKeys: Record<string, web3.PublicKey> = {};
    const result: web3.PublicKey[] = [];
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
  createLocalnetTransaction(
    description: string,
    ixns: (string | web3.TransactionInstruction)[],
    alts: string[],
    payer: string | web3.PublicKey,
    signers: (string | web3.Signer)[]
  ): Transaction {
    const _ixns: web3.TransactionInstruction[] = ixns.map(ix => {
      if (typeof ix === 'object' && typeof ix.data !== 'undefined' && typeof ix.keys !== 'undefined' && typeof ix.programId !== 'undefined') {
        return ix;
      } else if (typeof ix === 'string') {
        const _ix = this.getVar<web3.TransactionInstruction>(ix);
        if (!(typeof _ix === 'object' && typeof _ix.data !== 'undefined' && typeof _ix.keys !== 'undefined' && typeof _ix.programId !== 'undefined')) {
          throw `Variable ${ix} is not a valid transaction instruction`;
        }
        return _ix;
      } else {
        throw 'Invalid solana transaction instruction'
      }
    });
    let _payer: web3.PublicKey;
    if (typeof payer === 'string') {
      const __payer = this.getVar<web3.PublicKey | web3.Keypair>(payer);
      const isPublicKey = typeof __payer === 'object' && typeof (__payer as web3.PublicKey).toBuffer === 'function' && (__payer as web3.PublicKey).toBuffer().length === 32;
      const isKeypair = typeof __payer === 'object' && typeof (__payer as web3.Keypair).publicKey !== undefined && typeof (__payer as web3.Keypair).secretKey !== undefined;
      if (isPublicKey || isKeypair) {
        if (isPublicKey) {
          _payer = __payer as web3.PublicKey;
        } else {
          _payer = (__payer as web3.Keypair).publicKey;
        }
      } else {
        throw `Variable ${payer} is not a valid public key`;
      }
    } else {
      _payer = payer;
    }
    const _signers: web3.Signer[] = signers.map(signer => {
      if (typeof signer === 'string') {
        const _signer = this.getVar<web3.Signer>(signer)
        if (typeof _signer === 'undefined' || typeof _signer !== 'object') {
          throw `Variable ${signer} is not a valid Signer instance`;
        }
        return _signer;
      } else if (typeof signer === 'object' && typeof signer.publicKey !== 'undefined' && typeof signer.secretKey !== 'undefined') {
        return signer;
      } else {
        throw `Invalid solana signer instance`;
      }
    });
    return new Transaction(
      description,
      this.localnetConnection,
      _ixns,
      alts,
      _payer,
      _signers
    );
  }

  /**
   * Get signers from given instruction
   *
   * @param ixLabel
   */
  getSignersFromIx(ixLabel: string): web3.Signer[] {
    const result: web3.Signer[] = [];
    const payer = this.getVar<web3.Signer>(this._parsedYaml.instructionDefinition[ixLabel].payer);
    let isPayerSigner = false;
    for (const meta of this._parsedYaml.instructionDefinition[ixLabel].accounts) {
      const _meta = meta.split(',');
      const [account] = _meta;
      if (_meta.includes('signer')) {
        const signer = this.getVar<web3.Signer>(account);
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
  getInstructions(): string [] {
    const instructions: string[] = [];
    for (const instruction in this._parsedYaml.instructionDefinition) {
      instructions.push(instruction);
    }
    return instructions;
  }

  /**
   * @returns accounts from schema
   */
  getAccounts(): web3.PublicKey[] {
    const accounts: web3.PublicKey[] = [];
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
  getProgramAccounts(): AccountFile[] {
    return this.getFileAccount('so');
  }

  /**
   * @returns json accounts from schema
   */
  getJsonAccounts(): AccountFile[] {
    return this.getFileAccount('json');
  }

  /**
   * Batch download accounts from mainnet
   *
   * @param forceDownload
   */
  async downloadAccountsFromMainnet(forceDownload: web3.PublicKey[]): Promise<Record<string, string | null>> {
    console.log();
    console.log('Downloading solana accounts:');
    console.log('--------------------------------------------------------------');

    const cacheFolder = path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder);

    // 1. Get accounts from schema
    let accounts: web3.PublicKey[] = this.getAccounts();

    // 2. Skip accounts that are already downloaded
    accounts = util.fs.skipDownloadedAccounts(cacheFolder, accounts);

    // 3. Force include accounts that are in forceDownloaded
    accounts.push(...forceDownload);
    accounts = accounts.filter((v, i, s) => s.indexOf(v) === i);

    // 4. Skip accounts that are defined in localDevelopment.skipCache
    accounts = accounts.filter((v, i) => !this._parsedYaml.localDevelopment.skipCache.includes(v.toString()));

    // 5. Fetch multiple accounts from mainnet at batches of 100
    const accountInfos = await util.solana.getMultipleAccountsInfo(accounts);

    // 6. Find programs that are executable within account infos
    const executables: web3.PublicKey[] = [];
    for (const key in accountInfos) {
      const accountInfo = accountInfos[key];
      if (accountInfo === null) continue;
      if (accountInfo.executable) {
        const executable = new web3.PublicKey(accountInfo.data.subarray(4, 36));
        try {
          fs.accessSync(path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder, `${executable}.json`));
        } catch {
          executables.push(executable); 
        }
      }
    }
    const executableData = await util.solana.getMultipleAccountsInfo(executables);
    for (const key in executableData) {
      accountInfos[key] = executableData[key];
    }

    // 7. Write downloaded account infos from mainnet in designated cache folder
    util.fs.writeAccountsToCacheFolder(cacheFolder, accountInfos);

    // 8. Map accounts to downloaded to .accounts
    return util.fs.mapAccountsFromCache(cacheFolder, this.getAccounts());
  }

  /**
   * Find running instance of solana-test-validator and get its PID
   */
  async findTestValidatorProcess(): Promise<number> {
    const list = await find('name', 'solana-test-validator');

    for (const item of list) {
      if (item.name === 'solana-test-validator') {
        return item.pid;
      }
    }

    throw `Cannot find process named \'solana-test-validator\'`
  }

  /**
   * Execute transactions locally
   *
   * @param txns Transactions to execute
   * @param skipRedownload Skip these accounts for re-download
   * @param keepRunning Whether to keep test validator running
   */
  async executeTransactionsLocally(
    params: {
      txns: Transaction[],
      skipRedownload?: web3.PublicKey[],
      keepRunning?: boolean,
      cluster?: string,
      runFromExistingLocalnet?: boolean
    }
  ): Promise<
    Array<{
      txid: string,
      transactionResponse: web3.VersionedTransactionResponse | null,
    }>
  > {
    let {
      txns,
      skipRedownload,
      keepRunning,
      cluster,
      runFromExistingLocalnet,
    } = params;
    skipRedownload = skipRedownload === undefined ? [] : skipRedownload;
    keepRunning = keepRunning === undefined ? true : keepRunning;
    cluster = cluster === undefined ? 'http://127.0.0.1:8899' : cluster;
    runFromExistingLocalnet = runFromExistingLocalnet === undefined ? false : runFromExistingLocalnet;

    if (!runFromExistingLocalnet) {
      // Step 1: Run test validator
      await this.runTestValidator(txns, skipRedownload);
      await (() => new Promise(resolve => setTimeout(() => resolve(0), 1000)))();
    }

    // Step 2: Execute transactions
    const response: { txid: string, transactionResponse: web3.VersionedTransactionResponse | null }[] = [];
    for (const key in txns) {
      // Compile tx to versioned transaction
      const tx = await txns[key].compileToVersionedTransaction();
      const connection = (cluster === 'http://127.0.0.1:8899') ? txns[key].connection : new web3.Connection(cluster);

      // If we like to have test validator running, then we want to have skipPreflight enabled
      if (keepRunning) {
        const sig = await connection.sendTransaction(tx, { skipPreflight: true });
        console.log(`TX: ${txns[key].description}`);
        console.log(`-------------------------------------------------------------------`)
        console.log(`tx sig ${sig}`);
        console.log(`localnet explorer: https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
        console.log(``);
        const transactionResponse = (await connection.getTransaction(sig, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        }));
        response.push({ txid: sig, transactionResponse });
      } else {
        const sig = await connection.sendTransaction(tx);
        console.log(`TX: ${txns[key].description}`);
        console.log(`-------------------------------------------------------------------`)
        console.log(`tx sig ${sig}`);
        const transactionResponse = (await connection.getTransaction(sig, {
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
  }

  /**
   * Run test validator
   *
   * @param txns
   * @param skipRedownload
   * @returns
   */
  async runTestValidator(
    txns: Transaction[] = [],
    skipRedownload: web3.PublicKey[] = [],
  ) {
    // Step 1: Force download accounts from instructions on mainnet
    let accountsToDownload: web3.PublicKey[] = [];
    txns.map(tx => {
      accountsToDownload.push(...tx.getAccountsFromInstructions());
      accountsToDownload.push(...tx.alts.map(alt => new web3.PublicKey(alt)));
    });
    accountsToDownload = accountsToDownload.filter((v, i, s) => s.indexOf(v) === i && !skipRedownload.includes(v));
    const mapping = await this.downloadAccountsFromMainnet(accountsToDownload);

    // Step 2: Run test validator
    return await this.runTestValidator2(mapping);
  }

  /**
   * Kill test validator
   */
  killTestValidator() {
    const command = `kill -9 ${this.testValidatorPid}`;

    exec(command, (error, _stdout, stderr) => {
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
  getInstruction(name: string): web3.TransactionInstruction {
    return this.getVar<web3.TransactionInstruction>(name);
  }

  /**
   * Resolve given instruction
   *
   * @param ixLabel Instruction to execute
   * @returns available parameters that can be overriden for target instruction
   */
  resolveInstruction(ixLabel: string) {
    // Find PDAs involved from given instruction
    const pdas = this.findPdasInvolvedInInstruction(ixLabel);

    // Then run resolve function
    this.resolve(
      {
        onlyResolve: {
          thesePdas: pdas,
          theseInstructions: [ixLabel],
        }
      }
    );
  }

  /**
   * Extract variable info
   *
   * @param pattern
   */
  extractVarInfo(pattern: string): util.VariableInfo {

    return util.extractVariableInfo2(pattern, this.global);
  }

  /**
   * Find PDAs involved from given instruction
   *
   * @param ixLabel 
   */
  private findPdasInvolvedInInstruction(ixLabel: string): string[] {
    const result: string[] = [];
    for (const accountMeta of this._parsedYaml.instructionDefinition[ixLabel].accounts) {
      let [account] = accountMeta.split(',');
      if (!account.startsWith('$')) continue
      account = account.substring(1);
      if (typeof this._parsedYaml.pda[account] !== 'undefined') {
        result.push(account);
      }
    }
    return result;
  }

  /**
   * Set parameter value
   *
   * @param name
   * @param value
   */
  setParam<T>(name: string, value: T) {
    if (name.startsWith('$')) {
      this.setVar(name.substring(1), value);
    } else {
      throw 'Variable should begin with dollar symbol `$`';
    }
  }

  /**
   * Store value to global variable
   *
   * @param name 
   * @param value 
   */
  setVar<T>(name: string, value: T) {
    this.global[name] = value;
  }

  /**
   * Alias to getVar
   *
   * @param name 
   */
  getParam<T>(name: string): T {
    return this.getVar<T>(name);
  }

  /**
   * Retrieve value from global variable
   *
   * @param name
   * @returns
   */
  getVar<T>(name: string): T {
    if (name.startsWith('$')) {
      return this.global[name.substring(1)];
    } else {
      throw 'Variable should begin with dollar symbol `$`';
    }
  }

  /**
   * @param extension File extension to check
   * @returns
   */
  private getFileAccount(extension: string) {
    const accounts: AccountFile[] = [];
    for (const key in this._parsedYaml.accounts) {
      const [pk, filePath] = this._parsedYaml.accounts[key].split(',');
      if (filePath === undefined) continue;
      const filePathSplit = filePath.split('.');
      const _extension = filePathSplit[filePathSplit.length - 1];
      if (_extension === extension) {
        accounts.push({ key: new web3.PublicKey(pk), path: path.resolve(this.projectDir, filePath)});
      }
    }
    this._parsedYaml.accountsNoLabel.map(v => {
      const [pk, filePath] = v.split(',');
      if (filePath === undefined) return v;
      const filePathSplit = filePath.split('.');
      const _extension = filePathSplit[filePathSplit.length - 1];
      if (_extension === extension) {
        accounts.push({ key: new web3.PublicKey(pk), path: path.resolve(this.projectDir, filePath)});
      }
    });
    return accounts;
  }

  /**
   * Resolve test wallets
   *
   * @param parsedYaml
   */
  private resolveTestWallets(parsedYaml: ParsedYaml) {
    const testWallets = parsedYaml.localDevelopment.testWallets;
    for (const key in testWallets) {
      this.setVar<web3.Signer>(key, web3.Keypair.fromSecretKey(Buffer.from(
        testWallets[key].privateKey, 'base64'
      )));
    }
  }

  /**
   * Prints lamports out of thin air in given test wallet key from yaml
   *
   * @param key
   */
  private fundLocalnetWalletFromYaml(key: string) {
    const SOL = 1_000_000_000;
    const solAmount = parseFloat(this._parsedYaml.localDevelopment.testWallets[key].solAmount);
    const keypair = this.getVar<web3.Signer>(key);
    const account: Record<string, web3.AccountInfo<Buffer>> = {};
    const cacheFolder = path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder);
    account[keypair.publicKey.toString()] = {
      lamports: Math.floor(solAmount * SOL),
      data: Buffer.alloc(0),
      owner: new web3.PublicKey('11111111111111111111111111111111'),
      executable: false,
      rentEpoch: 0
    }
    util.fs.writeAccountsToCacheFolder(cacheFolder, account);
  }

  private async runTestValidator2(mapping: Record<string, string | null>) {
    // 1. Read solana-test-validator.template.sh to project base folder
    let template = util.fs.readTestValidatorTemplate();

    // 2. Update accounts and replace ==ACCOUNTS==
    const accounts = [];
    for (const account in mapping) {
      accounts.push(
        mapping[account] ?

          // If has mapping, then use cached account
          `\t--account ${account} ${mapping[account]} \\` :

          // Otherwise, clone account from target cluster
          `\t--maybe-clone ${account} \\`
      )
    }
    if (accounts.length === 0) {
      template = template.replace('==ACCOUNTS==\n', '')
    } else {
      template = template.replace('==ACCOUNTS==', accounts.join('\n')) + '\n';
    }

    // 3. Update programs and replace ==PROGRAMS==
    const programAccounts = [];
    for (let account of this.getProgramAccounts()) {
      programAccounts.push(`\t--bpf-program ${account.key} ${account.path} \\`);
    }
    if (programAccounts.length === 0) {
      template = template.replace('==PROGRAMS==\n', '')
    } else {
      template = template.replace('==PROGRAMS==', programAccounts.join('\n')) + '\n';
    }

    // 3. Update json accounts and replace ==JSON_ACCOUNTS==
    const jsonAccounts = [];
    for (let account of this.getJsonAccounts()) {
      jsonAccounts.push(`\t--account ${account.key} ${account.path} \\`);
    }
    if (jsonAccounts.length === 0) {
      template = template.replace('==JSON_ACCOUNTS==\n', '')
    } else {
      template = template.replace('==JSON_ACCOUNTS==', programAccounts.join('\n')) + '\n';
    }

    // 4. Update ==WARP_SLOT==
    template = template.replace('==WARP_SLOT==', `${await util.solana.getSlot()}`);

    // 5. Update ==CLUSTER==
    template = template.replace('==CLUSTER==', 'https://api.mainnet-beta.solana.com');

    // 6. Create solana-test-validator.ingnore.sh file
    util.fs.createScript(path.resolve(this.projectDir, 'solana-test-validator.ignore.sh'), template);

    // 7. Remove test-ledger folder first
    util.fs.deleteFolderRecursive(path.resolve(this.projectDir, 'test-ledger'));

    // 8. Run solana-test-validator.ignore.sh
    const test_validator = spawn(path.resolve(this.projectDir, 'solana-test-validator.ignore.sh'), [], { shell: true, cwd: this.projectDir });
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
    await waitToBeDone;
    this.testValidatorPid = await this.findTestValidatorProcess();
  }

  /**
   * Resolve transaction instructions
   *
   * @param parsedYaml
   * @param onlyResolve
   */
  private resolveInstructions(parsedYaml: ParsedYaml, onlyResolve?: string[]) {
    // Loop through instructions
    for (const key in parsedYaml.instructionDefinition) {

      // If onlyResolve is defined, skip instructions that aren't defined in onlyResolve
      if (onlyResolve !== undefined && !onlyResolve.includes(key)) continue;

      const ixDef = parsedYaml.instructionDefinition[key];
      let programId;
      if (ixDef.programId.startsWith('$')) {
        programId = this.getVar<web3.PublicKey>(ixDef.programId);
        if (typeof programId === undefined) {
          throw `The programId ${ixDef.programId} variable is not defined`;
        }
      } else {
        try {
          programId = new web3.PublicKey(ixDef.programId);
        } catch {
          throw `The program id value: ${ixDef.programId} is not a valid program id base58 string`;
        }
      }

      const data: Buffer = this.resolveInstructionData(ixDef.data);
      const keys: web3.AccountMeta[] = this.resolveInstructionAccounts(ixDef.accounts);

      // Store transaction instruction to global variable
      this.setVar<web3.TransactionInstruction>(
        key, new web3.TransactionInstruction({ programId, data, keys })
      );
    }
  }

  /**
   * Resolve instruction data
   *
   * @param data
   */
  private resolveInstructionData(data: string[]): Buffer {
    const dataArray: Buffer[] = [];
    for (const dataStr of data) {
      dataArray.push(util.resolveType2(dataStr, this.global));
    }
    return Buffer.concat(dataArray);
  }

  private resolveInstructionAccounts(accounts: string[]): web3.AccountMeta[] {
    const accountMetas: web3.AccountMeta[] = [];
    for (const account of accounts) {
      const arr = account.split(',');
      const key = arr[0];
      let pubkey: web3.PublicKey | web3.Keypair;
      if (key.startsWith('$')) {
        pubkey = this.getVar<web3.PublicKey | web3.Keypair>(key);
        if (typeof pubkey === 'undefined') {
          throw `Cannot resolve public key variable ${key}.`
        } else if (typeof (pubkey as web3.Keypair).publicKey !== 'undefined') {
          pubkey = (pubkey as web3.Keypair).publicKey;
        }
      } else {
        try {
          pubkey = new web3.PublicKey(key);
        } catch {
          throw `Public key value: ${key} is not a valid base58 solana public key string`;
        }
      }
      const isSigner = arr.includes('signer');
      const isWritable = arr.includes('mut');
      accountMetas.push({ pubkey: pubkey as web3.PublicKey, isSigner, isWritable });
    }
    return accountMetas;
  }

  /**
   * Set named accounts to global variable
   *
   * @param parsedYaml
   */
  private setNamedAccountsToGlobal(parsedYaml: ParsedYaml) {
    // Loop through accounts
    for (const key in parsedYaml.accounts) {

      const split = parsedYaml.accounts[key].split(',');
      const address = split[0];
      const file = split[1];

      // Set named account in global
      this.setVar<web3.PublicKey>(key, new web3.PublicKey(address));

      // Set file if 2nd parameter defined is valid (should be .so or .json)
      if (file !== undefined && typeof file === 'string' && ['json', 'so'].includes(file.split('.')[file.split('.').length - 1])) {
        this.setVar<Account>(address, { file });
      }
    }
  }

  /**
   * Set known solana accounts
   *
   * @param parsedYaml
   */
    private setKnownAccounts() {
      this.setVar<web3.PublicKey>('TOKEN_PROGRAM', new web3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'));
      this.setVar<web3.PublicKey>('ASSOCIATED_TOKEN_PROGRAM', new web3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'));
      this.setVar<web3.PublicKey>('SYSTEM_PROGRAM', web3.SystemProgram.programId);
      this.setVar<web3.PublicKey>('SYSVAR_CLOCK', web3.SYSVAR_CLOCK_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_EPOCH_SCHEDULE', web3.SYSVAR_EPOCH_SCHEDULE_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_INSTRUCTIONS', web3.SYSVAR_INSTRUCTIONS_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_RECENT_BLOCKHASHES', web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_RENT', web3.SYSVAR_RENT_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_REWARDS', web3.SYSVAR_REWARDS_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_SLOT_HASHES', web3.SYSVAR_SLOT_HASHES_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_SLOT_HISTORY', web3.SYSVAR_SLOT_HISTORY_PUBKEY);
      this.setVar<web3.PublicKey>('SYSVAR_STAKE_HISTORY', web3.SYSVAR_STAKE_HISTORY_PUBKEY);
    }

  /**
   * Resolve PDAs
   * 
   * @param parsedYaml
   * @param onlyResolve Only resolve these PDAs
   */
  private resolvePda(parsedYaml: ParsedYaml, onlyResolve?: string[]) {
    // Loop through PDA
    for (const key in parsedYaml.pda) {

      // If onlyResolve is defined, skip PDAs that aren't defined in onlyResolve
      if (onlyResolve !== undefined && !onlyResolve.includes(key)) continue;

      const pda = parsedYaml.pda[key];
      let programId;
      if (pda.programId.startsWith('$')) {
        programId = this.getVar<web3.PublicKey>(pda.programId);
        if (typeof programId === undefined) {
          throw `The programId ${pda.programId} variable is not defined`;
        }
      } else {
        try {
          programId = new web3.PublicKey(pda.programId);
        } catch {
          throw `The program id value: ${pda.programId} is not a valid program id base58 string`;
        }
      }

      const seeds: Buffer[] = [];
      for (const seed of pda.seeds) {
        if (seed.startsWith('$')) {
          const p = this.getVar<web3.PublicKey | web3.Signer>(seed);
          if (typeof p === 'undefined') {
            throw `The public key ${seed} variable is not defined`;
          } else if (typeof (p as web3.Signer).publicKey !== 'undefined') {
            seeds.push((p as web3.Signer).publicKey.toBuffer());
          } else {
            try {
              new web3.PublicKey(p);
              seeds.push((p as web3.PublicKey).toBuffer())
            } catch {
              throw `The variable ${seed} is not a valid public key`
            }
          }
        } else {
          const _seed = Buffer.from(seed, 'utf-8');
          if (_seed.length > 32) {
            throw `The given seed: ${_seed} exceeds 32 bytes`;
          } else {
            seeds.push(_seed);
          }
        }
      }

      // Generate PDA
      const [_pda] = web3.PublicKey.findProgramAddressSync(seeds, programId);
      this.setVar<web3.PublicKey>(key, _pda);
    }
  }
}

export class Transaction {
  constructor(
    public readonly description: string,
    public readonly connection: web3.Connection,
    public readonly ixns: web3.TransactionInstruction[],
    public readonly alts: string[],
    public readonly payer: web3.PublicKey,
    public readonly signers: web3.Signer[],
  ) {}
  async compileToVersionedTransaction(): Promise<web3.VersionedTransaction> {
    const { blockhash: recentBlockhash } = await this.connection.getLatestBlockhash();
    const alts = [];
    for (const alt of this.alts) {
      alts.push(
        (await this.connection.getAddressLookupTable(new web3.PublicKey(alt))).value as web3.AddressLookupTableAccount
      )
    }
    const tx = new web3.VersionedTransaction(
      new web3.TransactionMessage({
        payerKey: this.payer,
        instructions: this.ixns,
        recentBlockhash,
      }).compileToV0Message(alts)
    );
    tx.sign(this.signers);
    return tx;
  }

  /**
   * Get all accounts from instructions
   */
  getAccountsFromInstructions(): web3.PublicKey[] {
    let hashmap: Record<string, web3.PublicKey> = {};
    this.ixns.map(ix => {
      hashmap[ix.programId.toString()] = ix.programId;
      ix.keys.map(meta => {
        hashmap[meta.pubkey.toString()] = meta.pubkey;
      })
    })
    const result: web3.PublicKey[] = [];
    for (const key in hashmap) {
      result.push(hashmap[key]);
    }
    return result;
  }
}

export type ResolveParams = {
  onlyResolve: {
    thesePdas?: string[],
    theseInstructions?: string[]
  }
}

export type Account = {
  file: string,
}

export type ComputeLimitSettings = {
  units: string,
  microLamports: string,
};

export type Pda = {
  programId: string,
  seeds: string[]
}

export type InstructionDefinition = {
  programId: string,
  data: string[],
  accounts: string[],
  payer: string,
}

export type TestAccount = {
  schema: string,
  params: Record<string, string>
}

export type TestWallet = {
  privateKey: string,
  solAmount: string
}

export type Test = {
  instruction: string,
  description: string,
  params: Record<string, string>
}

export type ParsedYaml = {
  addressLookupTables?: string[],
  computeLimitSettings?: Record<string, ComputeLimitSettings>
  accounts: Record<string, string>,
  accountsNoLabel: string[],
  pda: Record<string, Pda>,
  instructionDefinition: Record<string, InstructionDefinition>,
  localDevelopment: {
    accountsFolder: string,
    skipCache: string[],
    testAccounts: TestWallet[],
    testWallets: Record<string, TestWallet>,
    tests: Test[]
  }
}

export type AccountFile = {
  key: web3.PublicKey,
  path: string,
}
