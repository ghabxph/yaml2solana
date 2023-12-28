import { PublicKey } from "@solana/web3.js";
import inquirer from "inquirer";

const CHOICE_GENERATE_PDA = 'Generate PDA';
const CHOICE_ANALYZE_TRANSACTION = 'Analyze Transaction';

export async function utilUi() {
  const { choice } = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'choice',
        message: '-=[Utility/Debugging Tools UI]=-\n\n [Choose Action]',
        choices: [
          CHOICE_GENERATE_PDA,
          CHOICE_ANALYZE_TRANSACTION,
        ],
      },
    ]
  );

  if (choice === CHOICE_GENERATE_PDA) {
    await inquirer
      .prompt([
        {
          type: 'input',
          name: 'programId',
          message: 'Program ID:'
        }
      ])
    const { choice } = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Do you wish to add more seeds?',
          choices: ['yes', 'no']
        }
      ])
  }
}