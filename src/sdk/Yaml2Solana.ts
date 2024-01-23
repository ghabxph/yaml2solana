import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as util from '../util';
import find from 'find-process';
import { exec } from 'child_process';
import { spawn } from 'child_process';
import { AccountDecoder as AccountDecoderClass } from './AccountDecoder';
import { DynamicInstruction as DynamicInstructionClass, GenerateIxFn, GenerateIxsFn } from './DynamicInstruction';
import { cliEntrypoint } from '../cli';
import { ContextResolver, MainSyntaxResolver, SyntaxContext, SyntaxResolver, Type, TypeFactory } from './SyntaxResolver';
import { throwErrorWithTrace } from '../error';
import tsClearScreen from 'ts-clear-screen';

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
  private _global: Record<string, Type> = {};

  /**
   * Parsed yaml
   */
  private _parsedYaml: ParsedYaml;

  /**
   * Test validator runnin PID
   */
  private testValidatorPid?: number;

  constructor(config: string) {
    this.localnetConnection = new web3.Connection("http://127.0.0.1:8899");

    // Read the YAML file.
    const _path = path.resolve(config);
    const yamlFile = fs.readFileSync(_path, 'utf8');
    this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');
    this._parsedYaml = yaml.parse(yamlFile);

    // Resolve test wallets
    this.resolveTestWallets();

    // Set named accounts to global variable
    this.setNamedAccountsToGlobal();

    // Set known solana accounts (not meant to be downloaded)
    this.setKnownAccounts();

    // Generate account decoders
    this.generateAccountDecoders();

    // Generate dynamic accoutns
    this.generateDynamicAccounts();
  }

  /**
   * Reloads test wallet
   */
  reloadTestWallets() {
    this.resolveTestWallets();
  }

  /**
   * Get all global variables
   */
  get global(): Record<string, any> {
    return this._global;
  }

  /**
   * Start CLI
   */
  async cli() {
    await cliEntrypoint(this);
  }

  /**
   * Parsed yaml file
   */
  get parsedYaml(): ParsedYaml {
    return this._parsedYaml;
  }

  /**
   * Get account decoders
   */
  get accountDecoders(): string[] {
    const result: string[] = [];
    for (const decoder in this.parsedYaml.accountDecoder) {
      result.push(decoder);
    }
    return result;
  }

  /**
   * Resolve variables
   * @param params
   */
  async resolve(params: ResolveParams) {
    let onlyResolve: string[] | undefined;

    // Resolve PDAs
    onlyResolve = params.onlyResolve.thesePdas?.map(v => this.sanitizeDollar(v));
    this.resolvePda(onlyResolve);

    // Resolve instructions
    onlyResolve = params.onlyResolve.theseInstructions?.map(v => this.sanitizeDollar(v));
    this.resolveInstructions(onlyResolve)

    // Resolve instruction bundles
    onlyResolve = params.onlyResolve.theseInstructionBundles?.map(v => this.sanitizeDollar(v));
    await this.resolveInstructionBundles(onlyResolve);
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
   * @param ix
   * @returns
   */
  private isObjectInstruction(ix: any): boolean {
    return typeof ix === 'object' && typeof ix.programId !== 'undefined';
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
  createTransaction(
    description: string,
    ixns: (string | web3.TransactionInstruction)[],
    alts: string[],
    payer: string | web3.PublicKey,
    signers: (string | web3.Signer)[]
  ): Transaction {
    const _ixns: web3.TransactionInstruction[] = [];
    for (const ix of ixns) {
      if (this.isObjectInstruction(ix)) {
        _ixns.push(ix as web3.TransactionInstruction);
      } else if (typeof ix === 'string') {
        const _ix = this.getVar(ix);
        if (_ix.type === 'instruction') {
          _ixns.push(_ix.value);
        } else if (_ix.type === 'resolved_instruction_bundles') {
          const bundle = _ix.value;
          _ixns.push(...bundle.ixs);
          alts.push(...bundle.alts.map(alt => alt.toString()));
        } else {
          return throwErrorWithTrace(`Variable ${ix} is not a valid transaction instruction`);
        }
      } else {
        return throwErrorWithTrace('Invalid solana transaction instruction');
      }
    }
    let _payer: web3.PublicKey;
    if (typeof payer === 'string') {
      const __payer = this.getVar(payer);
      if (__payer.type === 'pubkey') {
        _payer = __payer.value;
      } else if (__payer.type === 'keypair') {
        _payer = __payer.value.publicKey;
      } else {
        return throwErrorWithTrace(`Variable ${payer} is not a valid public key`);
      }
    } else {
      _payer = payer;
    }
    const _signers: web3.Signer[] = signers.map(signer => {
      if (typeof signer === 'string') {
        const _signer = this.getVar(signer)
        if (_signer.type !== 'keypair') {
          return throwErrorWithTrace(`Variable ${signer} is not a valid Signer instance`);
        }
        return _signer.value as web3.Signer;
      } else if (typeof signer === 'object' && typeof signer.publicKey !== 'undefined' && typeof signer.secretKey !== 'undefined') {
        return signer;
      } else {
        return throwErrorWithTrace(`Invalid solana signer instance`);
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
    const ixDef = this.getIxDefinition(ixLabel);
    let payer: web3.Signer;
    const p = this.getVar(ixDef.payer);
    if (p.type === 'keypair') {
      payer = p.value;
    } else {
      return throwErrorWithTrace(`Cannot resolve payer: ${ixDef.payer}`);
    }
    let isPayerSigner = false;
    for (const meta of ixDef.accounts) {
      const _meta = meta.split(',');
      const [account] = _meta;
      if (_meta.includes('signer')) {
        const signer = this.getVar(account);
        if (signer.type === 'keypair') {
          result.push(signer.value);
        } else {
          return throwErrorWithTrace(`Cannot resolve signer account: ${account}`);
        }
        if (Buffer.from(signer.value.secretKey).equals(Buffer.from(payer.secretKey))) {
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
   * @returns instruction bundle labels defined in yaml
   */
  getInstructionBundles(): string[] {
    const result: string[] = [];
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
  resolveInstructionBundlePayer(label: string): web3.PublicKey {
    const payer = this._parsedYaml.instructionBundle![label].payer;
    let kp: web3.Keypair;
    if (payer.startsWith('$')) {
      const _kp = this.getVar(payer);
      if (_kp.type === 'keypair') {
        kp = _kp.value;
      } else {
        return throwErrorWithTrace(`${payer} is not a valid keypair.`);
      }
    } else {
      // Assume that value is base64 encoded keypair
      kp = web3.Keypair.fromSecretKey(
        Buffer.from(payer, 'base64')
      );
    }
    return kp.publicKey;
  }

  /**
   * Resolve instruction bundle signers from instructions
   *
   * @param label Instruction bundle label
   * @returns 
   */
  resolveInstructionBundleSigners(label: string): web3.Signer[] {
    const result: web3.Signer[] = [];
    const signers: string[] = [];
    const dynIxSigners: web3.PublicKey[] = [];
    label = label.startsWith('$') ? label.substring(1) : label;
    const ixLabels = this._parsedYaml.instructionBundle![label].instructions.map(v => v.label.startsWith('$') ? v.label.substring(1) : v.label);
    const _payer = this._parsedYaml.instructionBundle![label].payer;
    let payer: web3.Signer;
    if (_payer.startsWith('$')) {
      const p = this.getVar(_payer);
      if (p.type === 'pubkey') {
        payer = this.findSigner(p.value);
      } else if (p.type === 'keypair') {
        payer = p.value;
      } else {
        return throwErrorWithTrace(`${_payer} is not a valid signer instance.`);
      }
    } else {
      const r = new MainSyntaxResolver(_payer, this).resolve(SyntaxContext.LITERALS);
      if (r !== undefined && r.type === 'pubkey') {
        payer = this.findSigner(r.value);
      } else if (r !== undefined && r.type === 'keypair') {
        payer = r.value;
      } else {
        return throwErrorWithTrace(`${_payer} is not a valid public key or keypair literal.`);
      }
    }
    result.push(payer);
    for (const ixLabel of ixLabels) {
      let ixDef: InstructionDefinition;
      try {
        ixDef = this.getIxDefinition(ixLabel);
      } catch {
        const dynIx = this.getVar(`$${ixLabel}`);
        if (dynIx.type === 'dynamic_instruction') {
          const singleIx = dynIx.value.ix;
          const multipleIx = dynIx.value.ixs;
          if (singleIx !== undefined) {
            dynIxSigners.push(...singleIx.keys.filter(meta => meta.isSigner).map(meta => meta.pubkey));
          } else if (multipleIx !== undefined) {
            multipleIx.map(ix => {
              dynIxSigners.push(...ix.keys.filter(meta => meta.isSigner).map(meta => meta.pubkey));
            });
          } else {
            return throwErrorWithTrace(`Dynamic instruction: ${ixLabel} is not yet defined.`);
          }
        } else {
          return throwErrorWithTrace(`${dynIx.type} is not dynamic instruction`);
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
    signers.filter((v,i,s) => s.indexOf(v) === i).map(signer => {
      result.push(this.findSigner(signer));
    });
    dynIxSigners.map(p => {
      result.push(this.findSigner(p));
    });
    return result.filter((v,i,s) => s.indexOf(v) === i);
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

    return throwErrorWithTrace(`Cannot find process named \'solana-test-validator\'`);
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

    if (!runFromExistingLocalnet && cluster === 'http://127.0.0.1:8899') {
      // Step 1: Run test validator
      await this.runTestValidator(txns, skipRedownload);
      await (() => new Promise(resolve => setTimeout(() => resolve(0), 1000)))();
      tsClearScreen();
      await (() => new Promise(resolve => setTimeout(() => resolve(0), 1000)))();
    }

    // Step 2: Execute transactions
    const response: { txid: string, transactionResponse: web3.VersionedTransactionResponse | null }[] = [];
    for (const key in txns) {
      // Compile tx to versioned transaction
      const connection = (cluster === 'http://127.0.0.1:8899') ? txns[key].connection : new web3.Connection(cluster);
      txns[key].connection = connection;
      // TODO: Option in CLI to run transaction as legacy or versioned transaction
      // const tx = await txns[key].compileToLegacyTx();
      const tx = await txns[key].compileToVersionedTransaction();

      // If we like to have test validator running, then we want to have skipPreflight enabled
      if (keepRunning) {
        try {
          // TODO: Option in CLI to run transaction as legacy or versioned transaction
          // const sig = await web3.sendAndConfirmTransaction(connection, tx, txns[key].signers, this._parsedYaml.executeTxSettings);
          const sig = await connection.sendTransaction(tx, this._parsedYaml.executeTxSettings);
          const url = cluster === 'http://127.0.0.1:8899' ? 
            `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899` :
            `https://explorer.solana.com/tx/${sig}`;
          console.log(`TX: ${txns[key].description}`);
          console.log(`-------------------------------------------------------------------`)
          console.log(`tx sig ${sig}`);
          console.log(`Solana Explorer: ${url}`);
          console.log(``);
          const transactionResponse = (await connection.getTransaction(sig, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          }));
          response.push({ txid: sig, transactionResponse });
        } catch (e) {
          console.log(e);
          console.trace();
          process.exit(-1);
        }
      } else {
        try {
          // TODO: Option in CLI to run transaction as legacy or versioned transaction
          // const sig = await web3.sendAndConfirmTransaction(connection, tx, txns[key].signers, this._parsedYaml.executeTxSettings);
          const sig = await connection.sendTransaction(tx, this._parsedYaml.executeTxSettings);
          const url = cluster === 'http://127.0.0.1:8899' ? 
            `https://explorer.solana.com/tx/${sig}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899` :
            `https://explorer.solana.com/tx/${sig}`;
          console.log(`TX: ${txns[key].description}`);
          console.log(`-------------------------------------------------------------------`)
          console.log(`tx sig ${sig}`);
          console.log(`Solana Explorer: ${url}`);
          const transactionResponse = (await connection.getTransaction(sig, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          }));
          response.push({ txid: sig, transactionResponse });
        } catch (e) {
          console.log(e);
          console.trace();
          process.exit(-1);
        }
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

    // Step 2: Override lamport amount from test wallet
    const cacheFolder = path.resolve(this.projectDir, this._parsedYaml.localDevelopment.accountsFolder);
    for (const walletId in this._parsedYaml.localDevelopment.testWallets) {
      const testWallet = this._parsedYaml.localDevelopment.testWallets[walletId];
      const kp = web3.Keypair.fromSecretKey(
        Buffer.from(testWallet.privateKey, 'base64')
      );
      const pubkey = kp.publicKey;
      const account: util.solana.FullAccountInfo = {}
      const lamports = parseInt((parseFloat(testWallet.solAmount) * 1_000_000_000).toString());
      account[`${pubkey}`] = {
        executable: false,
        owner: web3.SystemProgram.programId,
        lamports,
        data: Buffer.alloc(0),
        rentEpoch: 0,
      }
      util.fs.writeAccountsToCacheFolder(cacheFolder, account);
      const walletPath = path.resolve(cacheFolder, `${pubkey}.json`);
      mapping[`${pubkey}`] = walletPath;
    }

    // Step 3: Override account data
    for (const testAccount of this._parsedYaml.localDevelopment.testAccounts) {
      let key: string;
      if (testAccount.key.startsWith('$')) {
        const pubkeyOrKp = this.getVar(testAccount.key);
        if (pubkeyOrKp.type === 'pubkey') {
          key = pubkeyOrKp.value.toBase58();
        } else if (pubkeyOrKp.type === 'keypair') {
          key = pubkeyOrKp.value.publicKey.toBase58();
        } else {
          return throwErrorWithTrace(`Cannot resolve ${testAccount.key}`);
        }
      } else {
        key = testAccount.key;
      }
      if (testAccount.createNew) {
        util.fs.createEmptyAccount(
          cacheFolder,
          key,
          testAccount.hack.accountSize,
          new web3.PublicKey(testAccount.hack.owner),
          testAccount.hack.lamports
        );
        for (const override of testAccount.hack.overrides) {
          const account = util.fs.readAccount(cacheFolder, key);
          account[key]!.data.write(override.data, override.offset, 'base64');
          util.fs.writeAccountsToCacheFolder(cacheFolder, account);
        }
      }
      const account = util.fs.readAccount(cacheFolder, key);
      const decoder = this.getAccountDecoder(`$${testAccount.schema}`);
      decoder.data = account[key]!.data;
      for (const id in testAccount.params) {
        const value = testAccount.params[id];
        if (typeof value === 'string' && value.startsWith('$')) {
          const _value = this.getVar(value);
          decoder.setValue(`$${id}`, _value);
        } else {
          decoder.setValue(`$${id}`, value);
        }
      }
      account[key]!.data = decoder.data;
      util.fs.writeAccountsToCacheFolder(cacheFolder, account);
      const accountPath = path.resolve(cacheFolder, `${key}.json`);
      mapping[`${key}`] = accountPath;
    }

    // Step 4: Run test validator
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
    const v = this.getVar(name);
    if (v.type === 'instruction') {
      return v.value;
    } else {
      return throwErrorWithTrace(`${name} is not a valid web3.TransactionInstruction instance`);
    }
  }

  /**
   * Resolve given instruction
   *
   * @param ixLabel Instruction to execute
   * @returns available parameters that can be overriden for target instruction
   */
  async resolveInstruction(ixLabel: string) {
    // Find PDAs involved from given instruction
    const pdas = this.findPdasInvolvedInInstruction(ixLabel);

    // Then run resolve function
    await this.resolve(
      {
        onlyResolve: {
          thesePdas: pdas,
          theseInstructions: [ixLabel],
          theseInstructionBundles: [],
        }
      }
    );
  }

  /**
   * Extract variable info
   *
   * @param pattern
   */
  extractVarInfo(pattern: string): util.typeResolver.VariableInfo {
    return util.typeResolver.extractVariableInfo(pattern, this._global);
  }

  /**
   * Set parameter value
   *
   * @param name
   * @param value
   */
  setParam(name: string, value: any) {
    if (name.startsWith('$')) {
      this.setVar(name.substring(1), value);
    } else {
      return throwErrorWithTrace('Variable should begin with dollar symbol `$`');
    }
  }

  /**
   * Alias to getVar
   *
   * @param name 
   */
  getParam(name: string): Type {
    return this.getVar(name);
  }


  /**
   * Get ix definition
   *
   * @param ixLabel
   * @returns
   */
  public getIxDefinition(ixLabel: string): InstructionDefinition{
    const ixDef = this._parsedYaml.instructionDefinition[ixLabel];
    if ('programId' in ixDef && 'data' in ixDef && 'accounts' in ixDef && 'payer' in ixDef) {
      return ixDef as InstructionDefinition;
    }
    return throwErrorWithTrace(`${ixLabel} is not an InstructionDefinition`);
  }

  public extendDynamicInstruction(params: {ixName: string, generateFn: GenerateIxFn}): void;
  public extendDynamicInstruction(params: {ixName: string, generateFn: GenerateIxsFn}): void;
  public extendDynamicInstruction(params: {ixName: string, generateFn: GenerateIxFn | GenerateIxsFn}) {
    const v = this.getVar(`$${params.ixName}`);
    if (v !== undefined) {
      if (v.type === 'dynamic_instruction') {
        v.value.extend(params.generateFn as any);
      } else {
        return throwErrorWithTrace(`Cannot find dynamic instruction $${params.ixName}`);
      }
    }
  }

  /**
   * Find PDAs involved from given instruction
   *
   * @param ixLabel 
   */
  findPdasInvolvedInInstruction(ixLabel: string): string[] {
    ixLabel = ixLabel.startsWith('$') ? ixLabel.substring(1) : ixLabel;
    const result: string[] = [];
    try {
      const ixDef = this.getIxDefinition(ixLabel);
      for (const accountMeta of ixDef.accounts) {
        let [account] = accountMeta.split(',');
        if (!account.startsWith('$')) continue;
        account = account.substring(1);
        if (typeof this._parsedYaml.pda[account] !== 'undefined') {
          result.push(account);
        }
      }
    } catch {
      const dynIx = this.getDynamicInstruction(ixLabel);
      for (const param of dynIx.params) {
        const [_account] = param.split(':');
        const account = _account.substring(1);
        if (typeof this._parsedYaml.pda[account] !== 'undefined') {
          result.push(account);
        }
      }
    }
    return result;
  }

  /**
   * Get ix definition
   *
   * @param ixLabel
   * @returns
   */
  private getDynamicInstruction(ixLabel: string): DynamicInstruction{
    const ixDef = this._parsedYaml.instructionDefinition[ixLabel];
    if ('dynamic' in ixDef && 'params' in ixDef) {
      return ixDef as DynamicInstruction;
    }
    return throwErrorWithTrace(`${ixLabel} is not a DynamicInstruction`);
  }

  /**
   * Store value to global variable
   *
   * @param name 
   * @param value 
   */
  private setVar(name: string, value: any) {
    this._global[name] = TypeFactory.createValue(value);
  }

  /**
   * Retrieve value from global variable
   *
   * @param name
   * @returns
   */
  private getVar(name: string): Type {
    if (name.startsWith('$')) {
      const result = this._global[name.substring(1)]
      return result;
    } else {
      return throwErrorWithTrace('Variable should begin with dollar symbol `$`');
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
  private resolveTestWallets() {
    const testWallets = this._parsedYaml.localDevelopment.testWallets;
    for (const key in testWallets) {
      const testWallet = testWallets[key];
      const resolver = new ContextResolver(this, SyntaxContext.TEST_WALLET_DECLARATION, testWallet);
      const kp = resolver.resolve();
      if (kp !== undefined && kp.type === 'keypair') {
        this.setVar(key, kp.value)
      }
    }
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
   * @param onlyResolve
   */
  private resolveInstructions(onlyResolve?: string[]) {
    // Loop through instructions
    for (const key in this.parsedYaml.instructionDefinition) {
      // If onlyResolve is defined, skip instructions that aren't defined in onlyResolve
      if (onlyResolve !== undefined && !onlyResolve.includes(key)) continue;

      // Resolve first the necessary PDA required by the instruction
      this.resolve({
        onlyResolve: {
          thesePdas: this.findPdasInvolvedInInstruction(key),
          theseInstructions: [],
          theseInstructionBundles: [],
          theseDynamicInstructions: [],
        }
      });

      let ixDef: InstructionDefinition;
      try { ixDef = this.getIxDefinition(key) } catch { continue }
      const resolver = new ContextResolver(this, SyntaxContext.IX_RESOLUTION, ixDef).resolve();
      if (resolver !== undefined && resolver.type === 'instruction') {
        this.setVar(key, resolver.value);
      } else {
        return throwErrorWithTrace(`Cannot resolve ${key} instruction from schema`);
      }
    }
  }

  /**
   * Resolve instruction bundles
   *
   * @param onlyResolve
   */
  private async resolveInstructionBundles(onlyResolve?: string[]) {
    for (const _ixBundle in this._parsedYaml.instructionBundle) {

      // Skip if not included in onlyResolve
      if (onlyResolve !== undefined && !onlyResolve.includes(_ixBundle)) continue;

      const ixBundle = this._parsedYaml.instructionBundle[_ixBundle];
      const alts: web3.PublicKey[] = ixBundle.alts.map(alt => new web3.PublicKey(alt));

      // Resolve variables from bundle using context resolver
      new ContextResolver(this, SyntaxContext.IX_BUNDLE_RESOLUTION, ixBundle).resolve();

      // Resolve instructions (generate / re-generate isntruction after variable setting)
      for (const ix of ixBundle.instructions) {
        const _ix = this._parsedYaml.instructionDefinition[ix.label] as DynamicInstruction;
        if (_ix.dynamic !== undefined && _ix.dynamic) continue;
        this.resolveInstruction(ix.label)
      }

      // Get instructions from instruction definition or dynamic instruction
      const ixs: web3.TransactionInstruction[] = [];
      for (const ix of ixBundle.instructions) {
        const _ix = this.getVar(`$${ix.label}`);
        if (_ix.type === 'instruction') {
          ixs.push(_ix.value);
        } else if (_ix.type === 'dynamic_instruction') {
          await _ix.value.resolve();
          const singleIx = _ix.value.ix;
          const multipleIx = _ix.value.ixs;
          if (singleIx !== undefined) {
            ixs.push(singleIx);
          } else if (multipleIx !== undefined) {
            ixs.push(...multipleIx);
          } else {
            return throwErrorWithTrace(`Dynamic instruction ${ix.label} is not yet defined.`);
          }
          alts.push(..._ix.value.alts);
        } else {
          return throwErrorWithTrace(`${ix.label} is not a valid web3.TransactionInstruction or DynamicInstructionClass instance`);
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
  }

  /**
   * Set named accounts to global variable
   *
   * @param parsedYaml
   */
  private setNamedAccountsToGlobal() {
    // Loop through accounts
    const resolver = new ContextResolver(this, SyntaxContext.ACCOUNT_DECLARATION, this._parsedYaml.accounts);
    resolver.resolve();
  }

  /**
   * Set known solana accounts
   *
   * @param parsedYaml
   */
  private setKnownAccounts() {
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
  private resolvePda(onlyResolve?: string[]) {
    // Loop through PDA
    for (const key in this.parsedYaml.pda) {

      // If onlyResolve is defined, skip PDAs that aren't defined in onlyResolve
      if (onlyResolve !== undefined && !onlyResolve.includes(key)) continue;

      // Resolve PDA using context resolver
      const resolver = new ContextResolver(this, SyntaxContext.PDA_RESOLUTION, this.parsedYaml.pda[key])
      const resolved = resolver.resolve();
      if (resolved !== undefined && resolved.type === 'pubkey') {
        this.setVar(key, resolved);
      } else {
        return throwErrorWithTrace(`Cannot resolve PDA: ${key}`);
      }
    }
  }

  /**
   * Generate account decoder instances
   */
  private generateAccountDecoders() {
    if (this._parsedYaml.accountDecoder !== undefined) {
      for (const name in this._parsedYaml.accountDecoder) {
        // Resolve accont decoders using context resolver
        new ContextResolver(this, SyntaxContext.ACCOUNT_DECODER_DECLARATION, this._parsedYaml.accountDecoder[name], name).resolve();
      }
    }
  }

  /**
   * Resolve keypair
   *
   * @param idOrVal
   */
  private resolveKeypair(idOrVal: string): web3.Keypair {
    if (idOrVal.startsWith('$')) {
      const kp = this.getVar(idOrVal);
      if (kp.type === 'keypair') {
        return kp.value;
      } else {
        return throwErrorWithTrace(`Cannot resolve keypair: ${idOrVal}`);
      }
    } else {
      return web3.Keypair.fromSecretKey(
        Buffer.from(idOrVal, 'base64')
      );
    }
  }

  private sanitizeDollar(pattern: string) {
    return pattern.startsWith('$') ? pattern.substring(1) : pattern;
  }

  /**
   * Generate dynamic accounts
   */
  private generateDynamicAccounts() {
    for (const ixLabel in this._parsedYaml.instructionDefinition) {
      let dynamicIx: DynamicInstruction = { dynamic: true, params: [] };
      try {
        dynamicIx = this.getDynamicInstruction(ixLabel);
      } catch {
        continue;
      }
      if (dynamicIx.dynamic) {
        this.setVar(
          ixLabel,
          TypeFactory.createValue(new DynamicInstructionClass(this, dynamicIx.params))
        )
      }
    }
  }

  /**
   * Find signer from global variable
   *
   * @param idOrValue
   */
  private findSigner(idOrValue: string | web3.PublicKey): web3.Signer {
    let signerPubkey: string;
    if (typeof idOrValue !== 'string') {
      try {
        new web3.PublicKey(idOrValue);
        signerPubkey = (idOrValue as web3.PublicKey).toBase58();
      } catch {
        return throwErrorWithTrace(`${idOrValue} is not a valid public key instance.`);
      }
    } else if (idOrValue.startsWith('$')) {
      const pubkeyOrKp = this.getVar(idOrValue);
      if (pubkeyOrKp.type === 'keypair') {
        return pubkeyOrKp.value;
      } else if (pubkeyOrKp.type === 'pubkey') {
        signerPubkey = pubkeyOrKp.value.toBase58()
      } else {
        return throwErrorWithTrace(`Variable ${idOrValue} is not a valid public key or keypair instance`);
      }
    } else {
      try {
        new web3.PublicKey(idOrValue);
        signerPubkey = idOrValue;
      } catch {
        return throwErrorWithTrace(`${idOrValue} is not a valid base58 public key string.`);
      }
    }
    for (const id in this._global) {
      const keypair = this.getVar(`$${id}`);
      if (keypair.type === 'keypair' && keypair.value.publicKey.toBase58() === signerPubkey) {
        return keypair.value;
      }
    }
    return throwErrorWithTrace(`Cannot find keypair ${idOrValue}`);
  }

  /**
   * Get account decoder instance from global
   *
   * @param key
   * @returns
   */
  private getAccountDecoder(key: string): AccountDecoderClass {
    const v = this.getVar(key)
    if (v.type === 'account_decoder') {
      return v.value;
    } else {
      return throwErrorWithTrace(`${key} is not an AccountDecoder class instance`);
    }
  }
}

export class Transaction {
  constructor(
    public readonly description: string,
    public connection: web3.Connection,
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
    console.log();
    console.log();
    console.log();
    console.log('Transaction signers info:');
    console.log('-----------------------------------------------------------');
    const signerInfo: string[] = [];
    this.ixns.map((ix, i) => {
      ix.keys.map((meta, j) => {
        if (meta.isSigner) {
          signerInfo.push(`ix #${i+1} - account #${j+1} - ${meta.pubkey}`);
        }
      });
    });
    signerInfo.map(s => console.log(s));
    const actualSigners: string[] = [];
    this.signers.map((signer, i) => {
      actualSigners.push(`Signer #${i+1} ${signer.publicKey}`);
    });
    actualSigners.map(s => console.log(s));
    console.log(`Payer: ${this.payer}`);
    console.log('-----------------------------------------------------------');
    console.log();
    console.log();
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

  async compileToLegacyTx(): Promise<web3.Transaction> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    console.log();
    console.log();
    console.log();
    console.log('Transaction signers info:');
    console.log('-----------------------------------------------------------');
    const signerInfo: string[] = [];
    this.ixns.map((ix, i) => {
      ix.keys.map((meta, j) => {
        if (meta.isSigner) {
          signerInfo.push(`ix #${i+1} - account #${j+1} - ${meta.pubkey}`);
        }
      });
    });
    signerInfo.map(s => console.log(s));
    const actualSigners: string[] = [];
    this.signers.map((signer, i) => {
      actualSigners.push(`Signer #${i+1} ${signer.publicKey}`);
    });
    actualSigners.map(s => console.log(s));
    console.log(`Payer: ${this.payer}`);
    console.log('-----------------------------------------------------------');
    console.log();
    console.log();

    const tx = new web3.Transaction({ blockhash, lastValidBlockHeight });
    tx.add(...this.ixns);
    tx.sign(...this.signers);
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

export type ResolvedInstructionBundles = {
  resolvedInstructionBundle: true,
  alts: web3.PublicKey[],
  payer: web3.Keypair,
  ixs: web3.TransactionInstruction[],
};

export type ResolveParams = {
  onlyResolve: {
    thesePdas?: string[],
    theseInstructions?: string[]
    theseInstructionBundles?: string[],
    theseDynamicInstructions?: string[],
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

export type AccountHacker = {
  accountSize: number,
  owner: string,
  lamports: number,
  overrides: {
    offset: number,
    data: string
  }[]
}

export type TestAccount = {
  key: string,
  schema: string,
  params: Record<string, string>,
  createNew: boolean,
  hack: AccountHacker,
}

export type TestWallet = {
  useUserWallet?: boolean,
  privateKey: string,
  solAmount: string
}

export type Test = {
  instruction: string,
  description: string,
  params: Record<string, string>
}

export type InstructionBundleIxs = {
  label: string,
  dynamic?: boolean,
  params: Record<string, string>,
}

export type InstructionBundle = {
  vars?: Record<string, string>,
  alts: string[],
  payer: string,
  instructions: InstructionBundleIxs[]
}

export type DynamicInstruction = {
  dynamic: true,
  params: string[],
}

export type ExecuteTxSettings = {
  skipPreflight?: boolean,
}

export type Accounts = Record<string, string>;
export type AccountDecoder = string[];

export type ParsedYaml = {
  mainnetRpc?: string[],
  executeTxSettings: ExecuteTxSettings,
  addressLookupTables?: string[],
  computeLimitSettings?: Record<string, ComputeLimitSettings>
  accounts: Accounts,
  accountsNoLabel: string[],
  pda: Record<string, Pda>,
  instructionDefinition: Record<string, InstructionDefinition | DynamicInstruction>,
  accountDecoder?: Record<string, AccountDecoder>
  instructionBundle?: Record<string, InstructionBundle>,
  localDevelopment: {
    accountsFolder: string,
    skipCache: string[],
    testAccounts: TestAccount[],
    testWallets: Record<string, TestWallet>,
    tests: Test[]
  }
}

export type AccountFile = {
  key: web3.PublicKey,
  path: string,
}
