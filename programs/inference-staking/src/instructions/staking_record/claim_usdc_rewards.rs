use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct ClaimUsdcRewards<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        seeds = [b"OperatorPool".as_ref(), operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
        mut,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub staking_record: Account<'info, StakingRecord>,

    #[account(
        mut,
        seeds = [b"OperatorPoolUSDCVault", operator_pool.key().as_ref()],
        bump,
    )]
    pub pool_usdc_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_usdc_account.owner == owner.key(),
        constraint = owner_usdc_account.mint == USDC_MINT_PUBKEY,
    )]
    pub owner_usdc_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimUsdcRewards>) -> Result<()> {
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_pool = &ctx.accounts.operator_pool;
    let staking_record = &mut ctx.accounts.staking_record;

    // Ensure withdrawals are enabled
    require!(
        !pool_overview.is_withdrawal_halted,
        ErrorCode::WithdrawalsHalted
    );

    // Ensure all token rewards have been claimed
    // This is not strictly required, but is a nice program-wide invariant
    // to force pool reward claims before any other stake/reward actions occur
    require_gte!(
        operator_pool.reward_last_claimed_epoch,
        pool_overview.completed_reward_epoch,
        ErrorCode::UnclaimedRewards
    );

    // First settle any unsettled rewards
    operator_pool.settle_usdc_rewards(staking_record)?;

    // Check claimable amount
    let claimable = staking_record.accrued_usdc;
    require!(claimable > 0, ErrorCode::NoUsdcToClaim);
    require!(
        ctx.accounts.pool_usdc_vault.amount >= claimable,
        ErrorCode::InsufficientPoolUsdcVaultBalance
    );

    // Transfer USDC
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_usdc_vault.to_account_info(),
                to: ctx.accounts.owner_usdc_account.to_account_info(),
                authority: operator_pool.to_account_info(),
            },
            &[operator_pool_signer_seeds!(operator_pool)],
        ),
        claimable,
    )?;

    // Reset accrued balance
    staking_record.accrued_usdc = 0;

    emit!(ClaimUsdcRewardsEvent {
        staking_record: staking_record.key(),
        operator_pool: operator_pool.key(),
        amount_claimed: claimable,
        total_shares: staking_record.shares,
    });

    Ok(())
}

#[event]
pub struct ClaimUsdcRewardsEvent {
    pub staking_record: Pubkey,
    pub operator_pool: Pubkey,
    pub amount_claimed: u64,
    pub total_shares: u64,
}
