use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::constants;
use crate::error::ErrorCode;
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
pub struct NewCommissionRateSetting {
    pub rate_bps: Option<u16>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateOperatorPoolArgs {
    /// If set, the new commission rate will become active next epoch
    pub new_commission_rate_bps: Option<NewCommissionRateSetting>,
    pub allow_delegation: Option<bool>,
    pub auto_stake_fees: Option<bool>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub website_url: Option<String>,
    pub avatar_image_url: Option<String>,
    pub operator_auth_keys: Option<Vec<Pubkey>>,
}

pub fn handler(ctx: Context<UpdateOperatorPool>, args: UpdateOperatorPoolArgs) -> Result<()> {
    let UpdateOperatorPoolArgs {
        new_commission_rate_bps,
        allow_delegation,
        auto_stake_fees,
        name,
        description,
        website_url,
        avatar_image_url,
        operator_auth_keys,
    } = args;

    let operator_pool = &mut ctx.accounts.operator_pool;

    if let Some(name) = name {
        operator_pool.name = name;
    }

    operator_pool.description = description;
    operator_pool.website_url = website_url;
    operator_pool.avatar_image_url = avatar_image_url;

    if let Some(allow_delegation) = allow_delegation {
        operator_pool.allow_delegation = allow_delegation;
    }

    if let Some(auto_stake_fees) = auto_stake_fees {
        operator_pool.auto_stake_fees = auto_stake_fees;
    }

    if let Some(new_commission_rate_setting) = new_commission_rate_bps {
        if let Some(new_commission_rate_bps) = new_commission_rate_setting.rate_bps {
            require_gte!(10_000, new_commission_rate_bps);
        }
        operator_pool.new_commission_rate_bps = new_commission_rate_setting.rate_bps;
    }

    let usdc_payout_destination = &ctx.accounts.usdc_payout_destination;
    if let Some(usdc_payout_destination) = usdc_payout_destination {
        operator_pool.usdc_payout_destination = usdc_payout_destination.key();
    }

    if let Some(operator_auth_keys) = operator_auth_keys {
        require_gte!(
            3,
            operator_auth_keys.len(),
            ErrorCode::OperatorAuthKeysLengthInvalid
        );
        operator_pool.operator_auth_keys = operator_auth_keys;
    }

    operator_pool.validate_string_fields()?;

    Ok(())
}
