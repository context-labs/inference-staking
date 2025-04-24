use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct ChangeOperatorStakingRecord<'info> {
    /// Admin of the OperatorPool
    pub admin: Signer<'info>,

    /// Owner of the StakingRecord that will become the new OperatorPool StakingRecord
    pub owner: Signer<'info>,

    #[account(
      seeds = [b"PoolOverview".as_ref()],
      bump = pool_overview.bump,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
      mut,
      seeds = [
        &operator_pool.pool_id.to_le_bytes(),
        b"OperatorPool".as_ref()
      ],
      bump = operator_pool.bump,
      has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
      address = operator_pool.operator_staking_record,
      has_one = operator_pool,
    )]
    pub operator_staking_record: Account<'info, StakingRecord>,

    #[account(
      seeds = [operator_pool.key().as_ref(), owner.key().as_ref(), b"StakingRecord"],
      bump,
      has_one = owner,
      has_one = operator_pool,
    )]
    pub new_staking_record: Account<'info, StakingRecord>,
}

pub fn handler(ctx: Context<ChangeOperatorStakingRecord>) -> Result<()> {
    let min_operator_share_bps = ctx.accounts.pool_overview.min_operator_share_bps;
    let min_operator_shares = ctx
        .accounts
        .operator_pool
        .calc_min_operator_shares(min_operator_share_bps);
    require_gte!(
        ctx.accounts.new_staking_record.shares,
        min_operator_shares,
        ErrorCode::MinOperatorSharesNotMet
    );

    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.operator_staking_record = ctx.accounts.new_staking_record.key();

    Ok(())
}
