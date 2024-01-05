import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';

class AccountsClass {

  /**
   * Project directory is where yaml2solana.yaml file is found.
   */
  public readonly projectDir: string

  private accountData: Record<
    string,
    {
      publicKey: PublicKey,
      programPath?: string,
      jsonPath?: string,
    }
  >;

  private accountsNoLabel: {
    publicKey: PublicKey,
    programPath?: string,
    jsonPath?: string,
  }[] = [];

  constructor(config: string) {
    // Get project dir
    this.projectDir = path.resolve(config).split('/').slice(0, -1).join('/');

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
            publicKey: new PublicKey(accounts[key].split(',')[0]),
            programPath: path
          };
        } else if (fileExtension === 'json') {
          this.accountData[key] = {
            publicKey: new PublicKey(accounts[key].split(',')[0]),
            jsonPath: path
          };
        } else {
          this.accountData[key] = {
            publicKey: new PublicKey(accounts[key].split(',')[0]),
          };
        }
      } else {
        this.accountData[key] = {
          publicKey: new PublicKey(accounts[key].split(',')[0]),
        };
      }
    }

    for (const account of accountsNoLabel) {
      const path = account.split(',')[1];
      if (typeof path === 'string') {
        const fileExtension = path.split('.')[path.split('.').length - 1];
        if (fileExtension === 'so') {
          this.accountsNoLabel.push({
            publicKey: new PublicKey(account.split(',')[0]),
            programPath: path
          });
        } else if (fileExtension === 'json') {
          this.accountsNoLabel.push({
            publicKey: new PublicKey(account.split(',')[0]),
            jsonPath: path
          });
        } else {
          this.accountsNoLabel.push({
            publicKey: new PublicKey(account.split(',')[0]),
          });
        }
      } else {
        this.accountsNoLabel.push({
          publicKey: new PublicKey(account.split(',')[0]),
        });
      }
    }

    // Create a Proxy to handle property access dynamically.
    return new Proxy(this, {
      get(target, prop) {
        const propName = prop as string;
        const accountValue = target.accountData[propName];

        // Check if the property name ends with "_PROGRAM_PATH"
        if (propName.endsWith('_PROGRAM_PATH')) {
          // Remove "_PROGRAM_PATH" suffix and access the data
          const dataKey = propName.replace('_PROGRAM_PATH', '');
          const accountValue = target.accountData[dataKey];
          return accountValue ? accountValue.publicKey : undefined;
        }

        if (propName === 'getAccounts') {
          return (): PublicKey[] => {
            const accounts: PublicKey[] = [];
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
          }
        }

        if (propName === 'getProgramAccounts') {
          return (): { key: PublicKey, path: string }[] => {
            const accounts: { key: PublicKey, path: string }[] = [];
            for (let key in target.accountData) {
              const account = target.accountData[key];
              if (account.programPath !== undefined) {
                accounts.push({ key: account.publicKey, path: path.resolve(target.projectDir, account.programPath) });
              }
            }
            for (const account of target.accountsNoLabel) {
              if (account.programPath !== undefined) {
                accounts.push({ key: account.publicKey, path: path.resolve(target.projectDir, account.programPath) });
              }
            }
            return accounts;
          }
        }

        if (propName === 'getJsonAccounts') {
          return (): { key: PublicKey, path: string }[] => {
            const accounts: { key: PublicKey, path: string }[] = [];
            for (let key in target.accountData) {
              const account = target.accountData[key];
              if (account.jsonPath !== undefined) {
                accounts.push({ key: account.publicKey, path: path.resolve(target.projectDir, account.jsonPath) });
              }
            }
            for (const account of target.accountsNoLabel) {
              if (account.jsonPath !== undefined) {
                accounts.push({ key: account.publicKey, path: path.resolve(target.projectDir, account.jsonPath) });
              }
            }
            return accounts;
          }
        }

        return accountValue ? new PublicKey(accountValue.publicKey) : undefined;
      },
    });
  }
}

/**
 * Create instance of AccountsClass
 * @param config yaml2solana.yaml config file
 * @returns 
 */
export function Accounts(config: string): any {
  return new AccountsClass(config) as any;
}