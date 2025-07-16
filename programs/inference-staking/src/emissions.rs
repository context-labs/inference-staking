use anchor_lang::prelude::*;

use crate::error::ErrorCode;

/// Number of epochs per super epoch
pub const EPOCHS_PER_SUPER_EPOCH: u64 = 1_000;

/// Keep in sync with off-chain SDK utils in `token-emissions.utils.ts`.
/// Token rewards emissions schedule by super epoch (in token denomination with 9 decimals)
pub const TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH: &[u64] = &[
    200_000_000_000_000_000, // super epoch 1 = 2.0% of 10 billion
    180_000_000_000_000_000, // super epoch 2 = 1.8% of 10 billion
    160_000_000_000_000_000, // super epoch 3 ... etc.
    140_000_000_000_000_000,
    120_000_000_000_000_000,
    100_000_000_000_000_000,
    80_000_000_000_000_000,
    60_000_000_000_000_000,
    40_000_000_000_000_000,
    20_000_000_000_000_000,
    10_000_000_000_000_000,
];

/// Calculate the expected reward emissions for a given epoch based on the emission schedule.
pub fn get_expected_reward_emissions_for_epoch(epoch: u64) -> Result<u64> {
    require!(epoch >= 1, ErrorCode::InvalidEpoch);

    let emissions_schedule = TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH;

    // Calculate which super epoch this epoch belongs to (0-indexed)
    let super_epoch = (epoch - 1) / EPOCHS_PER_SUPER_EPOCH;

    // If we're past the defined schedule, no rewards
    if super_epoch >= emissions_schedule.len() as u64 {
        return Ok(0);
    }

    let total_super_epoch_rewards = emissions_schedule[super_epoch as usize];

    // Distribute rewards evenly across all epochs in the super epoch
    // with dust distributed to earlier epochs
    let base_reward = total_super_epoch_rewards / EPOCHS_PER_SUPER_EPOCH;
    let dust = total_super_epoch_rewards % EPOCHS_PER_SUPER_EPOCH;

    // Calculate which position this epoch has within its super epoch (0-indexed)
    let epoch_index_in_super_epoch = (epoch - 1) % EPOCHS_PER_SUPER_EPOCH;

    // Earlier epochs get 1 extra token unit if there's dust
    let final_reward = if epoch_index_in_super_epoch < dust {
        base_reward + 1
    } else {
        base_reward
    };

    Ok(final_reward)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_expected_reward_emissions_for_epoch() {
        // Test epoch 1 (first epoch of first super epoch)
        // 200_000_000_000_000_000 / 1000 = 200_000_000_000_000
        let result = get_expected_reward_emissions_for_epoch(1).unwrap();
        assert_eq!(result, 200_000_000_000_000);

        // Test epoch 1000 (last epoch of first super epoch)
        let result = get_expected_reward_emissions_for_epoch(1_000).unwrap();
        assert_eq!(result, 200_000_000_000_000);

        // Test epoch 1001 (first epoch of second super epoch)
        // 180_000_000_000_000_000 / 1000 = 180_000_000_000_000
        let result = get_expected_reward_emissions_for_epoch(1_001).unwrap();
        assert_eq!(result, 180_000_000_000_000);

        // Test epoch 2000 (last epoch of second super epoch)
        let result = get_expected_reward_emissions_for_epoch(2_000).unwrap();
        assert_eq!(result, 180_000_000_000_000);

        // Test epoch 10001 (first epoch of 11th super epoch)
        // 10_000_000_000_000_000 / 1000 = 10_000_000_000_000
        let result = get_expected_reward_emissions_for_epoch(10_001).unwrap();
        assert_eq!(result, 10_000_000_000_000);

        // Test epoch beyond defined schedule (should return 0)
        let result = get_expected_reward_emissions_for_epoch(12_000).unwrap();
        assert_eq!(result, 0);
    }

    #[test]
    fn test_epoch_dust_distribution() {
        // For super epoch rewards that don't divide evenly by 1000,
        // the dust should be distributed to earlier epochs

        // With 200_000_000_000_000_000 tokens for super epoch 1:
        // Base reward = 200_000_000_000_000_000 / 1000 = 200_000_000_000_000
        // Dust = 200_000_000_000_000_000 % 1000 = 0
        // So all epochs get exactly 200_000_000_000_000

        // Test that all epochs in first super epoch get the same amount (no dust)
        for epoch in 1..=1_000 {
            let result = get_expected_reward_emissions_for_epoch(epoch).unwrap();
            assert_eq!(result, 200_000_000_000_000);
        }
    }

    #[test]
    fn test_invalid_epoch() {
        // Test epoch 0 (invalid)
        let result = get_expected_reward_emissions_for_epoch(0);
        assert!(result.is_err());
    }

    #[test]
    fn test_all_super_epochs() {
        // Test first epoch of each super epoch matches expected schedule
        // Each value is the super epoch total / 1000
        let expected_amounts = vec![
            200_000_000_000_000, // 200_000_000_000_000_000 / 1000
            180_000_000_000_000, // 180_000_000_000_000_000 / 1000
            160_000_000_000_000, // etc.
            140_000_000_000_000,
            120_000_000_000_000,
            100_000_000_000_000,
            80_000_000_000_000,
            60_000_000_000_000,
            40_000_000_000_000,
            20_000_000_000_000,
            10_000_000_000_000,
        ];

        for (super_epoch_index, expected_amount) in expected_amounts.iter().enumerate() {
            let epoch = (super_epoch_index as u64 * 1_000) + 1;
            let result = get_expected_reward_emissions_for_epoch(epoch).unwrap();
            assert_eq!(result, *expected_amount);
        }
    }

    #[test]
    fn test_total_emissions_per_super_epoch() {
        // Verify that the sum of all epochs in a super epoch equals the expected total
        let expected_totals = vec![
            200_000_000_000_000_000u64, // Full super epoch 1 total
            180_000_000_000_000_000u64, // Full super epoch 2 total
            160_000_000_000_000_000u64, // Full super epoch 3 total
        ];

        for (super_epoch_index, expected_total) in expected_totals.iter().enumerate() {
            let mut total = 0u64;
            let start_epoch = (super_epoch_index as u64 * 1_000) + 1;
            let end_epoch = start_epoch + 999;

            for epoch in start_epoch..=end_epoch {
                let reward = get_expected_reward_emissions_for_epoch(epoch).unwrap();
                total += reward;
            }

            assert_eq!(total, *expected_total);
        }
    }
}
