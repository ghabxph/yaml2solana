import * as web3 from "@solana/web3.js";
import * as util from "../../util";
import inquirer from "inquirer";
import { Yaml2Solana } from "../..";
import { Yaml2SolanaClass } from "../../sdk/Yaml2Solana";
import { throwErrorWithTrace } from "../../error";

export async function runTxGeneratorUi(schemaFile: string, y2s?: Yaml2SolanaClass) {
  // 1. Create yaml2solana v2 instance
  const yaml2solana = y2s !== undefined ? y2s : Yaml2Solana(schemaFile);

  // 2. Get choices
  const choices = yaml2solana.getInstructionBundles();

  // 3. Choose bundle to execute
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: 'Choose bundle to execute:',
    choices,
  });

  // 4. Resolve
  await yaml2solana.resolve({
    onlyResolve: {
      thesePdas: [],
      theseInstructions: [],
      theseInstructionBundles: [choice]
    }
  });

  // 5. Create localnet transaction
  const signers = yaml2solana.resolveInstructionBundleSigners(`$${choice}`);
  const tx = yaml2solana.createTransaction(
    choice,
    [`$${choice}`],
    yaml2solana.parsedYaml.instructionBundle![choice].alts,
    yaml2solana.parsedYaml.instructionBundle![choice].payer,
    signers,
  );

  // 6. Choose whether to execute transaction in localnet or mainnet
  const cluster = await getCluster(yaml2solana);

  // 7. Execute instruction in localnet
  console.log();
  await yaml2solana.executeTransactionsLocally({
    txns: [tx],
    runFromExistingLocalnet: await util.test.checkIfLocalnetIsRunning(),
    cluster,
  });
}

async function getCluster(y2s: Yaml2SolanaClass): Promise<string> {
  if (y2s.parsedYaml.mainnetRpc) {
    const { cluster } = await inquirer.prompt({
      type: 'list',
      name: 'cluster',
      message: 'Execute transaction in?',
      choices: [
        'http://127.0.0.1:8899',
        ...y2s.parsedYaml.mainnetRpc,
      ],
    });
    return cluster;
  }
  return 'http://127.0.0.1:8899';
}
