use anchor_lang::prelude::*;

use crate::state::OperatorPool;

#[derive(Accounts)]
pub struct SetHaltStatus<'info> {
    pub admin: Signer<'info>,
    #[account(
      mut,
      seeds = [&operator_pool.pool_id.to_le_bytes(), b"OperatorPool".as_ref()],
      bump = operator_pool.bump,
      // Admin must sign to invoke this instruction
      has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct SetHaltStatusArgs {
    /// Whether the OperatorPool should be halted.
    pub is_halted: bool,
}

pub fn handler(ctx: Context<SetHaltStatus>, args: SetHaltStatusArgs) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.is_halted = args.is_halted;

    Ok(())
}
