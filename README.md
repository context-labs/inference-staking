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

## Getting Started

### Prerequisites

- Rust toolchain: 1.85.0
- Solana CLI: Solana 2.1.16 (Other versions may be supported)
- Anchor framework (AVM 0.31.0)

### Installation

```bash
# Install dependencies
yarn install

# Build the program
anchor build
```

### Testing

```bash
# Run tests
anchor test
```

### Deployment

TBD
