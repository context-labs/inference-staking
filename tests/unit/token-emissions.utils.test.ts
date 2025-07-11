import { describe, expect, it } from "bun:test";

import { TokenEmissionsUtils } from "@sdk/src";

describe("TokenEmissionsUtils", () => {
  describe("getTokenRewardsForEpoch - full emissions schedule", () => {
    it("correctly distributes all rewards if the entire emissions scheduled is used", () => {
      let epoch = 1n;
      let totalDistributedRewards = 0n;

      const finalEpoch =
        TokenEmissionsUtils.EPOCHS_PER_SUPER_EPOCH *
        BigInt(
          TokenEmissionsUtils.TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH
            .length
        );
      while (epoch <= finalEpoch) {
        const { uptimeRewards, tokenRewards } =
          TokenEmissionsUtils.getTokenRewardsForEpoch({
            emissionsSchedule:
              TokenEmissionsUtils.TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
            epoch,
            uptimeRewardsPercentage:
              TokenEmissionsUtils.UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
          });
        totalDistributedRewards += uptimeRewards + tokenRewards;
        epoch++;
      }

      const totalExpectedEmissions =
        TokenEmissionsUtils.TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH.reduce(
          (acc, curr) => acc + curr,
          0n
        );
      expect(totalDistributedRewards).toBe(totalExpectedEmissions);

      const nextEmissions = TokenEmissionsUtils.getTokenRewardsForEpoch({
        emissionsSchedule:
          TokenEmissionsUtils.TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
        epoch: epoch + 1n,
        uptimeRewardsPercentage:
          TokenEmissionsUtils.UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
      });
      expect(nextEmissions.uptimeRewards).toBe(0n);
      expect(nextEmissions.tokenRewards).toBe(0n);
    });
  });

  describe("getTokenRewardsForEpoch — additional cases", () => {
    const schedule =
      TokenEmissionsUtils.TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH;
    const uptimePercentage =
      TokenEmissionsUtils.UPTIME_REWARDS_PERCENTAGE_PER_EPOCH;
    const finalEpoch =
      TokenEmissionsUtils.EPOCHS_PER_SUPER_EPOCH * BigInt(schedule.length);

    it("throws if epoch < 1", () => {
      expect(() =>
        TokenEmissionsUtils.getTokenRewardsForEpoch({
          emissionsSchedule: schedule,
          epoch: 0n,
          uptimeRewardsPercentage: uptimePercentage,
        })
      ).toThrow(/Invalid epoch/);
    });

    it("returns 0 after the schedule is exhausted", () => {
      const beyond = finalEpoch + 1n;
      const current = beyond;
      while (current <= 1_000) {
        const { uptimeRewards, tokenRewards } =
          TokenEmissionsUtils.getTokenRewardsForEpoch({
            emissionsSchedule: schedule,
            epoch: beyond,
            uptimeRewardsPercentage: uptimePercentage,
          });
        expect(uptimeRewards).toBe(0n);
        expect(tokenRewards).toBe(0n);
      }
    });

    it("rolls over to super epoch 2 correctly", () => {
      // epoch 1000 → last epoch of super epoch 1, epoch 1001 → epoch 1 of super epoch 2
      const e1001 = TokenEmissionsUtils.getTokenRewardsForEpoch({
        emissionsSchedule: schedule,
        epoch: 1001n,
        uptimeRewardsPercentage: uptimePercentage,
      });

      // e1001's token + uptime should match schedule[1]/1000 ± dust
      const total1001 = e1001.uptimeRewards + e1001.tokenRewards;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const base2 = schedule[1]! / TokenEmissionsUtils.EPOCHS_PER_SUPER_EPOCH;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const dust2 = schedule[1]! % TokenEmissionsUtils.EPOCHS_PER_SUPER_EPOCH;
      // epochIndex = 0 → should get base2 + (0 < dust2 ? 1 : 0)
      expect(total1001).toBe(base2 + (dust2 > 0n ? 1n : 0n));
    });

    it("distributes dust exactly on the first N epochs", () => {
      // use a tiny custom schedule to make the math easy
      const tiny: bigint[] = [1002n]; // base=1, dust=2
      // epoch 1 & 2 → 2; epochs 3–1000 → 1
      expect(
        TokenEmissionsUtils.getTokenRewardsForEpoch({
          emissionsSchedule: tiny,
          epoch: 1n,
          uptimeRewardsPercentage: uptimePercentage,
        }).uptimeRewards +
          TokenEmissionsUtils.getTokenRewardsForEpoch({
            emissionsSchedule: tiny,
            epoch: 1n,
            uptimeRewardsPercentage: uptimePercentage,
          }).tokenRewards
      ).toBe(2n);
      expect(
        TokenEmissionsUtils.getTokenRewardsForEpoch({
          emissionsSchedule: tiny,
          epoch: 2n,
          uptimeRewardsPercentage: uptimePercentage,
        }).uptimeRewards +
          TokenEmissionsUtils.getTokenRewardsForEpoch({
            emissionsSchedule: tiny,
            epoch: 2n,
            uptimeRewardsPercentage: uptimePercentage,
          }).tokenRewards
      ).toBe(2n);
      expect(
        TokenEmissionsUtils.getTokenRewardsForEpoch({
          emissionsSchedule: tiny,
          epoch: 3n,
          uptimeRewardsPercentage: uptimePercentage,
        }).uptimeRewards +
          TokenEmissionsUtils.getTokenRewardsForEpoch({
            emissionsSchedule: tiny,
            epoch: 3n,
            uptimeRewardsPercentage: uptimePercentage,
          }).tokenRewards
      ).toBe(1n);
    });
  });
});
