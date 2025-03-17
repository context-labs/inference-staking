use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::PoolOverview;

#[derive(Accounts)]
pub struct CreatePoolOverview<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [b"PoolOverview".as_ref()],
        bump,
        payer = payer,
        space = 8 + PoolOverview::INIT_SPACE
    )]
    pub pool_overview: Box<Account<'info, PoolOverview>>,
    #[account(
        init,
        seeds = [b"RewardToken".as_ref()],
        bump,
        payer = payer,
        token::mint = mint,
        token::authority = pool_overview
    )]
    pub reward_token_account: Box<Account<'info, TokenAccount>>,
    pub mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Instruction to setup a PoolOverview singleton. To be called after initial program deployment.
pub fn handler(ctx: Context<CreatePoolOverview>) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.admin = ctx.accounts.admin.key();
    pool_overview.mint = ctx.accounts.mint.key();

    Ok(())
}
