use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Stake<'info> {
    pub owner: Signer<'info>,
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

/// Instruction to stake tokens to an OperatorPool.
pub fn handler(ctx: Context<Stake>, token_amount: u64) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_staking_record = &ctx.accounts.operator_staking_record;

    // Check that delegation is enabled or operator is staking.
    let is_operator_staking =
        operator_staking_record.key() == ctx.accounts.owner_staking_record.key();
    require!(
        operator_pool.allow_delegation || is_operator_staking,
        ErrorCode::StakingNotAllowed
    );

    // Check that pool is not closed or halted.
    require!(
        operator_pool.closed_at.is_none() && !operator_pool.is_halted,
        ErrorCode::StakingNotAllowed
    );

    // Check that all issued rewards have been claimed.
    require_gte!(
        operator_pool.reward_last_claimed_epoch,
        pool_overview.completed_reward_epoch,
    );

    let owner_token_account = &ctx.accounts.owner_token_account;
    require_gte!(owner_token_account.amount, token_amount);

    // Calculate number of shares to create, and update token and share amounts on OperatorPool.
    let shares_created = operator_pool.stake_tokens(token_amount);

    // Add shares created to owner's StakingRecord.
    let staking_record = &mut ctx.accounts.owner_staking_record;
    staking_record.shares = staking_record.shares.checked_add(shares_created).unwrap();

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.owner_token_account.to_account_info(),
                to: ctx.accounts.staked_token_account.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Check that operator still maintains min. share percentage of pool.
    let min_operator_share_bps = pool_overview.min_operator_share_bps;
    let min_operator_shares = operator_pool.calc_min_operator_shares(min_operator_share_bps);
    let operator_shares = if is_operator_staking {
        staking_record.shares
    } else {
        operator_staking_record.shares
    };
    require_gte!(
        operator_shares,
        min_operator_shares,
        ErrorCode::MinOperatorSharesNotMet
    );

    Ok(())
}
