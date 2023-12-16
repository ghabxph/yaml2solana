# yaml2solana

**yaml2solana** takes a systematic approach to execute Solana smart contracts by simplifying the process and enhancing configurability. The central idea behind this tool is to define Solana instructions statically within a YAML configuration file (`yaml2solana.yaml`). This YAML file serves as the single source of truth for executing Solana instructions, encompassing all relevant details, including account addresses and even Program Derived Account (PDA) generation.

## Key Concepts:

1. **Static Instruction Definitions:** Rather than coding instructions individually, we define all the Solana instructions we want to execute within a single schema in the yaml2solana.yaml file. This allows us to consolidate and manage our instructions efficiently.

2. **Comprehensive Address Management:** All addresses required for smart contract execution are defined within the schema as well. This eliminates the need to hardcode addresses in your code, ensuring that addresses stay up-to-date and consistent.

3. **Program Derived Account (PDA) Handling:** The tool simplifies the process of PDA generation. PDAs are defined in the YAML file, and the tool automatically generates them as needed.

By adhering to this design philosophy, yaml2solana provides a user-friendly, error-resistant, and scalable solution for executing Solana smart contracts. It empowers developers to focus on the essential aspects of their Solana interactions while abstracting away the technical intricacies.

With the configuration in place, developers can efficiently create, customize, and execute Solana instructions with ease, making it an invaluable addition to the Solana development toolkit.

## Installation

`yarn add yaml2solana`

## Usage

Create a `yaml2solana.yaml` file that will serve as global configuration

```yaml
version: "1.0"

accounts:
  ACCOUNT1: 11111111111111111111111
  ACCOUNT2: 22222222222222222222222
  ACCOUNT3: 33333333333333333333333
  ACCOUNT4: 44444444444444444444444
  ACCOUNT5: 55555555555555555555555
  TOKEN_PROGRAM: 1234567899857623478612
  ASSOCIATED_TOKEN_PROGRAM: 1234567899857623478619

pda:
  somePda:
    programId: $ACCOUNT1
    seeds:
      - some-string-seed
      - $ACCOUNT2
      - $userWallet

instructions:
  someContractA:
    programId: $ACCOUNT3
    data:
      - sighash(someAnchorProgram)
      - $amount:u64
      - $slippage:u64
      - bytes(0, 0, 0, 0, 0, 0, 0, 0)
    accounts:
      - $ACCOUNT5,mut
      - $ACCOUNT4,mut
      - $somePda,mut
      - $userWallet,mut,signer
      - $TOKEN_PROGRAM
      - $ASSOCIATED_TOKEN_PROGRAM
```

Now for the juicy part:

```ts
// Create instance of yaml2solana class
const y2s = Yaml2Solana("yaml2solana.yaml")

// Define userWallet here
const userWallet = "defineUserWalletHere"; // as public key of course...

// Generate PDA
const somePda = y2s.pda.somePda({ userWallet }); // we just put userWallet variable here. Everything is defined in the yaml config file.

// Generate instruction from schema
// Notice that we only focus on values that only matter and all constant stuff are already defined in the config.
const ix = y2s.instructions.someContractA({
  amount: u64(10_000),
  slippage: u64(10),
  somePda,
  userWallet,
});

// Then execute instruction using solana library
// execute(ix, signer)
```

We can always access the accounts we defined in the yaml using `accounts` property.

```ts
const account1 = y2s.accounts.ACCOUNT1;
```
