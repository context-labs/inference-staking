use anchor_lang::prelude::*;

#[event]
pub struct CancelUnstakeEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool this cancel unstake event instruction was executed for
    pub operator_pool: Pubkey,

    // Epoch this cancel unstake event instruction was executed for
    pub epoch: u64,

    // Staking record that unstaking was cancelled for
    pub staking_record: Pubkey,

    // Owner of the staking record
    pub owner: Pubkey,

    // Whether the canceller is the operator
    pub is_operator: bool,

    // Amount of tokens that were cancelled from unstaking
    pub token_amount: u64,

    // Number of shares created from the cancelled unstake
    pub shares_amount: u64,
}
