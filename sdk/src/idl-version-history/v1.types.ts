import type { Program } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";

import type { IDL, InferenceStaking } from "./v1.idl";

type ProgramType = Program<typeof IDL>;

/** ******************************************************************************
 *  Account Struct Types
 ******************************************************************************* */

export type V1OperatorPoolAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["operatorPool"]["fetch"]>
>;

export type V1PoolOverviewAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["poolOverview"]["fetch"]>
>;

export type V1RewardRecordAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["rewardRecord"]["fetch"]>
>;

export type V1StakingRecordAccountStruct = Awaited<
  ReturnType<ProgramType["account"]["stakingRecord"]["fetch"]>
>;

export type V1InferenceStakingAccountStructName =
  InferenceStaking["accounts"][number]["name"];

export type V1InstructionArgs<T extends keyof ProgramType["methods"]> =
  Parameters<ProgramType["methods"][T]>[0];

/** ******************************************************************************
 *  Error Types
 ******************************************************************************* */

type ExtractErrorNames<T> = T extends { errors: { name: infer N }[] }
  ? N
  : never;

export type V1InferenceStakingErrors = ExtractErrorNames<typeof IDL>;

/** ******************************************************************************
 *  Instruction Types
 ******************************************************************************* */

type ExtractInstructionNames<T> = T extends {
  instructions: { name: infer N }[];
}
  ? N
  : never;

export type V1InferenceStakingInstructions = ExtractInstructionNames<
  typeof IDL
>;

/** ******************************************************************************
 *  Decoded Instructions - Fixed for nested args
 ******************************************************************************* */

// Helper to check if an instruction has an "args" parameter
type HasArgsParameter<T extends V1InferenceStakingInstructions> = Extract<
  InferenceStaking["instructions"][number],
  { name: T }
>["args"][0] extends { name: "args" }
  ? true
  : false;

// Original args type (what the method expects)
type RawInstructionArgs<T extends V1InferenceStakingInstructions> =
  V1InstructionArgs<T>;

// The actual decoded args structure
export type V1InstructionArgsMap = {
  [K in V1InferenceStakingInstructions]: HasArgsParameter<K> extends true
    ? { args: RawInstructionArgs<K> }
    : RawInstructionArgs<K>;
};

export type V1InstructionAccountNames<
  T extends V1InferenceStakingInstructions
> = Extract<
  InferenceStaking["instructions"][number],
  { name: T }
>["accounts"][number]["name"];

export type V1InferenceStakingAccountName =
  InferenceStaking["instructions"][number]["accounts"][number]["name"];

export type V1AccountMetaWithName = {
  name: V1InferenceStakingAccountName;
  pubkey: PublicKey;
  isSigner: boolean;
  isWritable: boolean;
};

export type V1InstructionAccountsMap<T extends V1InferenceStakingInstructions> =
  Partial<Record<V1InstructionAccountNames<T>, V1AccountMetaWithName>>;

export type V1DecodedStakingProgramInstruction = {
  [K in V1InferenceStakingInstructions]: {
    name: K;
    args: V1InstructionArgsMap[K];
    accounts: V1InstructionAccountsMap<K>;
  };
}[V1InferenceStakingInstructions];
