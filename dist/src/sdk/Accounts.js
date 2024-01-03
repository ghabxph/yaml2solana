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
exports.Accounts = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
class AccountsClass {
    constructor(config) {
        this.accountsNoLabel = [];
        // Read the YAML file.
        const yamlContent = fs.readFileSync(config, 'utf8');
        // Parse the YAML content into a JavaScript object.
        const accounts = yaml.parse(yamlContent).accounts;
        this.accountData = {};
        const accountsNoLabel = yaml.parse(yamlContent).accountsNoLabel;
        for (let key in accounts) {
            const path = accounts[key].split(',')[1];
            if (typeof path === 'string') {
                const fileExtension = path.split('.')[path.split('.').length - 1];
                if (fileExtension === 'so') {
                    this.accountData[key] = {
                        publicKey: new web3_js_1.PublicKey(accounts[key].split(',')[0]),
                        programPath: path
                    };
                }
                else if (fileExtension === 'json') {
                    this.accountData[key] = {
                        publicKey: new web3_js_1.PublicKey(accounts[key].split(',')[0]),
                        jsonPath: path
                    };
                }
                else {
                    this.accountData[key] = {
                        publicKey: new web3_js_1.PublicKey(accounts[key].split(',')[0]),
                    };
                }
            }
            else {
                this.accountData[key] = {
                    publicKey: new web3_js_1.PublicKey(accounts[key].split(',')[0]),
                };
            }
        }
        for (const account of accountsNoLabel) {
            const path = account.split(',')[1];
            if (typeof path === 'string') {
                const fileExtension = path.split('.')[path.split('.').length - 1];
                if (fileExtension === 'so') {
                    this.accountsNoLabel.push({
                        publicKey: new web3_js_1.PublicKey(account.split(',')[0]),
                        programPath: path
                    });
                }
                else if (fileExtension === 'json') {
                    this.accountsNoLabel.push({
                        publicKey: new web3_js_1.PublicKey(account.split(',')[0]),
                        jsonPath: path
                    });
                }
                else {
                    this.accountsNoLabel.push({
                        publicKey: new web3_js_1.PublicKey(account.split(',')[0]),
                    });
                }
            }
            else {
                this.accountsNoLabel.push({
                    publicKey: new web3_js_1.PublicKey(account.split(',')[0]),
                });
            }
        }
        // Create a Proxy to handle property access dynamically.
        return new Proxy(this, {
            get(target, prop) {
                const propName = prop;
                const accountValue = target.accountData[propName];
                // Check if the property name ends with "_PROGRAM_PATH"
                if (propName.endsWith('_PROGRAM_PATH')) {
                    // Remove "_PROGRAM_PATH" suffix and access the data
                    const dataKey = propName.replace('_PROGRAM_PATH', '');
                    const accountValue = target.accountData[dataKey];
                    return accountValue ? accountValue.publicKey : undefined;
                }
                if (propName === 'getAccounts') {
                    return () => {
                        const accounts = [];
                        for (let key in target.accountData) {
                            const account = target.accountData[key];
                            if (account.programPath === undefined && account.jsonPath === undefined) {
                                accounts.push(account.publicKey);
                            }
                        }
                        for (const account of target.accountsNoLabel) {
                            if (account.programPath === undefined && account.jsonPath === undefined) {
                                accounts.push(account.publicKey);
                            }
                        }
                        return accounts;
                    };
                }
                if (propName === 'getProgramAccounts') {
                    return () => {
                        const accounts = [];
                        for (let key in target.accountData) {
                            const account = target.accountData[key];
                            if (account.programPath !== undefined) {
                                accounts.push({ key: account.publicKey, path: account.programPath });
                            }
                        }
                        for (const account of target.accountsNoLabel) {
                            if (account.programPath !== undefined) {
                                accounts.push({ key: account.publicKey, path: account.programPath });
                            }
                        }
                        return accounts;
                    };
                }
                if (propName === 'getJsonAccounts') {
                    return () => {
                        const accounts = [];
                        for (let key in target.accountData) {
                            const account = target.accountData[key];
                            if (account.jsonPath !== undefined) {
                                accounts.push({ key: account.publicKey, path: account.jsonPath });
                            }
                        }
                        for (const account of target.accountsNoLabel) {
                            if (account.jsonPath !== undefined) {
                                accounts.push({ key: account.publicKey, path: account.jsonPath });
                            }
                        }
                        return accounts;
                    };
                }
                return accountValue ? new web3_js_1.PublicKey(accountValue.publicKey) : undefined;
            },
        });
    }
}
/**
 * Create instance of AccountsClass
 * @param config yaml2solana.yaml config file
 * @returns
 */
function Accounts(config) {
    return new AccountsClass(config);
}
exports.Accounts = Accounts;
