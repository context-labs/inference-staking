use std::collections::HashSet;

use anchor_lang::prelude::*;

use crate::{constants::USDC_PRECISION_FACTOR, error::ErrorCode, state::StakingRecord};

// Keep numbers in sync with error codes.
const MAX_NAME_LENGTH: usize = 64;
const MAX_DESCRIPTION_LENGTH: usize = 200;
const MAX_WEBSITE_URL_LENGTH: usize = 64;
const MAX_AVATAR_IMAGE_URL_LENGTH: usize = 128;

const MAX_OPERATOR_AUTH_KEYS_LENGTH: usize = 5;

#[derive(InitSpace)]
#[account]
pub struct OperatorPool {
    /// Version of the OperatorPool account.
    pub version: u8,

    /// PDA Bump
    pub bump: u8,

    /// Initial pool admin. This is stored for the PDA derivation.
    pub initial_pool_admin: Pubkey,

    /// Authority allowed to configure settings for this account.
    pub admin: Pubkey,

    /// Name of Operator.
    #[max_len(MAX_NAME_LENGTH)]
    pub name: String,

    /// Description of Operator.
    #[max_len(MAX_DESCRIPTION_LENGTH)]
    pub description: Option<String>,

    /// Website of Operator.
    #[max_len(MAX_WEBSITE_URL_LENGTH)]
    pub website_url: Option<String>,

    /// Avatar image url of Operator.
    #[max_len(MAX_AVATAR_IMAGE_URL_LENGTH)]
    pub avatar_image_url: Option<String>,

    /// StakingRecord owned by Operator.
    pub operator_staking_record: Pubkey,

    /// Operator auth keys. Used to authenticate operator GPU workers.
    #[max_len(MAX_OPERATOR_AUTH_KEYS_LENGTH)]
    pub operator_auth_keys: Vec<Pubkey>,

    /// If commission fees received by Operator should be staked at the end of the epoch.
    pub auto_stake_fees: bool,

    /// Commission Rate for Epoch Token Rewards. Capped at 100%.
    pub reward_commission_rate_bps: u16,

    /// Commission Rate that will take place next Epoch, if set. Capped at 100%.
    pub new_reward_commission_rate_bps: Option<u16>,

    /// USDC commission rate in basis points (0-10000)
    pub usdc_commission_rate_bps: u16,

    /// Pending USDC commission rate for next epoch
    pub new_usdc_commission_rate_bps: Option<u16>,

    /// If any other user is allowed to delegate stake to Pool, besides operator_staking_record.
    pub allow_delegation: bool,

    /// Total amount of tokens staked in Pool. Value does not include tokens that are being unstaked.
    pub total_staked_amount: u64,

    /// Total amount of shares issued representing fractional ownership of `total_staked_amount` in Pool.
    pub total_shares: u64,

    /// Total amount of tokens being unstaked.
    pub total_unstaking: u64,

    /// Epoch that pool was created.
    pub joined_at_epoch: u64,

    /// Epoch that pool was permanently closed at, if set. Once a pool is closed, the pool will stop accruing
    /// any rewards starting from that epoch.
    pub closed_at_epoch: Option<u64>,

    /// Timestamp when the pool was halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,
    /// claim, withdraw rewards or close a pool. Other users can still unstake or claim.
    /// When unhalted, this is set to None.
    pub halted_at_timestamp: Option<i64>,

    /// Epoch in which reward was last claimed. Defaults to poolOverview.completed_reward_epoch + 1
    /// at initialization, as rewards will only be issued from next epoch.
    pub reward_last_claimed_epoch: u64,

    /// Rewards that have been calculated in `accrueRewards`, that are yet to be physically transferred to staking account.
    /// Used to optimize compute.
    pub accrued_rewards: u64,

    /// Commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to fee account.
    /// Used to optimize compute.
    pub accrued_reward_commission: u64,

    /// USDC commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to USDC fee account.
    /// Used to optimize compute.
    pub accrued_usdc_commission: u64,

    /// USDC earned by delegators, yet to be transferred to the pool vault.
    /// Used to optimize compute.
    pub accrued_delegator_usdc: u64,

    /// Cumulative USDC per share (scaled by USDC_PRECISION_FACTOR)
    pub cumulative_usdc_per_share: u128,
}

impl OperatorPool {
    /// Version of the OperatorPool account.
    pub const VERSION: u8 = 1;

    /// PDA seed for OperatorPool account.
    pub const SEED: &'static [u8] = b"OperatorPool";

    /// PDA seed for operator pool staked token vault.
    pub const POOL_STAKED_TOKEN_VAULT_SEED: &'static [u8] = b"PoolStakedTokenVault";

    /// PDA seed for operator pool reward commission token vault.
    pub const POOL_REWARD_COMMISSION_TOKEN_VAULT_SEED: &'static [u8] =
        b"PoolRewardCommissionTokenVault";

    /// PDA seed for operator pool USDC commission token vault.
    pub const POOL_USDC_COMMISSION_TOKEN_VAULT_SEED: &'static [u8] =
        b"PoolUsdcCommissionTokenVault";

    /// PDA seed for operator pool delegator USDC earnings vault.
    pub const POOL_DELEGATOR_USDC_EARNINGS_VAULT_SEED: &'static [u8] =
        b"PoolDelegatorUsdcEarningsVault";

    /// Reserved padding space for future upgrades.
    pub const PADDING: usize = 512;
}

impl OperatorPool {
    /// Calculates number of shares equivalent to token amount.
    /// Uses a default 1:1 rate if total_shares i 0.
    /// Final result is rounded down as part of integer division.
    pub fn calc_shares_for_token_amount(&self, token_amount: u64) -> u64 {
        if self.total_shares == 0 {
            return token_amount;
        }

        // Shares = (token_amount / total_staked_amount) * total_shares
        let shares = u128::from(token_amount)
            .checked_mul(u128::from(self.total_shares))
            .unwrap()
            .checked_div(u128::from(self.total_staked_amount))
            .unwrap();

        u64::try_from(shares).unwrap()
    }

    /// Calculates number of tokens equivalent to share amount.
    /// Final result is rounded down as part of integer division.
    pub fn calc_tokens_for_share_amount(&self, share_amount: u64) -> u64 {
        if share_amount == 0 {
            return 0;
        }

        // Tokens = (share_amount / total_shares) * total_staked_amount
        let tokens = u128::from(share_amount)
            .checked_mul(u128::from(self.total_staked_amount))
            .unwrap()
            .checked_div(u128::from(self.total_shares))
            .unwrap();

        u64::try_from(tokens).unwrap()
    }

    /// Updates OperatorPool total_shares and total_staked_amount after staking of
    /// token_amount tokens.
    /// Returns number of shares created.
    pub fn stake_tokens(
        &mut self,
        staking_record: &mut StakingRecord,
        token_amount: u64,
    ) -> Result<u64> {
        self.settle_usdc_earnings(staking_record)?;

        let shares_created = self.calc_shares_for_token_amount(token_amount);
        self.total_staked_amount = self.total_staked_amount.checked_add(token_amount).unwrap();
        self.total_shares = self.total_shares.checked_add(shares_created).unwrap();

        Ok(shares_created)
    }

    /// Updates OperatorPool total_shares, total_staked_amount and total_unstaking after
    /// unstaking of share_amount shares.
    /// Returns number of tokens unstaked.
    pub fn unstake_tokens(
        &mut self,
        staking_record: &mut StakingRecord,
        share_amount: u64,
    ) -> Result<u64> {
        self.settle_usdc_earnings(staking_record)?;

        let tokens_unstaked = self.calc_tokens_for_share_amount(share_amount);
        self.total_staked_amount = self
            .total_staked_amount
            .checked_sub(tokens_unstaked)
            .unwrap();
        self.total_shares = self.total_shares.checked_sub(share_amount).unwrap();
        self.total_unstaking = self.total_unstaking.checked_add(tokens_unstaked).unwrap();

        Ok(tokens_unstaked)
    }

    /// Updates OperatorPool total_shares, total_staked_amount and staking_record shares after
    /// slashing of share_amount shares. Slashing tokens is the same as unstaking, but
    /// there is no unstaking delay. The slashed tokens are immediately confiscated.
    /// Returns number of tokens slashed.
    pub fn slash_tokens(
        &mut self,
        staking_record: &mut StakingRecord,
        shares_amount: u64,
    ) -> Result<u64> {
        self.settle_usdc_earnings(staking_record)?;

        let token_amount = self.calc_tokens_for_share_amount(shares_amount);
        self.total_staked_amount = self.total_staked_amount.checked_sub(token_amount).unwrap();
        self.total_shares = self.total_shares.checked_sub(shares_amount).unwrap();

        Ok(token_amount)
    }

    /// Check that all rewards have been claimed for pool closure conditions.
    /// Returns an error if rewards are unclaimed and conditions are not met.
    pub fn check_unclaimed_rewards(&self, completed_reward_epoch: u64) -> Result<()> {
        if completed_reward_epoch > self.reward_last_claimed_epoch {
            if self.closed_at_epoch.is_some() {
                let closed_at = self.closed_at_epoch.unwrap();
                require_gte!(
                    self.reward_last_claimed_epoch,
                    closed_at,
                    ErrorCode::UnclaimedRewards
                );
            } else {
                return err!(ErrorCode::UnclaimedRewards);
            }
        }
        Ok(())
    }

    /// Settle USDC rewards for a staking record.
    /// Must be called before any share modifications.
    pub fn settle_usdc_earnings(
        &self,
        staking_record: &mut crate::state::StakingRecord,
    ) -> Result<()> {
        // Calculate earned USDC since last settlement
        let usdc_per_share_settlement_delta = self
            .cumulative_usdc_per_share
            .saturating_sub(staking_record.last_settled_usdc_per_share);

        let earned_usdc = (staking_record.shares as u128)
            .checked_mul(usdc_per_share_settlement_delta)
            .unwrap()
            .checked_div(USDC_PRECISION_FACTOR)
            .unwrap();

        // Add to accrued USDC earnings balance
        staking_record.accrued_usdc_earnings = staking_record
            .accrued_usdc_earnings
            .checked_add(earned_usdc as u64)
            .unwrap();

        // Update settlement checkpoint
        staking_record.last_settled_usdc_per_share = self.cumulative_usdc_per_share;

        Ok(())
    }

    /// Check if a staking record has unclaimed USDC.
    pub fn has_unclaimed_usdc_earnings(
        &self,
        staking_record: &crate::state::StakingRecord,
    ) -> bool {
        // Check accrued USDC earnings balance
        if staking_record.accrued_usdc_earnings > 0 {
            return true;
        }

        // Check unsettled USDC earnings
        let usdc_per_share_settlement_delta = self
            .cumulative_usdc_per_share
            .saturating_sub(staking_record.last_settled_usdc_per_share);

        if usdc_per_share_settlement_delta > 0 && staking_record.shares > 0 {
            let unsettled = (staking_record.shares as u128)
                .saturating_mul(usdc_per_share_settlement_delta)
                .saturating_div(USDC_PRECISION_FACTOR);
            return unsettled > 0;
        }

        false
    }

    /// Updates reward commission to new rate. Called after accrual of all issued rewards.
    pub fn update_reward_commission_rate(&mut self) {
        if let Some(new_commission_rate_bps) = self.new_reward_commission_rate_bps {
            self.reward_commission_rate_bps = new_commission_rate_bps;
            self.new_reward_commission_rate_bps = None;
        }
    }

    /// Updates USDC commission to new rate. Called after accrual of all issued rewards.
    pub fn update_usdc_commission_rate(&mut self) {
        if let Some(new_commission_rate_bps) = self.new_usdc_commission_rate_bps {
            self.usdc_commission_rate_bps = new_commission_rate_bps;
            self.new_usdc_commission_rate_bps = None;
        }
    }

    /// Checks if the operator pool is fully empty (no shares, no staked tokens, no unstaking).
    pub fn is_empty(&self) -> bool {
        self.total_shares == 0 && self.total_staked_amount == 0 && self.total_unstaking == 0
    }
}

impl OperatorPool {
    pub fn is_url_valid(&self, url: &str) -> bool {
        url.starts_with("https://") || url.starts_with("http://")
    }

    pub fn validate_name(&self) -> Result<()> {
        if self.name.len() > MAX_NAME_LENGTH {
            return Err(ErrorCode::NameTooLong.into());
        }

        Ok(())
    }

    pub fn validate_description(&self) -> Result<()> {
        if let Some(description) = &self.description {
            if description.len() > MAX_DESCRIPTION_LENGTH {
                return Err(ErrorCode::DescriptionTooLong.into());
            }
        }

        Ok(())
    }

    pub fn validate_website_url(&self) -> Result<()> {
        if let Some(website_url) = &self.website_url {
            if website_url.len() > MAX_WEBSITE_URL_LENGTH {
                return Err(ErrorCode::WebsiteUrlTooLong.into());
            }
            if !self.is_url_valid(website_url) {
                return Err(ErrorCode::InvalidWebsiteUrl.into());
            }
        }

        Ok(())
    }

    pub fn validate_avatar_image_url(&self) -> Result<()> {
        if let Some(avatar_image_url) = &self.avatar_image_url {
            if avatar_image_url.len() > MAX_AVATAR_IMAGE_URL_LENGTH {
                return Err(ErrorCode::AvatarImageUrlTooLong.into());
            }
            if !self.is_url_valid(avatar_image_url) {
                return Err(ErrorCode::InvalidAvatarImageUrl.into());
            }
        }

        Ok(())
    }

    pub fn validate_pool_profile_fields(&self) -> Result<()> {
        self.validate_name()?;
        self.validate_description()?;
        self.validate_website_url()?;
        self.validate_avatar_image_url()?;
        Ok(())
    }

    pub fn validate_operator_auth_keys(operator_auth_keys: &[Pubkey]) -> Result<()> {
        if operator_auth_keys.len() > MAX_OPERATOR_AUTH_KEYS_LENGTH {
            return Err(ErrorCode::OperatorAuthKeysLengthInvalid.into());
        }

        let mut seen = HashSet::new();
        for key in operator_auth_keys {
            if !seen.insert(key) {
                return Err(ErrorCode::DuplicateOperatorAuthKey.into());
            }
        }

        Ok(())
    }

    pub fn validate_commission_rate(commission_rate_bps: u16) -> Result<()> {
        require_gte!(
            10_000,
            commission_rate_bps,
            ErrorCode::InvalidCommissionRate
        );
        Ok(())
    }
}
