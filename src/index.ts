import { Yaml2SolanaClass } from "./sdk/Yaml2Solana";

/**
 * Creates an instance of Yaml2Solana class
 *
 * @param config yaml2solana.yaml file
 */
export function Yaml2Solana(config: string) {
    return new Yaml2SolanaClass(config);
}