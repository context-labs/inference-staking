use anchor_lang::prelude::*;

#[event]
pub struct SlashStakeEvent {
    // Operator pool where the stake was slashed
    pub operator_pool: Pubkey,

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
