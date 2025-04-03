use anchor_lang::prelude::*;

#[event]
pub struct CompleteAccrueRewardEvent {
    pub operator_pool: Pubkey,

    /// Total amount of remaining tokens staked in pool.
    pub total_staked_amount: u64,

    /// Total amount of remaining tokens being unstaked in the pool.
    pub total_unstaking: u64,
}
