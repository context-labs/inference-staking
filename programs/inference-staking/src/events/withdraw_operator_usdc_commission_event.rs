use anchor_lang::prelude::*;

#[event]
pub struct WithdrawOperatorUsdcCommissionEvent {
    // Operator pool that USDC commission was withdrawn from
    pub operator_pool: Pubkey,

    // Admin who withdrew the commission
    pub admin: Pubkey,

    // Destination account where USDC commission was sent
    pub destination: Pubkey,

    // Amount of USDC commission withdrawn
    pub usdc_amount_withdrawn: u64,
}
