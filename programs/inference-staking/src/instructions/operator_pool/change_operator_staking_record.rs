use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;

use crate::{
    error::ErrorCode,
    events::ChangeOperatorStakingRecordEvent,
    state::{OperatorPool, PoolOverview, StakingRecord},
};

#[derive(Accounts)]
pub struct ChangeOperatorStakingRecord<'info> {
    /// Admin of the OperatorPool
    pub admin: Signer<'info>,

    /// Owner of the StakingRecord that will become the new OperatorPool StakingRecord
    pub owner: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
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

    #[account(
        address = operator_pool.operator_staking_record,
        has_one = operator_pool,
    )]
    pub operator_staking_record: Account<'info, StakingRecord>,

    #[account(
        seeds = [StakingRecord::SEED, operator_pool.key().as_ref(), owner.key().as_ref()],
        bump,
        has_one = owner,
        has_one = operator_pool,
    )]
    pub new_staking_record: Account<'info, StakingRecord>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

/// This instruction provides an emergency option for an operator to change their staking record,
/// in the event that the key controlling their original staking owner wallet is compromised,
/// and withdraw the stake from the compromised staking record. Without this option, operators would
/// be unable to withdraw their stake because it would move them below the minimum operator share
/// requirement.
pub fn handler(ctx: Context<ChangeOperatorStakingRecord>) -> Result<()> {
    let min_operator_token_stake = ctx.accounts.pool_overview.min_operator_token_stake;
    let operator_stake = ctx
        .accounts
        .operator_pool
        .calc_tokens_for_share_amount(ctx.accounts.new_staking_record.shares);
    require_gte!(
        operator_stake,
        min_operator_token_stake,
        ErrorCode::MinOperatorTokenStakeNotMet
    );

    let operator_pool = &mut ctx.accounts.operator_pool;
    let old_staking_record = operator_pool.operator_staking_record;
    let new_staking_record = ctx.accounts.new_staking_record.key();

    operator_pool.operator_staking_record = new_staking_record;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(ChangeOperatorStakingRecordEvent {
        instruction_index,
        operator_pool: operator_pool.key(),
        admin: ctx.accounts.admin.key(),
        old_staking_record,
        new_staking_record,
    });

    Ok(())
}
