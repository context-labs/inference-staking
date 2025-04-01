#![allow(ambiguous_glob_reexports)]

pub mod error;
pub mod instructions;
pub mod macros;
pub mod state;

use instructions::*;
use state::*;

use anchor_lang::prelude::*;

declare_id!("7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb");

#[program]
pub mod inference_staking {
    use super::*;

    pub fn create_pool_overview(ctx: Context<CreatePoolOverview>) -> Result<()> {
        create_pool_overview::handler(ctx)
    }

    pub fn update_pool_overview_authorities(
        ctx: Context<UpdatePoolOverviewAuthorities>,
        new_admin: Pubkey,
        new_halt_authorites: Vec<Pubkey>,
    ) -> Result<()> {
        update_pool_overview_authorities::handler(ctx, new_admin, new_halt_authorites)
    }

    pub fn update_pool_overview(
        ctx: Context<UpdatePoolOverview>,
        is_withdrawal_halted: bool,
        allow_pool_creation: bool,
        min_operator_share_bps: u16,
        delegator_unstake_delay_seconds: u64,
        operator_unstake_delay_seconds: u64,
    ) -> Result<()> {
        update_pool_overview::handler(
            ctx,
            is_withdrawal_halted,
            allow_pool_creation,
            min_operator_share_bps,
            delegator_unstake_delay_seconds,
            operator_unstake_delay_seconds,
        )
    }

    pub fn create_staking_record(ctx: Context<CreateStakingRecord>) -> Result<()> {
        create_staking_record::handler(ctx)
    }

    pub fn stake(ctx: Context<Stake>, token_amount: u64) -> Result<()> {
        stake::handler(ctx, token_amount)
    }

    pub fn unstake(ctx: Context<Unstake>, share_amount: u64) -> Result<()> {
        unstake::handler(ctx, share_amount)
    }

    pub fn claim_unstake(ctx: Context<ClaimUnstake>) -> Result<()> {
        claim_unstake::handler(ctx)
    }

    pub fn create_reward_record(
        ctx: Context<CreateRewardRecord>,
        merkle_roots: Vec<[u8; 32]>,
        total_rewards: u64,
    ) -> Result<()> {
        create_reward_record::handler(ctx, merkle_roots, total_rewards)
    }

    pub fn accrue_reward(
        ctx: Context<AccrueReward>,
        merkle_index: u8,
        proof: Vec<[u8; 32]>,
        proof_path: Vec<bool>,
        reward_amount: u64,
    ) -> Result<()> {
        accrue_reward::handler(ctx, merkle_index, proof, proof_path, reward_amount)
    }

    pub fn close_staking_record(ctx: Context<CloseStakingRecord>) -> Result<()> {
        close_staking_record::handler(ctx)
    }

    /* PoolOverview admin instructions */

    pub fn slash_stake(ctx: Context<SlashStake>, args: SlashStakeArgs) -> Result<()> {
        slash_stake::handler(ctx, args)
    }

    /// PoolOverview admin sets the `is_halted` status of an OperatorPool.
    pub fn set_halt_status(ctx: Context<SetHaltStatus>, args: SetHaltStatusArgs) -> Result<()> {
        set_halt_status::handler(ctx, args)
    }

    /// Instruction to allow the PoolOverview admin to update the merkle roots on an existing RewardRecord.
    /// This currently does not allow the update of `total_rewards` to prevent accounting
    /// complexities when some rewards may have already been accrued to the OperatorPool
    pub fn modify_reward_record(
        ctx: Context<ModifyRewardRecord>,
        args: ModifyRewardRecordArgs,
    ) -> Result<()> {
        modify_reward_record::handler(ctx, args)
    }

    /* OperatorPool admin instructions */
    pub fn create_operator_pool(
        ctx: Context<CreateOperatorPool>,
        auto_stake_fees: bool,
        commission_rate_bps: u16,
        allow_delegation: bool,
    ) -> Result<()> {
        create_operator_pool::handler(ctx, auto_stake_fees, commission_rate_bps, allow_delegation)
    }

    pub fn withdraw_operator_commission(ctx: Context<WithdrawOperatorCommission>) -> Result<()> {
        withdraw_operator_commission::handler(ctx)
    }

    /// OperatorPool admin-only instruction to change the StakingRecord associated with
    /// the OperatorPool.
    pub fn change_operator_staking_record(ctx: Context<ChangeOperatorStakingRecord>) -> Result<()> {
        change_operator_staking_record::handler(ctx)
    }

    pub fn change_operator_admin(ctx: Context<ChangeOperatorAdmin>) -> Result<()> {
        change_operator_admin::handler(ctx)
    }

    /// Change configurable parameters on the OperatorPool.
    pub fn update_operator_pool(
        ctx: Context<UpdateOperatorPool>,
        args: UpdateOperatorPoolArgs,
    ) -> Result<()> {
        update_operator_pool::handler(ctx, args)
    }
}
