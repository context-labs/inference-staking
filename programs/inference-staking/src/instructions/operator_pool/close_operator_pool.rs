use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct CloseOperatorPool<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
    )]
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
    require!(
        operator_pool.halted_at.is_none(),
        ErrorCode::OperatorPoolHalted
    );
    require!(operator_pool.closed_at.is_none(), ErrorCode::ClosedPool);

    // The closed_at field is set to the next epoch after the current epoch, which
    // serves two functions:
    // 1. Ensures the pool is included in final epoch payouts and distributions.
    // 2. Enforces some delay before the operator can fully unstake, which extends
    //    the window for any potential final slashing actions.
    let current_epoch = match pool_overview.is_epoch_finalizing {
        true => pool_overview.completed_reward_epoch.checked_add(1).unwrap(),
        false => pool_overview.completed_reward_epoch,
    };
    operator_pool.closed_at = Some(current_epoch.checked_add(1).unwrap());

    Ok(())
}
