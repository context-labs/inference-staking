use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    events::SlashStakeEvent,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct SlashStake<'info> {
    pub admin: Signer<'info>,
    #[account(
      seeds = [b"PoolOverview".as_ref()],
      bump = pool_overview.bump,
      // Admin must sign to invoke this instruction
      has_one = admin,
    )]
    pub pool_overview: Account<'info, PoolOverview>,
    #[account(
      mut,
      seeds = [&operator_pool.pool_id.to_le_bytes(), b"OperatorPool".as_ref()],
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
      seeds = [operator_pool.key().as_ref(), b"StakedToken".as_ref()],
      bump,
    )]
    pub staked_token_account: Account<'info, TokenAccount>,

    // No owner validation needed as the admin is a signer
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct SlashStakeArgs {
    /// Amount of shares to slash from Operator's stake.
    pub shares_amount: u64,
}

/// Instruction to slash and Operator's stake.
pub fn handler(ctx: Context<SlashStake>, args: SlashStakeArgs) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let operator_staking_record = &mut ctx.accounts.operator_staking_record;

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
