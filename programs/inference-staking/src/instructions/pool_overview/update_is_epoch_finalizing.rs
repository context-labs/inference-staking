use anchor_lang::prelude::*;

use crate::{error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct UpdateIsEpochFinalizing<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = pool_overview.reward_distribution_authorities.contains(authority.key)
            @ ErrorCode::InvalidAuthority,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateIsEpochFinalizingArgs {
    pub is_epoch_finalizing: bool,
}

/// Instruction to update PoolOverview is_epoch_finalizing state.
pub fn handler(
    ctx: Context<UpdateIsEpochFinalizing>,
    args: UpdateIsEpochFinalizingArgs,
) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.is_epoch_finalizing = args.is_epoch_finalizing;

    Ok(())
}
