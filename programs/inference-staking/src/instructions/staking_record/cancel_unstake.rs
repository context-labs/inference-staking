use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;

use crate::events::CancelUnstakeEvent;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct CancelUnstake<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(mut)]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        mut,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub owner_staking_record: Box<Account<'info, StakingRecord>>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

/// Instruction to cancel unstaking of tokens from an OperatorPool.
pub fn handler(ctx: Context<CancelUnstake>) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;

    // Check that all rewards have been claimed for pool closure conditions.
    operator_pool.check_unclaimed_rewards(pool_overview.completed_reward_epoch)?;

    let staking_record = &mut ctx.accounts.owner_staking_record;

    // Store values before mutations
    let operator_pool_key = operator_pool.key();
    let staking_record_key = staking_record.key();
    let owner_key = ctx.accounts.owner.key();
    let is_operator_cancelling = operator_pool.operator_staking_record == staking_record.key();

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

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(CancelUnstakeEvent {
        instruction_index,
        operator_pool: operator_pool_key,
        staking_record: staking_record_key,
        owner: owner_key,
        is_operator: is_operator_cancelling,
        token_amount: tokens_unstake_amount,
        shares_amount: shares_created,
    });

    Ok(())
}
