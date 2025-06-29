use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Staking is not allowed")]
    StakingNotAllowed,
    #[msg("Unstaking is not allowed")]
    UnstakingNotAllowed,
    #[msg("Rewards have to be claimed first")]
    UnclaimedRewards,
    #[msg("Min. operator token stake not met")]
    MinOperatorTokenStakeNotMet,
    #[msg("No tokens to be claimed")]
    NoTokensToClaim,
    #[msg("Tokens are still in unstaking cooldown")]
    PendingDelay,
    #[msg("Insufficient reward tokens to issue")]
    InsufficientRewards,
    #[msg("Insufficient USDC tokens to issue")]
    InsufficientUsdc,
    #[msg("Pool is closed")]
    ClosedPool,
    #[msg("Invalid Proof")]
    InvalidProof,
    #[msg("OperatorPool is halted")]
    OperatorPoolHalted,
    #[msg("Staking is halted")]
    StakingHalted,
    #[msg("Withdrawals are halted")]
    WithdrawalsHalted,
    #[msg("Accrue reward is halted")]
    AccrueRewardHalted,
    #[msg("ProgramAdmin is not valid")]
    InvalidProgramAdmin,
    #[msg("RewardDistributionAuthority is not valid")]
    InvalidRewardDistributionAuthority,
    #[msg("HaltAuthority is not valid")]
    InvalidHaltAuthority,
    #[msg("SlashingAuthority is not valid")]
    InvalidSlashingAuthority,
    #[msg("Exceeded allowed authorities length")]
    AuthoritiesExceeded,
    #[msg("Invalid operator auth keys length")]
    OperatorAuthKeysLengthInvalid,
    #[msg("Account not empty")]
    AccountNotEmpty,
    #[msg("Pool creation is disabled")]
    PoolCreationDisabled,
    #[msg("Could not initialize USDC mint")]
    InvalidUsdcMint,
    #[msg("Invalid USDC payout destination")]
    InvalidUsdcPayoutDestination,
    #[msg("Invalid registration fee payout destination")]
    InvalidRegistrationFeePayoutDestination,
    #[msg("Epoch must be finalizing when calling CreateRewardRecord")]
    EpochMustBeFinalizing,
    #[msg("Epoch must not be finalizing during operator pool admin change")]
    EpochMustNotBeFinalizing,
    #[msg("Invalid expected epoch provided for epoch finalizing update")]
    EpochIsFinalizingEpochInvalid,
    #[msg("Name is too long, max length is 64 characters")]
    NameTooLong,
    #[msg("Description is too long, max length is 200 characters")]
    DescriptionTooLong,
    #[msg("Website URL is too long, max length is 64 characters")]
    WebsiteUrlTooLong,
    #[msg("Avatar image URL is too long, max length is 128 characters")]
    AvatarImageUrlTooLong,
    #[msg("Website URL is invalid")]
    InvalidWebsiteUrl,
    #[msg("Avatar image URL is invalid")]
    InvalidAvatarImageUrl,
    #[msg("USDC rewards must be claimed before unstaking")]
    UnclaimedUsdcRewards,
    #[msg("No USDC rewards to claim")]
    NoUsdcToClaim,
    #[msg("Insufficient USDC in pool vault")]
    InsufficientPoolUsdcVaultBalance,
    #[msg("Invalid commission rate")]
    InvalidCommissionRate,
    #[msg("Operator pool must be closed to sweep dust")]
    PoolMustBeClosed,
    #[msg("Pool is not empty")]
    PoolIsNotEmpty,
}
