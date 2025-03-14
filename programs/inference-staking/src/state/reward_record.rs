use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct RewardRecord {
    /// Counter to track the epoch this claim was made in.
    pub epoch: u64,

    /// Merkle roots for current epoch. Each root represents a merkle distribution tree
    /// where leaf nodes contain a SHA256 hashed value of `OperatorPools` key and reward amount in this epoch.
    #[max_len(5)]
    pub merkle_roots: Vec<[u8; 32]>,

    /// Amount of reward tokens issued for this epoch.
    pub total_rewards: u64,
}
