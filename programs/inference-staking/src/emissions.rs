use anchor_lang::prelude::*;

use crate::error::ErrorCode;

/// Number of epochs per super epoch
/// 5 super epochs at 300 days = 1500 days = 4.1 years
pub const EPOCHS_PER_SUPER_EPOCH: u64 = 300;

/// Keep in sync with off-chain SDK utils in `token-emissions.utils.ts`.
/// Token rewards emissions schedule by super epoch (in token denomination with 9 decimals)
/// Total = 15.0% of 10 billion
pub const TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH: &[u64] = &[
    500_000_000_000_000_000, // super epoch 1 = 5.0% of 10 billion
    400_000_000_000_000_000, // super epoch 2 = 4.0% of 10 billion
    300_000_000_000_000_000, // super epoch 3 = 3.0% of 10 billion
    200_000_000_000_000_000, // super epoch 4 = 2.0% of 10 billion
    100_000_000_000_000_000, // super epoch 5 = 1.0% of 10 billion
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
        // Test epoch 1 (first epoch of first super epoch) - may get dust
        let first_super_epoch_total = TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH[0];
        let base_reward = first_super_epoch_total / EPOCHS_PER_SUPER_EPOCH;
        let dust = first_super_epoch_total % EPOCHS_PER_SUPER_EPOCH;
        let first_epoch_reward = if dust > 0 {
            base_reward + 1
        } else {
            base_reward
        };

        let result = get_expected_reward_emissions_for_epoch(1).unwrap();
        assert_eq!(result, first_epoch_reward);

        // Test last epoch of first super epoch - gets base reward (no dust)
        let last_epoch_first_super = EPOCHS_PER_SUPER_EPOCH;
        let result = get_expected_reward_emissions_for_epoch(last_epoch_first_super).unwrap();
        assert_eq!(result, base_reward);

        // Test first epoch of second super epoch (if it exists)
        if TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH.len() > 1 {
            let second_super_epoch_total = TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH[1];
            let second_base_reward = second_super_epoch_total / EPOCHS_PER_SUPER_EPOCH;
            let second_dust = second_super_epoch_total % EPOCHS_PER_SUPER_EPOCH;
            let second_first_epoch_reward = if second_dust > 0 {
                second_base_reward + 1
            } else {
                second_base_reward
            };

            let first_epoch_second_super = EPOCHS_PER_SUPER_EPOCH + 1;
            let result = get_expected_reward_emissions_for_epoch(first_epoch_second_super).unwrap();
            assert_eq!(result, second_first_epoch_reward);

            // Test last epoch of second super epoch
            let last_epoch_second_super = EPOCHS_PER_SUPER_EPOCH * 2;
            let result = get_expected_reward_emissions_for_epoch(last_epoch_second_super).unwrap();
            assert_eq!(result, second_base_reward);
        }

        // Test epoch beyond defined schedule (should return 0)
        let beyond_schedule_epoch = (TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH.len() as u64
            * EPOCHS_PER_SUPER_EPOCH)
            + 1;
        let result = get_expected_reward_emissions_for_epoch(beyond_schedule_epoch).unwrap();
        assert_eq!(result, 0);
    }

    #[test]
    fn test_epoch_dust_distribution() {
        // For super epoch rewards that don't divide evenly by EPOCHS_PER_SUPER_EPOCH,
        // the dust should be distributed to earlier epochs

        let first_super_epoch_total = TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH[0];
        let base_reward = first_super_epoch_total / EPOCHS_PER_SUPER_EPOCH;
        let dust = first_super_epoch_total % EPOCHS_PER_SUPER_EPOCH;

        // Test reward distribution for all epochs in first super epoch
        for epoch in 1..=EPOCHS_PER_SUPER_EPOCH {
            let result = get_expected_reward_emissions_for_epoch(epoch).unwrap();

            // Earlier epochs get 1 extra token unit if there's dust
            let expected_reward = if (epoch - 1) < dust {
                base_reward + 1
            } else {
                base_reward
            };

            assert_eq!(result, expected_reward);
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
        // First epoch gets base reward + 1 if there's dust, otherwise just base reward
        for (super_epoch_index, &total) in TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH
            .iter()
            .enumerate()
        {
            let base_reward = total / EPOCHS_PER_SUPER_EPOCH;
            let dust = total % EPOCHS_PER_SUPER_EPOCH;
            let expected_first_epoch_reward = if dust > 0 {
                base_reward + 1
            } else {
                base_reward
            };

            let epoch = (super_epoch_index as u64 * EPOCHS_PER_SUPER_EPOCH) + 1;
            let result = get_expected_reward_emissions_for_epoch(epoch).unwrap();
            assert_eq!(
                result,
                expected_first_epoch_reward,
                "First epoch of super epoch {} should get base reward plus dust",
                super_epoch_index + 1
            );
        }
    }

    #[test]
    fn test_total_emissions_per_super_epoch() {
        // Verify that the sum of all epochs in a super epoch equals the expected total
        // Test all defined super epochs from the emissions schedule
        for (super_epoch_index, &expected_total) in TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH
            .iter()
            .enumerate()
        {
            let mut total = 0u64;
            let start_epoch = (super_epoch_index as u64 * EPOCHS_PER_SUPER_EPOCH) + 1;
            let end_epoch = start_epoch + EPOCHS_PER_SUPER_EPOCH - 1;

            for epoch in start_epoch..=end_epoch {
                let reward = get_expected_reward_emissions_for_epoch(epoch).unwrap();
                total += reward;
            }

            assert_eq!(
                total,
                expected_total,
                "Super epoch {} total emissions should match schedule",
                super_epoch_index + 1
            );
        }
    }
}
