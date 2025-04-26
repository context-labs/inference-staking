use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
    constants,
    error::ErrorCode,
    state::{OperatorPool, StakingRecord},
    PoolOverview,
};

#[derive(Accounts)]
pub struct CreateOperatorPool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub admin: Signer<'info>,

    #[account(
        init,
        seeds = [
            b"OperatorPool".as_ref(),
            &(pool_overview.total_pools + 1).to_le_bytes()
        ],
        bump,
        payer = payer,
        space = 8 + OperatorPool::INIT_SPACE
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        init,
        seeds = [
            b"StakingRecord".as_ref(),
            operator_pool.key().as_ref(),
            admin.key().as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + StakingRecord::INIT_SPACE
    )]
    pub staking_record: Box<Account<'info, StakingRecord>>,

    #[account(
        mut,
        seeds = [b"PoolOverview".as_ref()],
        bump = pool_overview.bump,
        has_one = mint,
        constraint = pool_overview.allow_pool_creation @ ErrorCode::PoolCreationDisabled,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        init,
        seeds = [b"StakedToken".as_ref(), operator_pool.key().as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = operator_pool
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [b"FeeToken".as_ref(), operator_pool.key().as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = operator_pool
    )]
    pub fee_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        token::mint = constants::USDC_MINT_PUBKEY,
    )]
    pub usdc_payout_destination: Account<'info, TokenAccount>,

    pub mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateOperatorPoolArgs {
    pub auto_stake_fees: bool,
    pub commission_rate_bps: u16,
    pub allow_delegation: bool,
}

/// Instruction to setup an OperatorPool.
pub fn handler(ctx: Context<CreateOperatorPool>, args: CreateOperatorPoolArgs) -> Result<()> {
    let CreateOperatorPoolArgs {
        auto_stake_fees,
        commission_rate_bps,
        allow_delegation,
    } = args;

    require_gte!(10000, commission_rate_bps);

    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.total_pools = pool_overview.total_pools.checked_add(1).unwrap();

    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.pool_id = pool_overview.total_pools;
    operator_pool.bump = ctx.bumps.operator_pool;
    operator_pool.admin = ctx.accounts.admin.key();
    operator_pool.operator_staking_record = ctx.accounts.staking_record.key();
    operator_pool.auto_stake_fees = auto_stake_fees;
    operator_pool.commission_rate_bps = commission_rate_bps;
    operator_pool.allow_delegation = allow_delegation;
    operator_pool.usdc_payout_destination = ctx.accounts.usdc_payout_destination.key();

    // The reward_last_claimed_epoch is initialized conditionally like this to avoid
    // the edge case where an operator joins during reward finalization for an epoch,
    // and is not included in the reward distribution. This would leave them "stranded"
    // in the epoch they joined, which is why we bump their epoch to the next one here
    // if the epoch is currently finalizing. For this to work, we must always initiate
    // the epoch finalization process first, before calculating the reward distribution.
    match pool_overview.is_epoch_finalizing {
        true => {
            operator_pool.reward_last_claimed_epoch =
                pool_overview.completed_reward_epoch.checked_add(1).unwrap();
        }
        false => {
            operator_pool.reward_last_claimed_epoch = pool_overview.completed_reward_epoch;
        }
    }

    let staking_record = &mut ctx.accounts.staking_record;
    staking_record.owner = ctx.accounts.admin.key();
    staking_record.operator_pool = operator_pool.key();

    Ok(())
}
