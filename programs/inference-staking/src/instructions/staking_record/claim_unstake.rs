use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::ErrorCode;
use crate::events::ClaimUnstakeEvent;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct ClaimUnstake<'info> {
    /// CHECK: No signer enforced on owner account as ix is permissionless.
    pub owner: UncheckedAccount<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        mut,
        seeds = [&operator_pool.pool_id.to_le_bytes(), b"OperatorPool".as_ref()],
        bump = operator_pool.bump,
        has_one = operator_staking_record,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        mut,
        seeds = [
          operator_pool.key().as_ref(),
          owner.key().as_ref(),
          b"StakingRecord".as_ref()
        ],
        bump,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub owner_staking_record: Box<Account<'info, StakingRecord>>,

    #[account(
        address = operator_pool.operator_staking_record,
    )]
    pub operator_staking_record: Box<Account<'info, StakingRecord>>,

    #[account(
        mut,
        token::mint = staked_token_account.mint,
        token::authority = owner
    )]
    pub owner_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [operator_pool.key().as_ref(), b"StakedToken".as_ref()],
        bump,
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

/// Instruction to claim tokens after unstaking delay.
pub fn handler(ctx: Context<ClaimUnstake>) -> Result<()> {
    let operator_pool = &ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_staking_record = &ctx.accounts.operator_staking_record;

    let is_operator_claiming =
        operator_staking_record.key() == ctx.accounts.owner_staking_record.key();

    // Check that operator is not claiming when pool is halted.
    require!(
        !is_operator_claiming || !operator_pool.is_halted,
        ErrorCode::UnstakingNotAllowed
    );

    // Check that global withdrawal has not been halted.
    require!(
        !pool_overview.is_withdrawal_halted,
        ErrorCode::WithdrawalsHalted
    );

    // Check that all rewards have been claimed, unless pool is closed and all rewards
    // up to (but excluding) epoch in which pool was closed at have been claimed.
    if pool_overview.completed_reward_epoch > operator_pool.reward_last_claimed_epoch {
        if operator_pool.closed_at.is_some() {
            let closed_at = operator_pool.closed_at.unwrap();
            require_gte!(
                operator_pool.reward_last_claimed_epoch,
                closed_at - 1,
                ErrorCode::UnclaimedRewards
            );
        } else {
            return err!(ErrorCode::UnclaimedRewards);
        }
    }

    let staking_record = &mut ctx.accounts.owner_staking_record;
    let tokens_unstake_amount = staking_record.tokens_unstake_amount;

    // Check that unstake_at_timestamp has elapsed.
    require_gte!(
        Clock::get()?.unix_timestamp,
        staking_record.unstake_at_timestamp,
        ErrorCode::PendingDelay
    );
    require_gt!(tokens_unstake_amount, 0, ErrorCode::NoTokensToClaim);

    // Transfer claimed tokens to owner.
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.staked_token_account.to_account_info(),
                to: ctx.accounts.owner_token_account.to_account_info(),
                authority: ctx.accounts.operator_pool.to_account_info(),
            },
            &[&[
                &operator_pool.pool_id.to_le_bytes(),
                b"OperatorPool".as_ref(),
                &[operator_pool.bump],
            ]],
        ),
        tokens_unstake_amount,
    )?;

    // Update total_unstaking on OperatorPool for claim.
    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.total_unstaking = operator_pool
        .total_unstaking
        .checked_sub(tokens_unstake_amount)
        .unwrap();

    // Reset owner's StakingRecord.
    staking_record.tokens_unstake_amount = 0;
    staking_record.unstake_at_timestamp = 0;

    // If Operator is claiming and pool is not closed, check that they still
    // maintain min. share percentage of pool after.
    if is_operator_claiming && operator_pool.closed_at.is_none() {
        let min_operator_share_bps = pool_overview.min_operator_share_bps;
        let min_operator_shares = operator_pool.calc_min_operator_shares(min_operator_share_bps);
        require_gte!(
            staking_record.shares,
            min_operator_shares,
            ErrorCode::MinOperatorSharesNotMet
        );
    }

    emit!(ClaimUnstakeEvent {
        staking_record: staking_record.key(),
        operator_pool: operator_pool.key(),
        unstake_amount: tokens_unstake_amount,
        total_staked_amount: operator_pool.total_staked_amount,
        total_unstaking: operator_pool.total_unstaking
    });

    Ok(())
}
