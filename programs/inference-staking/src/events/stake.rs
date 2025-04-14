use anchor_lang::prelude::*;

#[event]
pub struct StakeEvent {
    pub staking_record: Pubkey,
    pub operator_pool: Pubkey,

    /// Amount being of tokens being delegated to pool.
    pub stake_amount: u64,

    /// Total amount of remaining tokens staked in pool.
    pub total_staked_amount: u64,

    /// Total amount of remaining tokens being unstaked in the pool.
    pub total_unstaking: u64,
}
