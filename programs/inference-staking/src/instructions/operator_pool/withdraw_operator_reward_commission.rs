use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    error::ErrorCode,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct WithdrawOperatorRewardCommission<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        seeds = [b"OperatorPool".as_ref(), operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
        // Admin must sign to invoke this instruction
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
        mut,
        seeds = [b"PoolRewardCommissionTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub reward_fee_token_account: Account<'info, TokenAccount>,

    /// Destination for the commission.
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

/// Send all fees collected in the OperatorPool's Fee TokenAccount to the destination.
/// Must be signed by the OperatorPool's admin.
pub fn handler(ctx: Context<WithdrawOperatorRewardCommission>) -> Result<()> {
    require!(
        !ctx.accounts.pool_overview.is_withdrawal_halted,
        ErrorCode::WithdrawalsHalted
    );
    require!(
        !ctx.accounts.operator_pool.is_halted,
        ErrorCode::OperatorPoolHalted
    );

    // Transfer all fees from Fee TokenAccount to selected destination TokenAccount.
    let fees_amount = ctx.accounts.reward_fee_token_account.amount;
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_fee_token_account.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.operator_pool.to_account_info(),
            },
            &[operator_pool_signer_seeds!(ctx.accounts.operator_pool)],
        ),
        fees_amount,
    )?;

    Ok(())
}
