import * as web3 from '@solana/web3.js';
import { Yaml2SolanaClass } from "../../sdk/Yaml2Solana";
export declare let USER_WALLET: undefined | web3.Keypair;
export declare function setupUserWalletUi(): Promise<void>;
export declare function hasWallet(): boolean;
export declare function walletOptionsUi(schemaFile: string, y2s?: Yaml2SolanaClass): Promise<void>;
//# sourceMappingURL=setupUserWalletUi.d.ts.map