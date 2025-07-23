use anchor_lang::prelude::*;

#[event]
pub struct StakeEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool this stake event instruction was executed for
    pub operator_pool: Pubkey,

    // Epoch this stake event instruction was executed for
    pub epoch: u64,

    // Staking record that was staked to
    pub staking_record: Pubkey,

    // Owner of the staking record
    pub owner: Pubkey,

    // Whether the staker is the operator
    pub is_operator: bool,

    // Amount of tokens staked
    pub token_amount: u64,

    // Number of shares created from the stake
    pub shares_amount: u64,
}
