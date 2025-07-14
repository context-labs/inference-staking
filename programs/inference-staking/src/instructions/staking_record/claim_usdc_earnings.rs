use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
    events::ClaimUsdcEarningsEvent,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct ClaimUsdcEarnings<'info> {
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
        seeds = [b"PoolDelegatorUsdcEarningsVault", operator_pool.key().as_ref()],
        bump,
    )]
    pub pool_usdc_vault: Account<'info, TokenAccount>,

    /// Destination account for the USDC earnings. Must be a USDC token account.
    #[account(
        mut,
        constraint = destination.mint == USDC_MINT_PUBKEY @ ErrorCode::InvalidUsdcMint,
    )]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

pub fn handler(ctx: Context<ClaimUsdcEarnings>) -> Result<()> {
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_pool = &ctx.accounts.operator_pool;
    let staking_record = &mut ctx.accounts.staking_record;

    let is_operator_claiming = operator_pool.operator_staking_record.key() == staking_record.key();

    // Store keys before any mutations
    let operator_pool_key = operator_pool.key();
    let staking_record_key = staking_record.key();
    let owner_key = ctx.accounts.owner.key();

    // Check that operator is not claiming when pool is halted.
    require!(
        !is_operator_claiming || operator_pool.halted_at_timestamp.is_none(),
        ErrorCode::OperatorPoolHalted
    );

    // Check that global withdrawal has not been halted.
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
    operator_pool.settle_usdc_earnings(staking_record)?;

    // Check claimable amount
    let claimable = staking_record.accrued_usdc_earnings;
    require!(claimable > 0, ErrorCode::NoUsdcEarningsToClaim);
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
                to: ctx.accounts.destination.to_account_info(),
                authority: operator_pool.to_account_info(),
            },
            &[operator_pool_signer_seeds!(operator_pool)],
        ),
        claimable,
    )?;

    // Reset available USDC balance
    staking_record.accrued_usdc_earnings = 0;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(ClaimUsdcEarningsEvent {
        instruction_index,
        operator_pool: operator_pool_key,
        staking_record: staking_record_key,
        owner: owner_key,
        is_operator: is_operator_claiming,
        destination: ctx.accounts.destination.key(),
        usdc_amount: claimable,
    });

    Ok(())
}
