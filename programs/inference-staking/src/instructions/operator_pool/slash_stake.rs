use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
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

    #[account(
        mut,
        seeds = [b"PoolUsdcCommissionTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub usdc_fee_token_account: Account<'info, TokenAccount>,

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

    // Slash tokens from operator pool, this will also settle any unsettled USDC
    let slashed_token_amount =
        operator_pool.slash_tokens(operator_staking_record, args.shares_amount)?;

    // Decrement shares on staking record
    operator_staking_record.shares = operator_staking_record
        .shares
        .checked_sub(args.shares_amount)
        .unwrap();

    // Confiscate any accrued USDC the operator may have
    if operator_staking_record.accrued_usdc_earnings > 0 {
        let usdc_amount = operator_staking_record.accrued_usdc_earnings;

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

        // Reset accrued USDC earnings since we've confiscated all USDC earnings
        operator_staking_record.accrued_usdc_earnings = 0;
    }

    // Confiscate any USDC commission fees the operator may have
    let usdc_commission_amount = operator_pool.accrued_usdc_commission;
    if usdc_commission_amount > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.usdc_fee_token_account.to_account_info(),
                    to: ctx.accounts.destination_usdc_account.to_account_info(),
                    authority: operator_pool.to_account_info(),
                },
                &[operator_pool_signer_seeds!(operator_pool)],
            ),
            usdc_commission_amount,
        )?;

        // Reset accrued USDC commission since we've confiscated all USDC commission fees
        operator_pool.accrued_usdc_commission = 0;
    }

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
        slashed_token_amount,
    )?;

    Ok(())
}
