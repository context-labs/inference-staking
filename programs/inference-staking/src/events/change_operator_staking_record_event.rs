use anchor_lang::prelude::*;

#[event]
pub struct ChangeOperatorStakingRecordEvent {
    // Operator pool that had its staking record changed
    pub operator_pool: Pubkey,

    // Admin who authorized the change
    pub admin: Pubkey,

    // Previous operator staking record
    pub old_staking_record: Pubkey,

    // New operator staking record
    pub new_staking_record: Pubkey,
}
