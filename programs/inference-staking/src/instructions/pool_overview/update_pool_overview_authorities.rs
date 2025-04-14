use anchor_lang::prelude::*;

use crate::{error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct UpdatePoolOverviewAuthorities<'info> {
    pub program_admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        has_one = program_admin @ ErrorCode::InvalidAuthority
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
}

/// Instruction to update authorities on PoolOverview.
pub fn handler(
    ctx: Context<UpdatePoolOverviewAuthorities>,
    new_program_admin: Pubkey,
    new_reward_distribution_authorities: Vec<Pubkey>,
    new_halt_authorites: Vec<Pubkey>,
    new_slashing_authorities: Vec<Pubkey>,
) -> Result<()> {
    require_gte!(
        5,
        new_reward_distribution_authorities.len(),
        ErrorCode::AuthoritiesExceeded
    );
    require_gte!(
        5,
        new_slashing_authorities.len(),
        ErrorCode::AuthoritiesExceeded
    );
    require_gte!(5, new_halt_authorites.len(), ErrorCode::AuthoritiesExceeded);

    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.program_admin = new_program_admin;
    pool_overview.reward_distribution_authorities = new_reward_distribution_authorities;
    pool_overview.halt_authorities = new_halt_authorites;
    pool_overview.slashing_authorities = new_slashing_authorities;

    Ok(())
}
