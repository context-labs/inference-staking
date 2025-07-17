import { describe, expect, it } from "bun:test";

import { TokenEmissionsUtils } from "@sdk/src";

const {
  getTokenRewardsForEpoch,
  EPOCHS_PER_SUPER_EPOCH,
  TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
  UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
} = TokenEmissionsUtils;

describe("TokenEmissionsUtils", () => {
  describe("getTokenRewardsForEpoch - full emissions schedule", () => {
    it("correctly distributes all rewards if the entire emissions scheduled is used", () => {
      let epoch = 1n;
      let totalDistributedRewards = 0n;

      const finalEpoch =
        EPOCHS_PER_SUPER_EPOCH *
        BigInt(TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH.length);
      while (epoch <= finalEpoch) {
        const { uptimeRewards, tokenRewards } = getTokenRewardsForEpoch({
          emissionsSchedule: TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
          epoch,
          uptimeRewardsPercentage: UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
        });
        totalDistributedRewards += uptimeRewards + tokenRewards;
        epoch++;
      }

      const totalExpectedEmissions =
        TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH.reduce(
          (acc, curr) => acc + curr,
          0n
        );
      expect(totalDistributedRewards).toBe(totalExpectedEmissions);

      const nextEmissions = getTokenRewardsForEpoch({
        emissionsSchedule: TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
        epoch: epoch + 1n,
        uptimeRewardsPercentage: UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
      });
      expect(nextEmissions.uptimeRewards).toBe(0n);
      expect(nextEmissions.tokenRewards).toBe(0n);
    });
  });

  describe("getTokenRewardsForEpoch — additional cases", () => {
    const schedule = TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH;
    const uptimePercentage = UPTIME_REWARDS_PERCENTAGE_PER_EPOCH;
    const finalEpoch = EPOCHS_PER_SUPER_EPOCH * BigInt(schedule.length);

    it("throws if epoch < 1", () => {
      expect(() =>
        getTokenRewardsForEpoch({
          emissionsSchedule: schedule,
          epoch: 0n,
          uptimeRewardsPercentage: uptimePercentage,
        })
      ).toThrow(/Invalid epoch/);
    });

    it("returns 0 after the schedule is exhausted", () => {
      const beyond = finalEpoch + 1n;
      // Test a few epochs beyond the schedule
      for (let i = 0; i < 10; i++) {
        const { uptimeRewards, tokenRewards } = getTokenRewardsForEpoch({
          emissionsSchedule: schedule,
          epoch: beyond + BigInt(i),
          uptimeRewardsPercentage: uptimePercentage,
        });
        expect(uptimeRewards).toBe(0n);
        expect(tokenRewards).toBe(0n);
      }
    });

    it("rolls over to super epoch 2 correctly", () => {
      // Test first epoch of super epoch 2
      const firstEpochSuperEpoch2 = EPOCHS_PER_SUPER_EPOCH + 1n;
      const result = getTokenRewardsForEpoch({
        emissionsSchedule: schedule,
        epoch: firstEpochSuperEpoch2,
        uptimeRewardsPercentage: uptimePercentage,
      });

      // Total should match schedule[1]/EPOCHS_PER_SUPER_EPOCH ± dust
      const total = result.uptimeRewards + result.tokenRewards;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const base2 = schedule[1]! / EPOCHS_PER_SUPER_EPOCH;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dust2 = schedule[1]! % EPOCHS_PER_SUPER_EPOCH;
      // epochIndex = 0 → should get base2 + (0 < dust2 ? 1 : 0)
      expect(total).toBe(base2 + (dust2 > 0n ? 1n : 0n));
    });

    it("distributes dust exactly on the first N epochs", () => {
      // use a tiny custom schedule to make the math easy with 300 epochs per super epoch
      const tiny: bigint[] = [302n]; // base=1, dust=2 (302/300 = 1 remainder 2)
      // epoch 1 & 2 → 2; epochs 3–300 → 1

      // Helper function to get total rewards for an epoch
      const getTotalRewards = (epoch: bigint) => {
        const result = getTokenRewardsForEpoch({
          emissionsSchedule: tiny,
          epoch,
          uptimeRewardsPercentage: uptimePercentage,
        });
        return result.uptimeRewards + result.tokenRewards;
      };

      expect(getTotalRewards(1n)).toBe(2n); // gets dust
      expect(getTotalRewards(2n)).toBe(2n); // gets dust
      expect(getTotalRewards(3n)).toBe(1n); // no dust
      expect(getTotalRewards(300n)).toBe(1n); // no dust (last epoch)
    });
  });
});
