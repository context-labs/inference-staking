use anchor_lang::prelude::*;

use crate::state::OperatorPool;

#[derive(Accounts)]
pub struct UpdateOperatorPool<'info> {
    pub admin: Signer<'info>,
    #[account(
      mut,
      seeds = [
        &operator_pool.pool_id.to_le_bytes(),
        b"OperatorPool".as_ref()
      ],
      bump = operator_pool.bump,
      has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateOperatorPoolArgs {
    /// Update Operator commission rate that will become active next epoch
    pub new_commission_rate_bps: u16,
    /// Allow delegation from stakers that are not the Operator
    pub allow_delegation: bool,
    /// Auto stake operator fees
    pub auto_stake_fees: bool,
}

pub fn handler(ctx: Context<UpdateOperatorPool>, args: UpdateOperatorPoolArgs) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.new_commission_rate_bps = Some(args.new_commission_rate_bps);
    operator_pool.allow_delegation = args.allow_delegation;
    operator_pool.auto_stake_fees = args.auto_stake_fees;

    Ok(())
}
