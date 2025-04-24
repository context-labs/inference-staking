use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::StakingRecord};

#[derive(Accounts)]
pub struct CloseStakingRecord<'info> {
    /// Account to receive the reclaimed rent from StakingRecord
    /// CHECK: not needed as owner is checked
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,

    pub owner: Signer<'info>,

    #[account(
      mut,
      close = receiver,
      seeds = [staking_record.operator_pool.as_ref(), owner.key().as_ref(), b"StakingRecord".as_ref()],
      bump,
      has_one = owner,
    )]
    pub staking_record: Account<'info, StakingRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseStakingRecord>) -> Result<()> {
    // Assert the StakingRecord is empty
    require!(
        ctx.accounts.staking_record.shares == 0,
        ErrorCode::AccountNotEmpty
    );
    require!(
        ctx.accounts.staking_record.tokens_unstake_amount == 0,
        ErrorCode::AccountNotEmpty
    );
    Ok(())
}
