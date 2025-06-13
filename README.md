# Inference.net Staking Program

A Solana on-chain program that manages staking and unstaking of tokens to Operator-managed pools, custodies delegated tokens, and distributes rewards.

## Overview

The Inference.net Staking System allows users to stake tokens to Operator-managed pools. Operators can set commission rates and receive rewards based on network performance, while delegators can stake to Operators to earn passive income.

For a detailed design, access [here](https://www.notion.so/Inference-net-Staking-Architecture-1a3eeaed0a3280c88636ed6c45cfbc34?pvs=4).

### Key Features

- Support for up to 10,000 active Operators (no fixed cap)
- Delegation system for external holders
- Cooldown period on unstaking (no rewards during cooldown)
- Slashing penalties for Operators (no slashing risk for delegators)
- Configurable Operator reward commission rates
- Reward distribution per 24/48 hour epochs
- Automatic compounding via operator commission fee auto-staking
- Efficient reward distribution with off-chain storage and on-chain Merkle Tree proof verification.

## Architecture

The program consists of several key accounts:

- **PoolOverview**: Manages global staking parameters and tracks total pools
- **OperatorPool**: Represents an Operator's staking pool with configuration and state
- **StakingRecord**: Tracks individual staking positions for Operators and delegators
- **RewardRecord**: Stores Merkle roots for reward distributions by epoch

## Key Instructions

### For Operators

- `CreateOperatorPool`: Create a new staking pool for an Operator
- `UpdateOperatorPool`: Modify commission rates and delegation settings
- `ChangeOperatorPoolAdmin`: Change admin authority for pool
- `ChangeOperatorStakingRecord`: Change associated operator staking record for pool
- `WithdrawOperatorCommission`: Withdraw earned commission fees
- `CloseOperatorPool`: Permanently close a pool

### For Delegators

- `CreateStakingRecord`: Create a new account to record position in a pool
- `Stake`: Delegate tokens to an Operator pool
- `Unstake`: Begin the process of unstaking tokens
- `CancelUnstake`: Cancel a pending unstake operation
- `CloseStakingRecord`: Close staking record account after zeroing

### For Program Admin

- `CreatePoolOverview`: Initialize the program after deployment
- `UpdatePoolOverviewAuthorities`: Modify authorites on PoolOverview
- `UpdatePoolOverview`: Modify global staking parameters
- `CreateRewardRecord`: Finalize a reward epoch by committing the Merkle root
- `ModifyRewardRecord`: Modify Merkle root committed
- `SlashStake`: Penalize an Operator by slashing their stake
- `SetHaltStatus`: Halt an Operator from staking, unstaking or claiming from their pool

### Permissionless

- `AccrueReward`: Accrue reward issued to a pool
- `ClaimUnstake`: Withdraw tokens after the unstaking delay period

## Reward Distribution

Rewards are computed off-chain based on network performance metrics and distributed using a Merkle-based reward system:

1. Backend computes rewards per OperatorPool and generates Merkle trees
2. Merkle roots are committed on-chain via `CreateRewardRecord`
3. Rewards are claimed permissionlessly using Merkle proofs via `AccrueReward`
   - Operators receive commission fees and delegators receive staking rewards
   - Rewards auto-compound when added to the staking pool
   - USDC payments are also distributed to operators

# Getting Started

## Prerequisites

Start here: [https://www.anchor-lang.com/docs/installation](https://www.anchor-lang.com/docs/installation).

- Rust toolchain: 1.85.0
- Solana CLI: Solana 2.1.16 (Other versions may be supported)
- Anchor framework (AVM 0.31.0)
- [Bun](https://bun.sh/) (v1.2.5 or higher)

## Installation

```bash
# Install dependencies
bun install

# Build the program and generate the IDL
bun run build
```

# Testing

The `tests` folder contains a full suite of integrations tests for the program which can be run with Anchor:

```bash
# Run tests
bun run test
```

# Deployment

> **NOTE:** For non-mainnet deployments, keypairs are stored directly in the repo in the `keys/` folder.

## Localnet

You can deploy the program to a local validator with the following:

```bash
# This will run solana-test-validator with an empty ledger and deploy the program to this validator
task deploy-localnet-full
```

## Devnet

Run the following to deploy or upgrade the program on devnet:

> **Program ID:** `stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG`

Note that the devnet program and deployer keypairs are stored locally in the repo under `keys/devnet`.

```bash
# Set your CLI to the appropriate cluster.
$ solana config set -u devnet

# Give the script executable permissions (needed once on first use only).
$ chmod +x scripts/deploy-program.sh

# Check the deployer keypair balance
$ solana balance KB6Nr5jbzNxBhWsrwLhUNfFrmBQtRBWvHJ8t3z92kSw

# Airdrop some SOL if you need it (or use: https://faucet.solana.com)
$ solana airdrop 2 KB6Nr5jbzNxBhWsrwLhUNfFrmBQtRBWvHJ8t3z92kSw

# Build and deploy the program.
$ task deploy-devnet
```

## Mainnet

**TBD**

# SDK

A TypeScript client SDK is defined in the `sdk` package. We publish this as a private NPM package to be used by our other projects.

## Publishing

1. Add NPM credentials in `sdk/.npmrc`
2. Run `bun run check`.
3. Run `yarn publish` in the `sdk` folder (`yarn publish` has a better UX than `bun publish`, but you can use Bun as well).
