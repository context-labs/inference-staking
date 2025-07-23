use anchor_lang::prelude::*;

#[event]
pub struct UnstakeEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool this unstake event instruction was executed for
    pub operator_pool: Pubkey,

    // Epoch this unstake event instruction was executed for
    pub epoch: u64,

    // Staking record that was unstaked from
    pub staking_record: Pubkey,

    // Owner of the staking record
    pub owner: Pubkey,

    // Whether the delegator is the operator
    pub is_operator: bool,

    // Amount of tokens being unstaked
    pub token_amount: u64,

    // Number of shares being unstaked
    pub shares_amount: u64,

    // Timestamp when the unstake can be claimed
    pub unstake_at_timestamp: i64,
}
