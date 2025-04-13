use anchor_lang::prelude::*;

use crate::PoolOverview;

#[derive(Accounts)]
pub struct UpdatePoolOverview<'info> {
    pub program_admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        has_one = program_admin
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
}

/// Instruction to update settings on PoolOverview.
pub fn handler(
    ctx: Context<UpdatePoolOverview>,
    is_withdrawal_halted: bool,
    allow_pool_creation: bool,
    min_operator_share_bps: u16,
    delegator_unstake_delay_seconds: u64,
    operator_unstake_delay_seconds: u64,
) -> Result<()> {
    require_gte!(10000, min_operator_share_bps);

    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.is_withdrawal_halted = is_withdrawal_halted;
    pool_overview.allow_pool_creation = allow_pool_creation;
    pool_overview.min_operator_share_bps = min_operator_share_bps;
    pool_overview.delegator_unstake_delay_seconds = delegator_unstake_delay_seconds;
    pool_overview.operator_unstake_delay_seconds = operator_unstake_delay_seconds;

    Ok(())
}
