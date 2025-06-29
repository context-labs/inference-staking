use anchor_lang::prelude::*;

#[event]
pub struct CompleteClaimUsdcEarningsEvent {
    pub staking_record: Pubkey,
    pub operator_pool: Pubkey,

    /// Total amount of USDC claimed and withdrawn.
    pub amount_claimed: u64,

    /// Total amount of shares remaining in the staking record.
    pub total_shares: u64,
}
