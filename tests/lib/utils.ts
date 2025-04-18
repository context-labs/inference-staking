import type { Connection } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStakingErrors } from "@sdk/src";
import { InferenceStakingProgramSDK } from "@sdk/src/sdk";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assert.equal((error as any).error.errorCode.code, code);
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
