use anchor_lang::{prelude::*, solana_program::hash};

use crate::error::ErrorCode;

#[derive(InitSpace)]
#[account]
pub struct RewardRecord {
    /// Version of the RewardRecord account.
    pub version: u8,

    /// Counter to track the epoch this claim was made in.
    pub epoch: u64,

    /// Merkle roots for current epoch. Each root represents a merkle distribution tree
    /// where leaf nodes contain a SHA256 hashed value of `OperatorPools` key and reward amount in this epoch.
    #[max_len(5)]
    pub merkle_roots: Vec<[u8; 32]>,

    /// Amount of reward tokens issued for this epoch.
    pub total_rewards: u64,

    /// Amount of USDC tokens issued for this epoch.
    pub total_usdc_payout: u64,

    /// Timestamp when the epoch was finalized (when this record was created).
    pub epoch_finalized_at: i64,
}

impl RewardRecord {
    /// Version of the RewardRecord account.
    pub const VERSION: u8 = 1;

    /// PDA seed for RewardRecord account.
    pub const SEED: &'static [u8] = b"RewardRecord";

    /// Reserved padding space for future upgrades.
    pub const PADDING: usize = 256;
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
        usdc_amount: u64,
    ) -> Result<()> {
        require_eq!(proof.len(), proof_path.len(), ErrorCode::InvalidProof);

        let root = self.merkle_roots.get(usize::from(merkle_index)).unwrap();

        let leaf_data = format!("{},{},{}", pool_address, reward_amount, usdc_amount);

        // Define distinct prefixes for hashing.
        const LEAF_PREFIX: &[u8] = &[0x00];
        const NODE_PREFIX: &[u8] = &[0x01];

        // Prepend a '0x00' byte to the leaf data to distinguish it from an intermediate node.
        let mut node = hash::hashv(&[LEAF_PREFIX, leaf_data.as_bytes()]);

        for i in 0..proof.len() {
            let sibling_node = proof[i];

            // Prepend the '0x01' node prefix to the combined hashes before hashing again.
            node = if proof_path[i] {
                // Sibling is to the left of the current node.
                hash::hashv(&[NODE_PREFIX, &sibling_node, &node.to_bytes()])
            } else {
                // Current node is to the left of the sibling.
                hash::hashv(&[NODE_PREFIX, &node.to_bytes(), &sibling_node])
            };
        }

        if !root.eq(&node.to_bytes()) {
            return err!(ErrorCode::InvalidProof);
        }

        Ok(())
    }
}
