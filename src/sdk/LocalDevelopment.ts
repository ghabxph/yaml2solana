import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { TestWallets } from './TestWallets';

export class LocalDevelopment {

  readonly accountsFolder: string;

  readonly testWallets: Record<string, web3.Keypair | undefined>;

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string,
  ) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Account cache folder
    this.accountsFolder = yaml.parse(yamlContent).localDevelopment.accountsFolder;

    // Parse the YAML content into a JavaScript object.
    this.testWallets = TestWallets(config);
  }
}
