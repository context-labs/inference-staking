import { writeFileSync } from "fs";

import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  ConfirmOptions,
  Connection,
  PublicKey,
  Signer,
} from "@solana/web3.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { assert } from "chai";
import { Pool } from "pg";

import { TokenEmissionsUtils } from "@sdk/src";
import type {
  InferenceStakingErrors,
  OperatorPoolAccountStruct,
  StakingRecordAccountStruct,
} from "@sdk/src";
import type { InferenceStaking } from "@sdk/src/idl";
import { InferenceStakingProgramSdk } from "@sdk/src/sdk";

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

export const shortId = (): string => {
  return Math.random().toString(36).substring(2, 8);
};

export const batchArray = <T>(arr: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
};

export const randomIntInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomBigIntInRange = (
  min: number,
  max: number,
  scaleFactor: bigint
): bigint => {
  return BigInt(randomIntInRange(min, max)) * scaleFactor;
};

export const debug = (msg: string) => {
  if (process.env.ENABLE_DEBUG_LOGS === "true") {
    console.debug(msg);
  }
};

export const formatBN = (bn: anchor.BN): string => {
  try {
    return bn.toNumber().toLocaleString();
  } catch {
    return bn.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

const USDC_PRECISION = 1_000_000n;

const AMOUNT_RANGES = {
  "0": {
    MIN_AMOUNT: 0,
    MAX_AMOUNT: 3,
  },
  "1": {
    MIN_AMOUNT: 0,
    MAX_AMOUNT: 100,
  },
  "2": {
    MIN_AMOUNT: 1_000,
    MAX_AMOUNT: 10_000,
  },
  "3": {
    MIN_AMOUNT: 10_000,
    MAX_AMOUNT: 100_000,
  },
  "4": {
    MIN_AMOUNT: 100_000,
    MAX_AMOUNT: 1_000_000,
  },
  "5": {
    MIN_AMOUNT: 1_000_000,
    MAX_AMOUNT: 10_000_000,
  },
  "6": {
    MIN_AMOUNT: 10_000_000,
    MAX_AMOUNT: 100_000_000,
  },
};

type AmountRange = "0" | "1" | "2" | "3" | "4" | "5" | "6";

export const generateRewardsForEpoch = (
  publicKeys: PublicKey[],
  epoch: number,
  usdcAmountRange: AmountRange = "6"
): ConstructMerkleTreeInput[] => {
  const { MIN_AMOUNT, MAX_AMOUNT } = AMOUNT_RANGES[usdcAmountRange];
  const { totalRewards } = TokenEmissionsUtils.getTokenRewardsForEpoch({
    epoch: BigInt(epoch),
  });

  const numKeys = publicKeys.length;
  if (numKeys === 0) {
    return [];
  }

  const baseTokenAmount = totalRewards / BigInt(numKeys);
  let tokenDust = totalRewards % BigInt(numKeys);

  const input: ConstructMerkleTreeInput[] = [];
  for (const publicKey of publicKeys) {
    const tokenAmount = baseTokenAmount;
    const usdcAmount = randomBigIntInRange(
      MIN_AMOUNT,
      MAX_AMOUNT,
      USDC_PRECISION
    );

    input.push({
      address: publicKey.toString(),
      tokenAmount,
      usdcAmount,
    });
  }

  while (tokenDust > 0n) {
    for (const val of input) {
      if (tokenDust === 0n) {
        break;
      }

      val.tokenAmount += 1n;
      tokenDust -= 1n;
    }
  }

  const totalTokenAmount = input.reduce(
    (acc, curr) => acc + curr.tokenAmount,
    0n
  );
  if (totalTokenAmount !== totalRewards) {
    throw new Error(
      `Total token amount ${totalTokenAmount} does not match total rewards ${totalRewards}`
    );
  }

  return MerkleUtils.sortAddressList(input);
};

export function assertStakingProgramError(
  error: unknown,
  code: InferenceStakingErrors
) {
  const errorName =
    InferenceStakingProgramSdk.getErrorNameFromTransactionError(error);

  if (errorName !== code) {
    console.error(error);
  }

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
    LAMPORTS_PER_SOL * 1_000
  );
  await confirmTransaction(provider.connection, tx);
};

export const confirmTransaction = async (
  connection: Connection,
  signature: string
) => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature,
    },
    "confirmed"
  );
};

export const handleMarkEpochAsFinalizing = async ({
  setup,
  program,
}: {
  setup: SetupTestResult;
  program: Program<InferenceStaking>;
}) => {
  const poolOverviewPre = await program.account.poolOverview.fetch(
    setup.poolOverview
  );

  await program.methods
    .markEpochAsFinalizing({
      expectedEpoch: new anchor.BN(
        poolOverviewPre.completedRewardEpoch.toNumber() + 1
      ),
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
  assert(poolOverviewPost.isEpochFinalizing === true);
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
      registrationFeePayoutWallet: null,
    })
    .signers([setup.poolOverviewAdminKp])
    .rpc();

  const poolOverviewPost = await program.account.poolOverview.fetch(
    setup.poolOverview
  );
  assert(poolOverviewPost.isStakingHalted === isStakingHalted);
};

export const assertStakingRecordCreatedState = ({
  poolPost,
  poolPre,
  stakingRecordPost,
  stakingRecordPre,
  stakeAmount,
}: {
  poolPost: OperatorPoolAccountStruct;
  poolPre: OperatorPoolAccountStruct;
  stakingRecordPost: StakingRecordAccountStruct;
  stakingRecordPre: StakingRecordAccountStruct;
  stakeAmount: anchor.BN;
}) => {
  // 1:1 share↔token ratio means both totals rise by stakeAmount
  assert(
    poolPost.totalStakedAmount.sub(poolPre.totalStakedAmount).eq(stakeAmount),
    "totalStakedAmount must increase by stakeAmount"
  );
  assert(
    poolPost.totalShares.sub(poolPre.totalShares).eq(stakeAmount),
    "totalShares must increase by stakeAmount"
  );

  // Delegator’s record should reflect the new shares
  assert(
    stakingRecordPost.shares.sub(stakingRecordPre.shares).eq(stakeAmount),
    "StakingRecord.shares must increase by stakeAmount"
  );
  assert(
    stakingRecordPost.tokensUnstakeAmount.eq(
      stakingRecordPre.tokensUnstakeAmount
    ),
    "No tokens should be in unstake queue immediately after staking"
  );
};

// Helper function for end-to-end local testing.
export const resetDatabaseState = async () => {
  if (process.env.SHOULD_RESET_DATABASE !== "true") {
    return;
  }

  try {
    const host = process.env.SOLANA_PROGRAMS_DB_HOST;
    const port = process.env.SOLANA_PROGRAMS_DB_PORT;
    const user = process.env.SOLANA_PROGRAMS_DB_USERNAME;
    const password = process.env.SOLANA_PROGRAMS_DB_PASSWORD;
    const database = process.env.SOLANA_PROGRAMS_DB_NAME;
    if (
      host == null ||
      port == null ||
      isNaN(Number(port)) ||
      user == null ||
      password == null ||
      database == null
    ) {
      console.warn(
        "- Invalid database credentials provided, skipping database state reset."
      );
      return;
    }

    console.warn("\n- Resetting database state...");
    const pool = new Pool({
      host,
      port: Number(port),
      user,
      password,
      database,
      ssl: false,
    });

    const tables = process.env.SOLANA_DB_TABLE_NAMES ?? "";
    const names = tables.split(",");
    if (names.length === 0) {
      console.warn("- No tables to truncate, skipping database state reset.");
      return;
    }

    const query = `${names
      .map((name) => `truncate ${name} cascade;`)
      .join("\n")}`;

    await pool.query(query);
    console.warn("- Database state reset successfully.\n");
  } catch (err) {
    console.error("Failed to reset database state");
    console.error(err);
  }
};

export const createMintIfNotExists = async (
  connection: Connection,
  payer: Signer,
  mintAuthority: PublicKey,
  freezeAuthority: PublicKey | null,
  decimals: number,
  keypair = Keypair.generate(),
  confirmOptions?: ConfirmOptions,
  programId = TOKEN_PROGRAM_ID
) => {
  const accountInfo = await connection.getAccountInfo(keypair.publicKey);
  if (accountInfo != null) {
    debug(
      `- Token mint ${keypair.publicKey.toString()} already exists, skipping creation`
    );
    return keypair.publicKey;
  }

  const result = await createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals,
    keypair,
    confirmOptions,
    programId
  );

  debug(
    `- Created token mint ${result.toString()} with mint authority ${mintAuthority.toString()}`
  );

  return result;
};

export const convertToTokenUnitAmount = (amount: number) => {
  return new anchor.BN(amount).mul(new anchor.BN(10 ** 9));
};

export const saveTransactionReceiptForDebugging = async (
  connection: Connection,
  signature: string
) => {
  await confirmTransaction(connection, signature);
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  const serializedTransactionMessage = tx?.transaction.message.serialize();
  const serializedMessage = serializedTransactionMessage?.toString("base64");

  const shortSignature = signature.slice(0, 8);
  writeFileSync(`tx-${shortSignature}.json`, JSON.stringify(tx, null, 2));
  writeFileSync(
    `tx-message-${shortSignature}.json`,
    JSON.stringify(serializedMessage, null, 2)
  );
};
