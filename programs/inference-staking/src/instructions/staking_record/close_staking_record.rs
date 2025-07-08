use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{OperatorPool, StakingRecord},
};

#[derive(Accounts)]
pub struct CloseStakingRecord<'info> {
    /// Account to receive the reclaimed rent from StakingRecord
    /// CHECK: not needed as owner is checked
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,

    pub owner: Signer<'info>,

    #[account(
        mut,
        close = receiver,
        seeds = [
            b"StakingRecord".as_ref(),
            owner_staking_record.operator_pool.as_ref(),
            owner.key().as_ref()
        ],
        bump,
        has_one = owner,
    )]
    pub owner_staking_record: Account<'info, StakingRecord>,

    #[account(
        seeds = [b"OperatorPool".as_ref(), operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseStakingRecord>) -> Result<()> {
    let operator_pool = &ctx.accounts.operator_pool;
    let staking_record = &ctx.accounts.owner_staking_record;

    // Check no shares or unstaking tokens
    require!(staking_record.shares == 0, ErrorCode::AccountNotEmpty);
    require!(
        staking_record.tokens_unstake_amount == 0,
        ErrorCode::AccountNotEmpty
    );

    // Check no unsettled USDC earnings
    require!(
        !operator_pool.has_unclaimed_usdc_earnings(staking_record),
        ErrorCode::UnclaimedUsdcEarnings
    );

    // Enforce that the operator pool has been fully unstaked before the
    // operator can close their staking record. This is because the unstake
    // flow instructions require the operator staking record account.
    let is_operator_unstaking = operator_pool.operator_staking_record.key() == staking_record.key();
    if is_operator_unstaking {
        require!(operator_pool.is_empty(), ErrorCode::PoolIsNotEmpty);
    }

    Ok(())
}
