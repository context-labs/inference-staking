use anchor_lang::prelude::*;

use crate::error::ErrorCode;
use crate::state::OperatorPool;

#[derive(Accounts)]
pub struct UpdateOperatorPool<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"OperatorPool".as_ref(),
            operator_pool.initial_pool_admin.as_ref(),
        ],
        bump = operator_pool.bump,
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    /// CHECK: This is the wallet address that should receive USDC payouts
    pub usdc_payout_wallet: Option<UncheckedAccount<'info>>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct NewCommissionRateSetting {
    pub rate_bps: Option<u16>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateOperatorPoolArgs {
    /// If set, the new commission rate will become active next epoch
    pub new_commission_rate_bps: Option<NewCommissionRateSetting>,
    pub new_usdc_commission_rate_bps: Option<NewCommissionRateSetting>,
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
        new_usdc_commission_rate_bps,
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

    if let Some(description) = description {
        operator_pool.description = Some(description);
    }

    if let Some(website_url) = website_url {
        operator_pool.website_url = Some(website_url);
    }

    if let Some(avatar_image_url) = avatar_image_url {
        operator_pool.avatar_image_url = Some(avatar_image_url);
    }

    if let Some(allow_delegation) = allow_delegation {
        operator_pool.allow_delegation = allow_delegation;
    }

    if let Some(auto_stake_fees) = auto_stake_fees {
        operator_pool.auto_stake_fees = auto_stake_fees;
    }

    if let Some(new_commission_rate_setting) = new_commission_rate_bps {
        if let Some(new_commission_rate_bps) = new_commission_rate_setting.rate_bps {
            require_gte!(
                10_000,
                new_commission_rate_bps,
                ErrorCode::InvalidCommissionRate
            );
        }
        operator_pool.new_commission_rate_bps = new_commission_rate_setting.rate_bps;
    }

    if let Some(new_usdc_rate_setting) = new_usdc_commission_rate_bps {
        if let Some(new_usdc_rate_bps) = new_usdc_rate_setting.rate_bps {
            require_gte!(10_000, new_usdc_rate_bps, ErrorCode::InvalidCommissionRate);
        }
        operator_pool.new_usdc_commission_rate_bps = new_usdc_rate_setting.rate_bps;
    }

    let usdc_payout_wallet = &ctx.accounts.usdc_payout_wallet;
    if let Some(usdc_payout_wallet) = usdc_payout_wallet {
        operator_pool.usdc_payout_wallet = usdc_payout_wallet.key();
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
