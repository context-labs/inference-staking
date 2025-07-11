use anchor_lang::prelude::*;

#[event]
pub struct ClaimUnstakeEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool this claim unstake event instruction was executed for
    pub operator_pool: Pubkey,

    // Staking record that tokens were claimed from
    pub staking_record: Pubkey,

    // Owner of the staking record
    pub owner: Pubkey,

    // Whether the claimer is the operator
    pub is_operator: bool,

    // Amount of tokens claimed
    pub token_amount: u64,
}
