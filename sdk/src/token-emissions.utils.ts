/**
 * NOTE: The values in this file are important because they control reward allocations.
 *
 * We may move these to some other more secure location in the future, but for
 * now they are simply hard-coded here, which is makes testing and development easier.
 */

/** ******************************************************************************
 *  Token Rewards Emission Schedule
 ******************************************************************************* */

export const INFERENCE_TOKEN_DECIMALS = 9;
const INFERENCE_TOKEN_CONVERSION_FACTOR = BigInt(
  10 ** INFERENCE_TOKEN_DECIMALS
);

function convertToTokenDenomination(amount: bigint): bigint {
  return amount * INFERENCE_TOKEN_CONVERSION_FACTOR;
}

export type TokenRewardsEmissionsSchedule = bigint[];

const EPOCHS_PER_SUPER_EPOCH = 1_000n;

const TOKEN_REWARDS_EMISSIONS_SCHEDULE_BY_SUPER_EPOCH: TokenRewardsEmissionsSchedule =
  [
    200_000_000n, // super epoch 1 = 2.0% of 10 billion
    180_000_000n, // super epoch 2 = 1.8% of 10 billion
    160_000_000n, // super epoch 3 ... etc.
    140_000_000n,
    120_000_000n,
    100_000_000n,
    80_000_000n,
    60_000_000n,
    40_000_000n,
    20_000_000n,
    10_000_000n,
  ].map((amount) => convertToTokenDenomination(amount));

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
};

function getEpochRewardsInclusiveOfDust(superEpochEmissions: bigint): bigint[] {
  const base = superEpochEmissions / EPOCHS_PER_SUPER_EPOCH;
  const dust = superEpochEmissions % EPOCHS_PER_SUPER_EPOCH;
  const final = Array.from(
    { length: Number(EPOCHS_PER_SUPER_EPOCH) },
    (_, i) => base + (BigInt(i) < dust ? 1n : 0n)
  );
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
    return { uptimeRewards: 0n, tokenRewards: 0n };
  }

  const superEpoch = (epoch - 1n) / EPOCHS_PER_SUPER_EPOCH;
  if (superEpoch >= BigInt(emissionsSchedule.length)) {
    return { uptimeRewards: 0n, tokenRewards: 0n };
  }

  const totalSuperEpoch = emissionsSchedule[Number(superEpoch)];
  if (totalSuperEpoch == null) {
    return { uptimeRewards: 0n, tokenRewards: 0n };
  }

  const epochRewards = getEpochRewardsInclusiveOfDust(totalSuperEpoch);
  const epochIndex = (epoch - 1n) % EPOCHS_PER_SUPER_EPOCH;
  const finalEpochRewards = epochRewards[Number(epochIndex)];
  if (finalEpochRewards == null) {
    throw new Error(`Invalid epoch index, received: ${epochIndex}`);
  }

  const uptimeRewards = (finalEpochRewards * uptimeRewardsPercentage) / 100n;
  const tokenRewards = finalEpochRewards - uptimeRewards;
  return { uptimeRewards, tokenRewards };
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
