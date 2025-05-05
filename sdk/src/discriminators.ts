import { IDL } from "./idl";

export const OPERATOR_POOL_DISCRIMINATOR = IDL.accounts.find(
  (i) => i.name === "operatorPool"
)?.discriminator;

export const STAKING_RECORD_DISCRIMINATOR = IDL.accounts.find(
  (i) => i.name === "stakingRecord"
)?.discriminator;

export const REWARD_RECORD_DISCRIMINATOR = IDL.accounts.find(
  (i) => i.name === "rewardRecord"
)?.discriminator;
