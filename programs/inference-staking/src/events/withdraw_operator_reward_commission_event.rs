use anchor_lang::prelude::*;

#[event]
pub struct WithdrawOperatorRewardCommissionEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool that reward commission was withdrawn from
    pub operator_pool: Pubkey,

    // Epoch this withdraw operator reward commission event instruction was executed for
    pub epoch: u64,

    // Admin who withdrew the commission
    pub admin: Pubkey,

    // Destination account where reward commission was sent
    pub destination: Pubkey,

    // Amount of reward commission withdrawn
    pub reward_amount_withdrawn: u64,
}
