import { Pda } from "../../src/sdk/Pda";
import { Accounts } from "../../src/sdk/Accounts";

test('Create "Pda" instance. Creating instance should not produce any error', () => {
  Pda("test/yaml2solana.yaml", Accounts("test/yaml2solana.yaml"));
});

test('Should be able to generate PDA from yaml2solana.yaml', () => {
  const pda = Pda("test/yaml2solana.yaml", Accounts("test/yaml2solana.yaml"));
  expect(pda.somePda({
    userWallet: "38w9ZPy4wxNwjHSEazqAb74kJ8GhyfuvwXu8uCYqWSPr"
  }).toString()).toBe("DJG9JsZQybnP3DWmEaMKEfeM15t9pVbGicp7tnovbmCZ");
});
