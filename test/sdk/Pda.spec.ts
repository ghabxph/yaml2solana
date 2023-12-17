import { Pda } from "../../src/sdk/Pda";
import { Accounts } from "../../src/sdk/Accounts";
import { LocalDevelopment } from "../../src/sdk/LocalDevelopment";

test('Create "Pda" instance. Creating instance should not produce any error', () => {
  const accounts = Accounts("test/yaml2solana.yaml");
  const localDevelopment = new LocalDevelopment("test/yaml2solana.yaml");
  Pda("test/yaml2solana.yaml", accounts, localDevelopment);
});

test('Should be able to generate PDA from yaml2solana.yaml', () => {
  const accounts = Accounts("test/yaml2solana.yaml");
  const localDevelopment = new LocalDevelopment("test/yaml2solana.yaml");
  const pda = Pda("test/yaml2solana.yaml", accounts, localDevelopment);
  expect(pda.somePda({
    userWallet1: "38w9ZPy4wxNwjHSEazqAb74kJ8GhyfuvwXu8uCYqWSPr"
  }).toString()).toBe("DJG9JsZQybnP3DWmEaMKEfeM15t9pVbGicp7tnovbmCZ");
});
