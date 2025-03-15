use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{
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
          &(pool_overview.total_pools + 1).to_le_bytes(),
          b"OperatorPool".as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + OperatorPool::INIT_SPACE
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,
    #[account(
        init,
        seeds = [
          operator_pool.key().as_ref(),
          admin.key().as_ref(),
          b"StakingRecord".as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + StakingRecord::INIT_SPACE
    )]
    pub staking_record: Box<Account<'info, StakingRecord>>,
    #[account(
        mut,
        has_one = mint,
        constraint = pool_overview.allow_pool_creation,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
    #[account(
        init,
        seeds = [operator_pool.key().as_ref(), b"StakedToken".as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = operator_pool
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        seeds = [operator_pool.key().as_ref(), b"FeeToken".as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = operator_pool
    )]
    pub fee_token_account: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Instruction to setup an OperatorPool.
pub fn handler(
    ctx: Context<CreateOperatorPool>,
    auto_stake_fees: bool,
    commission_rate_bps: u16,
    allow_delegation: bool,
) -> Result<()> {
    require_gte!(10000, commission_rate_bps);

    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.total_pools = pool_overview.total_pools.checked_add(1).unwrap();

    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.pool_id = pool_overview.total_pools;
    operator_pool.admin = ctx.accounts.admin.key();
    operator_pool.operator_staking_record = ctx.accounts.staking_record.key();
    operator_pool.auto_stake_fees = auto_stake_fees;
    operator_pool.commission_rate_bps = commission_rate_bps;
    operator_pool.allow_delegation = allow_delegation;

    let staking_record = &mut ctx.accounts.staking_record;
    staking_record.owner = ctx.accounts.admin.key();
    staking_record.operator_pool = operator_pool.key();

    Ok(())
}
