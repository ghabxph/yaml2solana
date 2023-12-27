import inquirer from "inquirer";
import * as util from "../../util";

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
    util.fs.createFile('yaml2solana.yaml', `${basedir}/template.yaml`);
    return true;
  } else {
    console.log('Cancelled.');
    return false;
  }
}