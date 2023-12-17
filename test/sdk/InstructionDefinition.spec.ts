import { Accounts } from "../../src/sdk/Accounts";
import { Pda } from "../../src/sdk/Pda";
import { InstructionDefinition } from "../../src/sdk/InstructionDefinition";
import { LocalDevelopment } from "../../src/sdk/LocalDevelopment";
import * as web3 from '@solana/web3.js';

test('Create "Yaml2SolanaClass" instance. Creating instance should not produce any error', () => {
  const accounts = Accounts("test/yaml2solana.yaml");
  const localDevelopment = new LocalDevelopment("test/yaml2solana.yaml");
  const pda = Pda("test/yaml2solana.yaml", accounts, localDevelopment);
  InstructionDefinition("test/yaml2solana.yaml", accounts, pda, localDevelopment);
});

test('Create `someInstructionA` instruction from yaml2solana.yaml', () => {
  const accounts = Accounts("test/yaml2solana.yaml");
  const localDevelopment = new LocalDevelopment("test/yaml2solana.yaml");
  const pda = Pda("test/yaml2solana.yaml", accounts, localDevelopment);
  const instructionDefinition = InstructionDefinition("test/yaml2solana.yaml", accounts, pda, localDevelopment);
  const ix = instructionDefinition.someInstructionA({
    amount: 10_000,
    slippage: 10,
  });
  expect(ix).toBeDefined();
  expect(ix).toBeInstanceOf(web3.TransactionInstruction);
});
