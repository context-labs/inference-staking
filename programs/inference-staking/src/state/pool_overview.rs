use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct PoolOverview {
    /// Mint address of token to be staked.
    pub mint: Pubkey,

    /// PDA Bump
    pub bump: u8,

    /// Authority allowed to update authorities and other pool settings.
    pub program_admin: Pubkey,

    /// List of signers authorized to create or modify RewardRecord.
    #[max_len(5)]
    pub reward_distribution_authorities: Vec<Pubkey>,

    /// List of signers authorized to set OperatorPool.halted_at.
    #[max_len(5)]
    pub halt_authorities: Vec<Pubkey>,

    /// List of signers authorized to slash Operator's stake.
    #[max_len(5)]
    pub slashing_authorities: Vec<Pubkey>,

    /// Whether the current epoch is in the finalizing state.
    pub is_epoch_finalizing: bool,

    /// Halts all staking instructions when true. Used as a security backstop.
    pub is_staking_halted: bool,

    /// Halts all withdrawal instructions when true. Used as a security backstop.
    pub is_withdrawal_halted: bool,

    /// Halts all accrue reward instructions when true. Used as a security backstop.
    pub is_accrue_reward_halted: bool,

    /// If creation of OperatorPool is allowed.
    pub allow_pool_creation: bool,

    /// Token fee required to register an OperatorPool.
    pub operator_pool_registration_fee: u64,

    /// Wallet that receives the operator pool registration fees.
    pub registration_fee_payout_wallet: Pubkey,

    /// Min. amount of token stake that the Operator must maintain staked in their pool.
    /// If the value is below this minimum, no delegations are allowed (unless pool is closed).
    pub min_operator_token_stake: u64,

    /// Delay for unstaking in seconds for Delegators.
    pub delegator_unstake_delay_seconds: u64,

    /// Delay for unstaking in seconds for Operators.
    pub operator_unstake_delay_seconds: u64,

    /// Total number of pools created.
    pub total_pools: u64,

    /// Number of completed epochs.
    pub completed_reward_epoch: u64,

    /// Total amount of reward tokens across all epochs that are issued, but yet to be paid out.
    pub unclaimed_rewards: u64,

    /// Total amount of USDC tokens across all epochs that are issued, but yet to be paid out.
    pub unclaimed_usdc: u64,

    /// Destination account for slashed USDC tokens.
    pub slashing_destination_usdc_account: Pubkey,

    /// Destination account for slashed tokens.
    pub slashing_destination_token_account: Pubkey,

    /// Delay in seconds after halting a pool before slashing can occur. Minimum 86,400 seconds (1 day).
    pub slashing_delay_seconds: u64,
}

impl PoolOverview {
    /// Reserved padding space for future upgrades.
    pub const PADDING: usize = 1024;
}
