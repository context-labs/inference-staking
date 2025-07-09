use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode, events::ChangeOperatorAdminEvent, state::OperatorPool, PoolOverview,
};

#[derive(Accounts)]
pub struct ChangeOperatorAdmin<'info> {
    pub admin: Signer<'info>,

    pub new_admin: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = !pool_overview.is_epoch_finalizing @ ErrorCode::EpochMustNotBeFinalizing,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        mut,
        seeds = [
          b"OperatorPool".as_ref(),
          operator_pool.initial_pool_admin.as_ref(),
        ],
        bump = operator_pool.bump,
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,
}

pub fn handler(ctx: Context<ChangeOperatorAdmin>) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let old_admin = operator_pool.admin;
    let new_admin = ctx.accounts.new_admin.key();

    operator_pool.admin = new_admin;

    emit!(ChangeOperatorAdminEvent {
        operator_pool: operator_pool.key(),
        old_admin,
        new_admin,
    });

    Ok(())
}
