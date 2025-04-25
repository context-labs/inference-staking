import type { Program } from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStakingErrors } from "@sdk/src";
import type { InferenceStaking } from "@sdk/src/idl";
import { InferenceStakingProgramSDK } from "@sdk/src/sdk";

import type { SetupTestResult } from "@tests/lib/setup";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
