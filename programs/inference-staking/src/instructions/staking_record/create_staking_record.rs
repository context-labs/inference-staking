use anchor_lang::prelude::*;

use crate::state::{OperatorPool, StakingRecord};

#[derive(Accounts)]
pub struct CreateStakingRecord<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub owner: Signer<'info>,

    #[account(
        seeds = [&operator_pool.pool_id.to_le_bytes(), b"OperatorPool".as_ref()],
        bump,
    )]
    pub operator_pool: Box<Account<'info, OperatorPool>>,

    #[account(
        init,
        seeds = [
          operator_pool.key().as_ref(),
          owner.key().as_ref(),
          b"StakingRecord".as_ref()
        ],
        bump,
        payer = payer,
        space = 8 + StakingRecord::INIT_SPACE
    )]
    pub staking_record: Box<Account<'info, StakingRecord>>,

    pub system_program: Program<'info, System>,
}

/// Instruction to setup a StakingRecord.
pub fn handler(ctx: Context<CreateStakingRecord>) -> Result<()> {
    let staking_record = &mut ctx.accounts.staking_record;
    staking_record.owner = ctx.accounts.owner.key();
    staking_record.operator_pool = ctx.accounts.operator_pool.key();

    Ok(())
}
