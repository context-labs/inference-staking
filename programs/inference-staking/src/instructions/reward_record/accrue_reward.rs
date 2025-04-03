use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::ErrorCode;
use crate::events::CompleteAccrueRewardEvent;
use crate::state::{OperatorPool, PoolOverview, RewardRecord, StakingRecord};

#[derive(Accounts)]
pub struct AccrueReward<'info> {
    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
    #[account(
        seeds = [
          &reward_record.epoch.to_le_bytes(),
          b"RewardRecord".as_ref()
        ],
        bump,
        constraint = reward_record.epoch == operator_pool.reward_last_claimed_epoch + 1
    )]
    pub reward_record: Box<Account<'info, RewardRecord>>,
    #[account(
        mut,
        seeds = [&operator_pool.pool_id.to_le_bytes(), b"OperatorPool".as_ref()],
        bump = operator_pool.bump,
        has_one = operator_staking_record,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,
    #[account(
        mut,
        address = operator_pool.operator_staking_record,
    )]
    pub operator_staking_record: Box<Account<'info, StakingRecord>>,
    #[account(
        mut,
        seeds = [b"RewardToken".as_ref()],
        bump,
    )]
    pub reward_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [operator_pool.key().as_ref(), b"StakedToken".as_ref()],
        bump,
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [operator_pool.key().as_ref(), b"FeeToken".as_ref()],
        bump,
    )]
    pub fee_token_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
}

/// Instruction to accrue reward issued for an OperatorPool.
pub fn handler(
    ctx: Context<AccrueReward>,
    merkle_index: u8,
    proof: Vec<[u8; 32]>,
    proof_path: Vec<bool>,
    reward_amount: u64,
) -> Result<()> {
    let reward_record = &ctx.accounts.reward_record;
    let operator_pool = &mut ctx.accounts.operator_pool;
    reward_record.verify_proof(
        merkle_index,
        operator_pool.key(),
        proof,
        proof_path,
        reward_amount,
    )?;

    let pool_overview = &ctx.accounts.pool_overview;
    let operator_staking_record: &mut Box<Account<'_, StakingRecord>> =
        &mut ctx.accounts.operator_staking_record;

    let is_most_recent = pool_overview.completed_reward_epoch == reward_record.epoch;

    if operator_pool.closed_at.is_some() {
        let closed_at = operator_pool.closed_at.unwrap();
        require_gt!(closed_at, reward_record.epoch, ErrorCode::ClosedPool);
    }

    let commission = u64::try_from(
        u128::from(reward_amount)
            .checked_mul(operator_pool.commission_rate_bps.into())
            .unwrap()
            .checked_div(10000)
            .unwrap(),
    )
    .unwrap();
    let delegator_rewards = reward_amount.checked_sub(commission).unwrap();

    operator_pool.accrued_rewards = operator_pool
        .accrued_rewards
        .checked_add(delegator_rewards)
        .unwrap();
    operator_pool.accrued_commission = operator_pool
        .accrued_commission
        .checked_add(commission)
        .unwrap();
    operator_pool.reward_last_claimed_epoch = operator_pool
        .reward_last_claimed_epoch
        .checked_add(1)
        .unwrap();

    if is_most_recent {
        operator_pool.total_staked_amount = operator_pool
            .total_staked_amount
            .checked_add(operator_pool.accrued_rewards)
            .unwrap();
        let mut amount_to_staked_account = operator_pool.accrued_rewards;

        if operator_pool.auto_stake_fees {
            let accrued_commission = operator_pool.accrued_commission;
            amount_to_staked_account = amount_to_staked_account
                .checked_add(accrued_commission)
                .unwrap();

            // Stake tokens and increment shares owned by Operator.
            let new_shares = operator_pool.stake_tokens(accrued_commission);
            operator_staking_record.shares = operator_staking_record
                .shares
                .checked_add(new_shares)
                .unwrap();
        } else {
            // Transfer commission to fee account directly since auto-stake is not enabled.
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.reward_token_account.to_account_info(),
                        to: ctx.accounts.fee_token_account.to_account_info(),
                        authority: ctx.accounts.pool_overview.to_account_info(),
                    },
                    &[&[b"PoolOverview".as_ref(), &[pool_overview.bump]]],
                ),
                operator_pool.accrued_commission,
            )?;
        }

        // Transfer rewards (including commission if auto-stake is enabled) to staked token account.
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_token_account.to_account_info(),
                    to: ctx.accounts.staked_token_account.to_account_info(),
                    authority: ctx.accounts.pool_overview.to_account_info(),
                },
                &[&[b"PoolOverview".as_ref(), &[pool_overview.bump]]],
            ),
            amount_to_staked_account,
        )?;

        // Subtract claimed rewards and commission from unclaimed amount.
        let pool_overview = &mut ctx.accounts.pool_overview;
        pool_overview.unclaimed_rewards = pool_overview
            .unclaimed_rewards
            .checked_sub(operator_pool.accrued_rewards)
            .unwrap()
            .checked_sub(operator_pool.accrued_commission)
            .unwrap();

        // Update commission rate if new rate is set.
        operator_pool.update_commission_rate();

        // Reset accrued rewards and commission.
        operator_pool.accrued_rewards = 0;
        operator_pool.accrued_commission = 0;

        emit!(CompleteAccrueRewardEvent {
            operator_pool: operator_pool.key(),
            total_staked_amount: operator_pool.total_staked_amount,
            total_unstaking: operator_pool.total_unstaking
        });
    }

    Ok(())
}
