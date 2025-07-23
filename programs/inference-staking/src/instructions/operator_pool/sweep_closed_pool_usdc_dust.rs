use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;
use anchor_spl::token::{self, CloseAccount, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
    events::SweepClosedPoolUsdcDustEvent,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview},
};

#[derive(Accounts)]
pub struct SweepClosedPoolUsdcDust<'info> {
    /// The admin of the OperatorPool, who is authorized to sweep the vault.
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        // The pool must be owned by the admin invoking this.
        has_one = admin,
        // The pool must be in a closed state.
        constraint = operator_pool.closed_at_epoch.is_some() @ ErrorCode::PoolClosedEpochInvalid,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
        mut,
        // This is the vault we are sweeping.
        seeds = [OperatorPool::POOL_DELEGATOR_USDC_EARNINGS_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
    )]
    pub operator_usdc_vault: Account<'info, TokenAccount>,

    /// The admin's USDC token account to receive the swept funds.
    #[account(
        mut,
        constraint = admin_usdc_account.mint == USDC_MINT_PUBKEY,
    )]
    pub admin_usdc_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

pub fn handler(ctx: Context<SweepClosedPoolUsdcDust>) -> Result<()> {
    let operator_pool = &ctx.accounts.operator_pool;
    let operator_usdc_vault = &mut ctx.accounts.operator_usdc_vault;
    let pool_overview = &ctx.accounts.pool_overview;

    // Ensure the pool is closed and therefore no more rewards are possible
    require!(
        pool_overview.completed_reward_epoch > operator_pool.closed_at_epoch.unwrap(),
        ErrorCode::PoolClosedEpochInvalid
    );

    // Verify that the pool is completely empty (no delegators remain)
    require!(operator_pool.is_empty(), ErrorCode::PoolIsNotEmpty);

    // Transfer all remaining "dust" from the pool's vault to the admin.
    let remaining_balance = operator_usdc_vault.amount;
    if remaining_balance > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: operator_usdc_vault.to_account_info(),
                    to: ctx.accounts.admin_usdc_account.to_account_info(),
                    authority: operator_pool.to_account_info(),
                },
                // Use the same seeds that give the pool authority over its vault
                &[operator_pool_signer_seeds!(operator_pool)],
            ),
            remaining_balance,
        )?;
    }

    // Close the now-empty vault account and return the rent to the admin.
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: operator_usdc_vault.to_account_info(),
            destination: ctx.accounts.admin.to_account_info(),
            authority: operator_pool.to_account_info(),
        },
        &[operator_pool_signer_seeds!(operator_pool)],
    ))?;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(SweepClosedPoolUsdcDustEvent {
        instruction_index,
        operator_pool: operator_pool.key(),
        epoch: ctx.accounts.pool_overview.completed_reward_epoch + 1,
        admin: ctx.accounts.admin.key(),
        usdc_amount_swept: remaining_balance,
    });

    Ok(())
}
