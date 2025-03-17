use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Staking is not allowed")]
    StakingNotAllowed,
    #[msg("Rewards have to be claimed first")]
    UnclaimedRewards,
    #[msg("Min. operator shares % in pool violated")]
    MinOperatorSharesNotMet,
}
