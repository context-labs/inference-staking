#![allow(ambiguous_glob_reexports)]
#![allow(unexpected_cfgs)] // See: https://solana.stackexchange.com/a/19845

#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

pub mod constants;
pub mod emissions;
pub mod error;
pub mod events;
pub mod instructions;
pub mod macros;
pub mod state;

use instructions::*;
use state::*;

use anchor_lang::prelude::*;

declare_id!("stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG");

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Inference.net Staking Program",
    project_url: "https://inference.net",
    contacts: "email:security@inference.net",
    policy: "https://docs.devnet.inference.net/devnet-epoch-3/bug-bounty-program",
    source_code: "https://github.com/context-labs/inference-staking",
    auditors: "Zellic"
}

#[program]
pub mod inference_staking {
    use super::*;

    /** -----------------------------------------------------------------------
     * PoolOverview Admin Instructions
     * ------------------------------------------------------------------------ */
    pub fn create_pool_overview(ctx: Context<CreatePoolOverview>) -> Result<()> {
        create_pool_overview::handler(ctx)
    }

    pub fn update_pool_overview(
        ctx: Context<UpdatePoolOverview>,
        args: UpdatePoolOverviewArgs,
    ) -> Result<()> {
        update_pool_overview::handler(ctx, args)
    }

    pub fn update_pool_overview_authorities(
        ctx: Context<UpdatePoolOverviewAuthorities>,
        args: UpdatePoolOverviewAuthoritiesArgs,
    ) -> Result<()> {
        update_pool_overview_authorities::handler(ctx, args)
    }

    pub fn mark_epoch_as_finalizing(
        ctx: Context<MarkEpochIsFinalizing>,
        args: MarkEpochIsFinalizingArgs,
    ) -> Result<()> {
        mark_epoch_as_finalizing::handler(ctx, args)
    }

    /** -----------------------------------------------------------------------
     * Staking Instructions
     * ------------------------------------------------------------------------ */
    pub fn create_staking_record(ctx: Context<CreateStakingRecord>) -> Result<()> {
        create_staking_record::handler(ctx)
    }

    pub fn stake(ctx: Context<Stake>, args: StakeArgs) -> Result<()> {
        stake::handler(ctx, args)
    }

    pub fn unstake(ctx: Context<Unstake>, args: UnstakeArgs) -> Result<()> {
        unstake::handler(ctx, args)
    }

    pub fn claim_unstake(ctx: Context<ClaimUnstake>) -> Result<()> {
        claim_unstake::handler(ctx)
    }

    pub fn cancel_unstake(ctx: Context<CancelUnstake>) -> Result<()> {
        cancel_unstake::handler(ctx)
    }

    pub fn close_staking_record(ctx: Context<CloseStakingRecord>) -> Result<()> {
        close_staking_record::handler(ctx)
    }

    pub fn claim_usdc_earnings(ctx: Context<ClaimUsdcEarnings>) -> Result<()> {
        claim_usdc_earnings::handler(ctx)
    }

    /** -----------------------------------------------------------------------
     * Reward Distribution Instructions
     * ------------------------------------------------------------------------ */
    pub fn create_reward_record(
        ctx: Context<CreateRewardRecord>,
        args: CreateRewardRecordArgs,
    ) -> Result<()> {
        create_reward_record::handler(ctx, args)
    }

    pub fn accrue_reward(ctx: Context<AccrueReward>, args: AccrueRewardArgs) -> Result<()> {
        accrue_reward::handler(ctx, args)
    }

    pub fn accrue_reward_emergency_bypass(ctx: Context<AccrueRewardEmergencyBypass>) -> Result<()> {
        accrue_reward_emergency_bypass::handler(ctx)
    }

    /** -----------------------------------------------------------------------
     * OperatorPool Admin Instructions
     * ------------------------------------------------------------------------ */
    pub fn create_operator_pool(
        ctx: Context<CreateOperatorPool>,
        args: CreateOperatorPoolArgs,
    ) -> Result<()> {
        create_operator_pool::handler(ctx, args)
    }

    pub fn withdraw_operator_reward_commission(
        ctx: Context<WithdrawOperatorRewardCommission>,
    ) -> Result<()> {
        withdraw_operator_reward_commission::handler(ctx)
    }

    pub fn withdraw_operator_usdc_commission(
        ctx: Context<WithdrawOperatorUsdcCommission>,
    ) -> Result<()> {
        withdraw_operator_usdc_commission::handler(ctx)
    }

    pub fn change_operator_staking_record(ctx: Context<ChangeOperatorStakingRecord>) -> Result<()> {
        change_operator_staking_record::handler(ctx)
    }

    pub fn change_operator_admin(ctx: Context<ChangeOperatorAdmin>) -> Result<()> {
        change_operator_admin::handler(ctx)
    }

    pub fn update_operator_pool(
        ctx: Context<UpdateOperatorPool>,
        args: UpdateOperatorPoolArgs,
    ) -> Result<()> {
        update_operator_pool::handler(ctx, args)
    }

    pub fn close_operator_pool(ctx: Context<CloseOperatorPool>) -> Result<()> {
        close_operator_pool::handler(ctx)
    }

    pub fn sweep_closed_pool_usdc_dust(ctx: Context<SweepClosedPoolUsdcDust>) -> Result<()> {
        sweep_closed_pool_usdc_dust::handler(ctx)
    }

    /** -----------------------------------------------------------------------
     * Program Admin Security Instructions
     * ------------------------------------------------------------------------ */
    pub fn set_halt_status(ctx: Context<SetHaltStatus>, args: SetHaltStatusArgs) -> Result<()> {
        set_halt_status::handler(ctx, args)
    }

    pub fn slash_stake(ctx: Context<SlashStake>, args: SlashStakeArgs) -> Result<()> {
        slash_stake::handler(ctx, args)
    }
}
