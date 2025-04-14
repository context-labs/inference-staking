use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct CloseOperatorPool<'info> {
    pub admin: Signer<'info>,
    pub pool_overview: Box<Account<'info, PoolOverview>>,
    #[account(
        mut,
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,
}

pub fn handler(ctx: Context<CloseOperatorPool>) -> Result<()> {
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_pool = &mut ctx.accounts.operator_pool;

    // Check that pool is not halted or already closed.
    require!(!operator_pool.is_halted, ErrorCode::OperatorPoolHalted);
    require!(operator_pool.closed_at.is_none(), ErrorCode::ClosedPool);

    operator_pool.closed_at = Some(pool_overview.completed_reward_epoch);

    Ok(())
}
