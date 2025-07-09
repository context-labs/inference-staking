use anchor_lang::prelude::*;

#[event]
pub struct AccrueRewardEvent {
    // Operator pool this accrued reward event instruction was executed for
    pub operator_pool: Pubkey,

    // Epoch this accrued reward event instruction was executed for
    pub epoch: u64,

    // Total reward token payout transferred
    pub total_rewards_transferred: u64,

    // Total accrued USDC earnings transferred
    pub total_usdc_transferred: u64,

    // Delegator token rewards share
    pub delegator_rewards: u64,

    // Operator token commission share
    pub operator_reward_commission: u64,

    // Delegator USDC share
    pub delegator_usdc_earnings: u64,

    // Operator USDC share
    pub operator_usdc_commission: u64,
}
