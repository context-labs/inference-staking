use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct StakingRecord {
    /// Version of the StakingRecord account.
    pub version: u8,

    /// Owner of the StakingRecord.
    pub owner: Pubkey,

    /// OperatorPool that stake is delegated to.
    pub operator_pool: Pubkey,

    /// Amount of shares owned.
    pub shares: u64,

    /// Timestamp after which unstaked tokens can be claimed.
    pub unstake_at_timestamp: i64,

    /// Amount of tokens to be unstaked
    pub tokens_unstake_amount: u64,

    /// USDC per share value at last settlement
    pub last_settled_usdc_per_share: u128,

    /// Accrued USDC rewards available to claim
    pub accrued_usdc_earnings: u64,
}

impl StakingRecord {
    /// Version of the StakingRecord account.
    pub const VERSION: u8 = 1;

    /// PDA seed for StakingRecord account.
    pub const SEED: &'static [u8] = b"StakingRecord";

    /// Reserved padding space for future upgrades.
    pub const PADDING: usize = 256;
}
