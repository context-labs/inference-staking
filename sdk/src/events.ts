import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

import type { IDL } from "./idl";

/** ******************************************************************************
 *  Event Types
 * ----------------------------------------------------------------------------
 * Keep in sync with program event structs.
 ******************************************************************************* */

export type AccrueRewardEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  epoch: BN;
  totalRewardsTransferred: BN;
  totalUsdcTransferred: BN;
  delegatorRewards: BN;
  operatorRewardCommission: BN;
  delegatorUsdcEarnings: BN;
  operatorUsdcCommission: BN;
};

export type CancelUnstakeEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
  sharesAmount: BN;
};

export type ChangeOperatorAdminEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  oldAdmin: PublicKey;
  newAdmin: PublicKey;
};

export type ChangeOperatorStakingRecordEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  admin: PublicKey;
  oldStakingRecord: PublicKey;
  newStakingRecord: PublicKey;
};

export type ClaimUnstakeEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
};

export type ClaimUsdcEarningsEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  destination: PublicKey;
  usdcAmount: BN;
};

export type SlashStakeEventData = {
  instructionIndex: number;
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

export type StakeEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
  sharesAmount: BN;
};

export type SweepClosedPoolUsdcDustEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  admin: PublicKey;
  usdcAmountSwept: BN;
};

export type UnstakeEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  stakingRecord: PublicKey;
  owner: PublicKey;
  isOperator: boolean;
  tokenAmount: BN;
  sharesAmount: BN;
  unstakeAtTimestamp: BN;
};

export type WithdrawOperatorRewardCommissionEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  admin: PublicKey;
  destination: PublicKey;
  rewardAmountWithdrawn: BN;
};

export type WithdrawOperatorUsdcCommissionEventData = {
  instructionIndex: number;
  operatorPool: PublicKey;
  admin: PublicKey;
  destination: PublicKey;
  usdcAmountWithdrawn: BN;
};

export type EventDataMap = {
  accrueRewardEvent: AccrueRewardEventData;
  cancelUnstakeEvent: CancelUnstakeEventData;
  changeOperatorAdminEvent: ChangeOperatorAdminEventData;
  changeOperatorStakingRecordEvent: ChangeOperatorStakingRecordEventData;
  claimUnstakeEvent: ClaimUnstakeEventData;
  claimUsdcEarningsEvent: ClaimUsdcEarningsEventData;
  slashStakeEvent: SlashStakeEventData;
  stakeEvent: StakeEventData;
  sweepClosedPoolUsdcDustEvent: SweepClosedPoolUsdcDustEventData;
  unstakeEvent: UnstakeEventData;
  withdrawOperatorRewardCommissionEvent: WithdrawOperatorRewardCommissionEventData;
  withdrawOperatorUsdcCommissionEvent: WithdrawOperatorUsdcCommissionEventData;
};

type ExtractEventNames<T> = T extends { events: { name: infer N }[] }
  ? N
  : never;

export type InferenceStakingEvents = ExtractEventNames<typeof IDL>;

export type ParsedEvent<
  T extends InferenceStakingEvents = InferenceStakingEvents
> = {
  name: T;
  data: T extends keyof EventDataMap ? EventDataMap[T] : never;
};
