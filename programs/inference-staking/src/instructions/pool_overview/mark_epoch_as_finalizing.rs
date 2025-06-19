use anchor_lang::prelude::*;

use crate::{error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct MarkEpochIsFinalizing<'info> {
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
pub struct MarkEpochIsFinalizingArgs {
    pub expected_epoch: u64,
}

/// Instruction to mark an epoch as finalizing.
pub fn handler(ctx: Context<MarkEpochIsFinalizing>, args: MarkEpochIsFinalizingArgs) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;

    // We explicitly check the epoch that are marking as finalizing, to avoid
    // accidentally setting the epoch is finalizing state.
    require_eq!(
        pool_overview.completed_reward_epoch.checked_add(1).unwrap(),
        args.expected_epoch,
        ErrorCode::EpochIsFinalizingEpochInvalid
    );

    pool_overview.is_epoch_finalizing = true;

    Ok(())
}
