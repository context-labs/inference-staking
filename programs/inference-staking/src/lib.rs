#![allow(ambiguous_glob_reexports)]

pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

use anchor_lang::prelude::*;

declare_id!("7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb");

#[program]
pub mod inference_staking {
    use super::*;

    pub fn create_pool_overview(ctx: Context<CreatePoolOverview>) -> Result<()> {
        instructions::create_pool_overview::handler(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
