"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestWallets = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
class TestWalletClass {
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config) {
        // Read the YAML file.
        const yamlContent = fs.readFileSync(config, 'utf8');
        // Parse the YAML content into a JavaScript object.
        this.testWallets = yaml.parse(yamlContent).localDevelopment.testWallets;
        // Create a Proxy to handle property access dynamically.
        return new Proxy(this, {
            get(target, prop) {
                const propName = prop;
                const testWallet = target.testWallets[propName];
                if (testWallet === undefined) {
                    return undefined;
                }
                return web3.Keypair.fromSecretKey(new Uint8Array(Buffer.from(testWallet.privateKey, "base64")));
            },
        });
    }
}
/**
 * Create instance of TestWalletClass
 * @param config yaml2solana.yaml config file
 * @returns
 */
function TestWallets(config) {
    return new TestWalletClass(config);
}
exports.TestWallets = TestWallets;
