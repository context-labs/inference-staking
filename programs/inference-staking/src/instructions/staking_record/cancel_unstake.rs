use anchor_lang::prelude::*;

use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct CancelUnstake<'info> {
    pub owner: Signer<'info>,

    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(mut)]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        mut,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub owner_staking_record: Box<Account<'info, StakingRecord>>,
}

/// Instruction to cancel unstaking of tokens from an OperatorPool.
pub fn handler(ctx: Context<CancelUnstake>) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;

    // Check that all rewards have been claimed for pool closure conditions.
    operator_pool.check_unclaimed_rewards(pool_overview.completed_reward_epoch)?;

    let staking_record = &mut ctx.accounts.owner_staking_record;

    let tokens_unstake_amount = staking_record.tokens_unstake_amount;

    // Calculate number of shares to create, and update token and share amounts on OperatorPool.
    let shares_created = operator_pool.stake_tokens(staking_record, tokens_unstake_amount)?;
    operator_pool.total_unstaking = operator_pool
        .total_unstaking
        .checked_sub(staking_record.tokens_unstake_amount)
        .unwrap();

    // Add shares created to owner's StakingRecord.
    staking_record.shares = staking_record.shares.checked_add(shares_created).unwrap();

    // Reset owner's StakingRecord.
    staking_record.unstake_at_timestamp = 0;
    staking_record.tokens_unstake_amount = 0;

    Ok(())
}
