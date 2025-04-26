import type * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStakingErrors } from "@sdk/src";
import type { InferenceStaking } from "@sdk/src/idl";
import { InferenceStakingProgramSDK } from "@sdk/src/sdk";

import type { ConstructMerkleTreeInput } from "@tests/lib/merkle";
import { MerkleUtils } from "@tests/lib/merkle";
import type { SetupTestResult } from "@tests/lib/setup";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sum = (arr: bigint[]): bigint => {
  return arr.reduce((acc, curr) => acc + curr, BigInt(0));
};

export const range = (len: number): number[] => {
  return [...new Array(len).keys()];
};

export const shuffleArray = <T>(arr: T[]): T[] => {
  return arr.sort(() => Math.random() - 0.5);
};

export const randomIntInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateRewardsForEpoch = (
  publicKeys: PublicKey[]
): ConstructMerkleTreeInput[] => {
  const input: ConstructMerkleTreeInput[] = [];
  for (const publicKey of publicKeys) {
    input.push({
      address: publicKey.toString(),
      tokenAmount: BigInt(randomIntInRange(1, 1_000_000)),
      usdcAmount: BigInt(randomIntInRange(1, 10_000)),
    });
  }
  return MerkleUtils.sortAddressList(input);
};

export function assertStakingProgramError(
  error: unknown,
  code: InferenceStakingErrors
) {
  const errorName =
    InferenceStakingProgramSDK.getErrorNameFromTransactionError(error);
  assert.equal(errorName, code);
}

export function assertError(error: unknown, code: string) {
  try {
    assert.equal(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).error.errorCode.code,
      code,
      `Expected error code to be ${code}`
    );
  } catch {
    // Fallback to generic error matching if the above fails.
    const msg = (error as Error).message;
    assert.equal(
      msg.includes(code),
      true,
      `Expected error message to include ${code}`
    );
  }
}

export const airdrop = async (
  provider: anchor.Provider,
  recipient: Keypair
) => {
  const tx = await provider.connection.requestAirdrop(
    recipient.publicKey,
    LAMPORTS_PER_SOL
  );
  await confirmTransaction(provider.connection, tx);
};

export const confirmTransaction = async (
  connection: Connection,
  signature: string
) => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature,
  });
};

export const setEpochFinalizationState = async ({
  setup,
  program,
  isEpochFinalizing = true,
}: {
  setup: SetupTestResult;
  program: Program<InferenceStaking>;
  isEpochFinalizing?: boolean;
}) => {
  const poolOverviewPre = await program.account.poolOverview.fetch(
    setup.poolOverview
  );
  assert(poolOverviewPre.isEpochFinalizing === !isEpochFinalizing);

  await program.methods
    .updateIsEpochFinalizing({
      isEpochFinalizing,
    })
    .accountsStrict({
      poolOverview: setup.poolOverview,
      authority: setup.rewardDistributionAuthority,
    })
    .signers([setup.rewardDistributionAuthorityKp])
    .rpc();

  const poolOverviewPost = await program.account.poolOverview.fetch(
    setup.poolOverview
  );
  assert(poolOverviewPost.isEpochFinalizing === isEpochFinalizing);
};

export const setStakingHalted = async ({
  setup,
  program,
  isStakingHalted = true,
}: {
  setup: SetupTestResult;
  program: Program<InferenceStaking>;
  isStakingHalted?: boolean;
}) => {
  const poolOverviewPre = await program.account.poolOverview.fetch(
    setup.poolOverview
  );
  assert(poolOverviewPre.isStakingHalted === !isStakingHalted);

  await program.methods
    .updatePoolOverview({
      ...setup.sdk.getEmptyPoolOverviewFieldsForUpdateInstruction(),
      isStakingHalted,
    })
    .accountsStrict({
      poolOverview: setup.poolOverview,
      programAdmin: setup.poolOverviewAdminKp.publicKey,
    })
    .signers([setup.poolOverviewAdminKp])
    .rpc();

  const poolOverviewPost = await program.account.poolOverview.fetch(
    setup.poolOverview
  );
  assert(poolOverviewPost.isStakingHalted === isStakingHalted);
};
