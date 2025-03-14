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
        create_pool_overview::handler(ctx)
    }

    pub fn update_pool_overview_authorities(
        ctx: Context<UpdatePoolOverviewAuthorities>,
        new_admin: Pubkey,
        new_halt_authorites: Vec<Pubkey>,
    ) -> Result<()> {
        update_pool_overview_authorities::handler(ctx, new_admin, new_halt_authorites)
    }

    pub fn update_pool_overview(
        ctx: Context<UpdatePoolOverview>,
        is_withdrawal_halted: bool,
        allow_pool_creation: bool,
        min_operator_share_bps: u16,
        unstake_delay_seconds: u64,
    ) -> Result<()> {
        update_pool_overview::handler(
            ctx,
            is_withdrawal_halted,
            allow_pool_creation,
            min_operator_share_bps,
            unstake_delay_seconds,
        )
    }
}

#[derive(Accounts)]
pub struct Initialize {}
