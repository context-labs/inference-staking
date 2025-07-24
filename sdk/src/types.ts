import type { Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

import type { IDL, InferenceStaking } from "./idl";

type ProgramType = Program<typeof IDL>;

/** ******************************************************************************
 *  Account Struct Types
 ******************************************************************************* */

export type OperatorPoolAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["operatorPool"]["fetch"]>
>;

export type PoolOverviewAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["poolOverview"]["fetch"]>
>;

export type RewardRecordAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["rewardRecord"]["fetch"]>
>;

export type StakingRecordAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["stakingRecord"]["fetch"]>
>;

export type InferenceStakingAccountStructName =
  InferenceStaking["accounts"][number]["name"];

export type InstructionArgs<T extends keyof ProgramType["methods"]> =
  Parameters<ProgramType["methods"][T]>[0];

/** ******************************************************************************
 *  Error Types
 ******************************************************************************* */

type ExtractErrorNames<T> = T extends { errors: { name: infer N }[] }
  ? N
  : never;

export type InferenceStakingErrorName = ExtractErrorNames<typeof IDL>;

/** ******************************************************************************
 *  Instruction Types
 ******************************************************************************* */

type ExtractInstructionNames<T> = T extends {
  instructions: { name: infer N }[];
}
  ? N
  : never;

export type InferenceStakingInstructionName = ExtractInstructionNames<
  typeof IDL
>;

/** ******************************************************************************
 *  Decoded Instructions - Fixed for nested args
 ******************************************************************************* */

// Original args type (what the method expects)
type RawInstructionArgs<T extends InferenceStakingInstructionName> =
  InstructionArgs<T>;

// The raw (Borsch) decoded args structure
export type RawInstructionArgsMap = {
  [K in InferenceStakingInstructionName]: { args: RawInstructionArgs<K> };
};

export type InstructionArgsMap = {
  [K in InferenceStakingInstructionName]: RawInstructionArgs<K>;
};

export type InstructionAccountNames<T extends InferenceStakingInstructionName> =
  Extract<
    InferenceStaking["instructions"][number],
    { name: T }
  >["accounts"][number]["name"];

export type InferenceStakingAccountName =
  InferenceStaking["instructions"][number]["accounts"][number]["name"];

export type AccountMetaWithName = {
  name: InferenceStakingAccountName;
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
};

export type InstructionAccountsMap<T extends InferenceStakingInstructionName> =
  Partial<Record<InstructionAccountNames<T>, AccountMetaWithName>>;

export type DecodedStakingProgramInstruction = {
  [K in InferenceStakingInstructionName]: {
    name: K;
    accounts: InstructionAccountsMap<K>;
    args: InstructionArgsMap[K];
    instructionIndex: number;
  };
}[InferenceStakingInstructionName];
