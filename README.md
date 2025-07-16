![inference-net](https://github.com/user-attachments/assets/cdf6fbb6-3d51-4b3f-b2bd-9d1dfdd0f1fd)

At [Inference.net](https://inference.net/?utm_source=github&utm_medium=readme&utm_campaign=overview), we provide developers and enterprises with access to top-performing large language models (LLMs) through our efficient and cost-effective inference platform. Our backend is powered by a global, distributed GPU network which is coordinated by this on-chain staking program.

# Inference.net Staking Program

An on-chain Solana program that manages staking and unstaking of tokens to operator managed pools, custodies delegated tokens, distributes rewards and USDC earnings, and ensures Inference.net network security via halting and slashing mechanisms.

View staking program documentation [here](https://docs.devnet.inference.net/devnet-epoch-3/staking-protocol).

## Overview

The Inference.net Staking System allows users to stake tokens to operator-managed pools. Operators can set commission rates and receive rewards based on network performance, while delegators can stake to operators to earn passive income. Operators may be slashed for protocol violations, which ensures network security.

### Key Features

- Support for large numbers of active operators (e.g. ~100,000+, no fixed cap) and unlimited delegators
- Delegation + reward system for external token holders
- Configurable cooldown period on unstaking (no rewards during cooldown)
- Slashing penalties for operators (no slashing risk for delegators)
- Dual commission rates for operators: token rewards and USDC earnings
- Configurable operator commission rates and other pool settings
- Epoch-based reward distributions, with verifiable network emissions
- Automatic compounding via operator commission fee auto-staking
- USDC revenue share for delegators based on pool share ownership
- Decoupled USDC revenue stream which is claimable independently from staked token positions
- Efficient reward distribution with off-chain storage and on-chain merkle tree proof verification
- On-chain encoded reward emission schedule for transparency and auditability
- Program events for fine-grained monitoring and auditing

## Architecture

The program consists of several key accounts:

- **PoolOverview**: Manages global staking parameters and tracks total pools
- **OperatorPool**: Represents an operator's staking pool with configuration and state
- **StakingRecord**: Tracks individual staking positions for operators and delegators
- **RewardRecord**: Stores merkle roots for reward distributions by epoch

## Key Instructions

### For Operators

- `CreateOperatorPool`: Create a new staking pool for an operator
- `UpdateOperatorPool`: Modify commission rates and delegation settings
- `ChangeOperatorPoolAdmin`: Change admin authority for pool
- `ChangeOperatorStakingRecord`: Change associated operator staking record for pool
- `WithdrawOperatorRewardCommission`: Withdraw earned commission fees
- `WithdrawOperatorUsdcCommission`: Withdraw earned USDC commission fees
- `CloseOperatorPool`: Permanently close a pool
- `SweepClosedPoolUsdcDust`: Sweep USDC dust from a closed pool
- `AccrueRewardEmergencyBypass`: Accrue reward to a pool when the pool is not included in a reward record payout

### For Delegators

- `CreateStakingRecord`: Create a new account to record position in a pool
- `Stake`: Delegate tokens to an Operator pool
- `Unstake`: Begin the process of unstaking tokens
- `CancelUnstake`: Cancel a pending unstake operation
- `CloseStakingRecord`: Close staking record account after zeroing
- `ClaimUsdcEarnings`: Claim USDC earnings from a pool

### For Program Admin

- `CreatePoolOverview`: Initialize the program after deployment
- `UpdatePoolOverviewAuthorities`: Modify authorities on `PoolOverview`
- `UpdatePoolOverview`: Modify global staking parameters
- `CreateRewardRecord`: Finalize a reward epoch by committing the merkle root
- `SlashStake`: Penalize an operator by slashing their stake
- `SetHaltStatus`: Halt an operator from staking, unstaking or claiming from their pool

### Permissionless

- `AccrueReward`: Accrue reward issued to a pool
- `ClaimUnstake`: Withdraw tokens after the unstaking delay period

## Reward Distribution

Rewards are computed off-chain based on network performance metrics and distributed using a merkle-based reward system:

1. Off-chain service computes rewards per `OperatorPool` and generates merkle trees
2. Merkle roots are committed on-chain via `CreateRewardRecord`
3. Rewards are claimed permissionlessly using merkle proofs via `AccrueReward`
   - Operators receive commission fees and delegators receive staking rewards and USDC earnings
   - Rewards auto-compound when added to the staking pool for all delegators
   - USDC earnings are distributed to delegators based on pool share ownership
   - USDC earnings can be claimed at any time, independently from staked token positions

## On-Chain Accounting

On-chain accounting is managed by two mechanisms:

- **Pool Shares**: A proportional ownership system where delegators receive shares representing their stake in a pool. Token rewards automatically increase share value without requiring additional transactions, allowing all participants to benefit passively based on their stake proportion.

- **USDC Revenue Sharing**: A hybrid accounting model using a cumulative per-share index system that tracks USDC earnings over the pool's lifetime. Delegators can claim USDC earnings independently from their staked tokens, with settlements calculated using checkpoints to ensure accurate and efficient accounting.

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

# Install SDK dependencies
cd sdk && bun install
cd ..

# Setup (back at root level)
bun run setup

# Run formatting
bun run format

# Run linting
bun run lint

# Run all static checks
bun run check

# Build the program and generate the IDL
bun run build
```

# Testing

The `tests` folder contains a full suite of integrations tests for the program which can be run with Anchor. The tests will run whichever test suite is specified in the `Anchor.toml` file (there are multiple test suites - additional tests are commented out, you can run them all with the `test-all` command).

```bash
# Run unit tests
bun run test:unit

# Run Program unit tests
bun run test:program:unit

# Run program tests
bun run test

# Run tests without spinning up a local validator (requires a local validator to be running)
bun run test:skip-local-validator

# Run all program tests
bun run test-all
```

You can deploy the program with the `deploy-localnet.sh` script in the `scripts` folder for local testing and development.

# Client SDK

A TypeScript client SDK is provided in the `sdk` package. The SDK provides methods to read program account state and decode program transactions/events.
