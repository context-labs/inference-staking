use anchor_lang::prelude::*;

use crate::{constants::MIN_SLASHING_DELAY_SECONDS, error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct UpdatePoolOverview<'info> {
    pub program_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
        has_one = program_admin @ ErrorCode::InvalidProgramAdmin
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    /// CHECK: This is the wallet address that receives the operator pool registration fees.
    pub registration_fee_payout_wallet: Option<UncheckedAccount<'info>>,

    /// CHECK: This is the destination account for slashed USDC tokens.
    pub slashing_destination_usdc_account: Option<UncheckedAccount<'info>>,

    /// CHECK: This is the destination account for slashed tokens.
    pub slashing_destination_token_account: Option<UncheckedAccount<'info>>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdatePoolOverviewArgs {
    pub is_staking_halted: Option<bool>,
    pub is_withdrawal_halted: Option<bool>,
    pub is_accrue_reward_halted: Option<bool>,
    pub allow_pool_creation: Option<bool>,
    pub operator_pool_registration_fee: Option<u64>,
    pub min_operator_token_stake: Option<u64>,
    pub delegator_unstake_delay_seconds: Option<u64>,
    pub operator_unstake_delay_seconds: Option<u64>,
    pub slashing_delay_seconds: Option<u64>,
}

/// Instruction to update settings on PoolOverview.
pub fn handler(ctx: Context<UpdatePoolOverview>, args: UpdatePoolOverviewArgs) -> Result<()> {
    let UpdatePoolOverviewArgs {
        is_staking_halted,
        is_withdrawal_halted,
        is_accrue_reward_halted,
        allow_pool_creation,
        operator_pool_registration_fee,
        min_operator_token_stake,
        delegator_unstake_delay_seconds,
        operator_unstake_delay_seconds,
        slashing_delay_seconds,
    } = args;

    let pool_overview = &mut ctx.accounts.pool_overview;

    if let Some(min_operator_token_stake) = min_operator_token_stake {
        pool_overview.min_operator_token_stake = min_operator_token_stake;
    }

    if let Some(is_staking_halted) = is_staking_halted {
        pool_overview.is_staking_halted = is_staking_halted;
    }

    if let Some(is_withdrawal_halted) = is_withdrawal_halted {
        pool_overview.is_withdrawal_halted = is_withdrawal_halted;
    }

    if let Some(is_accrue_reward_halted) = is_accrue_reward_halted {
        pool_overview.is_accrue_reward_halted = is_accrue_reward_halted;
    }

    if let Some(allow_pool_creation) = allow_pool_creation {
        pool_overview.allow_pool_creation = allow_pool_creation;
    }

    if let Some(operator_pool_registration_fee) = operator_pool_registration_fee {
        pool_overview.operator_pool_registration_fee = operator_pool_registration_fee;
    }

    if let Some(delegator_unstake_delay_seconds) = delegator_unstake_delay_seconds {
        pool_overview.delegator_unstake_delay_seconds = delegator_unstake_delay_seconds;
    }

    if let Some(operator_unstake_delay_seconds) = operator_unstake_delay_seconds {
        pool_overview.operator_unstake_delay_seconds = operator_unstake_delay_seconds;
    }

    if let Some(slashing_delay_seconds) = slashing_delay_seconds {
        require!(
            slashing_delay_seconds >= MIN_SLASHING_DELAY_SECONDS,
            ErrorCode::InvalidSlashingDelay
        );
        pool_overview.slashing_delay_seconds = slashing_delay_seconds;
    }

    let registration_fee_payout_wallet = &ctx.accounts.registration_fee_payout_wallet;
    if let Some(registration_fee_payout_wallet) = registration_fee_payout_wallet {
        pool_overview.registration_fee_payout_wallet = registration_fee_payout_wallet.key();
    }

    let slashing_destination_usdc_account = &ctx.accounts.slashing_destination_usdc_account;
    if let Some(slashing_destination_usdc_account) = slashing_destination_usdc_account {
        pool_overview.slashing_destination_usdc_account = slashing_destination_usdc_account.key();
    }

    let slashing_destination_token_account = &ctx.accounts.slashing_destination_token_account;
    if let Some(slashing_destination_token_account) = slashing_destination_token_account {
        pool_overview.slashing_destination_token_account = slashing_destination_token_account.key();
    }

    Ok(())
}
