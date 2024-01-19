#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliEntrypoint = void 0;
const util = __importStar(require("../util"));
const prompt = __importStar(require("./prompt"));
const ts_clear_screen_1 = __importDefault(require("ts-clear-screen"));
const BASE_DIR = __dirname;
const WORK_DIR = process.cwd();
const ignoreFiles = util.fs.compileIgnoreFiles(WORK_DIR);
const find = () => util.fs.findFilesRecursively(WORK_DIR, ['yaml2solana.yaml', 'yaml2solana.yml'], ['.git', ...ignoreFiles]);
async function cliEntrypoint(y2s) {
    (0, ts_clear_screen_1.default)();
    let schemaFile = '';
    if (y2s === undefined) {
        let schemaFiles = find();
        if (schemaFiles.length === 0) {
            if (await prompt.createInitialYaml(BASE_DIR) === false) {
                return;
            }
            else {
                schemaFiles = find();
            }
        }
        if (schemaFiles.length > 1) {
            const { targetFile } = await prompt.chooseYaml(WORK_DIR, schemaFiles);
            schemaFile = targetFile;
        }
        else {
            schemaFile = schemaFiles[0].replace(`${WORK_DIR}/`, '');
        }
    }
    await prompt.mainUi(schemaFile, y2s);
}
exports.cliEntrypoint = cliEntrypoint;
if (require.main === module) {
    cliEntrypoint();
}
