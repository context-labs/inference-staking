use anchor_lang::prelude::*;

use crate::{error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct UpdatePoolOverviewAuthorities<'info> {
    pub program_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
        has_one = program_admin @ ErrorCode::InvalidProgramAdmin
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    // Optional new admin that must be a signer if provided
    #[account(signer)]
    pub new_program_admin: Option<AccountInfo<'info>>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdatePoolOverviewAuthoritiesArgs {
    pub new_reward_distribution_authorities: Option<Vec<Pubkey>>,
    pub new_halt_authorities: Option<Vec<Pubkey>>,
    pub new_slashing_authorities: Option<Vec<Pubkey>>,
}

/// Instruction to update authorities on PoolOverview.
pub fn handler(
    ctx: Context<UpdatePoolOverviewAuthorities>,
    args: UpdatePoolOverviewAuthoritiesArgs,
) -> Result<()> {
    let UpdatePoolOverviewAuthoritiesArgs {
        new_reward_distribution_authorities,
        new_halt_authorities,
        new_slashing_authorities,
    } = args;

    let pool_overview = &mut ctx.accounts.pool_overview;

    if let Some(new_program_admin_info) = &ctx.accounts.new_program_admin {
        pool_overview.program_admin = new_program_admin_info.key();
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
