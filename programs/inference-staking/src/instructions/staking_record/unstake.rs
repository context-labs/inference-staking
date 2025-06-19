use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::events::UnstakeEvent;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct Unstake<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = !pool_overview.is_staking_halted @ ErrorCode::StakingHalted,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        mut,
        seeds = [b"OperatorPool".as_ref(), &operator_pool.pool_id.to_le_bytes()],
        bump = operator_pool.bump,
        has_one = operator_staking_record,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        mut,
        seeds = [
            b"StakingRecord".as_ref(),
            operator_pool.key().as_ref(),
            owner.key().as_ref()
        ],
        bump,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub owner_staking_record: Box<Account<'info, StakingRecord>>,

    #[account(
        address = operator_pool.operator_staking_record,
    )]
    pub operator_staking_record: Box<Account<'info, StakingRecord>>,
}

/// Instruction to initiate unstaking of tokens from an OperatorPool.
pub fn handler(ctx: Context<Unstake>, share_amount: u64) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_staking_record = &ctx.accounts.operator_staking_record;

    let is_operator_unstaking =
        operator_staking_record.key() == ctx.accounts.owner_staking_record.key();

    // Check that operator is not unstaking when pool is halted.
    require!(
        !is_operator_unstaking || !operator_pool.is_halted,
        ErrorCode::UnstakingNotAllowed
    );

    // Check that global withdrawal has not been halted.
    require!(
        !pool_overview.is_withdrawal_halted,
        ErrorCode::WithdrawalsHalted
    );

    // Check that all rewards have been claimed for pool closure conditions.
    operator_pool.check_unclaimed_rewards(pool_overview.completed_reward_epoch)?;

    let staking_record = &mut ctx.accounts.owner_staking_record;
    require_gte!(staking_record.shares, share_amount);

    // Calculate number of tokens to unstake, and update token and share amounts on OperatorPool.
    let tokens_unstaked = operator_pool.unstake_tokens(share_amount);

    // Determine the correct unstake cooldown period on whether it's a delegator
    // or operator.
    let unstake_delay_seconds = if is_operator_unstaking {
        pool_overview.operator_unstake_delay_seconds
    } else {
        pool_overview.delegator_unstake_delay_seconds
    };

    // Update owner's StakingRecord with new unstake details.
    staking_record.shares = staking_record.shares.checked_sub(share_amount).unwrap();
    staking_record.tokens_unstake_amount = staking_record
        .tokens_unstake_amount
        .checked_add(tokens_unstaked)
        .unwrap();
    staking_record.unstake_at_timestamp = Clock::get()?
        .unix_timestamp
        .checked_add(unstake_delay_seconds.try_into().unwrap())
        .unwrap();

    // If Operator is unstaking and pool is not closed, check that they still
    // maintain min. share percentage of pool after.
    if is_operator_unstaking && operator_pool.closed_at.is_none() {
        let min_operator_share_bps = pool_overview.min_operator_share_bps;
        let min_operator_shares = operator_pool.calc_min_operator_shares(min_operator_share_bps);
        require_gte!(
            staking_record.shares,
            min_operator_shares,
            ErrorCode::MinOperatorSharesNotMet
        );
    }

    emit!(UnstakeEvent {
        staking_record: staking_record.key(),
        operator_pool: operator_pool.key(),
        unstake_amount: tokens_unstaked,
        total_staked_amount: operator_pool.total_staked_amount,
        total_unstaking: operator_pool.total_unstaking
    });

    Ok(())
}
