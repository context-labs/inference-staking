use anchor_lang::prelude::*;

use crate::PoolOverview;

#[derive(Accounts)]
pub struct UpdatePoolOverviewAuthorities<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        has_one = admin
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
}

/// Instruction to update authorities on PoolOverview.
pub fn handler(
    ctx: Context<UpdatePoolOverviewAuthorities>,
    new_admin: Pubkey,
    new_halt_authorites: Vec<Pubkey>,
) -> Result<()> {
    require_gte!(10, new_halt_authorites.len());

    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.admin = new_admin;
    pool_overview.halt_authorities = new_halt_authorites;

    Ok(())
}
