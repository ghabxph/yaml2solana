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
  const choices = yaml2solana.getTxGenerators();

  // 3. Choose tx generator to execute
  const { choice } = await inquirer.prompt({
    type: 'list',
    name: 'choice',
    message: 'Choose tx generator to execute:',
    choices,
  });

  // 4. Choose whether to execute transaction in localnet or mainnet
  const cluster = await getCluster(yaml2solana);

  // 5. Choose transaction priority
  const { priority } = await inquirer.prompt({
    type: 'list',
    name: 'priority',
    message: 'Choose execution priority:',
    choices: [
      "Default",
      "None",
      "Low",
      "Medium",
      "High",
      "VeryHigh",
      "UnsafeMax",
    ],
  });

  // 6. Resolve
  await yaml2solana.resolve({
    onlyResolve: {
      thesePdas: [],
      theseInstructions: [],
      theseInstructionBundles: [],
      theseTxGenerators: [choice]
    }
  });

  // 7. Create localnet transaction(s)
  const txns = [];
  for (const generator of yaml2solana.parsedYaml.txGeneratorExecute![choice].generators) {
    const txGenerator = yaml2solana.getParam(`$${generator.label}`);
    if (txGenerator.type !== 'tx_generator') {
      return throwErrorWithTrace(`Unexpected error: ${generator.label} is not a TxGenerator instance`);
    }
    for (const tx of txGenerator.value.txs) {
      txns.push(
        yaml2solana.createTransaction(
          choice,
          tx,
          yaml2solana.parsedYaml.txGeneratorExecute![choice].alts,
          yaml2solana.parsedYaml.txGeneratorExecute![choice].payer,
          txGenerator.value.signers,
          priority,
        )
      )
    }  
  }

  // 8. Execute instruction in localnet
  console.log();
  await yaml2solana.executeTransactionsLocally({
    txns,
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
