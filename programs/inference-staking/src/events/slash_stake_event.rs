use anchor_lang::prelude::*;

#[event]
pub struct SlashStakeEvent {
    // Instruction index this event was emitted in
    pub instruction_index: u16,

    // Operator pool where the stake was slashed
    pub operator_pool: Pubkey,

    // Epoch this slash stake event instruction was executed for
    pub epoch: u64,

    // Operator staking record that was slashed
    pub operator_staking_record: Pubkey,

    // Authority that executed the slash
    pub authority: Pubkey,

    // Destination account for slashed tokens and reward commission
    pub destination: Pubkey,

    // Destination account for slashed USDC
    pub destination_usdc: Pubkey,

    // Amount of shares slashed
    pub shares_slashed: u64,

    // Amount of tokens slashed
    pub token_amount_slashed: u64,

    // Amount of USDC confiscated
    pub usdc_confiscated: u64,

    // Amount of reward commission confiscated
    pub reward_commission_confiscated: u64,

    // Amount of USDC commission confiscated
    pub usdc_commission_confiscated: u64,
}
