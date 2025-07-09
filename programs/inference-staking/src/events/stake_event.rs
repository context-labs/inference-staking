use anchor_lang::prelude::*;

#[event]
pub struct StakeEvent {
    // Operator pool this stake event instruction was executed for
    pub operator_pool: Pubkey,

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
