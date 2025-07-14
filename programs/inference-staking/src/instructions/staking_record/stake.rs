use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;

use crate::error::ErrorCode;
use crate::events::StakeEvent;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct Stake<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = !pool_overview.is_staking_halted @ ErrorCode::StakingHalted,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        mut,
        seeds = [b"OperatorPool".as_ref(), operator_pool.initial_pool_admin.as_ref()],
        bump = operator_pool.bump,
        has_one = operator_staking_record,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        mut,
        seeds = [
            b"StakingRecord".as_ref(),
            operator_pool.key().as_ref(),
            owner.key().as_ref()
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
        seeds = [b"PoolStakedTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
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
        operator_pool.closed_at_epoch.is_none(),
        ErrorCode::ClosedPool
    );
    require!(
        operator_pool.halted_at_timestamp.is_none(),
        ErrorCode::OperatorPoolHalted
    );

    // Check that all issued rewards have been claimed.
    require_gte!(
        operator_pool.reward_last_claimed_epoch,
        pool_overview.completed_reward_epoch,
        ErrorCode::UnclaimedRewards
    );

    let owner_token_account = &ctx.accounts.owner_token_account;
    require_gte!(owner_token_account.amount, token_amount);

    // Calculate number of shares to create, and update token and share amounts on OperatorPool.
    let shares_created =
        operator_pool.stake_tokens(&mut ctx.accounts.owner_staking_record, token_amount)?;

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

    // Check that operator still maintains min. token stake. This prevents delegators
    // from staking to a pool where an operator is in violation of the min. token stake.
    let operator_shares = if is_operator_staking {
        staking_record.shares
    } else {
        operator_staking_record.shares
    };

    let operator_stake = operator_pool.calc_tokens_for_share_amount(operator_shares);
    let min_operator_token_stake = pool_overview.min_operator_token_stake;
    require_gte!(
        operator_stake,
        min_operator_token_stake,
        ErrorCode::MinOperatorTokenStakeNotMet
    );

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(StakeEvent {
        instruction_index,
        operator_pool: operator_pool.key(),
        staking_record: ctx.accounts.owner_staking_record.key(),
        owner: ctx.accounts.owner.key(),
        is_operator: is_operator_staking,
        token_amount,
        shares_amount: shares_created,
    });

    Ok(())
}
