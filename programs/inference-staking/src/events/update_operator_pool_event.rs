use anchor_lang::prelude::*;

#[event]
pub struct UpdateOperatorPoolEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool that was updated
    pub operator_pool: Pubkey,

    // Epoch this update operator pool event instruction was executed for
    pub epoch: u64,
}
