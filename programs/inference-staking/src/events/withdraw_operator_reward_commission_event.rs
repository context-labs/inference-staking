use anchor_lang::prelude::*;

#[event]
pub struct WithdrawOperatorRewardCommissionEvent {
    // Operator pool that reward commission was withdrawn from
    pub operator_pool: Pubkey,

    // Admin who withdrew the commission
    pub admin: Pubkey,

    // Destination account where reward commission was sent
    pub destination: Pubkey,

    // Amount of reward commission withdrawn
    pub reward_amount_withdrawn: u64,
}
