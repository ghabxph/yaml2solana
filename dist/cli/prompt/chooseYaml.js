"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseYaml = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
async function chooseYaml(workDir, targetFiles) {
    const choices = targetFiles.map((choice) => choice.replace(`${workDir}/`, ''));
    return await inquirer_1.default
        .prompt([
        {
            type: 'list',
            name: 'targetFile',
            message: 'There are multiple yaml2solana.yaml file in the project. Choose what to use:',
            choices,
        },
    ]);
}
exports.chooseYaml = chooseYaml;
