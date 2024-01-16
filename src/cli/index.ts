#!/usr/bin/env node

import * as util from "../util";
import * as prompt from "./prompt";
import clear from "ts-clear-screen";

const BASE_DIR = __dirname;
const WORK_DIR = process.cwd();
const ignoreFiles = util.fs.compileIgnoreFiles(WORK_DIR);
const find = () => util.fs.findFilesRecursively(WORK_DIR, ['yaml2solana.yaml', 'yaml2solana.yml'], ['.git', ...ignoreFiles]);

export async function cliEntrypoint() {
  clear();
  let schemaFile = '';
  let schemaFiles = find();
  if (schemaFiles.length === 0) {
    if (await prompt.createInitialYaml(BASE_DIR) === false) {
      return;
    } else {
      schemaFiles = find();
    }
  }
  if (schemaFiles.length > 1) {
    const {targetFile} = await prompt.chooseYaml(WORK_DIR, schemaFiles);
    schemaFile = targetFile;
  } else {
    schemaFile = schemaFiles[0].replace(`${WORK_DIR}/`, '');
  }
  await prompt.mainUi(schemaFile);
}

if (require.main === module) {
  cliEntrypoint();
}

process.on('unhandledRejection', (e) => {
  console.error();
  console.error(`Error: ${e}`);
  console.trace();
  console.error();
});
