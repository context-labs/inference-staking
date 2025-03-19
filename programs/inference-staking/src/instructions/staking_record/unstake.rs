use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct Unstake<'info> {
    pub owner: Signer<'info>,
    pub pool_overview: Box<Account<'info, PoolOverview>>,
    #[account(mut, has_one = operator_staking_record)]
    pub operator_pool: Box<Account<'info, OperatorPool>>,
    #[account(
        mut,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub owner_staking_record: Box<Account<'info, StakingRecord>>,
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
        ErrorCode::UnstakingNotAllowed
    );

    // Check that all rewards have been claimed, unless pool is closed and all rewards
    // up to (but excluding) epoch in which pool was closed at have been claimed.
    if pool_overview.completed_reward_epoch > operator_pool.reward_last_claimed_epoch {
        if operator_pool.closed_at.is_some() {
            let closed_at = operator_pool.closed_at.unwrap();
            require_gte!(
                operator_pool.reward_last_claimed_epoch,
                closed_at - 1,
                ErrorCode::UnclaimedRewards
            );
        } else {
            return err!(ErrorCode::UnstakingNotAllowed);
        }
    }

    let staking_record = &mut ctx.accounts.owner_staking_record;
    require_gte!(staking_record.shares, share_amount);

    // Calculate number of tokens to unstake, and update token and share amounts on OperatorPool.
    let tokens_unstaked = operator_pool.unstake_tokens(share_amount);

    // Update owner's StakingRecord with new unstake details.
    staking_record.shares = staking_record.shares.checked_sub(share_amount).unwrap();
    staking_record.tokens_unstake_amount = staking_record
        .tokens_unstake_amount
        .checked_add(tokens_unstaked)
        .unwrap();
    staking_record.unstake_at_timestamp = Clock::get()?
        .unix_timestamp
        .checked_add(pool_overview.unstake_delay_seconds.try_into().unwrap())
        .unwrap();

    // If Operator is unstaking, check that they still maintain min. share percentage of pool after.
    if is_operator_unstaking {
        let min_operator_share_bps = pool_overview.min_operator_share_bps;
        let min_operator_shares = operator_pool
            .total_shares
            .checked_mul(min_operator_share_bps.into())
            .unwrap()
            .checked_div(10000)
            .unwrap();
        require_gte!(
            staking_record.shares,
            min_operator_shares,
            ErrorCode::MinOperatorSharesNotMet
        );
    }

    Ok(())
}
