import type { BN } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

export type StakeEvent = {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  stakeAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
};

export type UnstakeEvent = {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  unstakeAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
};

export type ClaimUnstakeEvent = {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  unstakeAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
};

export type SlashStakeEvent = {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  slashedAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
};

export type CompleteAccrueRewardEvent = {
  operatorPool: PublicKey;
  totalStakedAmount: BN;
  totalUnstaking: BN;
};
