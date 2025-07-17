use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{
    constants::USDC_MINT_PUBKEY,
    error::ErrorCode,
    events::SlashStakeEvent,
    operator_pool_signer_seeds,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct SlashStake<'info> {
    pub authority: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
        constraint = pool_overview.slashing_authorities.contains(authority.key)
          @ ErrorCode::InvalidSlashingAuthority,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        mut,
        seeds = [OperatorPool::SEED, operator_pool.initial_pool_admin.as_ref()],
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
        seeds = [OperatorPool::POOL_STAKED_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
    )]
    pub staked_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [OperatorPool::POOL_DELEGATOR_USDC_EARNINGS_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
    )]
    pub pool_usdc_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [OperatorPool::POOL_REWARD_COMMISSION_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
    )]
    pub reward_fee_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [OperatorPool::POOL_USDC_COMMISSION_TOKEN_VAULT_SEED, operator_pool.key().as_ref()],
        bump,
    )]
    pub usdc_fee_token_account: Account<'info, TokenAccount>,

    // Destination for slashed tokens - must match pool_overview configuration
    #[account(
    mut,
    address = pool_overview.slashing_destination_token_account,
)]
    pub slashing_destination_token_account: Account<'info, TokenAccount>,

    // Destination for slashed USDC - must match pool_overview configuration
    #[account(
        mut,
        constraint = slashing_destination_usdc_account.mint == USDC_MINT_PUBKEY,
        address = pool_overview.slashing_destination_usdc_account,
    )]
    pub slashing_destination_usdc_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct SlashStakeArgs {
    /// Amount of shares to slash from Operator's stake.
    pub shares_amount: u64,
}

/// Instruction to slash an Operator's stake.
pub fn handler(ctx: Context<SlashStake>, args: SlashStakeArgs) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let operator_staking_record = &mut ctx.accounts.operator_staking_record;
    let pool_overview = &ctx.accounts.pool_overview;

    let shares_amount = args.shares_amount;
    require_gt!(shares_amount, 0, ErrorCode::InvalidAmount);

    // Ensure the pool is halted
    require!(
        operator_pool.halted_at_timestamp.is_some(),
        ErrorCode::OperatorPoolNotHalted
    );

    require_gte!(
        operator_staking_record.shares,
        shares_amount,
        ErrorCode::InvalidSlashSharesAmount
    );

    // Ensure the pool has been halted for the required delay period
    let halted_at = operator_pool.halted_at_timestamp.unwrap();
    let current_timestamp = Clock::get()?.unix_timestamp;
    let elapsed_seconds = current_timestamp.saturating_sub(halted_at);

    require!(
        elapsed_seconds >= pool_overview.slashing_delay_seconds as i64,
        ErrorCode::SlashingDelayNotMet
    );

    // Store initial values for event emission
    let operator_pool_key = operator_pool.key();
    let operator_staking_record_key = operator_staking_record.key();
    let authority_key = ctx.accounts.authority.key();

    // Slash tokens from operator pool, this will also settle any unsettled USDC
    let slashed_token_amount =
        operator_pool.slash_tokens(operator_staking_record, shares_amount)?;

    // Decrement shares on staking record
    operator_staking_record.shares = operator_staking_record
        .shares
        .checked_sub(shares_amount)
        .unwrap();

    // Confiscate any accrued USDC the operator may have
    let mut usdc_confiscated = 0;
    if operator_staking_record.accrued_usdc_earnings > 0 {
        let usdc_amount = operator_staking_record.accrued_usdc_earnings;

        require!(
            ctx.accounts.pool_usdc_vault.amount >= usdc_amount,
            ErrorCode::InsufficientPoolUsdcVaultBalance
        );

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_usdc_vault.to_account_info(),
                    to: ctx
                        .accounts
                        .slashing_destination_usdc_account
                        .to_account_info(),
                    authority: operator_pool.to_account_info(),
                },
                &[operator_pool_signer_seeds!(operator_pool)],
            ),
            usdc_amount,
        )?;

        usdc_confiscated = usdc_amount;
        // Reset accrued USDC earnings since we've confiscated all USDC earnings
        operator_staking_record.accrued_usdc_earnings = 0;
    }

    // Confiscate any reward commission tokens the operator may have
    let available_reward_commission = ctx.accounts.reward_fee_token_account.amount;
    if available_reward_commission > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_fee_token_account.to_account_info(),
                    to: ctx
                        .accounts
                        .slashing_destination_token_account
                        .to_account_info(),
                    authority: operator_pool.to_account_info(),
                },
                &[operator_pool_signer_seeds!(operator_pool)],
            ),
            available_reward_commission,
        )?;
    }

    // Confiscate any USDC commission fees the operator may have
    let available_usdc_commission = ctx.accounts.usdc_fee_token_account.amount;
    if available_usdc_commission > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.usdc_fee_token_account.to_account_info(),
                    to: ctx
                        .accounts
                        .slashing_destination_usdc_account
                        .to_account_info(),
                    authority: operator_pool.to_account_info(),
                },
                &[operator_pool_signer_seeds!(operator_pool)],
            ),
            available_usdc_commission,
        )?;
    }

    // Transfer slashed tokens to destination account
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.staked_token_account.to_account_info(),
                to: ctx
                    .accounts
                    .slashing_destination_token_account
                    .to_account_info(),
                authority: operator_pool.to_account_info(),
            },
            &[operator_pool_signer_seeds!(operator_pool)],
        ),
        slashed_token_amount,
    )?;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(SlashStakeEvent {
        instruction_index,
        operator_pool: operator_pool_key,
        operator_staking_record: operator_staking_record_key,
        authority: authority_key,
        destination: ctx.accounts.slashing_destination_token_account.key(),
        destination_usdc: ctx.accounts.slashing_destination_usdc_account.key(),
        shares_slashed: shares_amount,
        token_amount_slashed: slashed_token_amount,
        usdc_confiscated,
        reward_commission_confiscated: available_reward_commission,
        usdc_commission_confiscated: available_usdc_commission,
    });

    Ok(())
}
