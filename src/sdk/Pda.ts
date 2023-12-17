import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { LocalDevelopment } from './LocalDevelopment';

class PdaClass {

  private pdaData: Record<string, {
    programId: string,
    seeds: string[]
  }>;

  constructor(
    /**
     * yaml2solana.yaml config file
     */
    config: string,

    /**
     * Accounts definition
     */
    accounts: any,

    /**
     * Local development setup
     */
    localDevelopment: LocalDevelopment,
  ) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Parse the YAML content into a JavaScript object.
    this.pdaData = yaml.parse(yamlContent).pda;

    // Create a Proxy to handle property access dynamically.
    return new Proxy(this, {
      get(target, prop) {
        const propName = prop as string;
        const pda = target.pdaData[propName];
        return pda === undefined ? undefined : (params: any) => {
          const seeds: Buffer[] = [];
          for(const seed of pda.seeds) {
            if (seed.startsWith('$')) {
              const key = seed.replace('$', '');
              if (params[key] !== undefined) {
                seeds.push(new web3.PublicKey(params[key]).toBuffer())
              } else if (accounts[key] !== undefined) {
                seeds.push(accounts[key].toBuffer())
              } else if (localDevelopment.testWallets[key] !== undefined) {
                seeds.push(localDevelopment.testWallets[key]!.publicKey.toBuffer())
              } else {
                throw `$${key} param does not exist in PDA definition`;
              }
            } else {
              seeds.push(Buffer.from(seed))
            }
          }
          let programId = pda.programId.startsWith('$') ? accounts[pda.programId.replace('$', '')] : pda.programId;
          return web3.PublicKey.findProgramAddressSync(seeds, new web3.PublicKey(programId))[0];
        }
      },
    });
  }
}

/**
 * Create instance of PdaClass
 * @param config yaml2solana.yaml config file
 * @returns 
 */
export function Pda(config: string, accounts: any, localDevelopment: LocalDevelopment): any {
  return new PdaClass(config, accounts, localDevelopment) as any;
}