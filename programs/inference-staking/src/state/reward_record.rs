use anchor_lang::{prelude::*, solana_program::hash};

use crate::error::ErrorCode;

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

impl RewardRecord {
    /// Verify that given pool_address and reward_amount exist in Merkle Tree by attempting to
    /// generate the known root node through iteratively hashing the leaf/computed node with its
    /// sibling node provided in the proof.
    pub fn verify_proof(
        &self,
        merkle_index: u8,
        pool_address: Pubkey,
        proof: Vec<[u8; 32]>,
        proof_path: Vec<bool>,
        reward_amount: u64,
    ) -> Result<()> {
        require_eq!(proof.len(), proof_path.len(), ErrorCode::InvalidProof);

        let root = self.merkle_roots.get(usize::from(merkle_index)).unwrap();

        let leaf_data = format!("{},{}", pool_address, reward_amount);
        let mut node = hash::hash(leaf_data.as_bytes());

        for i in 0..proof.len() {
            let sibling_node = proof[i];

            // If sibling node is to the left of the current node.
            if proof_path[i] {
                node = hash::hash(&[sibling_node, node.to_bytes()].concat().to_vec());
            } else {
                node = hash::hash(&[node.to_bytes(), sibling_node].concat().to_vec());
            }
        }

        if !root.eq(&node.to_bytes()) {
            return err!(ErrorCode::InvalidProof);
        }

        Ok(())
    }
}
