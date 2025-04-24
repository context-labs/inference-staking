use anchor_lang::prelude::*;

use crate::state::OperatorPool;

#[derive(Accounts)]
pub struct ChangeOperatorAdmin<'info> {
    pub admin: Signer<'info>,

    pub new_admin: Signer<'info>,

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

pub fn handler(ctx: Context<ChangeOperatorAdmin>) -> Result<()> {
    let operator_pool = &mut ctx.accounts.operator_pool;
    operator_pool.admin = ctx.accounts.new_admin.key();

    Ok(())
}
