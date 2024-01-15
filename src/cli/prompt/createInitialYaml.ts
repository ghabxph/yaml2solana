import inquirer from "inquirer";
import * as util from "../../util";
import path from "path";

export async function createInitialYaml(basedir: string): Promise<boolean> {
  const answer = await inquirer
  .prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Cannot find yaml2solana.yaml. Do you want to create?',
      default: false,
    },
  ]);
  if (answer.confirm) {
    const _templatePath = path.resolve(`${basedir}/../../templates/template.yaml`);
    util.fs.createFile('yaml2solana.yaml', _templatePath);
    return true;
  } else {
    console.log('Cancelled.');
    return false;
  }
}