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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyntaxContext = exports.TypeFactory = exports.SyntaxResolver = exports.MainSyntaxResolver = exports.ContextResolver = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const p = __importStar(require("path"));
const util = __importStar(require("../util"));
const bn_js_1 = __importDefault(require("bn.js"));
const AccountDecoder_1 = require("./AccountDecoder");
const setupUserWalletUi_1 = require("../cli/prompt/setupUserWalletUi");
const error_1 = require("../error");
class ContextResolver {
    constructor(y2s, context, toResolve, extra) {
        this.y2s = y2s;
        this.context = context;
        this.toResolve = toResolve;
        this.extra = extra;
    }
    resolve() {
        if (this.context === SyntaxContext.ACCOUNT_DECLARATION) {
            this.accountDeclarationContext();
        }
        else if (this.context === SyntaxContext.TEST_WALLET_DECLARATION) {
            return this.testWalletDeclarationContext();
        }
        else if (this.context === SyntaxContext.PDA_RESOLUTION) {
            return this.pdaResolutionContext();
        }
        else if (this.context === SyntaxContext.IX_RESOLUTION) {
            return this.resolveInstruction();
        }
        else if (this.context === SyntaxContext.IX_BUNDLE_RESOLUTION) {
            this.resolveBundledInstruction();
        }
        else if (this.context === SyntaxContext.DYNAMIC_IX_DECLARATION) {
            this.dynamicIxDeclarationContext();
        }
        else if (this.context === SyntaxContext.ACCOUNT_DECODER_DECLARATION) {
            this.accountDecoderClassContext();
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Invalid context.`);
        }
    }
    accountDeclarationContext() {
        const accounts = this.toResolve;
        for (const key in accounts) {
            const resolver = new MainSyntaxResolver(accounts[key], this.y2s);
            resolver.resolve(this.context, key);
        }
    }
    testWalletDeclarationContext() {
        const testWallet = this.toResolve;
        let kp;
        if (testWallet.useUserWallet && setupUserWalletUi_1.USER_WALLET !== undefined) {
            kp = TypeFactory.createValue(setupUserWalletUi_1.USER_WALLET);
        }
        else {
            kp = TypeFactory.createValue(web3.Keypair.fromSecretKey(Buffer.from(testWallet.privateKey, 'base64')));
        }
        return kp;
    }
    pdaResolutionContext() {
        const pda = this.toResolve;
        const addressResolver = new MainSyntaxResolver(pda.programId, this.y2s).resolve(SyntaxContext.ADDRESS_RESOLUTION);
        if (addressResolver.type === 'pubkey') {
            const programId = addressResolver.value;
            const seeds = [];
            for (const seed of pda.seeds) {
                const seedResolver = new MainSyntaxResolver(seed, this.y2s).resolve(this.context);
                if (seedResolver.type === 'buffer') {
                    seeds.push(seedResolver.value);
                }
            }
            const [pda2] = web3.PublicKey.findProgramAddressSync(seeds, programId);
            return TypeFactory.createValue(pda2);
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve program id: ${pda.programId}`);
        }
    }
    resolveInstruction() {
        const ixDef = this.toResolve;
        const _programId = new MainSyntaxResolver(ixDef.programId, this.y2s).resolve(SyntaxContext.ADDRESS_RESOLUTION);
        if (_programId.type !== 'pubkey') {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve program id: ${ixDef.programId}`);
        }
        const dataArray = [];
        for (const dataStr of ixDef.data) {
            const dataResolver = new MainSyntaxResolver(dataStr, this.y2s).resolve(SyntaxContext.DATA_RESOLUTION);
            if (dataResolver.type === 'buffer') {
                dataArray.push(dataResolver.value);
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Invalid resolution. Should resolve to Buffer.`);
            }
        }
        const accountMetas = [];
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
        const data = Buffer.concat(dataArray);
        const keys = accountMetas;
        return TypeFactory.createValue(new web3.TransactionInstruction({ programId, data, keys }));
    }
    resolveBundledInstruction() {
        const ixBundle = this.toResolve;
        if (ixBundle.vars !== null) {
            for (const id in ixBundle.vars) {
                const value = ixBundle.vars[id];
                if (typeof value !== 'string' && typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'bigint') {
                    (0, error_1.throwErrorWithTrace)(`${id} must be either string, boolean, or numerical value only.`);
                }
                let result;
                if (value.startsWith('$')) {
                    result = new MainSyntaxResolver(value, this.y2s).resolve(SyntaxContext.VARIABLE_RESOLUTION);
                }
                else {
                    result = new MainSyntaxResolver(value, this.y2s).resolve(SyntaxContext.LITERALS);
                }
                this.y2s.setParam(`$${id}`, result);
            }
        }
        for (const ix of ixBundle.instructions) {
            const ixDefOrDynIx = this.y2s.parsedYaml.instructionDefinition[ix.label];
            if (ixDefOrDynIx === undefined)
                continue;
            const dynIx = ixDefOrDynIx;
            const ixDef = ixDefOrDynIx;
            let declarationSyntaxArr = dynIx.dynamic ? dynIx.params : ixDef.data;
            for (const declarationSyntax of declarationSyntaxArr) {
                const resolver = new MainSyntaxResolver(declarationSyntax, this.y2s).resolve(SyntaxContext.DECLARATION_SYNTAX);
                if (resolver.type === 'function_declaration_syntax')
                    continue;
                else if (resolver.type === 'typed_variable_declaration_syntax') {
                    let value = ix.params[resolver.value.name];
                    if (typeof value === 'string' && value.startsWith('$') && this.y2s.parsedYaml.pda[value.substring(1)]) {
                        this.y2s.resolve({
                            onlyResolve: {
                                thesePdas: [value.substring(1)],
                                theseInstructions: [],
                                theseInstructionBundles: [],
                                theseDynamicInstructions: [],
                            }
                        });
                    }
                    try {
                        const result = new MainSyntaxResolver(value, this.y2s).resolve(SyntaxContext.VARIABLE_RESOLUTION);
                        value = result.value;
                    }
                    catch {
                        if (value.startsWith('$')) {
                            (0, error_1.throwErrorWithTrace)(`Cannot resolve variable: ${value}`);
                        }
                    }
                    if (value !== undefined) {
                        if (resolver.value.dataType === 'pubkey') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new web3.PublicKey(value)));
                        }
                        else if (resolver.value.dataType === 'string') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(value));
                        }
                        else if (resolver.value.dataType === 'u8') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "u8"));
                        }
                        else if (resolver.value.dataType === 'u16') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "u16"));
                        }
                        else if (resolver.value.dataType === 'u32') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "u32"));
                        }
                        else if (resolver.value.dataType === 'u64') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new bn_js_1.default(value), "u64"));
                        }
                        else if (resolver.value.dataType === 'usize') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new bn_js_1.default(value), "usize"));
                        }
                        else if (resolver.value.dataType === 'i8') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "i8"));
                        }
                        else if (resolver.value.dataType === 'i16') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "i16"));
                        }
                        else if (resolver.value.dataType === 'i32') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(Number(value), "i32"));
                        }
                        else if (resolver.value.dataType === 'i64') {
                            this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(new bn_js_1.default(value), "i64"));
                        }
                        else if (resolver.value.dataType === 'bool') {
                            if (typeof value === 'boolean') {
                                this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(value));
                            }
                            else {
                                if (['true', 'false'].includes(value)) {
                                    this.y2s.setParam(`$${resolver.value.name}`, TypeFactory.createValue(value === 'true'));
                                }
                                else {
                                    return (0, error_1.throwErrorWithTrace)(`${resolver.value.name} supports only boolean value.`);
                                }
                            }
                        }
                    }
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`Invalid declaration syntax: ${declarationSyntax}`);
                }
            }
        }
    }
    dynamicIxDeclarationContext() {
    }
    accountDecoderClassContext() {
        const accountDecoder = this.toResolve;
        for (const item of accountDecoder) {
            const resolver = new MainSyntaxResolver(item, this.y2s).resolve(SyntaxContext.ACCOUNT_DECODER_DECLARATION);
            if (resolver.type !== 'account_decoder_syntax') {
                return (0, error_1.throwErrorWithTrace)(`Invalid syntax: ${item}`);
            }
        }
        const name = `$${this.extra}`;
        const decoder = TypeFactory.createValue(new AccountDecoder_1.AccountDecoder(name, accountDecoder));
        this.y2s.setParam(name, decoder);
    }
}
exports.ContextResolver = ContextResolver;
class MainSyntaxResolver {
    constructor(
    /**
     * Pattern string
     */
    pattern, y2s) {
        this.pattern = pattern;
        this.y2s = y2s;
    }
    /**
     * Performs action based on given pattern and context
     */
    resolve(context, param) {
        if (context === SyntaxContext.ACCOUNT_DECLARATION) {
            return this.accountDeclarationContext(param);
        }
        else if (context === SyntaxContext.PDA_RESOLUTION) {
            return this.basicResolver(new PdaSeedSyntaxResolver(this.pattern, this.y2s), `${this.pattern} is not a valid seed.`);
        }
        else if (context === SyntaxContext.ADDRESS_RESOLUTION) {
            return this.addressResolver();
        }
        else if (context === SyntaxContext.DATA_RESOLUTION) {
            return this.basicResolver(new AccountDataResolver(this.pattern, this.y2s), `Cannot resolve ${this.pattern} account decoder.`);
        }
        else if (context === SyntaxContext.META_RESOLUTION) {
            return this.basicResolver(new AccountMetaSyntaxResolver(this.pattern, this.y2s), `Public key or keypair ${this.pattern} does not exist.`);
        }
        else if (context === SyntaxContext.VARIABLE_RESOLUTION) {
            return this.basicResolver(new ValueSyntaxResolver(this.pattern, this.y2s), `Cannot resolve ${this.pattern} variable.`);
        }
        else if (context === SyntaxContext.ACCOUNT_DECODER_DECLARATION) {
            return this.basicResolver(new AccountDecoderClassSyntaxResolver(this.pattern, this.y2s), `Invalid syntax: ${this.pattern}`);
        }
        else if (context === SyntaxContext.DYNAMIC_IX_DECLARATION) {
            return this.basicResolver(new DynamicIxSyntaxResolver(this.pattern, this.y2s), `Invalid dynamic ix declaration syntax: ${this.pattern}`);
        }
        else if (context === SyntaxContext.DECLARATION_SYNTAX) {
            return this.basicResolver(new AccountDataSyntaxResolver(this.pattern, this.y2s), `Invalid declaration syntax: ${this.pattern}`);
        }
        else if (context === SyntaxContext.LITERALS) {
            return this.basicResolver(new LiteralSyntaxResolver(this.pattern, this.y2s), `Invalid literal syntax: ${this.pattern}`);
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Invalid context: ${this.pattern}`);
        }
    }
    accountDeclarationContext(param) {
        const syntax = new AccountSyntaxResolver(this.pattern, this.y2s);
        if (syntax.isValid()) {
            this.y2s.setParam(`$${param}`, syntax.value.value.account);
            return this.y2s.getParam(`$${param}`);
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Account declaration syntax is invalid: ${this.pattern}`);
        }
    }
    addressResolver() {
        const syntax = new ValueSyntaxResolver(this.pattern, this.y2s);
        if (syntax.isValid()) {
            if (syntax.value.type === 'keypair') {
                return TypeFactory.createValue(syntax.value.value.publicKey);
            }
            else if (syntax.value.type === 'pubkey') {
                return TypeFactory.createValue(syntax.value.value);
            }
            else if (syntax.value.type === 'string') {
                return TypeFactory.createValue(new web3.PublicKey(syntax.value.value));
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`${this.pattern} is not a valid keypair or public key instance`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve ${this.pattern}.`);
        }
    }
    basicResolver(syntax, errorMessage) {
        if (syntax.isValid()) {
            return syntax.value;
        }
        else {
            return (0, error_1.throwErrorWithTrace)(errorMessage);
        }
    }
}
exports.MainSyntaxResolver = MainSyntaxResolver;
class SyntaxResolver {
    /**
     * Syntax resolver base constructor
     *
     * @param pattern
     * @param y2s
     */
    constructor(pattern, y2s) {
        this.pattern = pattern;
        this.y2s = y2s;
        if (this.isValid())
            this.resolve();
    }
}
exports.SyntaxResolver = SyntaxResolver;
class AccountSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue({
            account: this.account,
            path: this.path,
        });
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        const [key, path] = this.pattern.split(',');
        try {
            new web3.PublicKey(key);
            if (path !== undefined) {
                const filePath = p.resolve(this.y2s.projectDir, path);
                fs.accessSync(filePath, fs.constants.F_OK);
                const split = filePath.split('.');
                const extension = split[split.length - 1];
                if (!['so', 'json'].includes(extension.toLocaleLowerCase())) {
                    return (0, error_1.throwErrorWithTrace)(false);
                }
            }
        }
        catch {
            return false;
        }
        return true;
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const [key, path] = this.pattern.split(',');
        this.account = new web3.PublicKey(key);
        if (path === undefined)
            return;
        const filePath = p.resolve(this.y2s.projectDir, path);
        const split = filePath.split('.');
        const extension = split[split.length - 1];
        if (extension.toLocaleLowerCase() === 'so') {
            this.path = {
                value: filePath,
                type: AccountPathType.EXECUTABLE
            };
        }
        else if (extension.toLocaleLowerCase() === 'json') {
            this.path = {
                value: filePath,
                type: AccountPathType.JSON
            };
        }
    }
}
class VariableSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue(this._value);
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        return this.pattern.startsWith('$');
    }
    /**
     * Resolves the variable
     */
    resolve() {
        this._value = this.y2s.getParam(this.pattern);
        if (this._value === undefined) {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve ${this.value} variable.`);
        }
    }
}
class AccountMetaSyntaxResolver extends SyntaxResolver {
    constructor() {
        super(...arguments);
        /**
         * Account is signer
         */
        this.isSigner = false;
        /**
         * Account is mutable
         */
        this.isMutable = false;
    }
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue({
            key: this.account,
            isSigner: this.isSigner,
            isWritable: this.isMutable,
        });
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        const [value] = this.pattern.split(',');
        const startsWithDollar = value.startsWith('$');
        if (startsWithDollar) {
            try {
                const pubkey = new VariableSyntaxResolver(value, this.y2s);
                if (pubkey.value.type === "pubkey") {
                    return true;
                }
            }
            catch {
                return false;
            }
        }
        else {
            try {
                new web3.PublicKey(value);
            }
            catch {
                return false;
            }
        }
        return true;
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const split = this.pattern.split(',');
        const [value] = split;
        const startsWithDollar = value.startsWith('$');
        if (startsWithDollar) {
            const pubkey = new VariableSyntaxResolver(value, this.y2s);
            this.account = pubkey.value.value;
        }
        else {
            this.account = new web3.PublicKey(value);
        }
        this.isSigner = split.includes('signer');
        this.isMutable = split.includes('mut');
    }
}
class ValueSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
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
    isValid() {
        const isBigNumber = typeof this.pattern === 'bigint';
        const isNumber = typeof this.pattern === 'number';
        const isBoolean = typeof this.pattern === 'boolean';
        const isString = typeof this.pattern === 'string';
        if (isString && this.pattern.startsWith('$')) {
            const resolver = new VariableSyntaxResolver(this.pattern, this.y2s);
            return resolver.isValid();
        }
        return isBigNumber || isNumber || isBoolean || isString;
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const isNumber = typeof this.pattern === 'number';
        const isString = typeof this.pattern === 'string';
        if (isString && this.pattern.startsWith('$')) {
            const resolver = new VariableSyntaxResolver(this.pattern, this.y2s);
            this._value = resolver.value;
        }
        else {
            this._value = this.pattern;
            if (isNumber && this._value > 0) {
                this.type = 'u32'; // Assume number is 32-bit unsigned
            }
            else if (isNumber && this._value < 0) {
                this.type = 'i32'; // Assume number is 32-bit signed
            }
        }
    }
}
class AccountDecoderClassSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue({
            holder: this.holder,
            type: this.type,
            offset: this.offset,
        });
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        const [holder, typeAndOffset] = this.pattern.split(':');
        const startsWithDollar = holder.startsWith('$');
        const [type, offset] = typeAndOffset.split(',');
        const offsetIsInteger = Number(offset) === parseInt(offset);
        const validType = [
            "u8", "u16", "u32", "u64", "u128", "usize",
            "i8", "i16", "i32", "i64", "i128", "pubkey",
            "bool"
        ].includes(type);
        return startsWithDollar && offsetIsInteger && validType;
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const [holder, typeAndOffset] = this.pattern.split(':');
        const [type, offset] = typeAndOffset.split(',');
        this.holder = holder;
        this.type = type;
        this.offset = parseInt(offset);
    }
}
class PdaSeedSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue(this.seed);
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        if (this.pattern.startsWith('$')) {
            const value = new ValueSyntaxResolver(this.pattern, this.y2s);
            return value.isValid() && ['pubkey', 'keypair', 'string'].includes(value.value.type);
        }
        else {
            return typeof this.pattern === 'string';
        }
    }
    /**
     * Resolves the variable
     */
    resolve() {
        if (this.pattern.startsWith('$')) {
            const value = new ValueSyntaxResolver(this.pattern, this.y2s);
            if (value.value.type === 'keypair') {
                this.seed = value.value.value.publicKey.toBuffer();
            }
            else if (value.value.type === 'pubkey') {
                this.seed = value.value.value.toBuffer();
            }
            else if (value.value.type === 'string') {
                this.seed = Buffer.from(value.value.value, 'utf-8');
            }
        }
        else {
            this.seed = Buffer.from(this.pattern, 'utf-8');
        }
        if (this.seed.length > 32) {
            return (0, error_1.throwErrorWithTrace)(`Seed cannot exceed 32 bytes.`);
        }
    }
}
class FunctionResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue(this._value);
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        try {
            this.resolveFunctions();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Resolves the variable
     */
    resolve() {
        this._value = this.resolveFunctions();
    }
    resolveFunctions() {
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
            return this.resolveUsizeFunc(this.pattern);
        }
        else if (__u32.test(this.pattern)) {
            return this.resolveU32Func(this.pattern);
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`$${this.pattern} is not a valid function syntax.`);
        }
    }
    /**
     * Resolve sighash to Buffer
     *
     * @param data
     */
    resolveSighash(data) {
        return util.typeResolver.sighash(data.replace(/sighash\(([^)]+)\)/, "$1"));
    }
    /**
     * Resolve raw bytes
     *
     * @param data
     */
    resolveRawBytes(data) {
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
    resolveBase64(data) {
        const bytes = data.replace(/fromBase64\((.*?)\)/g, '$1');
        return Buffer.from(bytes, "base64");
    }
    /**
     * Resolve hex encoded string to raw bytes
     *
     * @param data
     */
    resolveHex(data) {
        const bytes = data.replace(/hex\((.*?)\)/g, '$1');
        return Buffer.from(bytes, "hex");
    }
    /**
     * Resolve hex encoded string to raw bytes
     *
     * @param data
     */
    resolveUsizeFunc(data) {
        const value = data.replace(/usize\((.*?)\)/g, '$1');
        const number = BigInt(value);
        if (number >= BigInt("0") && number <= BigInt("18446744073709551615")) { // 2^64 - 1
            const buffer = Buffer.alloc(8);
            buffer.writeBigUInt64LE(number); // Write as little-endian
            return buffer;
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Value ${value} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`);
        }
    }
    /**
     * Resolve hex encoded string to raw bytes
     *
     * @param data
     */
    resolveU32Func(data) {
        const value = data.replace(/u32\((.*?)\)/g, '$1');
        const number = parseInt(value);
        if (number >= 0 && number <= 4294967295) { // 2^32 - 1
            const buffer = Buffer.alloc(4);
            buffer.writeUInt32LE(number); // Write as little-endian
            return buffer;
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Value ${value} is not a valid u32. Valid usize can only be between 0 to 4294967295.`);
        }
    }
}
class TypedVariableResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return this._value;
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        try {
            this.resolveTypedVariable();
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Resolves the variable
     */
    resolve() {
        this._value = this.resolveTypedVariable();
    }
    resolveTypedVariable() {
        const _u8 = /\$[a-zA-Z0-9_]+:u8/;
        const _u16 = /\$[a-zA-Z0-9_]+:u16/;
        const _u32 = /\$[a-zA-Z0-9_]+:u32/;
        const _u64 = /\$[a-zA-Z0-9_]+:u64/;
        const _usize = /\$[a-zA-Z0-9_]+:usize/;
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
            return (0, error_1.throwErrorWithTrace)(`$${this.pattern} is not a valid typed variable syntax.`);
        }
    }
    /**
     * Resolve unsigned 8-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU8(data) {
        const key = data.replace(/\$([^:]+):u8/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
                const value = resolver.value.value;
                if (value >= 0 && value <= 255) {
                    return TypeFactory.createValue(value, 'u8');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid u8. Valid u8 can only between 0 to 255.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a number.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve u8 value: $${key}`);
        }
    }
    /**
     * Resolve unsigned 16-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU16(data) {
        const key = data.replace(/\$([^:]+):u16/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            const value = resolver.value.value;
            if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
                if (value >= 0 && value <= 65535) { // 2^16 - 1
                    return TypeFactory.createValue(value, 'u16');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid u16. Valid u16 can only be between 0 to 65535.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a number.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve u16 $${key} value.`);
        }
    }
    /**
     * Resolve unsigned 32-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU32(data) {
        const key = data.replace(/\$([^:]+):u32/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            const value = resolver.value.value;
            if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
                if (value >= 0 && value <= 4294967295) { // 2^32 - 1
                    return TypeFactory.createValue(value, 'u32');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid u32. Valid u32 can only be between 0 to 4294967295.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a number.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve u32 $${key} value.`);
        }
    }
    /**
     * Resolve unsigned 64-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU64(data) {
        const key = data.replace(/\$([^:]+):u64/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['u8', 'u16', 'u32', 'u64'].includes(resolver.value.type)) {
                let value;
                if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
                    value = new bn_js_1.default(resolver.value.value);
                }
                else {
                    value = new bn_js_1.default(resolver.value.value);
                }
                if (value.gte(new bn_js_1.default(0)) && value.lte(new bn_js_1.default("18446744073709551615"))) { // 2^64 - 1
                    return TypeFactory.createValue(value, 'u64');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid u64. Valid u64 can only be between 0 to 18446744073709551615.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid number or bigint.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve u64 $${key} value.`);
        }
    }
    /**
     * Resolve usize to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveUsize(data) {
        const key = data.replace(/\$([^:]+):usize/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['u8', 'u16', 'u32', 'u64', 'usize'].includes(resolver.value.type)) {
                let value;
                if (['u8', 'u16', 'u32'].includes(resolver.value.type)) {
                    value = new bn_js_1.default(resolver.value.value);
                }
                else {
                    value = new bn_js_1.default(resolver.value.value);
                }
                if (value.gte(new bn_js_1.default(0)) && value.lte(new bn_js_1.default("18446744073709551615"))) { // 2^64 - 1
                    return TypeFactory.createValue(value, 'u128');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid number or bigint.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve usize $${key} value.`);
        }
    }
    /**
     * Resolve signed 8-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI8(data) {
        const key = data.replace(/\$([^:]+):i8/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
                const value = resolver.value.value;
                if (value >= -128 && value <= 127) { // Range for i8
                    return TypeFactory.createValue(value, 'i8');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid i8. Valid i8 can only be between -128 to 127.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a number.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve i8 $${key} value.`);
        }
    }
    /**
     * Resolve signed 16-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI16(data) {
        const key = data.replace(/\$([^:]+):i16/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
                const value = resolver.value.value;
                if (value >= -32768 && value <= 32767) { // Range for i16
                    return TypeFactory.createValue(value, 'i16');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid i16. Valid i16 can only be between -32768 to 32767.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a number.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve i16 $${key} value.`);
        }
    }
    /**
     * Resolve signed 32-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI32(data) {
        const key = data.replace(/\$([^:]+):i32/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
                const value = resolver.value.value;
                if (value >= -2147483648 && value <= 2147483647) { // Range for i32
                    return TypeFactory.createValue(value, 'i32');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid i32. Valid i32 can only be between -2147483648 to 2147483647.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a number.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve i32 $${key} value.`);
        }
    }
    /**
     * Resolve signed 64-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI64(data) {
        const key = data.replace(/\$([^:]+):i64/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (['i8', 'i16', 'i32', 'i64'].includes(resolver.value.type)) {
                let value;
                if (['i8', 'i16', 'i32'].includes(resolver.value.type)) {
                    value = new bn_js_1.default(resolver.value.value);
                }
                else {
                    value = new bn_js_1.default(resolver.value.value);
                }
                if (value.gte(new bn_js_1.default("-9223372036854775808")) && // -2^63
                    value.lte(new bn_js_1.default("9223372036854775807")) // 2^63 - 1
                ) {
                    return TypeFactory.createValue(value, 'i64');
                }
                else {
                    return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid i64. Valid i64 can only be between -9223372036854775808 to 9223372036854775807.`);
                }
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a valid number or bigint.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve u64 $${key} value.`);
        }
    }
    /**
     * Resolve boolean to Buffer
     *
     * @param data
     * @param params
     */
    resolveBool(data) {
        const key = data.replace(/\$([^:]+):bool/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid() && resolver.value.type === 'boolean') {
            const value = resolver.value.value;
            return TypeFactory.createValue(value);
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`The value of $${key} is not a valid boolean.`);
        }
    }
    /**
     * Resolve public key from account definition or given parameters
     *
     * @param data
     * @param params
     * @returns
     */
    resolvePubkey(data) {
        const key = data.replace(/\$([^:]+):pubkey/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (resolver.value.type === 'pubkey') {
                return TypeFactory.createValue(resolver.value.value);
            }
            else if (resolver.value.type === 'keypair') {
                return TypeFactory.createValue(resolver.value.value.publicKey);
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a pubkey or keypair instance.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve keypair or pubkey $${key} value.`);
        }
    }
    /**
     * Resolve string
     *
     * @param data
     * @param params
     * @returns
     */
    resolveString(data) {
        const key = data.replace(/\$([^:]+):string/, "$1");
        const resolver = new ValueSyntaxResolver(`$${key}`, this.y2s);
        if (resolver.isValid()) {
            if (resolver.value.type === 'string') {
                return TypeFactory.createValue(resolver.value.value);
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`$${key} is not a string.`);
            }
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Cannot resolve string $${key} value.`);
        }
    }
}
class AccountDataResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue(this._value);
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        const funcResolver = new FunctionResolver(this.pattern, this.y2s);
        const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
        let supportedTypes = false;
        if (typedVarResolver.isValid()) {
            supportedTypes = ['u8', 'u16', 'u32', 'u64', 'usize', 'i8', 'i16', 'i32', 'i64', 'boolean', 'pubkey'].includes(typedVarResolver.value.type);
        }
        return funcResolver.isValid() || (typedVarResolver.isValid() && supportedTypes);
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const funcResolver = new FunctionResolver(this.pattern, this.y2s);
        const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
        if (funcResolver.isValid()) {
            this._value = funcResolver.value.value;
        }
        else if (typedVarResolver.isValid()) {
            if (typedVarResolver.value.type === 'u8') {
                this._value = Buffer.from([typedVarResolver.value.value]);
            }
            else if (typedVarResolver.value.type === 'u16') {
                this._value = Buffer.alloc(2);
                this._value.writeUint16LE(typedVarResolver.value.value);
            }
            else if (typedVarResolver.value.type === 'u32') {
                this._value = Buffer.alloc(4);
                this._value.writeUint32LE(typedVarResolver.value.value);
            }
            else if (typedVarResolver.value.type === 'u64') {
                this._value = Buffer.alloc(8);
                this._value.writeBigUint64LE(BigInt(typedVarResolver.value.value.toString()));
            }
            else if (typedVarResolver.value.type === 'usize') {
                this._value = Buffer.alloc(8);
                this._value.writeBigUint64LE(BigInt(typedVarResolver.value.value.toString()));
            }
            else if (typedVarResolver.value.type === 'i8') {
                this._value = Buffer.alloc(1);
                this._value.writeInt8(typedVarResolver.value.value);
            }
            else if (typedVarResolver.value.type === 'i16') {
                this._value = Buffer.alloc(2);
                this._value.writeInt16LE(typedVarResolver.value.value);
            }
            else if (typedVarResolver.value.type === 'i32') {
                this._value = Buffer.alloc(4);
                this._value.writeInt32LE(typedVarResolver.value.value);
            }
            else if (typedVarResolver.value.type === 'i64') {
                this._value = Buffer.alloc(8);
                this._value.writeBigInt64LE(BigInt(typedVarResolver.value.value.toString()));
            }
            else if (typedVarResolver.value.type === 'boolean') {
                this._value = Buffer.from([typedVarResolver.value.value ? 1 : 0]);
            }
            else if (typedVarResolver.value.type === 'pubkey') {
                this._value = typedVarResolver.value.value.toBuffer();
            }
            else {
                return (0, error_1.throwErrorWithTrace)(`Unsupported type: ${typedVarResolver.value.type}`);
            }
        }
    }
}
class DynamicIxSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return this._value;
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
        return typedVarResolver.isValid();
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const typedVarResolver = new TypedVariableResolver(this.pattern, this.y2s);
        this._value = typedVarResolver.value;
    }
}
class AccountDataSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue({
            type: this.type,
            dataType: this.dataType,
            name: this.name,
            returns: this.returns,
        });
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        try {
            this.getMeaning();
        }
        catch {
            return false;
        }
        return true;
    }
    /**
     * Resolves the variable
     */
    resolve() {
        const meaning = this.getMeaning();
        this.type = meaning.type;
        this.dataType = meaning.dataType;
        this.name = meaning.name;
        this.returns = meaning.returns;
    }
    getMeaning() {
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
        const _usize = /\$[a-zA-Z0-9_]+:usize/;
        const _i8 = /\$[a-zA-Z0-9_]+:i8/;
        const _i16 = /\$[a-zA-Z0-9_]+:i16/;
        const _i32 = /\$[a-zA-Z0-9_]+:i32/;
        const _i64 = /\$[a-zA-Z0-9_]+:i64/;
        const _bool = /\$[a-zA-Z0-9_]+:bool/;
        const _pubkey = /\$[a-zA-Z0-9_]+:pubkey/;
        const _string = /\$[a-zA-Z0-9_]+:string/;
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
            return this.resolveUsizeFunc(this.pattern);
        }
        else if (__u32.test(this.pattern)) {
            return this.resolveU32Func(this.pattern);
        }
        else if (_u8.test(this.pattern)) {
            return this.resolveU8(this.pattern);
        }
        else if (_u16.test(this.pattern)) {
            return this.resolveU16(this.pattern);
        }
        else if (_u32.test(this.pattern)) {
            return this.resolveU32(this.pattern);
        }
        else if (_u64.test(this.pattern)) {
            return this.resolveU64(this.pattern);
        }
        else if (_usize.test(this.pattern)) {
            return this.resolveUsize(this.pattern);
        }
        else if (_i8.test(this.pattern)) {
            return this.resolveI8(this.pattern);
        }
        else if (_i16.test(this.pattern)) {
            return this.resolveI16(this.pattern);
        }
        else if (_i32.test(this.pattern)) {
            return this.resolveI32(this.pattern);
        }
        else if (_i64.test(this.pattern)) {
            return this.resolveI64(this.pattern);
        }
        else if (_bool.test(this.pattern)) {
            return this.resolveBool(this.pattern);
        }
        else if (_pubkey.test(this.pattern)) {
            return this.resolvePubkey(this.pattern);
        }
        else if (_string.test(this.pattern)) {
            return this.resolveString(this.pattern);
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`$${this.pattern} is not a valid typed variable or function syntax.`);
        }
    }
    /**
     * Resolve sighash to Buffer
     *
     * @param data
     */
    resolveSighash(data) {
        return {
            type: "function",
            dataType: "buffer",
            name: "sighash",
            returns: util.typeResolver.sighash(data.replace(/sighash\(([^)]+)\)/, "$1")),
        };
    }
    /**
     * Resolve raw bytes
     *
     * @param data
     */
    resolveRawBytes(data) {
        const value = data
            .replace(/bytes\((\s*\d+\s*,\s*)*\s*\d+\s*\)/, match => match.replace(/bytes\(|\)/g, ''))
            .split(',').map(value => parseInt(value.trim(), 10));
        return {
            type: "function",
            dataType: "buffer",
            name: "bytes",
            returns: Buffer.from(value),
        };
    }
    /**
     * Resolve base64 encoded string to raw bytes
     *
     * @param data
     */
    resolveBase64(data) {
        const bytes = data.replace(/fromBase64\((.*?)\)/g, '$1');
        return {
            type: "function",
            dataType: "buffer",
            name: "fromBase64",
            returns: Buffer.from(bytes, "base64"),
        };
    }
    /**
     * Resolve hex encoded string to raw bytes
     *
     * @param data
     */
    resolveHex(data) {
        const bytes = data.replace(/hex\((.*?)\)/g, '$1');
        return {
            type: "function",
            dataType: "buffer",
            name: "hex",
            returns: Buffer.from(bytes, "hex"),
        };
    }
    /**
     * Resolve hex encoded string to raw bytes
     *
     * @param data
     */
    resolveUsizeFunc(data) {
        const value = data.replace(/usize\((.*?)\)/g, '$1');
        const number = BigInt(value);
        if (number >= BigInt("0") && number <= BigInt("18446744073709551615")) { // 2^64 - 1
            return {
                type: "function",
                dataType: "usize",
                name: "usize",
                returns: new bn_js_1.default(value),
            };
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Value ${value} is not a valid usize. Valid usize can only be between 0 to 18446744073709551615.`);
        }
    }
    /**
     * Resolve hex encoded string to raw bytes
     *
     * @param data
     */
    resolveU32Func(data) {
        const value = data.replace(/u32\((.*?)\)/g, '$1');
        const number = parseInt(value);
        if (number >= 0 && number <= 4294967295) { // 2^32 - 1
            return {
                type: "function",
                dataType: "u32",
                name: "u32",
                returns: number,
            };
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Value ${value} is not a valid u32. Valid usize can only be between 0 to 4294967295.`);
        }
    }
    /**
     * Resolve unsigned 8-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU8(data) {
        const key = data.replace(/\$([^:]+):u8/, "$1");
        return {
            type: "variable",
            dataType: "u8",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve unsigned 16-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU16(data) {
        const key = data.replace(/\$([^:]+):u16/, "$1");
        return {
            type: "variable",
            dataType: "u16",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve unsigned 32-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU32(data) {
        const key = data.replace(/\$([^:]+):u32/, "$1");
        return {
            type: "variable",
            dataType: "u32",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve unsigned 64-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveU64(data) {
        const key = data.replace(/\$([^:]+):u64/, "$1");
        return {
            type: "variable",
            dataType: "u64",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve usize to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveUsize(data) {
        const key = data.replace(/\$([^:]+):usize/, "$1");
        return {
            type: "variable",
            dataType: "usize",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve signed 8-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI8(data) {
        const key = data.replace(/\$([^:]+):i8/, "$1");
        return {
            type: "variable",
            dataType: "i8",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve signed 16-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI16(data) {
        const key = data.replace(/\$([^:]+):i16/, "$1");
        return {
            type: "variable",
            dataType: "i16",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve signed 32-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI32(data) {
        const key = data.replace(/\$([^:]+):i32/, "$1");
        return {
            type: "variable",
            dataType: "i32",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve signed 64-bit integer to Buffer
     *
     * @param data
     * @param params Parameters from function in object form
     */
    resolveI64(data) {
        const key = data.replace(/\$([^:]+):i64/, "$1");
        return {
            type: "variable",
            dataType: "i64",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve boolean to Buffer
     *
     * @param data
     * @param params
     */
    resolveBool(data) {
        const key = data.replace(/\$([^:]+):bool/, "$1");
        return {
            type: "variable",
            dataType: "bool",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve public key from account definition or given parameters
     *
     * @param data
     * @param params
     * @returns
     */
    resolvePubkey(data) {
        const key = data.replace(/\$([^:]+):pubkey/, "$1");
        return {
            type: "variable",
            dataType: "pubkey",
            name: key,
            returns: undefined,
        };
    }
    /**
     * Resolve public key from account definition or given parameters
     *
     * @param data
     * @param params
     * @returns
     */
    resolveString(data) {
        const key = data.replace(/\$([^:]+):string/, "$1");
        return {
            type: "variable",
            dataType: "string",
            name: key,
            returns: undefined,
        };
    }
}
class LiteralSyntaxResolver extends SyntaxResolver {
    /**
     * Resolved value
     */
    get value() {
        return TypeFactory.createValue(this._value);
    }
    /**
     * Checks whether syntax provided is valid
     *
     * @returns true or false
     */
    isValid() {
        const isString = typeof this.pattern === 'string';
        const isNumber = typeof this.pattern === 'number';
        const isBigNumber = typeof this.pattern === 'bigint';
        const isBoolean = typeof this.pattern === 'boolean';
        let isPubkey = false;
        let isKeypair = false;
        try {
            new web3.PublicKey(this.pattern);
            isPubkey = true;
        }
        catch { }
        try {
            web3.Keypair.fromSecretKey(Buffer.from(this.pattern, 'base64'));
            isKeypair = true;
        }
        catch { }
        if (this.pattern.startsWith('$')) {
            return false;
        }
        return isPubkey || isKeypair || isString || isNumber || isBigNumber || isBoolean;
    }
    /**
     * Resolves the variable
     */
    resolve() {
        try {
            const pubkey = new web3.PublicKey(this.pattern);
            this._value = TypeFactory.createValue(pubkey);
            return;
        }
        catch { }
        try {
            const keypair = web3.Keypair.fromSecretKey(Buffer.from(this.pattern, 'base64'));
            ;
            this._value = TypeFactory.createValue(keypair);
            return;
        }
        catch { }
        if (typeof this.pattern === 'number') {
            if (Math.floor(this.pattern) === this.pattern) {
                if (this.pattern > 0) {
                    this._value = TypeFactory.createValue(this.pattern, 'u32'); // Assumes that it's 32-bit unsigned integer (heuristic)
                }
                else {
                    this._value = TypeFactory.createValue(this.pattern, 'i32'); // Assumes that it's 32-bit signed integer (heuristic)
                }
            }
            else {
                (0, error_1.throwErrorWithTrace)(`Floats (${this.pattern}) currently not supported by this system.`);
            }
        }
        else if (typeof this.pattern === 'boolean') {
            this._value = TypeFactory.createValue(this.pattern);
        }
        else if (typeof this.pattern === 'string' && !this.pattern.startsWith('$')) {
            this._value = TypeFactory.createValue(this.pattern);
        }
    }
}
class TypeFactory {
    static createValue(value, type) {
        if (TypeFactory.isPubkey(value)) {
            return { value: value, type: "pubkey" };
        }
        else if (TypeFactory.isKeypair(value)) {
            return { value: value, type: "keypair" };
        }
        else if (TypeFactory.isString(value)) {
            return { value: value, type: "string" };
        }
        else if (TypeFactory.isBoolean(value)) {
            return { value: value, type: "boolean" };
        }
        else if (TypeFactory.isInteger(value)) {
            return { value: value, type: type }; // buggy code (TODO: Should write a resolver for this.)
        }
        else if (TypeFactory.isBigInteger(value)) {
            return { value: value, type: type }; // buggy code (TODO: Should write a resolver for this.)
        }
        else if (TypeFactory.isAccountSyntax(value)) {
            return { value: value, type: "account_syntax" };
        }
        else if (TypeFactory.isAccountMeta(value)) {
            return { value: value, type: "account_meta_syntax" };
        }
        else if (TypeFactory.isAccountDecoderClassSyntax(value)) {
            return { value: value, type: "account_decoder_syntax" };
        }
        else if (TypeFactory.isInstruction(value)) {
            return { value: value, type: "instruction" };
        }
        else if (TypeFactory.isAccountDecoderClass(value)) {
            return { value: value, type: "account_decoder" };
        }
        else if (TypeFactory.isDynamicInstructionClass(value)) {
            return { value: value, type: "dynamic_instruction" };
        }
        else if (TypeFactory.isBuffer(value)) {
            return { value: value, type: "buffer" };
        }
        else if (TypeFactory.isTypedVariableDeclarationSyntax(value)) {
            return { value: value, type: "typed_variable_declaration_syntax" };
        }
        else if (TypeFactory.isFunctionDeclarationSyntax(value)) {
            return { value: value, type: "function_declaration_syntax" };
        }
        else if (TypeFactory.isResolvedInstructionBundles(value)) {
            return { value: value, type: "resolved_instruction_bundles" };
        }
        else if (TypeFactory.isType(value)) {
            return value;
        }
        else {
            return (0, error_1.throwErrorWithTrace)(`Unsupported value.`);
        }
    }
    static isType(value) {
        return typeof value.value !== 'undefined' && typeof value.type === 'string';
    }
    static isPubkey(value) {
        return typeof value.toBase58 === 'function';
    }
    static isKeypair(value) {
        return typeof value.publicKey !== 'undefined';
    }
    static isString(value) {
        return typeof value === 'string';
    }
    static isBoolean(value) {
        return typeof value === 'boolean';
    }
    static isInteger(value) {
        return typeof value === 'number' && value === Math.floor(value);
    }
    static isBigInteger(value) {
        return typeof value.cmp === 'function' && value.mod(new bn_js_1.default(1)).eq(new bn_js_1.default(0));
    }
    static isAccountMeta(value) {
        return typeof value.key !== 'undefined' && typeof value.key.toBase58 === 'function';
    }
    static isAccountSyntax(value) {
        return typeof value.account !== 'undefined' && typeof value.account.toBase58 === 'function';
    }
    static isAccountDecoderClassSyntax(value) {
        return typeof value.holder === 'string';
    }
    static isAccountDecoderClass(value) {
        return typeof value.data !== 'undefined' && typeof value.data.toString === 'function';
    }
    static isDynamicInstructionClass(value) {
        return typeof value.extend === 'function';
    }
    static isBuffer(value) {
        return typeof value.readUInt16BE === 'function';
    }
    static isInstruction(value) {
        return typeof value.programId !== 'undefined' && typeof value.programId.toBase58 === 'function';
    }
    static isTypedVariableDeclarationSyntax(value) {
        return value.type === 'variable';
    }
    static isFunctionDeclarationSyntax(value) {
        return value.type === 'function';
    }
    static isResolvedInstructionBundles(value) {
        return value.resolvedInstructionBundle === true;
    }
}
exports.TypeFactory = TypeFactory;
var AccountPathType;
(function (AccountPathType) {
    AccountPathType[AccountPathType["EXECUTABLE"] = 0] = "EXECUTABLE";
    AccountPathType[AccountPathType["JSON"] = 1] = "JSON";
})(AccountPathType || (AccountPathType = {}));
;
var SyntaxContext;
(function (SyntaxContext) {
    SyntaxContext[SyntaxContext["ACCOUNT_DECLARATION"] = 0] = "ACCOUNT_DECLARATION";
    SyntaxContext[SyntaxContext["PDA_RESOLUTION"] = 1] = "PDA_RESOLUTION";
    SyntaxContext[SyntaxContext["ADDRESS_RESOLUTION"] = 2] = "ADDRESS_RESOLUTION";
    SyntaxContext[SyntaxContext["DATA_RESOLUTION"] = 3] = "DATA_RESOLUTION";
    SyntaxContext[SyntaxContext["META_RESOLUTION"] = 4] = "META_RESOLUTION";
    SyntaxContext[SyntaxContext["VARIABLE_RESOLUTION"] = 5] = "VARIABLE_RESOLUTION";
    SyntaxContext[SyntaxContext["ACCOUNT_DECODER_DECLARATION"] = 6] = "ACCOUNT_DECODER_DECLARATION";
    SyntaxContext[SyntaxContext["DYNAMIC_IX_DECLARATION"] = 7] = "DYNAMIC_IX_DECLARATION";
    SyntaxContext[SyntaxContext["TEST_WALLET_DECLARATION"] = 8] = "TEST_WALLET_DECLARATION";
    SyntaxContext[SyntaxContext["IX_RESOLUTION"] = 9] = "IX_RESOLUTION";
    SyntaxContext[SyntaxContext["IX_BUNDLE_RESOLUTION"] = 10] = "IX_BUNDLE_RESOLUTION";
    SyntaxContext[SyntaxContext["DECLARATION_SYNTAX"] = 11] = "DECLARATION_SYNTAX";
    SyntaxContext[SyntaxContext["SET_VALUE_SYNTAX"] = 12] = "SET_VALUE_SYNTAX";
    SyntaxContext[SyntaxContext["LITERALS"] = 13] = "LITERALS";
})(SyntaxContext || (exports.SyntaxContext = SyntaxContext = {}));
