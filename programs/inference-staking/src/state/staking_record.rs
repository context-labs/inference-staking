use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct StakingRecord {
    /// Owner of the StakingRecord.
    pub owner: Pubkey,

    /// OperatorPool that stake is delegated to.
    pub operator_pool: Pubkey,

    /// Amount of shares owned.
    pub shares: u64,

    /// Timestamp after which unstaked tokens can be claimed.
    pub unstake_at_timestamp: i64,

    /// Amount of tokens to be unstaked
    pub unstake_amount: i64,
}
