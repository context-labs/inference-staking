use anchor_lang::prelude::*;

#[event]
pub struct ChangeOperatorStakingRecordEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool that had its staking record changed
    pub operator_pool: Pubkey,

    // Epoch this change operator staking record event instruction was executed for
    pub epoch: u64,

    // Admin who authorized the change
    pub admin: Pubkey,

    // Previous operator staking record
    pub old_staking_record: Pubkey,

    // New operator staking record
    pub new_staking_record: Pubkey,
}
