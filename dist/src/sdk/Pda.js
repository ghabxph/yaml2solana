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
exports.Pda = void 0;
const web3 = __importStar(require("@solana/web3.js"));
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
class PdaClass {
    constructor(
    /**
     * yaml2solana.yaml config file
     */
    config, 
    /**
     * Accounts definition
     */
    accounts, 
    /**
     * Local development setup
     */
    localDevelopment) {
        // Read the YAML file.
        const yamlContent = fs.readFileSync(config, 'utf8');
        // Parse the YAML content into a JavaScript object.
        this.pdaData = yaml.parse(yamlContent).pda;
        // Create a Proxy to handle property access dynamically.
        return new Proxy(this, {
            get(target, prop) {
                const propName = prop;
                const pda = target.pdaData[propName];
                return pda === undefined ? undefined : (params) => {
                    const recurseInstance = new PdaClass(config, accounts, localDevelopment);
                    const seeds = [];
                    for (const seed of pda.seeds) {
                        if (seed.startsWith('$')) {
                            const key = seed.replace('$', '');
                            if (params[key] !== undefined) {
                                seeds.push(new web3.PublicKey(params[key]).toBuffer());
                            }
                            else if (accounts[key] !== undefined) {
                                seeds.push(accounts[key].toBuffer());
                            }
                            else if (localDevelopment.testWallets[key] !== undefined) {
                                seeds.push(localDevelopment.testWallets[key].publicKey.toBuffer());
                            }
                            else if (recurseInstance[key] !== undefined) {
                                seeds.push(recurseInstance[key](Object.assign({}, params)).toBuffer());
                            }
                            else {
                                throw `$${key} param does not exist in PDA definition`;
                            }
                        }
                        else {
                            seeds.push(Buffer.from(seed));
                        }
                    }
                    let programId = pda.programId.startsWith('$') ? accounts[pda.programId.replace('$', '')] : pda.programId;
                    return web3.PublicKey.findProgramAddressSync(seeds, new web3.PublicKey(programId))[0];
                };
            },
        });
    }
}
/**
 * Create instance of PdaClass
 * @param config yaml2solana.yaml config file
 * @returns
 */
function Pda(config, accounts, localDevelopment) {
    return new PdaClass(config, accounts, localDevelopment);
}
exports.Pda = Pda;
