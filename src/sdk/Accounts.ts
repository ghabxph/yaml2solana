import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';

class AccountsClass {
  private accountData: Record<string, string>;

  constructor(config: string) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Parse the YAML content into a JavaScript object.
    this.accountData = yaml.parse(yamlContent).accounts;

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
          return accountValue ? accountValue.split(',')[1] : undefined;
        }

        return accountValue ? new PublicKey(accountValue.split(',')[0]) : undefined;
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