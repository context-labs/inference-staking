use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct OperatorPool {
    /// ID of Pool. Equal to (PoolOverview.totalPools + 1) at time of creation.
    pub pool_id: u64,

    /// Authority allowed to configure settings for this account.
    pub admin: Pubkey,

    /// StakingRecord owned by Operator.
    pub operator_staking_record: Pubkey,

    /// If commission fees received by Operator should be staked at the end of the epoch.
    pub auto_stake_fees: bool,

    /// Commission Rate for Epoch Rewards. Capped at 100%.
    pub commission_rate_bps: u16,

    /// Commission Rate that will take place next Epoch, if set. Capped at 100%.
    pub new_commission_rate_bps: Option<u16>,

    /// If any other user is allowed to delegate stake to Pool, besides operator_staking_record.
    pub allow_delegation: bool,

    /// Total amount of tokens staked in Pool. Value does not include tokens that are being unstaked.
    pub total_staked_amount: u64,

    /// Total amount of shares issued representing fractional ownership of `total_staked_amount` in Pool.
    pub total_shares: u64,

    /// Total amount of tokens being unstaked.
    pub total_unstaking: u64,

    /// Epoch that pool was permanently closed at, if set.
    pub closed_at: Option<u64>,

    /// If Pool is halted by the PoolOverview admin. An Operator will not be allowed to stake, unstake,
    /// claim or withdraw rewards. Other users can still unstake or claim.
    pub is_halted: bool,

    /// Epoch in which reward was last claimed.
    pub reward_last_claimed_epoch: u64,

    /// Rewards that have been calculated in `claimRewards`, that are yet to be physically transferred to staking account.
    /// Used to optimize compute.
    pub accrued_rewards: u64,

    /// Commission that have been calculated in `claimRewards` , that are yet to be physically transferred to fee account.
    /// Used to optimize compute.
    pub accrued_commission: u64,
}

impl OperatorPool {
    /// Calculates number of shares equivalent to token amount.
    /// Uses a default 1:1 rate if total_shares i 0.
    /// Final result is rounded down  as part of integer division.
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

    /// Updates OperatorPool total_shares and total_staked_amount after staking of
    /// token_amount tokens.
    /// Returns number of shares created.
    pub fn stake_tokens(&mut self, token_amount: u64) -> u64 {
        let shares_created = self.calc_shares_for_token_amount(token_amount);
        self.total_staked_amount = self.total_staked_amount.checked_add(token_amount).unwrap();
        self.total_shares = self.total_shares.checked_add(shares_created).unwrap();

        shares_created
    }
}
