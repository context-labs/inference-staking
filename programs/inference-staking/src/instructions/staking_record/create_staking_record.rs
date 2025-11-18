use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct CreateStakingRecord<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub owner: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        seeds = [OperatorPool::SEED, operator_pool.initial_pool_admin.as_ref()],
        bump,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        init,
        seeds = [
            StakingRecord::SEED,
            operator_pool.key().as_ref(),
            owner.key().as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + StakingRecord::INIT_SPACE + StakingRecord::PADDING
    )]
    pub owner_staking_record: Box<Account<'info, StakingRecord>>,

    pub system_program: Program<'info, System>,
}

/// Instruction to setup a StakingRecord.
pub fn handler(ctx: Context<CreateStakingRecord>) -> Result<()> {
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_pool = &ctx.accounts.operator_pool;
    let owner = ctx.accounts.owner.key();

    // Check if this is the operator's staking record
    let is_operator = owner == operator_pool.admin;

    // If token rewards are disabled, only operators can create staking records
    if !pool_overview.token_rewards_enabled && !is_operator {
        return Err(ErrorCode::DelegatorStakingDisabled.into());
    }

    let staking_record = &mut ctx.accounts.owner_staking_record;
    staking_record.version = StakingRecord::VERSION;
    staking_record.owner = owner;
    staking_record.operator_pool = operator_pool.key();
    staking_record.last_settled_usdc_per_share = operator_pool.cumulative_usdc_per_share;
    staking_record.accrued_usdc_earnings = 0;

    Ok(())
}
