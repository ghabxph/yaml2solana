# yaml2solana

**NOTE:** This readme is outdated. Will be updating soon. So many design principles have changed based on creator's use case. Like for example: its ability to download accounts from transaction prior to execution, thus accomodates a use case for dynamic transactions such as Jupiter swap where you need to request for quote, and that quote generates a route. This kind of use case violates the initial design principle of this project to be zero code.

Stay tuned!

**yaml2solana** takes a systematic approach to execute Solana smart contracts by simplifying the process and enhancing configurability. The central idea behind this tool is to define Solana instructions statically within a YAML configuration file (`yaml2solana.yaml`). This YAML file serves as the single source of truth for executing Solana instructions, encompassing all relevant details, including account addresses and even Program Derived Account (PDA) generation.

## Key Concepts:

1. **Static Instruction Definitions:** Instead of coding instructions individually, we define all Solana instructions to be executed within a single schema in the yaml2solana.yaml file. This consolidation streamlines instruction management.

2. **Comprehensive Address Management:** All addresses necessary for smart contract execution are defined within the schema. This approach eliminates the need to hardcode addresses in your code, ensuring address consistency and easy updates.

3. **Program Derived Account (PDA) Handling:** The tool simplifies PDA generation. PDAs are defined in the YAML file, and the tool automatically generates them as needed.

4. **Local Development Environment Setup:** yaml2solana streamlines local development by cloning accounts from the target cluster (ideally mainnet) based on the account definitions. This approach aims to accelerate the creation of a solana-test-validator instance on a local machine.

5. **Testing Smart Contracts from YAML:** yaml2solana includes a CLI tool that enables developers to quickly test smart contracts based on instruction definitions and the test field in the configuration. This simplifies the process of testing and validating Solana smart contracts during development.

By adhering to these core principles, yaml2solana provides a user-friendly, error-resistant, and scalable solution for executing Solana smart contracts. It empowers developers to focus on the essential aspects of their Solana interactions while abstracting away technical complexities.

## Dev Notes

* Solana version to use: v1.14.18

## Installation

**TODO:**
`yarn add yaml2solana`

**Notice:**
The project hasn't been published yet on npm. Download the source code for now usin git:

`git clone https://github.com/ghabxph/yaml2solana.git`

And then install dependencies using yarn

`yarn`

Then install the package globally using

`npm link`

You can modify and debug the source code this way. No official release at the moment. Everything is at the edge. Will release a stable release soon.


## Usage

Create a `yaml2solana.yaml` file that will serve as global configuration

```yaml
version: "1.0"

accounts:
  TOKEN_PROGRAM: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  ASSOCIATED_TOKEN_PROGRAM: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
  SYSTEM_PROGRAM: "11111111111111111111111111111111"
  USDT_MINT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  USDC_MINT: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  USDH_MINT: "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX"
  WSOL_MINT: "So11111111111111111111111111111111111111112"
  SOME_PROGRAM: "DM6UM8DELAKBH2VcypUoNMjuR9yJ5FfhSzhD5GLav22n,target/deploy/some_program.so"
  SOME_ACCOUNT: "455QuvQPGEHWQNHaMW4x83huidS64TnsiSuxXfRTT7Tj"

pda:
  somePda:
    programId: $SOME_PROGRAM
    seeds:
      - some-string-seed
      - $SOME_ACCOUNT
      - $userWallet1

instructionDefinition:
  someInstructionA:
    programId: $SOME_PROGRAM
    data:
      - sighash(someAnchorProgram)
      - $amount:u64
      - $slippage:u64
      - bytes(0, 1, 2, 3, 4, 5, 6, 7)
    accounts:
      - $USDT_MINT,mut
      - $SOME_ACCOUNT
      - $somePda,mut
      - $userWallet1,mut,signer
      - $TOKEN_PROGRAM
      - $ASSOCIATED_TOKEN_PROGRAM

schemaDefinition:
  TokenAccount:
    - $mint:pubkey
    - $owner:pubkey
    - $amount:u64
    - fromBase58(....)

localDevelopment:
  accountsFolder: .accounts/
  skipCache:
    - ACCOUNT4
  testAccounts:
    - schema: TokenAccount
      params:
        mint: $ACCOUNT5
        owner: $userWallet1
        amount: 10000
  testWallets:
    userWallet1:
      privateKey: uMJqZRN8zDCAX8AoSj+JsDcUOcb7J61x1nEKHncyxJlWd+COwctV9eKLYK6NIABCqBdfPCcHgwRUJLb+lnNPYw==
      solAmount: 10000
  test:
    - instruction: someInstructionA
      description: Deposit $amount to liquidity bla bla
      params:
        amount: 10000
        slippage: 10
        userWallet1: $testWalletA
```

Now for the juicy part:

```ts
// Create instance of yaml2solana class
const y2s = Yaml2Solana("yaml2solana.yaml")

// Define userWallet here
const userWallet = "defineUserWalletHere"; // as public key of course...

// Generate PDA (no need)
// const somePda = y2s.pda.somePda({ userWallet }); // we just put userWallet variable here. Everything is defined in the yaml config file.

// Generate instruction from schema
// Notice that we only focus on values that only matter and all constant stuff are already defined in the config.
const ix = y2s.instructionDefinition.someInstructionA({
  amount: u64(10_000),
  slippage: u64(10),
  // somePda, // since pda is resolvable from schema, then this became optional
  userWallet,
});

// Then execute instruction using solana library
// execute(ix, signer)
```

We can always access the accounts we defined in the yaml using `accounts` property.

```ts
const account1 = y2s.accounts.ACCOUNT1;
```
