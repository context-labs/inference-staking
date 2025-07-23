use anchor_lang::prelude::*;

#[event]
pub struct ClaimUsdcEarningsEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool this claim USDC earnings event instruction was executed for
    pub operator_pool: Pubkey,

    // Epoch this claim USDC earnings event instruction was executed for
    pub epoch: u64,

    // Staking record that USDC earnings were claimed from
    pub staking_record: Pubkey,

    // Owner of the staking record
    pub owner: Pubkey,

    // Whether the claimer is the operator
    pub is_operator: bool,

    // Destination account where USDC earnings were sent
    pub destination: Pubkey,

    // Amount of USDC claimed
    pub usdc_amount: u64,
}
