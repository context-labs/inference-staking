use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct OperatorPool {
    /// ID of Pool. Equal to (PoolOverview.totalPools + 1) at time of creation.
    pub pool_id: u64,

    /// Authority allowed to configure settings for this account.
    pub admin: Pubkey,

    /// StakingRecord owned by Operator.
    pub operator_staking_record: Pubkey,

    /// If commission fees received by Operator should be staked at the end of the epoch.
    pub auto_stake_fees: bool,

    /// Commission Rate for Epoch Rewards. Capped at 100%.
    pub commission_rate_bps: u16,

    /// Commission Rate that will take place next Epoch, if set. Capped at 100%.
    pub new_commission_rate_bps: Option<u16>,

    /// If any other user is allowed to delegate stake to Pool, besides operator_staking_record.
    pub allow_delegation: bool,

    /// Total amount of tokens staked in Pool.
    pub total_staked_amount: u64,

    /// Total amount of shares issued representing fractional ownership of tokens staked in Pool.
    pub total_shares: u64,

    /// Total amount of tokens being unstaked.
    pub total_unstaking: u64,

    /// Epoch that pool was permanently closed at, if set.
    pub closed_at: Option<u64>,

    /// If Pool is halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,
    /// claim or withdraw rewards. Other users are not affected.
    pub is_halted: bool,

    /// Epoch in which reward was last claimed.
    pub reward_last_claimed_epoch: u64,

    /// Rewards that have been calculated in `claimRewards`, that are yet to be physically transferred to staking account.
    /// Used to optimize compute.
    pub accrued_rewards: u64,

    /// Commission that have been calculated in `claimRewards` , that are yet to be physically transferred to fee account.
    /// Used to optimize compute.
    pub accrued_commission: u64,
}
