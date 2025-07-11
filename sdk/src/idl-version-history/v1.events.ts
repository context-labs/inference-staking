import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

import type { IDL } from "./v1.idl";

/** ******************************************************************************
 *  Event Types
 * ----------------------------------------------------------------------------
 * Keep in sync with program event structs.
 ******************************************************************************* */

export type V1AccrueRewardEventData = {
  operatorPool: PublicKey;
  epoch: BN;
  totalRewardsTransferred: BN;
  totalUsdcTransferred: BN;
  delegatorRewards: BN;
  operatorRewardCommission: BN;
  delegatorUsdcEarnings: BN;
  operatorUsdcCommission: BN;
};

export type V1CancelUnstakeEventData = {
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
  sharesAmount: BN;
};

export type V1ChangeOperatorAdminEventData = {
  operatorPool: PublicKey;
  oldAdmin: PublicKey;
  newAdmin: PublicKey;
};

export type V1ChangeOperatorStakingRecordEventData = {
  operatorPool: PublicKey;
  admin: PublicKey;
  oldStakingRecord: PublicKey;
  newStakingRecord: PublicKey;
};

export type V1ClaimUnstakeEventData = {
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
};

export type V1ClaimUsdcEarningsEventData = {
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  destination: PublicKey;
  usdcAmount: BN;
};

export type V1SlashStakeEventData = {
  operatorPool: PublicKey;
  operatorStakingRecord: PublicKey;
  authority: PublicKey;
  destination: PublicKey;
  destinationUsdc: PublicKey;
  sharesSlashed: BN;
  tokenAmountSlashed: BN;
  usdcConfiscated: BN;
  rewardCommissionConfiscated: BN;
  usdcCommissionConfiscated: BN;
};

export type V1StakeEventData = {
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
  sharesAmount: BN;
};

export type V1SweepClosedPoolUsdcDustEventData = {
  operatorPool: PublicKey;
  admin: PublicKey;
  usdcAmountSwept: BN;
};

export type V1UnstakeEventData = {
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
  sharesAmount: BN;
  unstakeAtTimestamp: BN;
};

export type V1WithdrawOperatorRewardCommissionEventData = {
  operatorPool: PublicKey;
  admin: PublicKey;
  destination: PublicKey;
  rewardAmountWithdrawn: BN;
};

export type V1WithdrawOperatorUsdcCommissionEventData = {
  operatorPool: PublicKey;
  admin: PublicKey;
  destination: PublicKey;
  usdcAmountWithdrawn: BN;
};

export type V1EventDataMap = {
  accrueRewardEvent: V1AccrueRewardEventData;
  cancelUnstakeEvent: V1CancelUnstakeEventData;
  changeOperatorAdminEvent: V1ChangeOperatorAdminEventData;
  changeOperatorStakingRecordEvent: V1ChangeOperatorStakingRecordEventData;
  claimUnstakeEvent: V1ClaimUnstakeEventData;
  claimUsdcEarningsEvent: V1ClaimUsdcEarningsEventData;
  slashStakeEvent: V1SlashStakeEventData;
  stakeEvent: V1StakeEventData;
  sweepClosedPoolUsdcDustEvent: V1SweepClosedPoolUsdcDustEventData;
  unstakeEvent: V1UnstakeEventData;
  withdrawOperatorRewardCommissionEvent: V1WithdrawOperatorRewardCommissionEventData;
  withdrawOperatorUsdcCommissionEvent: V1WithdrawOperatorUsdcCommissionEventData;
};

type ExtractEventNames<T> = T extends { events: { name: infer N }[] }
  ? N
  : never;

export type V1InferenceStakingEvents = ExtractEventNames<typeof IDL>;

export type V1ParsedEvent<
  T extends V1InferenceStakingEvents = V1InferenceStakingEvents
> = {
  name: T;
  data: T extends keyof V1EventDataMap ? V1EventDataMap[T] : never;
};
