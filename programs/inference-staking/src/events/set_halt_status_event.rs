use anchor_lang::prelude::*;

#[event]
pub struct SetHaltStatusEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool that had its halt status changed
    pub operator_pool: Pubkey,

    // Epoch this set halt status event instruction was executed for
    pub epoch: u64,

    // Whether the pool is now halted
    pub is_halted: bool,
}
