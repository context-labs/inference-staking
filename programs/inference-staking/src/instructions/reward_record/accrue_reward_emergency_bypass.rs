use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{OperatorPool, PoolOverview, RewardRecord};

#[derive(Accounts)]
pub struct AccrueRewardEmergencyBypass<'info> {
    /// Only the pool admin can execute this emergency bypass
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        mut,
        seeds = [
            b"OperatorPool".as_ref(),
            operator_pool.initial_pool_admin.as_ref(),
        ],
        bump = operator_pool.bump,
        constraint = operator_pool.halted_at_timestamp.is_none() @ ErrorCode::OperatorPoolHalted,
        constraint = operator_pool.closed_at_epoch.is_none() @ ErrorCode::ClosedPool,
        has_one = admin,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    /// The current reward record that should have been claimed (at reward_last_claimed_epoch + 1)
    #[account(
        seeds = [
            b"RewardRecord".as_ref(),
            &current_pool_reward_record.epoch.to_le_bytes()
        ],
        bump,
        constraint = current_pool_reward_record.epoch == operator_pool.reward_last_claimed_epoch + 1 @ ErrorCode::InvalidEmergencyBypassEpoch,
    )]
    pub current_pool_reward_record: Box<Account<'info, RewardRecord>>,

    /// The next reward record that we're bypassing to (at reward_last_claimed_epoch + 2)
    #[account(
        seeds = [
            b"RewardRecord".as_ref(),
            &next_pool_reward_record.epoch.to_le_bytes()
        ],
        bump,
        constraint = next_pool_reward_record.epoch == operator_pool.reward_last_claimed_epoch + 2 @ ErrorCode::InvalidEmergencyBypassEpoch,
    )]
    pub next_pool_reward_record: Box<Account<'info, RewardRecord>>,
}

/// Emergency instruction to bypass a reward accrual when an operator pool
/// was not included in a reward record payout. This allows the pool admin
/// to increment the reward_last_claimed_epoch to prevent the pool from
/// getting stranded.
pub fn handler(ctx: Context<AccrueRewardEmergencyBypass>) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;

    // Ensure the pool's last claimed epoch is less than the completed reward epoch
    require_gt!(
        pool_overview.completed_reward_epoch,
        operator_pool.reward_last_claimed_epoch,
        ErrorCode::InvalidEmergencyBypassEpoch
    );

    // Increment the pool's reward_last_claimed_epoch
    operator_pool.reward_last_claimed_epoch = operator_pool
        .reward_last_claimed_epoch
        .checked_add(1)
        .unwrap();

    Ok(())
}
