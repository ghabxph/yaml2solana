import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as p from 'path';
import * as util from '../util';
import { AccountDecoder, Accounts, DynamicInstruction, InstructionBundle, InstructionDefinition, Pda, ResolvedInstructionBundles, TestWallet, Yaml2SolanaClass } from './Yaml2Solana';
import BN from 'bn.js';
import { AccountDecoder as AccountDecoderClass } from './AccountDecoder';
import { DynamicInstruction as DynamicInstructionClass } from './DynamicInstruction';
import { USER_WALLET } from '../cli/prompt/setupUserWalletUi';

export class ContextResolver {
  constructor (
    private readonly y2s: Yaml2SolanaClass,
    private readonly context: SyntaxContext,
    private readonly toResolve: Pda | Accounts | TestWallet | InstructionDefinition | DynamicInstruction | AccountDecoder | InstructionBundle,
    private readonly extra?: any,
  ) {}

  resolve(): Type | undefined {
    if (this.context === SyntaxContext.ACCOUNT_DECLARATION) {
      this.accountDeclarationContext();
    } else if (this.context === SyntaxContext.TEST_WALLET_DECLARATION) {
      return this.testWalletDeclarationContext();
    } else if (this.context === SyntaxContext.PDA_RESOLUTION) {
      return this.pdaResolutionContext();
    } else if (this.context === SyntaxContext.IX_RESOLUTION) {
      return this.resolveInstruction();
    } else if (this.context === SyntaxContext.IX_BUNDLE_RESOLUTION) {
      this.resolveBundledInstruction();
    } else if (this.context === SyntaxContext.DYNAMIC_IX_DECLARATION) {
      this.dynamicIxDeclarationContext();
    } else if (this.context === SyntaxContext.ACCOUNT_DECODER_DECLARATION) {
      this.accountDecoderClassContext();
    } else {
      throw `Invalid context.`;
    }
  }

  private accountDeclarationContext() {
    for (const key in this.toResolve) {
      const resolver = new MainSyntaxResolver(key, this.y2s);
      resolver.resolve(this.context, key);
    }
  }
  private testWalletDeclarationContext(): TypeKeypair {
    const testWallet = this.toResolve as TestWallet;
    let kp: TypeKeypair;
    if (testWallet.useUserWallet && USER_WALLET !== undefined) {
      kp = TypeFactory.createValue(USER_WALLET);
    } else {
      kp = TypeFactory.createValue(web3.Keypair.fromSecretKey(Buffer.from(testWallet.privateKey, 'base64')));
    }
    return kp;
  }
  private pdaResolutionContext(): Type {
    const pda = this.toResolve as Pda;
    const addressResolver = new MainSyntaxResolver(pda.programId, this.y2s).resolve(SyntaxContext.ADDRESS_RESOLUTION);
    if (addressResolver.type === 'pubkey') {
      const programId = addressResolver.value;
      const seeds: Buffer[] = [];
      for (const seed of pda.seeds) {
        const seedResolver = new MainSyntaxResolver(seed, this.y2s).resolve(this.context);
        if (seedResolver.type === 'buffer') {
          seeds.push(seedResolver.value);
        }
      }
      const [pda2] = web3.PublicKey.findProgramAddressSync(seeds, programId);
      return TypeFactory.createValue(pda2);
    } else {
      throw `Cannot resolve program id: ${pda.programId}`;
    }
  }
  private resolveInstruction() {
    const ixDef = this.toResolve as InstructionDefinition;
    const _programId = new MainSyntaxResolver(ixDef.programId, this.y2s).resolve(SyntaxContext.ADDRESS_RESOLUTION);
    if (_programId.type !== 'pubkey') {
      throw `Cannot resolve program id: ${ixDef.programId}`;
    }
    const dataArray: Buffer[] = [];
    for (const dataStr of ixDef.data) {
      const dataResolver = new MainSyntaxResolver(dataStr, this.y2s).resolve(SyntaxContext.DATA_RESOLUTION);
      if (dataResolver.type === 'buffer') {
        dataArray.push(dataResolver.value);
      } else {
        throw `Invalid resolution. Should resolve to Buffer.`;
      }
    }
    const accountMetas: web3.AccountMeta[] = [];
    for (const account of ixDef.accounts) {
      const metaResolver = new MainSyntaxResolver(account, this.y2s).resolve(SyntaxContext.META_RESOLUTION);
      if (metaResolver.type === 'account_meta_syntax') {
        accountMetas.push({
          ...metaResolver.value,
          pubkey: metaResolver.value.key
        });
      }
    }
    const programId = _programId.value;
    const data =  Buffer.concat(dataArray);
    const keys: web3.AccountMeta[] = accountMetas;
    return TypeFactory.createValue(new web3.TransactionInstruction({ programId, data, keys }));
  }
  private resolveBundledInstruction() {
    const ixBundle = this.toResolve as InstructionBundle;
    for (const ix of ixBundle.instructions) {
      const ixDefOrDynIx = this.y2s.parsedYaml.instructionDefinition[ix.label];
      const dynIx = ixDefOrDynIx as DynamicInstruction;
      const ixDef = ixDefOrDynIx as InstructionDefinition;
      let declarationSyntaxArr: string[] = dynIx.dynamic ? dynIx.params : ixDef.data;
      for (const declarationSyntax of declarationSyntaxArr) {
        const resolver = new MainSyntaxResolver(declarationSyntax, this.y2s).resolve(SyntaxContext.DECLARATION_SYNTAX);
        if (resolver.type === 'function_declaration_syntax') continue;
        else if (resolver.type === 'typed_variable_declaration_syntax') {
          const value = ix.params[resolver.value.name];
          if (value !== undefined) {
            if (resolver.value.dataType === 'pubkey') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new web3.PublicKey(value)));
            } else if (resolver.value.dataType === 'string') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(value));
            } else if (resolver.value.dataType === 'u8') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "u8"));
            } else if (resolver.value.dataType === 'u16') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "u16"));
            } else if (resolver.value.dataType === 'u32') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "u32"));
            } else if (resolver.value.dataType === 'u64') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new BN(value), "u64"));
            } else if (resolver.value.dataType === 'usize') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new BN(value), "usize"));
            } else if (resolver.value.dataType === 'i8') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "i8"));
            } else if (resolver.value.dataType === 'i16') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "i16"));
            } else if (resolver.value.dataType === 'i32') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "i32"));
            } else if (resolver.value.dataType === 'i64') {
              this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new BN(value), "i64"));
            } else if (resolver.value.dataType === 'bool') {
              if (typeof value === 'boolean') {
                this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(value));
              } else {
                if (['true', 'false'].includes(value)) {
                  this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(value === 'true'));
                } else {
                  throw `${resolver.value.name} supports only boolean value.`
                }
              }
            }
          }
        } else {
          throw `Invalid declaration syntax: ${declarationSyntax}`;
        }
      }
    }
  }
  private dynamicIxDeclarationContext() {

  }
  private accountDecoderClassContext() {
    const accountDecoder = this.toResolve as AccountDecoder;
    for (const item of accountDecoder) {
      const resolver = new MainSyntaxResolver(item, this.y2s).resolve(SyntaxContext.ACCOUNT_DECODER_DECLARATION);
      if (resolver.type !== 'account_decoder') {
        throw `Invalid syntax: ${item}`;
      }
    }
    const name = this.extra;
    const decoder = TypeFactory.createValue(new AccountDecoderClass(name, accountDecoder));
    this.y2s.setParam(name, decoder);
  }
}

export class MainSyntaxResolver {
  constructor(
    /**
     * Pattern string
     */
    public readonly pattern: string,
    private readonly y2s: Yaml2SolanaClass
  ) {}

  /**
   * Performs action based on given pattern and context
   */
  resolve(context: SyntaxContext, param?: any): Type {
    if (context === SyntaxContext.ACCOUNT_DECLARATION) {
      return this.accountDeclarationContext(param);
    } else if (context === SyntaxContext.PDA_RESOLUTION) {
      return this.basicResolver(new PdaSeedSyntaxResolver(this.pattern, this.y2s), `${this.pattern} is not a valid seed.`);
    } else if (context === SyntaxContext.ADDRESS_RESOLUTION) {
      return this.addressResolver();
    } else if (context === SyntaxContext.DATA_RESOLUTION) {
      return this.basicResolver(new AccountDataResolver(this.pattern, this.y2s), `Cannot resolve ${this.pattern} account decoder.`);
    } else if (context === SyntaxContext.META_RESOLUTION) {
      return this.basicResolver(new AccountMetaSyntaxResolver(this.pattern, this.y2s), `Public key or keypair ${this.pattern} does not exist.`);
    } else if (context === SyntaxContext.VARIABLE_RESOLUTION) {
      return this.basicResolver(new ValueSyntaxResolver(this.pattern, this.y2s), `Cannot resolve ${this.pattern} variable.`);
    } else if (context === SyntaxContext.ACCOUNT_DECODER_DECLARATION) {
      return this.basicResolver(new AccountDecoderClassSyntaxResolver(this.pattern, this.y2s), `Cannot resolve ${this.pattern} account decoder.`);
    } else if (context === SyntaxContext.DYNAMIC_IX_DECLARATION) {
      return this.basicResolver(new DynamicIxSyntaxResolver(this.pattern, this.y2s), `Invalid dynamic ix declaration syntax: ${this.pattern}`);
    } else if (context === SyntaxContext.DECLARATION_SYNTAX) {
      return this.basicResolver(new AccountDataSyntaxResolver(this.pattern, this.y2s), `Invalid declaration syntax: ${this.pattern}`);
    } else {
      throw `Invalid context.`;
    }
  }

  private accountDeclarationContext(param: string) {
    const syntax = new AccountSyntaxResolver(this.pattern, this.y2s);
    if (syntax.isValid()) {
      this.y2s.setParam(`$${param}`, syntax.value.value.account);
      return this.y2s.getParam(`$${param}`);
    } else {
      throw `Account declaration syntax is invalid.`;
    }
  }
  private addressResolver() {
    const syntax = new ValueSyntaxResolver(this.pattern, this.y2s);
    if (syntax.isValid()) {
      if (syntax.value.type === 'keypair') {
        return TypeFactory.createValue(syntax.value.value.publicKey);
      } else if (syntax.value.type === 'pubkey') {
        return TypeFactory.createValue(syntax.value.value);
      } else if (syntax.value.type === 'string') {
        return TypeFactory.createValue(
          new web3.PublicKey(syntax.value.value)
        );
      } else {
        throw `${this.pattern} is not a valid keypair or public key instance`
      }
    } else {
      throw `Cannot resolve ${this.pattern}.`;
    }
  }
  private basicResolver(syntax: SyntaxResolver, errorMessage: string) {
    if (syntax.isValid()) {
      return syntax.value;
    } else {
      throw errorMessage;
    }
  }
}

export abstract class SyntaxResolver {
  /**
   * Syntax resolver base constructor
   *
   * @param pattern
   * @param y2s
   */
  constructor(
    public readonly pattern: string,
    protected readonly y2s: Yaml2SolanaClass
  ) { 
    if (this.isValid()) this.resolve();
  }

  /**
   * Resolved value
   */
  abstract get value(): Type;

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  abstract isValid(): boolean;

  /**
   * Resolves the variable
   */
  protected abstract resolve(): void;
}

class AccountSyntaxResolver extends SyntaxResolver {

  private account?: web3.PublicKey;
  private path?: AccountPath

  /**
   * Resolved value
   */
  get value(): TypeAccountSyntax {
    return TypeFactory.createValue({
      account: this.account as web3.PublicKey,
      path: this.path,
    });
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    const [key, path] = this.pattern.split(',');
    try {
      new web3.PublicKey(key);
      if (path !== undefined) {
        const filePath = p.resolve(this.y2s.projectDir, path);
        fs.accessSync(filePath, fs.constants.F_OK);
        const split = filePath.split('.');
        const extension = split[split.length - 1];
        if (!['so', 'json'].includes(extension.toLocaleLowerCase())) {
          throw false;
        }
      }
    } catch {
      return false;
    }
    return true;
  }

  /**
   * Resolves the variable
   */
  resolve(): void {
    const [key, path] = this.pattern.split(',');
    this.account = new web3.PublicKey(key);
    if (path === undefined) return;
    const filePath = p.resolve(this.y2s.projectDir, path);
    const split = filePath.split('.');
    const extension = split[split.length - 1];
    if (extension.toLocaleLowerCase() === 'so') {
      this.path = {
        value: filePath,
        type: AccountPathType.EXECUTABLE
      };
    } else if (extension.toLocaleLowerCase() === 'json') {
      this.path = {
        value: filePath,
        type: AccountPathType.JSON
      };
    }
  }
}

class VariableSyntaxResolver extends SyntaxResolver {

  /**
   * Variable value
   */
  private _value: any;

  /**
   * Resolved value
   */
  get value(): Type {
    return TypeFactory.createValue(this._value);
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    return this.pattern.startsWith('$');
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    this._value = this.y2s.getParam(this.pattern);
    if (this._value === undefined) {
      throw `Cannot resolve ${this.value} variable.`
    }
  }
}

class AccountMetaSyntaxResolver extends SyntaxResolver {

  /**
   * Solana public key
   */
  private account?: web3.PublicKey;

  /**
   * Account is signer
   */
  private isSigner: boolean = false;

  /**
   * Account is mutable
   */
  private isMutable: boolean = false;

  /**
   * Resolved value
   */
  get value(): TypeAccountMeta {
    return TypeFactory.createValue({
      key: this.account as web3.PublicKey,
      isSigner: this.isSigner,
      isWritable: this.isMutable,
    })
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    const [value] = this.pattern.split(',');
    const startsWithDollar = value.startsWith('$');
    if (startsWithDollar) {
      try {
        const pubkey = new VariableSyntaxResolver(value, this.y2s)
        if (pubkey.value.type === "pubkey") {
          return true;
        }
      } catch {
        return false;
      }
    } else {
      try {
        new web3.PublicKey(value)
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    const split = this.pattern.split(',');
    const [value] = split;
    const startsWithDollar = value.startsWith('$');
    if (startsWithDollar) {
      const pubkey = new VariableSyntaxResolver(value, this.y2s);
      this.account = pubkey.value.value as web3.PublicKey;
    } else {
      this.account = new web3.PublicKey(value);
    }
    this.isSigner = split.includes('signer');
    this.isMutable = split.includes('mut');
  }
}

class ValueSyntaxResolver extends SyntaxResolver {

  /**
   * Value from yaml (primitive or resolved variable value)
   */
  private _value: any;

  private type?: any;

  /**
   * Resolved value
   */
  get value(): Type {
    if (typeof this._value === 'number') {
      return TypeFactory.createValue(this._value, this.type);
    }
    return TypeFactory.createValue(this._value);
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    const isNumber = typeof this.pattern === 'number';
    const isBoolean = typeof this.pattern === 'boolean';
    const isString = typeof this.pattern === 'string';
    if (isString && this.pattern.startsWith('$')) {
      const resolver = new VariableSyntaxResolver(this.pattern, this.y2s);
      if (!resolver.isValid()) {
        return false;
      }
      return [
        'string', 'pubkey', 'keypair', 'boolean',
        'u8', 'u16', 'u32', 'i8', 'i16', 'i32'
      ].includes(resolver.value.type);
    }
    return isNumber || isBoolean || isString;
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    const isNumber = typeof this.pattern === 'number';
    const isString = typeof this.pattern === 'string';
    if (isString && this.pattern.startsWith('$')) {
      const resolver = new VariableSyntaxResolver(this.pattern, this.y2s);
      this._value = resolver.value.value;
    } else {
      this._value = this.pattern;
      if (isNumber && this._value > 0) {
        this.type = 'u32'; // Assume number is 32-bit unsigned
      } else if (isNumber && this._value < 0) {
        this.type = 'i32'; // Assume number is 32-bit signed
      }
    }
  }
}

class AccountDecoderClassSyntaxResolver extends SyntaxResolver {

  private holder?: string;
  private type?: string;
  private offset?: number;

  /**
   * Resolved value
   */
  get value(): TypeAccountDecoderClassSyntax {
    return TypeFactory.createValue({
      holder: this.holder as string,
      type: this.type as string,
      offset: this.offset as number,
    });
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    const [holder, typeAndOffset] = this.pattern.split(':');
    const startsWithDollar = holder.startsWith('$');
    const [type, offset] = typeAndOffset.split(',');
    const offsetIsInteger = Number(offset) === parseInt(offset);
    const validType = [
      "u8", "u16", "u32", "u64", "u128", "usize",
      "i8", "i16", "i32", "i64", "i128", "pubkey",
    ].includes(type);
    return startsWithDollar && offsetIsInteger && validType
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    const [holder, typeAndOffset] = this.pattern.split(':');
    const [type, offset] = typeAndOffset.split(',');
    this.holder = holder;
    this.type = type;
    this.offset = parseInt(offset);
  }
}

class PdaSeedSyntaxResolver extends SyntaxResolver {

  /**
   * Seed
   */
  seed?: Buffer;

  /**
   * Resolved value
   */
  get value(): TypeBuffer {
    return TypeFactory.createValue(this.seed as Buffer);
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    if (this.pattern.startsWith('$')) {
      const value = new ValueSyntaxResolver(this.pattern, this.y2s);
      return value.isValid() && ['pubkey', 'keypair', 'string'].includes(value.value.type);
    } else {
      return typeof this.pattern === 'string';
    }
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    if (this.pattern.startsWith('$')) {
      const value = new ValueSyntaxResolver(this.pattern, this.y2s);
      if (value.value.type === 'keypair') {
        this.seed = value.value.value.publicKey.toBuffer();
      } else if (value.value.type === 'pubkey') {
        this.seed = value.value.value.toBuffer();
      } else if (value.value.type === 'string') {
        this.seed = Buffer.from(value.value.value, 'utf-8');
      }
    } else {
      this.seed = Buffer.from(this.pattern, 'utf-8');
    }
    if (this.seed!.length > 32) {
      throw `Seed cannot exceed 32 bytes.`;
    }
  }
}

class FunctionResolver extends SyntaxResolver {

  private _value?: Buffer;

  /**
   * Resolved value
   */
  get value(): TypeBuffer {
    return TypeFactory.createValue(this._value as Buffer);
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    try {
      this.resolveFunctions();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    this._value = this.resolveFunctions();
  }

  private resolveFunctions() {
    const _sighash = /sighash\([a-zA-Z0-9_]+\)/;
    const _bytes = /bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/;
    const _fromBase64 = /fromBase64\([^)]*\)/g;
    const _hex = /hex\([a-fA-F0-9_]+\)/;
    const __usize = /usize\([^)]*\)/g;
    const __u32 = /u32\([^)]*\)/g;


    if (_sighash.test(this.pattern)) {
      return this.resolveSighash(this.pattern);
    }

    else if (_bytes.test(this.pattern)) {
      return this.resolveRawBytes(this.pattern);
    }
  
    else if (_fromBase64.test(this.pattern)) {
      return this.resolveBase64(this.pattern);
    }
  
    else if (_hex.test(this.pattern)) {
      return this.resolveHex(this.pattern);
    }

    else if (__usize.test(this.pattern)) {
      return this.resolveUsizeFunc(this.pattern)
    }

    else if (__u32.test(this.pattern)) {
      return this.resolveU32Func(this.pattern)
    }

    else {
      throw `$${this.pattern} is not a valid function syntax.`;
    }
  }

  /**
   * Resolve sighash to Buffer
   *
   * @param data
   */
  private resolveSighash(data: string): Buffer {
    return util.typeResolver.sighash(
      data.replace(/sighash\(([^)]+)\)/, "$1")
    )
  }

  /**
   * Resolve raw bytes
   *
   * @param data
   */
  private resolveRawBytes(data: string): Buffer {
    const value = data
      .replace(/bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/, match => match.replace(/bytes\(|\)/g, ''))
      .split(',').map(value => parseInt(value.trim(), 10));
    return Buffer.from(value);
  }

  /**
   * Resolve base64 encoded string to raw bytes
   *
   * @param data
   */
  private resolveBase64(data: string): Buffer {
    const bytes = data.replace(/fromBase64\((.*?)\)/g, '$1');
    return Buffer.from(bytes, "base64");
  }

  /**
   * Resolve hex encoded string to raw bytes
   *
   * @param data
   */
  private resolveHex(data: string): Buffer {
    const bytes = data.replace(/hex\((.*?)\)/g, '$1');
    return Buffer.from(bytes, "hex");
  }

  /**
   * Resolve hex encoded string to raw bytes
   *
   * @param data
   */
  private resolveUsizeFunc(data: string): Buffer {
    const value = data.replace(/usize\((.*?)\)/g, '$1');
    const number = BigInt(value);
    if (number >= BigInt("0") && number <= BigInt("18446744073709551615")) { // 2^64 - 1
      const buffer = Buffer.alloc(8);
      buffer.writeBigUInt64LE(number); // Write as little-endian
      return buffer;
    } else {
      throw `Value ${value} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`;
    }
  }

  /**
   * Resolve hex encoded string to raw bytes
   *
   * @param data
   */
  private resolveU32Func(data: string): Buffer {
    const value = data.replace(/u32\((.*?)\)/g, '$1');
    const number = parseInt(value);
    if (number >= 0 && number <= 4294967295) { // 2^32 - 1
      const buffer = Buffer.alloc(4);
      buffer.writeUInt32LE(number); // Write as little-endian
      return buffer;
    } else {
      throw `Value ${value} is not a valid u32. Valid usize can only be between 0 to 4294967295.`;
    }
  }
}

class TypedVariableResolver extends SyntaxResolver {

  private _value?: Type;

  /**
   * Resolved value
   */
  get value(): Type {
    return this._value as Type;
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    try {
      this.resolveTypedVariable();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    this._value = this.resolveTypedVariable();
  }

  private resolveTypedVariable(): Type {
    const _u8 = /\$[a-zA-Z0-9_]+:u8/;
    const _u16 = /\$[a-zA-Z0-9_]+:u16/;
    const _u32 = /\$[a-zA-Z0-9_]+:u32/;
    const _u64 = /\$[a-zA-Z0-9_]+:u64/;
    const _usize = /\$[a-zA-Z0-9_]+:usize/
    const _i8 = /\$[a-zA-Z0-9_]+:i8/;
    const _i16 = /\$[a-zA-Z0-9_]+:i16/;
    const _i32 = /\$[a-zA-Z0-9_]+:i32/;
    const _i64 = /\$[a-zA-Z0-9_]+:i64/;
    const _bool = /\$[a-zA-Z0-9_]+:bool/;
    const _pubkey = /\$[a-zA-Z0-9_]+:pubkey/;
    const _string = /\$[a-zA-Z0-9_]+:string/;

    // Resolve u8 type
    if (_u8.test(this.pattern)) {
      return this.resolveU8(this.pattern);
    }

    // Resolve u16 type
    else if (_u16.test(this.pattern)) {
      return this.resolveU16(this.pattern);
    }

    // Resolve u32 type
    else if (_u32.test(this.pattern)) {
      return this.resolveU32(this.pattern);
    }

    // Resolve u64 type
    else if (_u64.test(this.pattern)) {
      return this.resolveU64(this.pattern);
    }

    // Resolve usize type
    else if (_usize.test(this.pattern)) {
      return this.resolveUsize(this.pattern);
    }

    // Resolve i8 type
    else if (_i8.test(this.pattern)) {
      return this.resolveI8(this.pattern);
    }

    // Resolve i16 type
    else if (_i16.test(this.pattern)) {
      return this.resolveI16(this.pattern);
    }

    // Resolve i32 type
    else if (_i32.test(this.pattern)) {
      return this.resolveI32(this.pattern);
    }

    // Resolve i64 type
    else if (_i64.test(this.pattern)) {
      return this.resolveI64(this.pattern);
    }

    // Resolve bool type
    else if (_bool.test(this.pattern)) {
      return this.resolveBool(this.pattern);
    }

    // Resolve pubkey type
    else if (_pubkey.test(this.pattern)) {
      return this.resolvePubkey(this.pattern);
    }

    // Resolve string type
    else if (_string.test(this.pattern)) {
      return this.resolveString(this.pattern);
    }

    // Variable syntax is not correct.
    else {
      throw `$${this.pattern} is not a valid typed variable syntax.`;
    }
  }


  /**
   * Resolve unsigned 8-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU8(data: string): TypeU8 {
    const key = data.replace(/\$([^:]+):u8/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
        const value = resolver.value.value as number;
        if (value >= 0 && value <= 255) {
          return TypeFactory.createValue(value, 'u8');
        } else {
          throw `$${key} is not a valid u8. Valid u8 can only between 0 to 255.`
        }
      } else {
        throw `$${key} is not a number.`
      }
    } else {
      throw `Cannot resolve u8 value: $${key}`
    }
  }

  /**
   * Resolve unsigned 16-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU16(data: string): TypeU16 {
    const key = data.replace(/\$([^:]+):u16/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      const value = resolver.value.value as number;
      if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
        if (value >= 0 && value <= 65535) { // 2^16 - 1
          return TypeFactory.createValue(value, 'u16');
        } else {
          throw `$${key} is not a valid u16. Valid u16 can only be between 0 to 65535.`;
        }
      } else {
        throw `$${key} is not a number.`;
      }
    } else {
      throw `Cannot resolve u16 $${key} value.`;
    }
  }

  /**
   * Resolve unsigned 32-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU32(data: string): TypeU32 {
    const key = data.replace(/\$([^:]+):u32/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      const value = resolver.value.value as number;
      if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
        if (value >= 0 && value <= 4294967295) { // 2^32 - 1
          return TypeFactory.createValue(value, 'u32');
        } else {
          throw `$${key} is not a valid u32. Valid u32 can only be between 0 to 4294967295.`;
        }
      } else {
        throw `$${key} is not a number.`;
      }
    } else {
      throw `Cannot resolve u32 $${key} value.`;
    }
  }

  /**
   * Resolve unsigned 64-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU64(data: string): TypeU64 {
    const key = data.replace(/\$([^:]+):u64/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['u8', 'u16', 'u32', 'u64'].includes(resolver.value.type)) {
        let value: BN;
        if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
          value = new BN(resolver.value.value as number);
        } else {
          value = new BN(resolver.value.value as BN);
        }
        if (value.gte(new BN(0)) && value.lte(new BN("18446744073709551615"))) { // 2^64 - 1
          return TypeFactory.createValue(value, 'u64');
        } else {
          throw `$${key} is not a valid u64. Valid u64 can only be between 0 to 18446744073709551615.`;
        }
      } else {
        throw `$${key} is not a valid number or bigint.`;
      }
    } else {
      throw `Cannot resolve u64 $${key} value.`;
    }
  }

  /**
   * Resolve usize to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveUsize(data: string): TypeU128 {
    const key = data.replace(/\$([^:]+):usize/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['u8', 'u16', 'u32', 'u64', 'usize'].includes(resolver.value.type)) {
        let value: BN;
        if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
          value = new BN(resolver.value.value as number);
        } else {
          value = new BN(resolver.value.value as BN);
        }
        if (value.gte(new BN(0)) && value.lte(new BN("18446744073709551615"))) { // 2^64 - 1
          return TypeFactory.createValue(value, 'u128');
        } else {
          throw `$${key} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`;
        }
      } else {
        throw `$${key} is not a valid number or bigint.`;
      }
    } else {
      throw `Cannot resolve usize $${key} value.`;
    }
  }


  /**
   * Resolve signed 8-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI8(data: string): TypeI8 {
    const key = data.replace(/\$([^:]+):i8/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
        const value = resolver.value.value as number;
        if (value >= -128 && value <= 127) { // Range for i8
          return TypeFactory.createValue(value, 'i8');
        } else {
          throw `$${key} is not a valid i8. Valid i8 can only be between -128 to 127.`;
        }
      } else {
        throw `$${key} is not a number.`;
      }
    } else {
      throw `Cannot resolve i8 $${key} value.`;
    }
  }

  /**
   * Resolve signed 16-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI16(data: string): TypeI16 {
    const key = data.replace(/\$([^:]+):i16/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
        const value = resolver.value.value as number;
        if (value >= -32768 && value <= 32767) { // Range for i16
          return TypeFactory.createValue(value, 'i16');
        } else {
          throw `$${key} is not a valid i16. Valid i16 can only be between -32768 to 32767.`;
        }
      } else {
        throw `$${key} is not a number.`;
      }
    } else {
      throw `Cannot resolve i16 $${key} value.`;
    }
  }

  /**
   * Resolve signed 32-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI32(data: string): TypeI32 {
    const key = data.replace(/\$([^:]+):i32/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
        const value = resolver.value.value as number;
        if (value >= -2147483648 && value <= 2147483647) { // Range for i32
          return TypeFactory.createValue(value, 'i32');
        } else {
          throw `$${key} is not a valid i32. Valid i32 can only be between -2147483648 to 2147483647.`;
        }
      } else {
        throw `$${key} is not a number.`;
      }
    } else {
      throw `Cannot resolve i32 $${key} value.`;
    }
  }

  /**
   * Resolve signed 64-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI64(data: string): TypeI64 {
    const key = data.replace(/\$([^:]+):i64/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (['i8', 'i16', 'i32', 'i64'].includes(resolver.value.type)) {
        let value: BN;
        if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
          value = new BN(resolver.value.value as number);
        } else {
          value = new BN(resolver.value.value as BN);
        }
        if (
          value.gte(new BN("-9223372036854775808")) && // -2^63
          value.lte(new BN("9223372036854775807")) // 2^63 - 1
        ) {
          return TypeFactory.createValue(value, 'i64');
        } else {
          throw `$${key} is not a valid i64. Valid i64 can only be between -9223372036854775808 to 9223372036854775807.`;
        }
      } else {
        throw `$${key} is not a valid number or bigint.`;
      }
    } else {
      throw `Cannot resolve u64 $${key} value.`;
    }
  }

  /**
   * Resolve boolean to Buffer
   *
   * @param data
   * @param params
   */
  private resolveBool(data: string): TypeBoolean {
    const key = data.replace(/\$([^:]+):bool/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid() && resolver.value.type === 'boolean') {
      const value = resolver.value.value;
      return TypeFactory.createValue(value);
    } else {
      throw `The value of $${key} is not a valid boolean.`;
    }
  }

  /**
   * Resolve public key from account definition or given parameters
   *
   * @param data
   * @param params
   * @returns
   */
  private resolvePubkey(data: string): TypePubkey {
    const key = data.replace(/\$([^:]+):pubkey/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (resolver.value.type === 'pubkey') {
        return TypeFactory.createValue(resolver.value.value);
      } else if (resolver.value.type === 'keypair') {
        return TypeFactory.createValue(resolver.value.value.publicKey);
      } else {
        throw `$${key} is not a pubkey or keypair instance.`;
      }
    } else {
      throw `Cannot resolve keypair or pubkey $${key} value.`;
    }
  }

  /**
   * Resolve string
   *
   * @param data
   * @param params
   * @returns
   */
  private resolveString(data: string): TypeString {
    const key = data.replace(/\$([^:]+):string/, "$1");
    const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
    if (resolver.isValid()) {
      if (resolver.value.type === 'string') {
        return TypeFactory.createValue(resolver.value.value);
      } else {
        throw `$${key} is not a string.`;
      }
    } else {
      throw `Cannot resolve string $${key} value.`;
    }
  }
}

class AccountDataResolver extends SyntaxResolver {

  private _value?: Buffer;

  /**
   * Resolved value
   */
  get value(): TypeBuffer {
    return TypeFactory.createValue(this._value as Buffer);
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    const funcResolver = new FunctionResolver(this.pattern, this.y2s);
    const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
    const supportedTypes = ['u8', 'u16', 'u32', 'u64', 'usize', 'i8', 'i16', 'i32', 'i64', 'boolean', 'pubkey'].includes(typedVarResolver.value.type)
    return funcResolver.isValid() || typedVarResolver.isValid() && supportedTypes;
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    const funcResolver = new FunctionResolver(this.pattern, this.y2s);
    const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
    if (funcResolver.isValid()) {
      this._value = funcResolver.value.value;
    } else if (typedVarResolver.isValid()) {
      if (typedVarResolver.value.type === 'u8') {
        this._value = Buffer.from([typedVarResolver.value.value])
      } else if (typedVarResolver.value.type === 'u16') {
        this._value = Buffer.alloc(2);
        this._value.writeUint16LE(typedVarResolver.value.value);
      } else if (typedVarResolver.value.type === 'u32') {
        this._value = Buffer.alloc(4);
        this._value.writeUint32LE(typedVarResolver.value.value);
      } else if (typedVarResolver.value.type === 'u64') {
        this._value = Buffer.alloc(8);
        this._value.writeBigUint64LE(BigInt(typedVarResolver.value.value.toString()));
      } else if (typedVarResolver.value.type === 'usize') {
        this._value = Buffer.alloc(8);
        this._value.writeBigUint64LE(BigInt(typedVarResolver.value.value.toString()));
      } else if (typedVarResolver.value.type === 'i8') {
        this._value = Buffer.alloc(1);
        this._value.writeInt8(typedVarResolver.value.value);
      } else if (typedVarResolver.value.type === 'i16') {
        this._value = Buffer.alloc(2);
        this._value.writeInt16LE(typedVarResolver.value.value);
      } else if (typedVarResolver.value.type === 'i32') {
        this._value = Buffer.alloc(4);
        this._value.writeInt32LE(typedVarResolver.value.value);
      } else if (typedVarResolver.value.type === 'i64') {
        this._value = Buffer.alloc(8);
        this._value.writeBigInt64LE(BigInt(typedVarResolver.value.value.toString()));
      } else if (typedVarResolver.value.type === 'boolean') {
        this._value = Buffer.from([typedVarResolver.value.value ? 1 : 0]);
      } else if (typedVarResolver.value.type === 'pubkey') {
        this._value = typedVarResolver.value.value.toBuffer();
      } else {
        throw `Unsupported type: ${typedVarResolver.value.type}`
      }
    }
  }
}

class DynamicIxSyntaxResolver extends SyntaxResolver {
  /**
   * Value
   */
  private _value?: Type;

  /**
   * Resolved value
   */
  get value(): Type {
    return this._value as Type;
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
    return typedVarResolver.isValid();
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
    this._value = typedVarResolver.value;
  }
}

class AccountDataSyntaxResolver extends SyntaxResolver {

  private type?: string;
  private dataType?: string;
  private name?: string;
  private returns?: any;

  /**
   * Resolved value
   */
  get value(): TypeTypedVariableDeclarationSyntax | TypeFunctionDeclarationSyntax {
    return TypeFactory.createValue({
      type: this.type as any,
      dataType: this.dataType as any,
      name: this.name as string,
      returns: this.returns,
    })
  }

  /**
   * Checks whether syntax provided is valid
   *
   * @returns true or false
   */
  isValid(): boolean {
    try {
      this.getMeaning();
    } catch {
      return false;
    }
    return true;
  }

  /**
   * Resolves the variable
   */
  protected resolve(): void {
    const meaning = this.getMeaning();
    this.type = meaning.type;
    this.dataType = meaning.dataType;
    this.name = meaning.name;
    this.returns = meaning.returns;
  }

  private getMeaning() {
    const _sighash = /sighash\([a-zA-Z0-9_]+\)/;
    const _bytes = /bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/;
    const _fromBase64 = /fromBase64\([^)]*\)/g;
    const _hex = /hex\([a-fA-F0-9_]+\)/;
    const __usize = /usize\([^)]*\)/g;
    const __u32 = /u32\([^)]*\)/g;
    const _u8 = /\$[a-zA-Z0-9_]+:u8/;
    const _u16 = /\$[a-zA-Z0-9_]+:u16/;
    const _u32 = /\$[a-zA-Z0-9_]+:u32/;
    const _u64 = /\$[a-zA-Z0-9_]+:u64/;
    const _usize = /\$[a-zA-Z0-9_]+:usize/
    const _i8 = /\$[a-zA-Z0-9_]+:i8/;
    const _i16 = /\$[a-zA-Z0-9_]+:i16/;
    const _i32 = /\$[a-zA-Z0-9_]+:i32/;
    const _i64 = /\$[a-zA-Z0-9_]+:i64/;
    const _bool = /\$[a-zA-Z0-9_]+:bool/;
    const _pubkey = /\$[a-zA-Z0-9_]+:pubkey/;
    const _string = /\$[a-zA-Z0-9_]+:string/;

    if (_sighash.test(this.pattern)) {
      return this.resolveSighash(this.pattern);
    } else if (_bytes.test(this.pattern)) {
      return this.resolveRawBytes(this.pattern);
    } else if (_fromBase64.test(this.pattern)) {
      return this.resolveBase64(this.pattern);
    } else if (_hex.test(this.pattern)) {
      return this.resolveHex(this.pattern);
    } else if (__usize.test(this.pattern)) {
      return this.resolveUsizeFunc(this.pattern)
    } else if (__u32.test(this.pattern)) {
      return this.resolveU32Func(this.pattern)
    } else if (_u8.test(this.pattern)) {
      return this.resolveU8(this.pattern);
    } else if (_u16.test(this.pattern)) {
      return this.resolveU16(this.pattern);
    } else if (_u32.test(this.pattern)) {
      return this.resolveU32(this.pattern);
    } else if (_u64.test(this.pattern)) {
      return this.resolveU64(this.pattern);
    } else if (_usize.test(this.pattern)) {
      return this.resolveUsize(this.pattern);
    } else if (_i8.test(this.pattern)) {
      return this.resolveI8(this.pattern);
    } else if (_i16.test(this.pattern)) {
      return this.resolveI16(this.pattern);
    } else if (_i32.test(this.pattern)) {
      return this.resolveI32(this.pattern);
    } else if (_i64.test(this.pattern)) {
      return this.resolveI64(this.pattern);
    } else if (_bool.test(this.pattern)) {
      return this.resolveBool(this.pattern);
    } else if (_pubkey.test(this.pattern)) {
      return this.resolvePubkey(this.pattern);
    } else if (_string.test(this.pattern)) {
      return this.resolveString(this.pattern);
    } else {
      throw `$${this.pattern} is not a valid typed variable or function syntax.`;
    }
  }

  /**
   * Resolve sighash to Buffer
   *
   * @param data
   */
  private resolveSighash(data: string): FunctionSyntax {
    return {
      type: "function",
      dataType: "buffer",
      name: "sighash",
      returns: util.typeResolver.sighash(
        data.replace(/sighash\(([^)]+)\)/, "$1")
      ),
    }
  }

  /**
   * Resolve raw bytes
   *
   * @param data
   */
  private resolveRawBytes(data: string): FunctionSyntax {
    const value = data
      .replace(/bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/, match => match.replace(/bytes\(|\)/g, ''))
      .split(',').map(value => parseInt(value.trim(), 10));
    return {
      type: "function",
      dataType: "buffer",
      name: "bytes",
      returns: Buffer.from(value),
    }
  }

  /**
   * Resolve base64 encoded string to raw bytes
   *
   * @param data
   */
  private resolveBase64(data: string): FunctionSyntax {
    const bytes = data.replace(/fromBase64\((.*?)\)/g, '$1');
    return {
      type: "function",
      dataType: "buffer",
      name: "fromBase64",
      returns: Buffer.from(bytes, "base64"),
    }
  }

  /**
   * Resolve hex encoded string to raw bytes
   *
   * @param data
   */
  private resolveHex(data: string): FunctionSyntax {
    const bytes = data.replace(/hex\((.*?)\)/g, '$1');
    return {
      type: "function",
      dataType: "buffer",
      name: "hex",
      returns: Buffer.from(bytes, "hex"),
    }
  }

  /**
   * Resolve hex encoded string to raw bytes
   *
   * @param data
   */
  private resolveUsizeFunc(data: string): FunctionSyntax {
    const value = data.replace(/usize\((.*?)\)/g, '$1');
    const number = BigInt(value);
    if (number >= BigInt("0") && number <= BigInt("18446744073709551615")) { // 2^64 - 1
      return {
        type: "function",
        dataType: "usize",
        name: "usize",
        returns: new BN(value),
      }
    } else {
      throw `Value ${value} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`;
    }
  }

  /**
   * Resolve hex encoded string to raw bytes
   *
   * @param data
   */
  private resolveU32Func(data: string): FunctionSyntax {
    const value = data.replace(/u32\((.*?)\)/g, '$1');
    const number = parseInt(value);
    if (number >= 0 && number <= 4294967295) { // 2^32 - 1
      return {
        type: "function",
        dataType: "u32",
        name: "u32",
        returns: number,
      }
    } else {
      throw `Value ${value} is not a valid u32. Valid usize can only be between 0 to 4294967295.`;
    }
  }


  /**
   * Resolve unsigned 8-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU8(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):u8/, "$1");
    return {
      type: "variable",
      dataType: "u8",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve unsigned 16-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU16(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):u16/, "$1");
    return {
      type: "variable",
      dataType: "u16",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve unsigned 32-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU32(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):u32/, "$1");
    return {
      type: "variable",
      dataType: "u32",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve unsigned 64-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveU64(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):u64/, "$1");
    return {
      type: "variable",
      dataType: "u64",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve usize to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveUsize(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):usize/, "$1");
    return {
      type: "variable",
      dataType: "usize",
      name: key,
      returns: undefined,
    }
  }


  /**
   * Resolve signed 8-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI8(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):i8/, "$1");
    return {
      type: "variable",
      dataType: "i8",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve signed 16-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI16(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):i16/, "$1");
    return {
      type: "variable",
      dataType: "i16",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve signed 32-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI32(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):i32/, "$1");
    return {
      type: "variable",
      dataType: "i32",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve signed 64-bit integer to Buffer
   *
   * @param data
   * @param params Parameters from function in object form
   */
  private resolveI64(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):i64/, "$1");
    return {
      type: "variable",
      dataType: "i64",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve boolean to Buffer
   *
   * @param data
   * @param params
   */
  private resolveBool(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):bool/, "$1");
    return {
      type: "variable",
      dataType: "bool",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve public key from account definition or given parameters
   *
   * @param data
   * @param params
   * @returns
   */
  private resolvePubkey(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):pubkey/, "$1");
    return {
      type: "variable",
      dataType: "pubkey",
      name: key,
      returns: undefined,
    }
  }

  /**
   * Resolve public key from account definition or given parameters
   *
   * @param data
   * @param params
   * @returns
   */
  private resolveString(data: string): TypedVariableSyntax {
    const key = data.replace(/\$([^:]+):string/, "$1");
    return {
      type: "variable",
      dataType: "string",
      name: key,
      returns: undefined,
    }
  }
}

export abstract class TypeFactory {
  static createValue(value: Type): Type;
  static createValue(value: web3.PublicKey): TypePubkey;
  static createValue(value: web3.Keypair): TypeKeypair;
  static createValue(value: string): TypeString;
  static createValue(value: boolean): TypeBoolean;
  static createValue(value: number, type: "u8"): TypeU8;
  static createValue(value: number, type: "u16"): TypeU16;
  static createValue(value: number, type: "u32"): TypeU32;
  static createValue(value: number, type: "i8"): TypeI8;
  static createValue(value: number, type: "i16"): TypeI16;
  static createValue(value: number, type: "i32"): TypeI32;
  static createValue(value: BN, type: "u64"): TypeU64;
  static createValue(value: BN, type: "u128"): TypeU128;
  static createValue(value: BN, type: "usize"): TypeUsize;
  static createValue(value: BN, type: "i64"): TypeI64;
  static createValue(value: BN, type: "i128"): TypeI128;
  static createValue(value: AccountSyntax): TypeAccountSyntax;
  static createValue(value: AccountMetaSyntax): TypeAccountMeta;
  static createValue(value: AccountDecoderClassSyntax): TypeAccountDecoderClassSyntax;
  static createValue(value: AccountDecoderClass): TypeAccountDecoderClass;
  static createValue(value: DynamicInstructionClass): TypeDynamicInstructionClass;
  static createValue(value: Buffer): TypeBuffer;
  static createValue(value: web3.TransactionInstruction): TypeInstruction;
  static createValue(value: TypedVariableSyntax): TypeTypedVariableDeclarationSyntax;
  static createValue(value: FunctionSyntax): TypeFunctionDeclarationSyntax;
  static createValue(value: ResolvedInstructionBundles): TypeResolvedInstructionBundles;
  static createValue(
    value: Type | web3.PublicKey | web3.Keypair | string | boolean | number | BN | AccountMetaSyntax | AccountSyntax | AccountDecoderClassSyntax | DynamicInstructionClass | AccountDecoderClass | Buffer | web3.TransactionInstruction | TypedVariableSyntax | FunctionSyntax | ResolvedInstructionBundles,
    type?: "u8" | "u16" | "u32" | "u64" | "u128" | "usize" | "i8" | "i16" | "i32" | "i64" | "i128"
  ): Type {
    if (TypeFactory.isType(value)) {
      return value as Type;
    } else if (TypeFactory.isPubkey(value)) {
      return { value: value as web3.PublicKey, type: "pubkey" };
    } else if (TypeFactory.isKeypair(value)) {
      return { value: value as web3.Keypair, type: "keypair" };
    } else if (TypeFactory.isString(value)) {
      return { value: value as string, type: "string" };
    } else if (TypeFactory.isBoolean(value)) {
      return { value: value as boolean, type: "boolean" };
    } else if (TypeFactory.isInteger(value)) {
      return { value: value as number, type: type as "u8" | "u16" | "u32" | "i8" | "i16" | "i32"};
    } else if (TypeFactory.isBigInteger(value)) {
      return { value: value as BN, type: type as "u64" | "u128" | "usize" | "i64" | "i128" };
    } else if (TypeFactory.isAccountSyntax(value)) {
      return { value: value as AccountSyntax, type: "account_syntax" };
    } else if (TypeFactory.isAccountMeta(value)) {
      return { value: value as AccountMetaSyntax, type: "account_meta_syntax" };
    } else if (TypeFactory.isAccountDecoderClassSyntax(value)) {
      return { value: value as AccountDecoderClassSyntax, type: "account_decoder_syntax" };
    } else if (TypeFactory.isAccountDecoderClass(value)) {
      return { value: value as AccountDecoderClass, type: "account_decoder" };
    } else if (TypeFactory.isDynamicInstructionClass(value)) {
      return { value: value as DynamicInstructionClass, type: "dynamic_instruction" };
    } else if (TypeFactory.isBuffer(value)) {
      return { value: value as Buffer, type: "buffer" };
    } else if (TypeFactory.isInstruction(value)) {
      return { value: value as web3.TransactionInstruction, type: "instruction" };
    } else if (TypeFactory.isTypedVariableDeclarationSyntax(value)) {
      return { value: value as TypedVariableSyntax, type: "typed_variable_declaration_syntax" };
    } else if (TypeFactory.isFunctionDeclarationSyntax(value)) {
      return { value: value as FunctionSyntax, type: "function_declaration_syntax" };
    } else if (TypeFactory.isResolvedInstructionBundles(value)) {
      return { value: value as ResolvedInstructionBundles, type: "resolved_instruction_bundles" };
    } else {
      throw `Unsupported value.`
    }
  }

  private static isType(value: any): boolean {
    return typeof (value as Type).value !== 'undefined' && typeof (value as Type).type === 'string'
  }
  private static isPubkey(value: any): boolean {
    return typeof (value as web3.PublicKey).toBase58 === 'function'
  }
  private static isKeypair(value: any): boolean {
    return typeof (value as web3.Keypair).publicKey !== 'undefined';
  }
  private static isString(value: any): boolean {
    return typeof value === 'string';
  }
  private static isBoolean(value: any): boolean {
    return typeof value === 'boolean';
  }
  private static isInteger(value: any): boolean {
    return typeof value === 'number' && value === Math.floor(value);
  }
  private static isBigInteger(value: any): boolean {
    return typeof (value as BN).cmp === 'function' && (value as BN).mod(new BN(1)).eq(new BN(0));
  }
  private static isAccountMeta(value: any): boolean {
    return typeof (value as AccountMetaSyntax).key.toBase58 === 'function';
  }
  private static isAccountSyntax(value: any): boolean {
    return typeof (value as AccountSyntax).account?.toBase58 === 'function';
  }
  private static isAccountDecoderClassSyntax(value: any): boolean {
    return typeof (value as AccountDecoderClassSyntax).holder === 'string';
  }
  private static isAccountDecoderClass(value: any): boolean {
    return typeof (value as AccountDecoderClass).data.toString === 'function';
  }
  private static isDynamicInstructionClass(value: any): boolean {
    return typeof (value as DynamicInstructionClass).extend === 'function';
  }
  private static isBuffer(value: any): boolean {
    return typeof (value as Buffer).readUInt16BE === 'function';
  }
  private static isInstruction(value: any): boolean {
    return typeof (value as web3.TransactionInstruction).programId.toBase58 === 'function';
  }
  private static isTypedVariableDeclarationSyntax(value: any): boolean {
    return (value as TypedVariableSyntax).type === 'variable';
  }
  private static isFunctionDeclarationSyntax(value: any): boolean {
    return (value as FunctionSyntax).type === 'function';
  }
  private static isResolvedInstructionBundles(value: any): boolean {
    return (value as ResolvedInstructionBundles).resolvedInstructionBundle === true;
  }
}

export type Type =
  TypePubkey |
  TypeKeypair |
  TypeString |
  TypeBoolean |
  TypeU8 |
  TypeU16 |
  TypeU32 |
  TypeU64 |
  TypeUsize |
  TypeU128 |
  TypeI8 |
  TypeI16 |
  TypeI32 |
  TypeI64 |
  TypeI128 |
  TypeAccountMeta |
  TypeAccountSyntax |
  TypeAccountDecoderClassSyntax |
  TypeAccountDecoderClass |
  TypeDynamicInstructionClass |
  TypeBuffer |
  TypeInstruction |
  TypeTypedVariableDeclarationSyntax |
  TypeFunctionDeclarationSyntax |
  TypeResolvedInstructionBundles;

export type TypePubkey = { value: web3.PublicKey, type: "pubkey" };
export type TypeKeypair = { value: web3.Keypair, type: "keypair" };
export type TypeString = { value: string, type: "string" };
export type TypeBoolean = { value: boolean, type: "boolean" };
export type TypeAccountMeta = { value: AccountMetaSyntax, type: "account_meta_syntax" };
export type TypeAccountSyntax = { value: AccountSyntax, type: "account_syntax" };
export type TypeU8 = { value: number, type: "u8" };
export type TypeU16 = { value: number, type: "u16" };
export type TypeU32 = { value: number, type: "u32" };
export type TypeI8 = { value: number, type: "i8" };
export type TypeI16 = { value: number, type: "i16" };
export type TypeI32 = { value: number, type: "i32" };
export type TypeU64 = { value: BN, type: "u64" };
export type TypeU128 = { value: BN, type: "u128" };
export type TypeUsize = { value: BN, type: "usize" };
export type TypeI64 = { value: BN, type: "i64" };
export type TypeI128 = { value: BN, type: "i128" };
export type TypeAccountDecoderClassSyntax = { value: AccountDecoderClassSyntax, type: "account_decoder_syntax" };
export type TypeAccountDecoderClass = { value: AccountDecoderClass, type: "account_decoder" };
export type TypeDynamicInstructionClass = { value: DynamicInstructionClass, type: "dynamic_instruction" };
export type TypeBuffer = { value: Buffer, type: "buffer" };
export type TypeInstruction = { value: web3.TransactionInstruction, type: "instruction" };
export type TypeTypedVariableDeclarationSyntax = { value: TypedVariableSyntax , type: "typed_variable_declaration_syntax" };
export type TypeFunctionDeclarationSyntax = { value: FunctionSyntax , type: "function_declaration_syntax" };
export type TypeResolvedInstructionBundles = { value: ResolvedInstructionBundles, type: 'resolved_instruction_bundles' };

type AccountDecoderClassSyntax = { holder: string, type: string, offset: number }
type AccountMetaSyntax = { key: web3.PublicKey, isSigner: boolean, isWritable: boolean };
type AccountSyntax = { account: web3.PublicKey, path?: AccountPath };
type AccountPath = { value: string, type: AccountPathType };
type TypedVariableSyntax = 
  { type: "variable", dataType: "u8", name: string, returns: undefined } |
  { type: "variable", dataType: "u16", name: string, returns: undefined } |
  { type: "variable", dataType: "u32", name: string, returns: undefined } |
  { type: "variable", dataType: "u64", name: string, returns: undefined } |
  { type: "variable", dataType: "usize", name: string, returns: undefined } |
  { type: "variable", dataType: "i8", name: string, returns: undefined } |
  { type: "variable", dataType: "i16", name: string, returns: undefined } |
  { type: "variable", dataType: "i32", name: string, returns: undefined } |
  { type: "variable", dataType: "i64", name: string, returns: undefined } |
  { type: "variable", dataType: "bool", name: string, returns: undefined } |
  { type: "variable", dataType: "pubkey", name: string, returns: undefined } |
  { type: "variable", dataType: "string", name: string, returns: undefined };
type FunctionSyntax =
  { type: "function", dataType: "buffer", name: "sighash", returns: Buffer } |
  { type: "function", dataType: "buffer", name: "bytes", returns: Buffer } |
  { type: "function", dataType: "buffer", name: "fromBase64", returns: Buffer } |
  { type: "function", dataType: "buffer", name: "hex", returns: Buffer } |
  { type: "function", dataType: "usize", name: "usize", returns: BN } |
  { type: "function", dataType: "u32", name: "u32", returns: number };

enum AccountPathType { EXECUTABLE, JSON };
export enum SyntaxContext {
  ACCOUNT_DECLARATION,
  PDA_RESOLUTION,
  ADDRESS_RESOLUTION,
  DATA_RESOLUTION,
  META_RESOLUTION,
  VARIABLE_RESOLUTION,
  ACCOUNT_DECODER_DECLARATION,
  DYNAMIC_IX_DECLARATION,
  TEST_WALLET_DECLARATION,
  IX_RESOLUTION,
  IX_BUNDLE_RESOLUTION,
  DECLARATION_SYNTAX,
  SET_VALUE_SYNTAX,
}
