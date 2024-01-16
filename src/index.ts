export { DynamicInstruction } from "./sdk/DynamicInstruction";
import { Yaml2SolanaClass } from "./sdk/Yaml2Solana";

/**
 * Creates an instance of Yaml2Solana class
 *
 * @param config yaml2solana.yaml file
 * @returns Yaml2Solana version 2
 */
export function Yaml2Solana(config: string) {
  return new Yaml2SolanaClass(config);
}
