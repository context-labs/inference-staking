use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::error::ErrorCode;
use crate::state::{PoolOverview, RewardRecord};

#[derive(Accounts)]
pub struct CreateRewardRecord<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = pool_overview.reward_distribution_authorities.contains(authority.key)
            @ ErrorCode::InvalidRewardDistributionAuthority,
        constraint = pool_overview.is_epoch_finalizing @ ErrorCode::EpochMustBeFinalizing,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        init,
        seeds = [
            b"RewardRecord".as_ref(),
            &(pool_overview.completed_reward_epoch + 1).to_le_bytes()
        ],
        bump,
        payer = payer,
        space = 8 + RewardRecord::INIT_SPACE + RewardRecord::PADDING
    )]
    pub reward_record: Box<Account<'info, RewardRecord>>,

    #[account(
        seeds = [b"GlobalTokenRewardVault".as_ref()],
        bump,
    )]
    pub reward_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        seeds = [b"GlobalUsdcEarningsVault".as_ref()],
        bump,
    )]
    pub usdc_token_account: Box<Account<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateRewardRecordArgs {
    pub merkle_roots: Vec<[u8; 32]>,
    pub total_rewards: u64,
    pub total_usdc_payout: u64,
}

/// Instruction to setup a RewardRecord.
pub fn handler(ctx: Context<CreateRewardRecord>, args: CreateRewardRecordArgs) -> Result<()> {
    let CreateRewardRecordArgs {
        merkle_roots,
        total_rewards,
        total_usdc_payout,
    } = args;

    // If no merkle roots are provided then reward amounts must be zero.
    if merkle_roots.is_empty() {
        require_eq!(total_rewards, 0);
        require_eq!(total_usdc_payout, 0);
    }

    let pool_overview = &mut ctx.accounts.pool_overview;
    let reward_record = &mut ctx.accounts.reward_record;

    reward_record.version = RewardRecord::VERSION;
    reward_record.epoch = pool_overview.completed_reward_epoch.checked_add(1).unwrap();
    reward_record.merkle_roots = merkle_roots;
    reward_record.total_rewards = total_rewards;
    reward_record.total_usdc_payout = total_usdc_payout;
    reward_record.epoch_finalized_at = Clock::get()?.unix_timestamp;

    // Update unclaimed rewards to include new epoch rewards.
    pool_overview.unclaimed_rewards = pool_overview
        .unclaimed_rewards
        .checked_add(total_rewards)
        .unwrap();
    pool_overview.unclaimed_usdc = pool_overview
        .unclaimed_usdc
        .checked_add(total_usdc_payout)
        .unwrap();
    pool_overview.completed_reward_epoch = reward_record.epoch;

    // Reset the epoch finalizing state once a reward record is created.
    pool_overview.is_epoch_finalizing = false;

    // Ensure that there's sufficient reward tokens funded.
    let reward_token_account = &ctx.accounts.reward_token_account;
    require_gte!(
        reward_token_account.amount,
        pool_overview.unclaimed_rewards,
        ErrorCode::InsufficientRewards
    );

    // Ensure that there's sufficient USDC tokens funded.
    let usdc_token_account = &ctx.accounts.usdc_token_account;
    require_gte!(
        usdc_token_account.amount,
        pool_overview.unclaimed_usdc,
        ErrorCode::InsufficientUsdc
    );

    Ok(())
}
