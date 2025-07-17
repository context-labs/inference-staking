use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct SetHaltStatus<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
        constraint = pool_overview.halt_authorities.contains(authority.key)
          @ ErrorCode::InvalidHaltAuthority,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        mut,
        seeds = [OperatorPool::SEED, operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
    )]
    pub operator_pool: Account<'info, OperatorPool>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct SetHaltStatusArgs {
    /// Whether the OperatorPool should be halted.
    pub is_halted: bool,
}

pub fn handler(ctx: Context<SetHaltStatus>, args: SetHaltStatusArgs) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;

    if args.is_halted {
        operator_pool.halted_at_timestamp = Some(Clock::get()?.unix_timestamp);
    } else {
        operator_pool.halted_at_timestamp = None;
    }

    Ok(())
}
