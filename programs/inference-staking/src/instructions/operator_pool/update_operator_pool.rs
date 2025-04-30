use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::constants;
use crate::state::OperatorPool;

#[derive(Accounts)]
pub struct UpdateOperatorPool<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"OperatorPool".as_ref(),
            &operator_pool.pool_id.to_le_bytes()
        ],
        bump = operator_pool.bump,
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    #[account(
        token::mint = constants::USDC_MINT_PUBKEY,
    )]
    pub usdc_payout_destination: Option<Account<'info, TokenAccount>>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateOperatorPoolArgs {
    /// If provided, the commission rate will become active next epoch
    pub new_commission_rate_bps: Option<u16>,
    pub allow_delegation: Option<bool>,
    pub auto_stake_fees: Option<bool>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub website_url: Option<String>,
}

pub fn handler(ctx: Context<UpdateOperatorPool>, args: UpdateOperatorPoolArgs) -> Result<()> {
    if let Some(rate) = args.new_commission_rate_bps {
        require_gte!(10_000, rate);
    }

    let operator_pool = &mut ctx.accounts.operator_pool;

    if let Some(name) = args.name {
        operator_pool.name = name;
    }

    if let Some(description) = args.description {
        operator_pool.description = description;
    }

    if let Some(website_url) = args.website_url {
        operator_pool.website_url = website_url;
    }

    if let Some(allow_delegation) = args.allow_delegation {
        operator_pool.allow_delegation = allow_delegation;
    }

    if let Some(auto_stake_fees) = args.auto_stake_fees {
        operator_pool.auto_stake_fees = auto_stake_fees;
    }

    let usdc_payout_destination = &ctx.accounts.usdc_payout_destination;
    if let Some(usdc_payout_destination) = usdc_payout_destination {
        operator_pool.usdc_payout_destination = usdc_payout_destination.key();
    }

    operator_pool.new_commission_rate_bps = args.new_commission_rate_bps;

    Ok(())
}
