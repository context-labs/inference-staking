import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export interface StakeEvent {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  stakeAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
}

export interface UnstakeEvent {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  unstakeAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
}

export interface ClaimUnstakeEvent {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  unstakeAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
}

export interface SlashStakeEvent {
  stakingRecord: PublicKey;
  operatorPool: PublicKey;
  slashedAmount: BN;
  totalStakedAmount: BN;
  totalUnstaking: BN;
}

export interface CompleteAccrueRewardEvent {
  operatorPool: PublicKey;
  totalStakedAmount: BN;
  totalUnstaking: BN;
}
