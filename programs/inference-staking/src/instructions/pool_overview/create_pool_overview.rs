use anchor_lang::prelude::*;

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
    pub system_program: Program<'info, System>,
}

/// Instruction to setup a PoolOverview singleton. To be called after initial program deployment.
pub fn handler(ctx: Context<CreatePoolOverview>) -> Result<()> {
    let pool_overview = &mut ctx.accounts.pool_overview;
    pool_overview.admin = ctx.accounts.admin.key();

    Ok(())
}
