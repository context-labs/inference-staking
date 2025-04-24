use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::{PoolOverview, RewardRecord};

#[derive(Accounts)]
pub struct ModifyRewardRecord<'info> {
    pub authority: Signer<'info>,
    #[account(
      seeds = [b"PoolOverview"],
      bump = pool_overview.bump,
      constraint = pool_overview.reward_distribution_authorities.contains(authority.key) 
          @ ErrorCode::InvalidAuthority,
    )]
    pub pool_overview: Account<'info, PoolOverview>,
    #[account(
      mut,
      seeds = [&reward_record.epoch.to_le_bytes(), b"RewardRecord"],
      bump,
    )]
    pub reward_record: Account<'info, RewardRecord>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct ModifyRewardRecordArgs {
    pub merkle_roots: Vec<[u8; 32]>,
}

/// Instruction to allow the PoolOverview admin to update the merkle roots on an existing RewardRecord.
/// This currently does not allow the update of `total_rewards` to prevent accounting
/// complexities when some rewards may have already been accrued to the OperatorPool
pub fn handler(ctx: Context<ModifyRewardRecord>, args: ModifyRewardRecordArgs) -> Result<()> {
    let reward_record = &mut ctx.accounts.reward_record;
    reward_record.merkle_roots = args.merkle_roots;
    Ok(())
}
