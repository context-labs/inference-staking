use anchor_lang::prelude::*;

use crate::{error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct UpdatePoolOverview<'info> {
    pub program_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        has_one = program_admin @ ErrorCode::InvalidAuthority
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdatePoolOverviewArgs {
    pub is_staking_halted: Option<bool>,
    pub is_withdrawal_halted: Option<bool>,
    pub allow_pool_creation: Option<bool>,
    pub min_operator_share_bps: Option<u16>,
    pub delegator_unstake_delay_seconds: Option<u64>,
    pub operator_unstake_delay_seconds: Option<u64>,
}

/// Instruction to update settings on PoolOverview.
pub fn handler(ctx: Context<UpdatePoolOverview>, args: UpdatePoolOverviewArgs) -> Result<()> {
    let UpdatePoolOverviewArgs {
        is_staking_halted,
        is_withdrawal_halted,
        allow_pool_creation,
        min_operator_share_bps,
        delegator_unstake_delay_seconds,
        operator_unstake_delay_seconds,
    } = args;

    let pool_overview = &mut ctx.accounts.pool_overview;

    if let Some(min_operator_share_bps) = min_operator_share_bps {
        require_gte!(10000, min_operator_share_bps);
        pool_overview.min_operator_share_bps = min_operator_share_bps;
    }

    if let Some(is_staking_halted) = is_staking_halted {
        pool_overview.is_staking_halted = is_staking_halted;
    }

    if let Some(is_withdrawal_halted) = is_withdrawal_halted {
        pool_overview.is_withdrawal_halted = is_withdrawal_halted;
    }

    if let Some(allow_pool_creation) = allow_pool_creation {
        pool_overview.allow_pool_creation = allow_pool_creation;
    }

    if let Some(delegator_unstake_delay_seconds) = delegator_unstake_delay_seconds {
        pool_overview.delegator_unstake_delay_seconds = delegator_unstake_delay_seconds;
    }

    if let Some(operator_unstake_delay_seconds) = operator_unstake_delay_seconds {
        pool_overview.operator_unstake_delay_seconds = operator_unstake_delay_seconds;
    }

    Ok(())
}
