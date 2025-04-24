use anchor_lang::prelude::*;

use crate::{
    error::ErrorCode,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct SetHaltStatus<'info> {
    pub authority: Signer<'info>,

    #[account(
      seeds = [b"PoolOverview".as_ref()],
      bump = pool_overview.bump,
      constraint = pool_overview.halt_authorities.contains(authority.key) 
          @ ErrorCode::InvalidAuthority,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
      mut,
      seeds = [&operator_pool.pool_id.to_le_bytes(), b"OperatorPool".as_ref()],
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
    operator_pool.is_halted = args.is_halted;

    Ok(())
}
