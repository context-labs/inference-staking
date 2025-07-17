use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;

use crate::{
    error::ErrorCode, events::ChangeOperatorAdminEvent, state::OperatorPool, PoolOverview,
};

#[derive(Accounts)]
pub struct ChangeOperatorAdmin<'info> {
    pub admin: Signer<'info>,

    pub new_admin: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
        constraint = !pool_overview.is_epoch_finalizing @ ErrorCode::EpochMustNotBeFinalizing,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        mut,
        seeds = [
                      OperatorPool::SEED,
          operator_pool.initial_pool_admin.as_ref(),
        ],
        bump = operator_pool.bump,
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

pub fn handler(ctx: Context<ChangeOperatorAdmin>) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    let old_admin = operator_pool.admin;
    let new_admin = ctx.accounts.new_admin.key();

    operator_pool.admin = new_admin;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(ChangeOperatorAdminEvent {
        instruction_index,
        operator_pool: operator_pool.key(),
        old_admin,
        new_admin,
    });

    Ok(())
}
