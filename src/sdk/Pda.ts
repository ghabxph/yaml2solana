import * as web3 from '@solana/web3.js';
import * as fs from 'fs';
import * as yaml from 'yaml';

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
  ) {
    // Read the YAML file.
    const yamlContent = fs.readFileSync(config, 'utf8');

    // Parse the YAML content into a JavaScript object.
    this.pdaData = yaml.parse(yamlContent).pda;

    // Create a Proxy to handle property access dynamically.
    return new Proxy(this, {
      get(target, prop) {
        return (params: any) => {
          const propName = prop as string;
          const pda = target.pdaData[propName];
          const seeds: Buffer[] = [];
          for(const seed of pda.seeds) {
            if (seed.startsWith('$')) {
              const key = seed.replace('$', '');
              if (params[key] !== undefined) {
                seeds.push(new web3.PublicKey(params[key]).toBuffer())
              } else if (accounts[key] !== undefined) {
                seeds.push(new web3.PublicKey(accounts[key]).toBuffer())
              } else {
                throw `$${key} param does not exist`;
              }
            } else {
              seeds.push(Buffer.from(seed))
            }
          }
          console.log(seeds);
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
export function Pda(config: string, accounts: any): any {
  return new PdaClass(config, accounts) as any;
}