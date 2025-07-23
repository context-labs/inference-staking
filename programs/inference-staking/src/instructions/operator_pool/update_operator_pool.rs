use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::load_current_index_checked;

use crate::events::UpdateOperatorPoolEvent;
use crate::state::{OperatorPool, PoolOverview};

#[derive(Accounts)]
pub struct UpdateOperatorPool<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [PoolOverview::SEED],
        bump = pool_overview.bump,
    )]
    pub pool_overview: Account<'info, PoolOverview>,

    #[account(
        mut,
        seeds = [
            OperatorPool::SEED,
            operator_pool.initial_pool_admin.as_ref(),
        ],
        bump = operator_pool.bump,
        has_one = admin,
    )]
    pub operator_pool: Account<'info, OperatorPool>,

    /// CHECK: This is a system account that is used to get the current instruction index.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: AccountInfo<'info>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct NewCommissionRateSetting {
    pub rate_bps: Option<u16>,
}

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct UpdateOperatorPoolArgs {
    /// If provided, the new commission rates will become active after the next epoch's reward claim for this pool
    pub new_reward_commission_rate_bps: Option<NewCommissionRateSetting>,
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
        new_reward_commission_rate_bps,
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

    if let Some(new_reward_rate_setting) = new_reward_commission_rate_bps {
        if let Some(new_commission_rate_bps) = new_reward_rate_setting.rate_bps {
            OperatorPool::validate_commission_rate(new_commission_rate_bps)?;
        }
        operator_pool.new_reward_commission_rate_bps = new_reward_rate_setting.rate_bps;
    }

    if let Some(new_usdc_rate_setting) = new_usdc_commission_rate_bps {
        if let Some(new_usdc_rate_bps) = new_usdc_rate_setting.rate_bps {
            OperatorPool::validate_commission_rate(new_usdc_rate_bps)?;
        }
        operator_pool.new_usdc_commission_rate_bps = new_usdc_rate_setting.rate_bps;
    }

    if let Some(operator_auth_keys) = operator_auth_keys {
        OperatorPool::validate_operator_auth_keys(&operator_auth_keys)?;
        operator_pool.operator_auth_keys = operator_auth_keys;
    }

    operator_pool.validate_pool_profile_fields()?;

    let instructions = ctx.accounts.instructions.to_account_info();
    let instruction_index = load_current_index_checked(&instructions)?;

    emit!(UpdateOperatorPoolEvent {
        instruction_index,
        operator_pool: operator_pool.key(),
        epoch: ctx.accounts.pool_overview.completed_reward_epoch + 1,
    });

    Ok(())
}
