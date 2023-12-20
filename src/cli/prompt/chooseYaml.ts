import inquirer from "inquirer";

export async function chooseYaml(workDir: string, targetFiles: string[]): Promise<{ targetFile: string }> {
  const choices = targetFiles.map((choice) => choice.replace(`${workDir}/`, ''));
  return await inquirer
    .prompt([
      {
        type: 'list',
        name: 'targetFile',
        message: 'There are multiple yaml2solana.yaml file in the project. Choose what to use:',
        choices,
      },
    ]
  );
}