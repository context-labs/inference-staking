use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Staking is not allowed")]
    StakingNotAllowed,
    #[msg("Unstaking is not allowed")]
    UnstakingNotAllowed,
    #[msg("Rewards have to be claimed first")]
    UnclaimedRewards,
    #[msg("Min. operator shares % in pool violated")]
    MinOperatorSharesNotMet,
    #[msg("No tokens to be claimed")]
    NoTokensToClaim,
    #[msg("Pending delay duration to elapse")]
    PendingDelay,
    #[msg("Insufficient reward tokens to issue")]
    InsufficientRewards,
    #[msg("Pool is closed")]
    ClosedPool,
    #[msg("Invalid Proof")]
    InvalidProof,
    #[msg("OperatorPool is halted")]
    OperatorPoolHalted,
    #[msg("Withdrawals are halted")]
    WithdrawalsHalted,
    #[msg("PoolOverview Authority is not valid")]
    InvalidAuthority,
    #[msg("Exceeded allowed authorities length")]
    AuthoritiesExceeded,
    #[msg("Account not empty")]
    AccountNotEmpty,
    #[msg("Pool creation is disabled")]
    PoolCreationDisabled,
}
