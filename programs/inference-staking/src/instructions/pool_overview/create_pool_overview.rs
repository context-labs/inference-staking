use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::{constants, error::ErrorCode, PoolOverview};

#[derive(Accounts)]
pub struct CreatePoolOverview<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub program_admin: Signer<'info>,

    /// CHECK: This is the wallet address that receives the operator pool registration fees.
    pub registration_fee_payout_wallet: UncheckedAccount<'info>,

    /// CHECK: This is the wallet address that receives the slashed tokens.
    pub slashing_destination_token_account: UncheckedAccount<'info>,

    /// CHECK: This is the wallet address that receives the slashed USDC.
    pub slashing_destination_usdc_account: UncheckedAccount<'info>,

    #[account(
        init,
        seeds = [b"PoolOverview".as_ref()],
        bump,
        payer = payer,
        space = 8 + PoolOverview::INIT_SPACE + PoolOverview::PADDING
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,

    #[account(
        init,
        seeds = [b"GlobalTokenRewardVault".as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = pool_overview
    )]
    pub reward_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        seeds = [b"GlobalUsdcEarningsVault".as_ref()],
        bump,
        payer = payer,
        token::mint = usdc_mint,
        token::authority = pool_overview
    )]
    pub usdc_token_account: Box<Account<'info, TokenAccount>>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        constraint = usdc_mint.key() == constants::USDC_MINT_PUBKEY @ ErrorCode::InvalidUsdcMint
    )]
    pub usdc_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

/// Instruction to setup a PoolOverview singleton. To be called after initial program deployment.
pub fn handler(ctx: Context<CreatePoolOverview>) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;

    pool_overview.bump = ctx.bumps.pool_overview;
    pool_overview.mint = ctx.accounts.mint.key();
    pool_overview.program_admin = ctx.accounts.program_admin.key();
    pool_overview.registration_fee_payout_wallet =
        ctx.accounts.registration_fee_payout_wallet.key();
    pool_overview.slashing_destination_token_account =
        ctx.accounts.slashing_destination_token_account.key();
    pool_overview.slashing_destination_usdc_account =
        ctx.accounts.slashing_destination_usdc_account.key();

    Ok(())
}
