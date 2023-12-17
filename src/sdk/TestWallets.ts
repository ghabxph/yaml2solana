import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';

class TestWalletClass {

  private testWallets: Record<string, {
    privateKey: string,
    solAmount: number,
  }>;

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string,
  ) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Parse the YAML content into a JavaScript object.
    this.testWallets = yaml.parse(yamlContent).localDevelopment.testWallets;

    // Create a Proxy to handle property access dynamically.
    return new Proxy(this, {
      get(target, prop) {
        const propName = prop as string;
        const testWallet = target.testWallets[propName];
        if (testWallet === undefined) {
          return undefined;
        }
        return web3.Keypair.fromSecretKey(
          new Uint8Array(
            Buffer.from(testWallet.privateKey, "base64")
          )
        )
      },
    });
  }
}

/**
 * Create instance of TestWalletClass
 * @param config yaml2solana.yaml config file
 * @returns 
 */
export function TestWallets(config: string): any {
  return new TestWalletClass(config) as any;
}
