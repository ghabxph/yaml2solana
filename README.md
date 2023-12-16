# yaml2solana

Schematic approach to execute solana smart contracts

## Installation

`yarn add yaml2solana`

## Usage

Create a `yaml2solana.yaml` file that will serve as global configuration

```yaml
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
