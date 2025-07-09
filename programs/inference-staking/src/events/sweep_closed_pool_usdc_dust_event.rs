use anchor_lang::prelude::*;

#[event]
pub struct SweepClosedPoolUsdcDustEvent {
    // Operator pool that had its USDC dust swept
    pub operator_pool: Pubkey,

    // Admin who swept the dust
    pub admin: Pubkey,

    // Amount of USDC dust swept
    pub usdc_amount_swept: u64,
}
