use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Staking is not allowed")]
    StakingNotAllowed,
    #[msg("Unstaking is not allowed")]
    UnstakingNotAllowed,
    #[msg("Rewards have to be claimed first")]
    UnclaimedRewards,
    #[msg("Minimum operator token stake not met")]
    MinOperatorTokenStakeNotMet,
    #[msg("No tokens available to be claimed")]
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
    #[msg("Invalid USDC mint provided")]
    InvalidUsdcMint,
    #[msg("Invalid registration fee payout destination")]
    InvalidRegistrationFeePayoutDestination,
    #[msg("Epoch must be finalizing when calling CreateRewardRecord")]
    EpochMustBeFinalizing,
    #[msg("Cannot update operator pool admin when epoch is finalizing")]
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
    #[msg("Invalid website URL provided")]
    InvalidWebsiteUrl,
    #[msg("Invalid avatar image URL provided")]
    InvalidAvatarImageUrl,
    #[msg("USDC earnings must be claimed before unstaking")]
    UnclaimedUsdcEarnings,
    #[msg("No USDC earnings available to claim")]
    NoUsdcEarningsToClaim,
    #[msg("Insufficient USDC in pool vault")]
    InsufficientPoolUsdcVaultBalance,
    #[msg("Invalid commission rate")]
    InvalidCommissionRate,
    #[msg("Operator pool must be closed to sweep dust")]
    PoolMustBeClosed,
    #[msg("Operator pool must be closed before the current epoch")]
    PoolClosedEpochInvalid,
    #[msg("Pool is not empty")]
    PoolIsNotEmpty,
    #[msg("Pool must be closed before the current epoch for the operator to unstake")]
    FinalUnstakeEpochInvalid,
    #[msg("Invalid epoch for emergency bypass")]
    InvalidEmergencyBypassEpoch,
    #[msg("Invalid epoch provided")]
    InvalidEpoch,
    #[msg("Invalid reward amount - does not match expected emissions for epoch")]
    InvalidRewardAmount,
    #[msg("Slashing delay must be at least 86,400 seconds (1 day)")]
    InvalidSlashingDelay,
    #[msg("Operator pool must be halted before slashing")]
    OperatorPoolNotHalted,
    #[msg("Minimum slashing delay period has not elapsed")]
    SlashingDelayNotMet,
}
