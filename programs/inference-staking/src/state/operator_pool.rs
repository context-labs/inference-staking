use anchor_lang::prelude::*;

use crate::{constants::USDC_PRECISION_FACTOR, error::ErrorCode};

// Keep numbers in sync with error codes.
const MAX_NAME_LENGTH: usize = 64;
const MAX_DESCRIPTION_LENGTH: usize = 200;
const MAX_WEBSITE_URL_LENGTH: usize = 64;
const MAX_AVATAR_IMAGE_URL_LENGTH: usize = 128;

#[derive(InitSpace)]
#[account]
pub struct OperatorPool {
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
    #[max_len(3)]
    pub operator_auth_keys: Vec<Pubkey>,

    /// If commission fees received by Operator should be staked at the end of the epoch.
    pub auto_stake_fees: bool,

    /// Commission Rate for Epoch Token Rewards. Capped at 100%.
    pub reward_commission_rate_bps: u16,

    /// Commission Rate that will take place next Epoch, if set. Capped at 100%.
    pub new_reward_commission_rate_bps: Option<u16>,

    /// If any other user is allowed to delegate stake to Pool, besides operator_staking_record.
    pub allow_delegation: bool,

    /// Total amount of tokens staked in Pool. Value does not include tokens that are being unstaked.
    pub total_staked_amount: u64,

    /// Total amount of shares issued representing fractional ownership of `total_staked_amount` in Pool.
    pub total_shares: u64,

    /// Total amount of tokens being unstaked.
    pub total_unstaking: u64,

    /// Epoch that pool was created.
    pub joined_at: u64,

    /// Epoch that pool was permanently closed at, if set. Once a pool is closed, the pool will stop accruing
    /// any rewards starting from that epoch.
    pub closed_at: Option<u64>,

    /// If Pool is halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,
    /// claim, withdraw rewards or close a pool. Other users can still unstake or claim.
    pub is_halted: bool,

    /// Epoch in which reward was last claimed. Defaults to poolOverview.completed_reward_epoch + 1
    /// at initialization, as rewards will only be issued from next epoch.
    pub reward_last_claimed_epoch: u64,

    /// Rewards that have been calculated in `accrueRewards`, that are yet to be physically transferred to staking account.
    /// Used to optimize compute.
    pub accrued_rewards: u64,

    /// Commission that have been calculated in `accrueRewards`, that are yet to be physically transferred to fee account.
    /// Used to optimize compute.
    pub accrued_commission: u64,

    /// USDC that have been calculated in `accrueRewards`, that are yet to be physically transferred to payout wallet.
    /// Used to optimize compute.
    pub accrued_usdc_payout: u64,

    /// Destination wallet for USDC payouts for this operator pool.
    pub usdc_payout_wallet: Pubkey,

    /// USDC commission rate in basis points (0-10000)
    pub usdc_commission_rate_bps: u16,

    /// Pending USDC commission rate for next epoch
    pub new_usdc_commission_rate_bps: Option<u16>,

    /// Cumulative USDC per share (scaled by USDC_PRECISION_FACTOR)
    pub cumulative_usdc_per_share: u128,

    /// USDC earned by delegators, yet to be transferred to the pool vault. Used to optimize compute.
    pub accrued_delegator_usdc: u64,
}

/// Program Accounting Mechanisms: The staking program employs two accounting mechanisms to
/// track and distribute rewards:
///
/// 1.  Share-based Accounting Mechanism: This mechanism tracks the proportional ownership of
///     each delegator in the pool and is used for reward distribution.
///
/// 2.  USDC Revenue Sharing Mechanism: This mechanism tracks the USDC revenue earned by the
///     pool and is used for USDC revenue distribution.
///
/// The logic for each mechanism is implemented below in the OperatorPool struct.
///
/// Notes on Share-based Accounting Mechanism:
///
/// The protocol uses a share-based system to represent a delegator's ownership in a staking
/// pool. This allows for the fair and efficient distribution of token rewards.
///
/// Core Concepts:
///
/// 1.  Proportional Share Issuance: When a user stakes tokens, they are issued a number of
///     shares that represents their proportional ownership of the pool. The number of
///     shares is calculated as:
///     shares = (staked_token_amount / total_staked_amount) * total_shares
///
/// 2.  Token Redemption: To unstake, a user redeems their shares to receive the
///     corresponding amount of underlying tokens based on the shares' current value. The shares
///     are then burned. The token amount is calculated as:
///     tokens = (share_amount / total_shares) * total_staked_amount
///
/// 3.  Passive Reward Accrual: When token rewards are added to the pool (after the
///     operator's commission is deducted), the pool's total_staked_amount increases, while
///     the total_shares remains unchanged. This directly increases the value of each share,
///     passively distributing rewards to all delegators in proportion to their stake.
///
/// Notes on USDC Revenue Sharing Mechanism:
///
/// The protocol uses a hybrid accounting model to distribute USDC revenue to delegators. This
/// allows delegators to earn USDC in proportion to their shares in the pool, which can be
/// withdrawn independently from their staked tokens.
///
/// Core Concepts:
///
/// 1.  Cumulative Per-Share Index: The OperatorPool tracks a global cumulative_usdc_per_share
///     value. This index represents the total USDC earned by a single share over the pool's lifetime,
///     scaled by a precision factor to handle fractions. When USDC rewards (net of operator commission)
///     are added to the pool, this index increases.
///
/// 2.  Delegator Checkpoint: Each StakingRecord stores last_settled_usdc_per_share, which is a
///     snapshot of the pool's cumulative index at the time of the delegator's last settlement.
///
/// 3.  Settling Earnings: A delegator's USDC earnings are calculated by finding the delta
///     between the current pool index and their last settled checkpoint, and multiplying it by their
///     number of shares.
///
///     earned_usdc = (pool.cumulative_usdc_per_share - delegator.last_settled_usdc_per_share) * delegator.shares
///
///     This "settlement" process is automatically triggered before any action that modifies a user's
///     share balance (e.g., stake, unstake). The calculated earnings are moved into the delegator's
///     accrued_usdc_earnings balance, and their last_settled_usdc_per_share checkpoint is updated to
///     the current pool index value.
///
/// 4.  Claiming USDC: Delegators can call a separate instruction at any time to withdraw the balance
///     from their accrued_usdc_earnings. This is required before closing a staking record. The claim
///     instruction additionally settles any outstanding earnings, and withdraws the full final amount.
///
/// This combined share and index-based accounting mechanism allows the program to fairly and efficiently
/// distribute and compound both token and USDC rewards among many stakers.
///
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
    pub fn stake_tokens(&mut self, token_amount: u64) -> u64 {
        let shares_created = self.calc_shares_for_token_amount(token_amount);
        self.total_staked_amount = self.total_staked_amount.checked_add(token_amount).unwrap();
        self.total_shares = self.total_shares.checked_add(shares_created).unwrap();

        shares_created
    }

    /// Updates OperatorPool total_shares, total_staked_amount and total_unstaking after
    /// unstaking of share_amount shares.
    /// Returns number of tokens unstaked.
    pub fn unstake_tokens(&mut self, share_amount: u64) -> u64 {
        let tokens_unstaked = self.calc_tokens_for_share_amount(share_amount);
        self.total_staked_amount = self
            .total_staked_amount
            .checked_sub(tokens_unstaked)
            .unwrap();
        self.total_shares = self.total_shares.checked_sub(share_amount).unwrap();
        self.total_unstaking = self.total_unstaking.checked_add(tokens_unstaked).unwrap();

        tokens_unstaked
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

    /// Check that all rewards have been claimed for pool closure conditions.
    /// Returns an error if rewards are unclaimed and conditions are not met.
    pub fn check_unclaimed_rewards(&self, completed_reward_epoch: u64) -> Result<()> {
        if completed_reward_epoch > self.reward_last_claimed_epoch {
            if self.closed_at.is_some() {
                let closed_at = self.closed_at.unwrap();
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

    /// Settle USDC rewards for a staking record
    /// Must be called before any share modifications
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

        // Add to accrued balance
        staking_record.accrued_usdc_earnings = staking_record
            .accrued_usdc_earnings
            .checked_add(earned_usdc as u64)
            .unwrap();

        // Update settlement checkpoint
        staking_record.last_settled_usdc_per_share = self.cumulative_usdc_per_share;

        Ok(())
    }

    /// Check if a staking record has unclaimed USDC
    pub fn has_unclaimed_usdc_earnings(
        &self,
        staking_record: &crate::state::StakingRecord,
    ) -> bool {
        // Check accrued balance
        if staking_record.accrued_usdc_earnings > 0 {
            return true;
        }

        // Check unsettled rewards
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

    pub fn validate_string_fields(&self) -> Result<()> {
        self.validate_name()?;
        self.validate_description()?;
        self.validate_website_url()?;
        self.validate_avatar_image_url()?;
        Ok(())
    }
}
