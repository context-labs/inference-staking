use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    error::ErrorCode,
    events::WithdrawOperatorUsdcCommissionEvent,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct WithdrawOperatorUsdcCommission<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        seeds = [OperatorPool::SEED, operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
        // Admin must sign to invoke this instruction
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
        mut,
        seeds = [OperatorPool::POOL_USDC_COMMISSION_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
    )]
    pub usdc_fee_token_account: Account<'info, TokenAccount>,

    /// Destination for the USDC commission.
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

/// Send all USDC fees collected in the OperatorPool's USDC Fee TokenAccount to the destination.
/// Must be signed by the OperatorPool's admin.
pub fn handler(ctx: Context<WithdrawOperatorUsdcCommission>) -> Result<()> {
    require!(
        !ctx.accounts.pool_overview.is_withdrawal_halted,
        ErrorCode::WithdrawalsHalted
    );
    // Check that operator is allowed to withdraw USDC if pool is not halted.
    require!(
        ctx.accounts.operator_pool.halted_at_timestamp.is_none(),
        ErrorCode::OperatorPoolHalted
    );

    // Transfer all USDC fees from USDC Fee TokenAccount to selected destination TokenAccount.
    let fees_amount = ctx.accounts.usdc_fee_token_account.amount;
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.usdc_fee_token_account.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.operator_pool.to_account_info(),
            },
            &[operator_pool_signer_seeds!(ctx.accounts.operator_pool)],
        ),
        fees_amount,
    )?;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(WithdrawOperatorUsdcCommissionEvent {
        instruction_index,
        operator_pool: ctx.accounts.operator_pool.key(),
        admin: ctx.accounts.admin.key(),
        destination: ctx.accounts.destination.key(),
        usdc_amount_withdrawn: fees_amount,
    });

    Ok(())
}
