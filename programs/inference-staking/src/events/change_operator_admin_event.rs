use anchor_lang::prelude::*;

#[event]
pub struct ChangeOperatorAdminEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool that had its admin changed
    pub operator_pool: Pubkey,

    // Epoch this change operator admin event instruction was executed for
    pub epoch: u64,

    // Previous admin of the operator pool
    pub old_admin: Pubkey,

    // New admin of the operator pool
    pub new_admin: Pubkey,
}
