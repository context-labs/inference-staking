use anchor_lang::prelude::*;

declare_id!("7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb");

#[program]
pub mod inference_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
