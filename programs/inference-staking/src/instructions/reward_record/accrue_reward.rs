use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::USDC_PRECISION_FACTOR;
use crate::error::ErrorCode;
use crate::events::AccrueRewardEvent;
use crate::state::{OperatorPool, PoolOverview, RewardRecord, StakingRecord};

#[derive(Accounts)]
pub struct AccrueReward<'info> {
    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        constraint = !pool_overview.is_accrue_reward_halted @ ErrorCode::AccrueRewardHalted,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        seeds = [
            b"RewardRecord".as_ref(),
            &reward_record.epoch.to_le_bytes()
        ],
        bump,
        constraint = reward_record.epoch == operator_pool.reward_last_claimed_epoch + 1
    )]
    pub reward_record: Box<Account<'info, RewardRecord>>,

    #[account(
        mut,
        seeds = [
            b"OperatorPool".as_ref(),
            operator_pool.initial_pool_admin.as_ref(),
        ],
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
        seeds = [b"GlobalTokenRewardVault".as_ref()],
        bump,
    )]
    pub reward_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"GlobalUsdcEarningsVault".as_ref()],
        bump,
    )]
    pub usdc_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"PoolStakedTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"PoolRewardCommissionTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub reward_fee_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"PoolUsdcCommissionTokenVault".as_ref(), operator_pool.key().as_ref()],
        bump,
    )]
    pub usdc_fee_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"PoolDelegatorUsdcEarningsVault", operator_pool.key().as_ref()],
        bump,
    )]
    pub pool_usdc_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AccrueRewardArgs {
    pub merkle_index: u8,
    pub proof: Vec<[u8; 32]>,
    pub proof_path: Vec<bool>,
    pub reward_amount: u64,
    pub usdc_amount: u64,
}

/// Instruction to accrue reward issued for an OperatorPool.
pub fn handler(ctx: Context<AccrueReward>, args: AccrueRewardArgs) -> Result<()> {
    let AccrueRewardArgs {
        merkle_index,
        proof,
        proof_path,
        reward_amount,
        usdc_amount,
    } = args;

    let reward_record = &ctx.accounts.reward_record;
    let operator_pool = &mut ctx.accounts.operator_pool;
    reward_record.verify_proof(
        merkle_index,
        operator_pool.key(),
        proof,
        proof_path,
        reward_amount,
        usdc_amount,
    )?;

    let pool_overview = &ctx.accounts.pool_overview;
    let operator_staking_record: &mut Box<Account<'_, StakingRecord>> =
        &mut ctx.accounts.operator_staking_record;

    if let Some(closed_at) = operator_pool.closed_at {
        require_gte!(closed_at, reward_record.epoch, ErrorCode::ClosedPool);
    }

    let is_most_recent_epoch = pool_overview.completed_reward_epoch == reward_record.epoch;
    let is_pool_closure_epoch = operator_pool.closed_at.is_some()
        && operator_pool.closed_at.unwrap() == reward_record.epoch;

    // Rewards should be transferred if it's the most recent epoch or if this is the epoch
    // in which the pool was closed.
    let should_transfer_rewards = is_most_recent_epoch || is_pool_closure_epoch;

    let mut total_rewards_transferred = 0;
    let mut total_usdc_transferred = 0;

    let reward_commission = u64::try_from(
        u128::from(reward_amount)
            .checked_mul(operator_pool.reward_commission_rate_bps.into())
            .unwrap()
            .checked_div(10_000)
            .unwrap(),
    )
    .unwrap();
    let delegator_rewards = reward_amount.checked_sub(reward_commission).unwrap();

    // Calculate USDC split
    let usdc_commission = u64::try_from(
        u128::from(usdc_amount)
            .checked_mul(operator_pool.usdc_commission_rate_bps.into())
            .unwrap()
            .checked_div(10_000)
            .unwrap(),
    )
    .unwrap();

    let usdc_delegator_amount = usdc_amount.checked_sub(usdc_commission).unwrap();

    // Always accumulate rewards for correct accounting regardless if fund transfers occur or not
    operator_pool.accrued_rewards = operator_pool
        .accrued_rewards
        .checked_add(delegator_rewards)
        .unwrap();
    operator_pool.accrued_reward_commission = operator_pool
        .accrued_reward_commission
        .checked_add(reward_commission)
        .unwrap();
    operator_pool.accrued_usdc_commission = operator_pool
        .accrued_usdc_commission
        .checked_add(usdc_commission)
        .unwrap();
    operator_pool.accrued_delegator_usdc = operator_pool
        .accrued_delegator_usdc
        .checked_add(usdc_delegator_amount)
        .unwrap();

    operator_pool.reward_last_claimed_epoch = operator_pool
        .reward_last_claimed_epoch
        .checked_add(1)
        .unwrap();

    if should_transfer_rewards {
        // Use the accumulated balances for transfers and updates
        let total_operator_usdc_to_transfer = operator_pool.accrued_usdc_commission;
        let total_delegator_usdc_to_transfer = operator_pool.accrued_delegator_usdc;

        operator_pool.total_staked_amount = operator_pool
            .total_staked_amount
            .checked_add(operator_pool.accrued_rewards)
            .unwrap();
        let mut amount_to_staked_account = operator_pool.accrued_rewards;

        if operator_pool.auto_stake_fees {
            let accrued_commission = operator_pool.accrued_reward_commission;
            amount_to_staked_account = amount_to_staked_account
                .checked_add(accrued_commission)
                .unwrap();

            // Stake tokens and increment shares owned by Operator.
            let new_shares =
                operator_pool.stake_tokens(operator_staking_record, accrued_commission)?;
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
                        to: ctx.accounts.reward_fee_token_account.to_account_info(),
                        authority: ctx.accounts.pool_overview.to_account_info(),
                    },
                    &[&[b"PoolOverview".as_ref(), &[pool_overview.bump]]],
                ),
                operator_pool.accrued_reward_commission,
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

        // Transfer operator's total accrued USDC commission directly
        if total_operator_usdc_to_transfer > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.usdc_token_account.to_account_info(),
                        to: ctx.accounts.usdc_fee_token_account.to_account_info(),
                        authority: ctx.accounts.pool_overview.to_account_info(),
                    },
                    &[&[b"PoolOverview".as_ref(), &[pool_overview.bump]]],
                ),
                total_operator_usdc_to_transfer,
            )?;
        }

        // Transfer the total accrued delegator portion to the pool vault
        if total_delegator_usdc_to_transfer > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.usdc_token_account.to_account_info(),
                        to: ctx.accounts.pool_usdc_vault.to_account_info(),
                        authority: ctx.accounts.pool_overview.to_account_info(),
                    },
                    &[&[b"PoolOverview".as_ref(), &[pool_overview.bump]]],
                ),
                total_delegator_usdc_to_transfer,
            )?;
        }

        // Update cumulative USDC per share index using the total transferred amount
        if operator_pool.total_shares > 0 && total_delegator_usdc_to_transfer > 0 {
            let usdc_per_share_increase = (total_delegator_usdc_to_transfer as u128)
                .checked_mul(USDC_PRECISION_FACTOR)
                .unwrap()
                .checked_div(operator_pool.total_shares as u128)
                .unwrap();

            operator_pool.cumulative_usdc_per_share = operator_pool
                .cumulative_usdc_per_share
                .checked_add(usdc_per_share_increase)
                .unwrap();
        }

        // Update USDC commission rate if new rate is pending
        if let Some(new_rate) = operator_pool.new_usdc_commission_rate_bps {
            operator_pool.usdc_commission_rate_bps = new_rate;
            operator_pool.new_usdc_commission_rate_bps = None;
        }

        // Update commission rates if necessary
        operator_pool.update_reward_commission_rate();
        operator_pool.update_usdc_commission_rate();

        // Update unclaimed token rewards
        let pool_overview = &mut ctx.accounts.pool_overview;
        pool_overview.unclaimed_rewards = pool_overview
            .unclaimed_rewards
            .checked_sub(operator_pool.accrued_rewards)
            .unwrap()
            .checked_sub(operator_pool.accrued_reward_commission)
            .unwrap();

        // Update unclaimed USDC rewards
        total_usdc_transferred = total_operator_usdc_to_transfer
            .checked_add(total_delegator_usdc_to_transfer)
            .unwrap();

        pool_overview.unclaimed_usdc = pool_overview
            .unclaimed_usdc
            .checked_sub(total_usdc_transferred)
            .unwrap();

        total_rewards_transferred = operator_pool
            .accrued_rewards
            .checked_add(operator_pool.accrued_reward_commission)
            .unwrap();

        // Reset ALL accumulators to zero after successful processing
        operator_pool.accrued_rewards = 0;
        operator_pool.accrued_reward_commission = 0;
        operator_pool.accrued_usdc_commission = 0;
        operator_pool.accrued_delegator_usdc = 0;
    }

    emit!(AccrueRewardEvent {
        operator_pool: operator_pool.key(),
        epoch: reward_record.epoch,
        total_rewards_transferred,
        total_usdc_transferred,
        delegator_rewards,
        operator_reward_commission: reward_commission,
        delegator_usdc_earnings: usdc_delegator_amount,
        operator_usdc_commission: usdc_commission,
    });

    Ok(())
}
