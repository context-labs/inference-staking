use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;

use crate::error::ErrorCode;
use crate::events::UnstakeEvent;
use crate::state::{OperatorPool, PoolOverview, StakingRecord};

#[derive(Accounts)]
pub struct Unstake<'info> {
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

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

/// Instruction to initiate unstaking of tokens from an OperatorPool.
pub fn handler(ctx: Context<Unstake>, shares_amount: u64) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let pool_overview = &ctx.accounts.pool_overview;
    let operator_staking_record = &ctx.accounts.operator_staking_record;

    let is_operator_unstaking =
        operator_staking_record.key() == ctx.accounts.owner_staking_record.key();

    // Store the staking record key before creating mutable borrow
    let staking_record_key = ctx.accounts.owner_staking_record.key();
    let owner_key = ctx.accounts.owner.key();

    // Check that operator is not unstaking when pool is halted.
    require!(
        !is_operator_unstaking || operator_pool.halted_at_timestamp.is_none(),
        ErrorCode::UnstakingNotAllowed
    );

    // Check that global withdrawal has not been halted.
    require!(
        !pool_overview.is_withdrawal_halted,
        ErrorCode::WithdrawalsHalted
    );

    // Check that all rewards have been claimed for pool closure conditions.
    operator_pool.check_unclaimed_rewards(pool_overview.completed_reward_epoch)?;

    let staking_record = &mut ctx.accounts.owner_staking_record;
    require_gte!(staking_record.shares, shares_amount);

    // Calculate number of tokens to unstake, and update token and share amounts on OperatorPool.
    let tokens_unstaked = operator_pool.unstake_tokens(staking_record, shares_amount)?;

    // Determine the correct unstake cooldown period on whether it's a delegator
    // or operator.
    let unstake_delay_seconds = if is_operator_unstaking {
        pool_overview.operator_unstake_delay_seconds
    } else {
        pool_overview.delegator_unstake_delay_seconds
    };

    // Update owner's StakingRecord with new unstake details.
    staking_record.shares = staking_record.shares.checked_sub(shares_amount).unwrap();
    staking_record.tokens_unstake_amount = staking_record
        .tokens_unstake_amount
        .checked_add(tokens_unstaked)
        .unwrap();
    staking_record.unstake_at_timestamp = Clock::get()?
        .unix_timestamp
        .checked_add(unstake_delay_seconds.try_into().unwrap())
        .unwrap();

    // If Operator is unstaking and:
    // 1. Pool is closed, check that the unstake is after the final epoch. This is to prevent
    //    a pool becoming fully unstaked before its final reward epoch distribution.
    // 2. Pool is not closed, check that they still maintain min. token stake of pool after.
    if is_operator_unstaking {
        match operator_pool.closed_at {
            Some(closed_at) => {
                let completed_reward_epoch = pool_overview.completed_reward_epoch;
                require_gte!(
                    completed_reward_epoch.checked_add(1).unwrap(),
                    closed_at,
                    ErrorCode::FinalUnstakeEpochInvalid
                );
            }
            None => {
                let min_operator_token_stake = pool_overview.min_operator_token_stake;
                let operator_stake =
                    operator_pool.calc_tokens_for_share_amount(staking_record.shares);
                require_gte!(
                    operator_stake,
                    min_operator_token_stake,
                    ErrorCode::MinOperatorTokenStakeNotMet
                );
            }
        }
    }

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(UnstakeEvent {
        instruction_index,
        operator_pool: operator_pool.key(),
        staking_record: staking_record_key,
        owner: owner_key,
        is_operator: is_operator_unstaking,
        token_amount: tokens_unstaked,
        shares_amount,
        unstake_at_timestamp: staking_record.unstake_at_timestamp,
    });

    Ok(())
}
