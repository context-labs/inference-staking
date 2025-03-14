use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct PoolOverview {
    /// Authority allowed to change settings on the acount.
    pub admin: Pubkey,

    /// Total number of pools created.
    pub total_pools: u64,

    /// List of signers authorized to halt OperatorPools.
    #[max_len(10)]
    pub halt_authorities: Vec<Pubkey>,

    /// Halts all withdrawal instructions when true. Used as a security backstop.
    pub is_withdrawal_halted: bool,

    /// If creation of OperatorPool is allowed.
    pub allow_pool_creation: bool,

    /// Min. % of total share in pool that the Operator must maintain. If value falls below this minimum, Operators
    /// would not be allowed to reduce their stake and no further delegations are allowed (unless pool is closed).
    pub min_operator_share_bps: u16,

    /// Delay for unstaking in seconds.
    pub unstake_delay_seconds: u64,

    /// Number of completed epochs.
    pub completed_reward_epoch: u64,

    /// Total amount of reward tokens across all epochs that are issued, but yet to be paid out.
    pub unclaimed_rewards: u64,
}
