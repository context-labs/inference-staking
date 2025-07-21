/** ******************************************************************************
 *  Token Rewards Emission Schedule
 * ----------------------------------------------------------------------------
 * Keep in sync with emissions.rs.
 ******************************************************************************* */

const INFERENCE_TOKEN_DECIMALS = 9;

const INFERENCE_TOKEN_CONVERSION_FACTOR = BigInt(
  10 ** INFERENCE_TOKEN_DECIMALS
);

function convertToBozemans(amount: bigint): bigint {
  return amount * INFERENCE_TOKEN_CONVERSION_FACTOR;
}

export type TokenRewardsEmissionsSchedule = bigint[];

const EPOCHS_PER_SUPER_EPOCH = 300n;

// Total = 15.0% of 10 billion
const TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH: TokenRewardsEmissionsSchedule =
  [
    500_000_000n, // super epoch 1 = 5.0% of 10 billion
    400_000_000n, // super epoch 2 = 4.0% of 10 billion
    300_000_000n, // super epoch 3 = 3.0% of 10 billion
    200_000_000n, // super epoch 4 = 2.0% of 10 billion
    100_000_000n, // super epoch 5 = 1.0% of 10 billion
  ].map((amount) => convertToBozemans(amount));

/** ******************************************************************************
 *  Uptime Rewards Buckets
 ******************************************************************************* */

const UPTIME_REWARDS_PERCENTAGE_PER_EPOCH = 30n; // i.e. 30% out of 100%.

/** ******************************************************************************
 *  Utils
 ******************************************************************************* */

type EpochRewardEmissions = {
  uptimeRewards: bigint;
  tokenRewards: bigint;
  totalRewards: bigint;
};

/**
 * This function spreads out any dust across the epochs in the super epoch.
 *
 * For example, if the super epoch emissions are 10 and there are 3 epochs in the super epoch,
 * the final result will be [4, 3, 3]. 1 unit of dust will be allocated to the first epoch.
 */
function getEpochRewardsInclusiveOfDust(superEpochEmissions: bigint): bigint[] {
  const base = superEpochEmissions / EPOCHS_PER_SUPER_EPOCH;
  const dust = superEpochEmissions % EPOCHS_PER_SUPER_EPOCH;
  const final = Array.from(
    { length: Number(EPOCHS_PER_SUPER_EPOCH) },
    (_, i) => base + (BigInt(i) < dust ? 1n : 0n)
  );
  const total = final.reduce((acc, curr) => acc + curr, 0n);
  if (total !== superEpochEmissions) {
    throw new Error(
      `Invalid total epoch rewards, received: ${total}, expected: ${superEpochEmissions}`
    );
  }
  return final;
}

type GetTokenRewardsForEpochArgs = {
  emissionsSchedule?: TokenRewardsEmissionsSchedule;
  epoch: bigint;
  uptimeRewardsPercentage?: bigint;
};

function getTokenRewardsForEpoch({
  emissionsSchedule = TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
  epoch,
  uptimeRewardsPercentage = UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
}: GetTokenRewardsForEpochArgs): EpochRewardEmissions {
  if (epoch < 1n) {
    throw new Error(`Invalid epoch: ${epoch}`);
  }

  if (emissionsSchedule.length === 0) {
    return { uptimeRewards: 0n, tokenRewards: 0n, totalRewards: 0n };
  }

  const superEpoch = (epoch - 1n) / EPOCHS_PER_SUPER_EPOCH;
  if (superEpoch >= BigInt(emissionsSchedule.length)) {
    return { uptimeRewards: 0n, tokenRewards: 0n, totalRewards: 0n };
  }

  const totalSuperEpoch = emissionsSchedule[Number(superEpoch)];
  if (totalSuperEpoch == null) {
    return { uptimeRewards: 0n, tokenRewards: 0n, totalRewards: 0n };
  }

  const epochRewards = getEpochRewardsInclusiveOfDust(totalSuperEpoch);
  const epochIndex = (epoch - 1n) % EPOCHS_PER_SUPER_EPOCH;
  const finalEpochRewards = epochRewards[Number(epochIndex)];
  if (finalEpochRewards == null) {
    throw new Error(`Invalid epoch index, received: ${epochIndex}`);
  }

  const uptimeRewards = (finalEpochRewards * uptimeRewardsPercentage) / 100n;
  const tokenRewards = finalEpochRewards - uptimeRewards;
  const totalRewards = uptimeRewards + tokenRewards;
  if (uptimeRewards + tokenRewards !== finalEpochRewards) {
    throw new Error(
      `Invalid epoch rewards, received: ${finalEpochRewards}, expected: ${
        uptimeRewards + tokenRewards
      }`
    );
  }

  return { uptimeRewards, tokenRewards, totalRewards };
}

/** ******************************************************************************
 *  Export
 ******************************************************************************* */

export const TokenEmissionsUtils = {
  getTokenRewardsForEpoch,
  TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH,
  UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
  EPOCHS_PER_SUPER_EPOCH,
};
