use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
    state::{OperatorPool, StakingRecord},
    PoolOverview,
};

#[derive(Accounts)]
pub struct CreateOperatorPool<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        seeds = [
            OperatorPool::SEED,
            admin.key().as_ref(),
        ],
        bump,
        payer = payer,
        space = 8 + OperatorPool::INIT_SPACE + OperatorPool::PADDING
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        init,
        seeds = [
            StakingRecord::SEED,
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
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
        has_one = mint,
        constraint = pool_overview.allow_pool_creation @ ErrorCode::PoolCreationDisabled,
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        init,
        seeds = [OperatorPool::POOL_STAKED_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = operator_pool
    )]
    pub staked_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [OperatorPool::POOL_REWARD_COMMISSION_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = operator_pool
    )]
    pub reward_fee_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [OperatorPool::POOL_USDC_COMMISSION_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = operator_pool
    )]
    pub usdc_fee_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [OperatorPool::POOL_DELEGATOR_USDC_EARNINGS_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = operator_pool
    )]
    pub operator_usdc_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = admin,
    )]
    pub admin_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = pool_overview.registration_fee_payout_wallet,
        constraint = registration_fee_payout_token_account.owner == pool_overview.registration_fee_payout_wallet @ ErrorCode::InvalidRegistrationFeePayoutDestination
    )]
    pub registration_fee_payout_token_account: Box<Account<'info, TokenAccount>>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        constraint = usdc_mint.key() == USDC_MINT_PUBKEY @ ErrorCode::InvalidUsdcMint
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateOperatorPoolArgs {
    pub auto_stake_fees: bool,
    pub reward_commission_rate_bps: u16,
    pub allow_delegation: bool,
    pub name: String,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub avatar_image_url: Option<String>,
    pub operator_auth_keys: Option<Vec<Pubkey>>,
    pub usdc_commission_rate_bps: u16,
}

/// Instruction to setup an OperatorPool.
pub fn handler(ctx: Context<CreateOperatorPool>, args: CreateOperatorPoolArgs) -> Result<()> {
    let CreateOperatorPoolArgs {
        auto_stake_fees,
        reward_commission_rate_bps,
        allow_delegation,
        name,
        description,
        website_url,
        avatar_image_url,
        operator_auth_keys,
        usdc_commission_rate_bps,
    } = args;

    OperatorPool::validate_commission_rate(reward_commission_rate_bps)?;
    OperatorPool::validate_commission_rate(usdc_commission_rate_bps)?;

    let pool_overview = &mut ctx.accounts.pool_overview;

    // Transfer registration fee if it's set above zero.
    let registration_fee = pool_overview.operator_pool_registration_fee;
    if registration_fee > 0 {
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.admin_token_account.to_account_info(),
                    to: ctx
                        .accounts
                        .registration_fee_payout_token_account
                        .to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            registration_fee,
        )?;
    }

    pool_overview.total_pools = pool_overview.total_pools.checked_add(1).unwrap();

    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.version = OperatorPool::VERSION;
    operator_pool.bump = ctx.bumps.operator_pool;
    operator_pool.name = name;
    operator_pool.description = description;
    operator_pool.website_url = website_url;
    operator_pool.avatar_image_url = avatar_image_url;
    operator_pool.admin = ctx.accounts.admin.key();
    operator_pool.initial_pool_admin = ctx.accounts.admin.key();
    operator_pool.operator_staking_record = ctx.accounts.staking_record.key();
    operator_pool.auto_stake_fees = auto_stake_fees;
    operator_pool.reward_commission_rate_bps = reward_commission_rate_bps;
    operator_pool.allow_delegation = allow_delegation;
    operator_pool.usdc_commission_rate_bps = usdc_commission_rate_bps;
    operator_pool.cumulative_usdc_per_share = 0;
    operator_pool.accrued_delegator_usdc = 0;

    if let Some(operator_auth_keys) = operator_auth_keys {
        OperatorPool::validate_operator_auth_keys(&operator_auth_keys)?;
        operator_pool.operator_auth_keys = operator_auth_keys;
    }

    // We derive the "current epoch" like this and use this to initialize the operator
    // pool's joined_at and reward_last_claimed_epoch fields to avoid the edge cases
    // where an operator joins during reward finalization for an epoch and is not included
    // in the reward distribution. This would leave them "stranded" in the epoch they joined,
    // which is why we bump their epoch to the next one here if the epoch is currently
    // finalizing. For this to work, we must always initiate the epoch finalization process
    // first, before calculating the reward distribution.
    let current_epoch = match pool_overview.is_epoch_finalizing {
        true => pool_overview.completed_reward_epoch.checked_add(1).unwrap(),
        false => pool_overview.completed_reward_epoch,
    };

    operator_pool.joined_at_epoch = current_epoch;
    operator_pool.reward_last_claimed_epoch = current_epoch;

    let staking_record = &mut ctx.accounts.staking_record;
    staking_record.owner = ctx.accounts.admin.key();
    staking_record.operator_pool = operator_pool.key();
    staking_record.last_settled_usdc_per_share = 0;
    staking_record.accrued_usdc_earnings = 0;

    operator_pool.validate_pool_profile_fields()?;

    Ok(())
}
