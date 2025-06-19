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
            @ ErrorCode::InvalidRewardDistributionAuthority,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateIsEpochFinalizingArgs {
    pub expected_epoch: u64,
    pub is_epoch_finalizing: bool,
}

/// Instruction to update PoolOverview is_epoch_finalizing state.
pub fn handler(
    ctx: Context<UpdateIsEpochFinalizing>,
    args: UpdateIsEpochFinalizingArgs,
) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;

    // We explicitly check the epoch that are marking as finalizing, to avoid
    // accidentally setting the epoch is finalizing state.
    require_eq!(
        pool_overview.completed_reward_epoch.checked_add(1).unwrap(),
        args.expected_epoch,
        ErrorCode::EpochIsFinalizingEpochInvalid
    );

    pool_overview.is_epoch_finalizing = args.is_epoch_finalizing;

    Ok(())
}
