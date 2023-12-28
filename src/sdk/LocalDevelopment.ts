import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { TestWallets } from './TestWallets';

export class LocalDevelopment {

  readonly accountsFolder: string;

  readonly testWallets: Record<string, web3.Keypair | undefined>;

  readonly tests: {
    instruction: string,
    description: string,
    params: Record<string, string>
  }[];

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string,
  ) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Parse the yaml
    const yamlParsed = yaml.parse(yamlContent);

    // Account cache folder
    this.accountsFolder = yamlParsed.localDevelopment.accountsFolder;

    // Parse the YAML content into a JavaScript object.
    this.testWallets = TestWallets(config);

    // Store tests from localDevelopment.tests
    this.tests = yamlParsed.localDevelopment.tests;
  }

  /**
   * Returns test descriptions
   *
   * @returns
   */
  getTestDescriptions(): string[] {
    const testsDescriptions: string[] = [];
    for (const test of this.tests) {
      testsDescriptions.push(test.description);
    }
    return testsDescriptions;
  }

  /**
   * Run selected test
   *
   * @param index
   */
  runTest(index: number) {
    console.log(this.tests[index]);
  }
}
