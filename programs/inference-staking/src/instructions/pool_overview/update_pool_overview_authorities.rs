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
    new_program_admin: Option<Pubkey>,
    new_reward_distribution_authorities: Option<Vec<Pubkey>>,
    new_halt_authorities: Option<Vec<Pubkey>>,
    new_slashing_authorities: Option<Vec<Pubkey>>,
) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;

    if let Some(new_admin) = new_program_admin {
        pool_overview.program_admin = new_admin;
    }

    if let Some(authorities) = new_reward_distribution_authorities {
        require_gte!(5, authorities.len(), ErrorCode::AuthoritiesExceeded);
        pool_overview.reward_distribution_authorities = authorities;
    }

    if let Some(authorities) = new_slashing_authorities {
        require_gte!(5, authorities.len(), ErrorCode::AuthoritiesExceeded);
        pool_overview.slashing_authorities = authorities;
    }

    if let Some(authorities) = new_halt_authorities {
        require_gte!(5, authorities.len(), ErrorCode::AuthoritiesExceeded);
        pool_overview.halt_authorities = authorities;
    }

    Ok(())
}
