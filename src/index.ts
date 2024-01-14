import { Yaml2SolanaClass2 } from "./sdk/Yaml2Solana2";

/**
 * Creates an instance of Yaml2Solana class
 *
 * @param config yaml2solana.yaml file
 * @returns Yaml2Solana version 2
 */
export function Yaml2Solana(config: string) {
  return new Yaml2SolanaClass2(config);
}