use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
    events::SlashStakeEvent,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct SlashStake<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = pool_overview.slashing_authorities.contains(authority.key)
          @ ErrorCode::InvalidSlashingAuthority,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        mut,
        seeds = [b"OperatorPool".as_ref(), operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
        mut,
        address = operator_pool.operator_staking_record,
    )]
    pub operator_staking_record: Account<'info, StakingRecord>,

    #[account(
        mut,
        seeds = [b"PoolStakedTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub staked_token_account: Account<'info, TokenAccount>,

    // No owner validation needed as the admin is a signer
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"PoolDelegatorUsdcEarningsVault", operator_pool.key().as_ref()],
        bump,
    )]
    pub pool_usdc_vault: Account<'info, TokenAccount>,

    // No owner validation needed as the admin is a signer
    #[account(
        mut,
        constraint = destination_usdc_account.mint == USDC_MINT_PUBKEY,
    )]
    pub destination_usdc_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct SlashStakeArgs {
    /// Amount of shares to slash from Operator's stake.
    pub shares_amount: u64,
}

/// Instruction to slash an Operator's stake.
pub fn handler(ctx: Context<SlashStake>, args: SlashStakeArgs) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let operator_staking_record = &mut ctx.accounts.operator_staking_record;

    // First settle USDC to get clean accounting
    operator_pool.settle_usdc_earnings(operator_staking_record)?;

    // Confiscate any accrued USDC the operator may have
    if operator_staking_record.available_usdc_earnings > 0 {
        let usdc_amount = operator_staking_record.available_usdc_earnings;

        require!(
            ctx.accounts.pool_usdc_vault.amount >= usdc_amount,
            ErrorCode::InsufficientPoolUsdcVaultBalance
        );

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_usdc_vault.to_account_info(),
                    to: ctx.accounts.destination_usdc_account.to_account_info(),
                    authority: operator_pool.to_account_info(),
                },
                &[operator_pool_signer_seeds!(operator_pool)],
            ),
            usdc_amount,
        )?;

        operator_staking_record.available_usdc_earnings = 0;
    }

    let token_amount = operator_pool.calc_tokens_for_share_amount(args.shares_amount);

    // Transfer slashed tokens to destination account
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.staked_token_account.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: operator_pool.to_account_info(),
            },
            &[operator_pool_signer_seeds!(operator_pool)],
        ),
        token_amount,
    )?;

    // Decrement Operator's StakingRecord
    operator_staking_record.shares = operator_staking_record
        .shares
        .checked_sub(args.shares_amount)
        .unwrap();

    // Decrement OperatorPool stake and shares
    operator_pool.total_shares = operator_pool
        .total_shares
        .checked_sub(args.shares_amount)
        .unwrap();
    operator_pool.total_staked_amount = operator_pool
        .total_staked_amount
        .checked_sub(token_amount)
        .unwrap();

    emit!(SlashStakeEvent {
        staking_record: operator_staking_record.key(),
        operator_pool: operator_pool.key(),
        slashed_amount: token_amount,
        total_staked_amount: operator_pool.total_staked_amount,
        total_unstaking: operator_pool.total_unstaking
    });

    Ok(())
}
