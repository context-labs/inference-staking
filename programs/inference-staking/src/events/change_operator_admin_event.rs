use anchor_lang::prelude::*;

#[event]
pub struct ChangeOperatorAdminEvent {
    // Operator pool that had its admin changed
    pub operator_pool: Pubkey,

    // Previous admin of the operator pool
    pub old_admin: Pubkey,

    // New admin of the operator pool
    pub new_admin: Pubkey,
}
