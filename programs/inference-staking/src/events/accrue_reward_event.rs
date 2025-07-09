use anchor_lang::prelude::*;

#[event]
pub struct AccrueRewardEvent {
    // Operator pool this accrued reward event instruction was executed for
    pub operator_pool: Pubkey,

    // Epoch this accrued reward event instruction was executed for
    pub epoch: u64,

    // Total reward token payout transferred
    pub total_reward_token_payout: u64,

    // Total accrued USDC earnings transferred
    pub total_accrued_usdc_earnings: u64,

    // Delegator token rewards share
    pub delegator_token_rewards: u64,

    // Operator token commission share
    pub operator_token_commission: u64,

    // Delegator USDC share
    pub delegator_usdc_earnings: u64,

    // Operator USDC share
    pub operator_usdc_commission: u64,
}
