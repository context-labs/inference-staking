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

import type {
  InferenceStakingErrors,
  OperatorPoolAccountStruct,
  StakingRecordAccountStruct,
} from "@sdk/src";
import type { InferenceStaking } from "@sdk/src/idl";
import { InferenceStakingProgramSdk } from "@sdk/src/sdk";

import { TEST_WITH_RELAY } from "@tests/lib/const";
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
    return bn.toString();
  }
};

const TOKEN_PRECISION = 1_000_000_000n;
const USDC_PRECISION = 1_000_000n;

const MIN_AMOUNT = 0;
const MAX_AMOUNT = 3;

// const MIN_AMOUNT = 0;
// const MAX_AMOUNT = 100;

// const MIN_AMOUNT = 1_000;
// const MAX_AMOUNT = 10_000;

// const MIN_AMOUNT = 1_000_000;
// const MAX_AMOUNT = 10_000_000;

// const MIN_AMOUNT = 10_000_000;
// const MAX_AMOUNT = 100_000_000;

export const generateRewardsForEpoch = (
  publicKeys: PublicKey[]
): ConstructMerkleTreeInput[] => {
  const input: ConstructMerkleTreeInput[] = [];
  for (const publicKey of publicKeys) {
    input.push({
      address: publicKey.toString(),
      tokenAmount: randomBigIntInRange(MIN_AMOUNT, MAX_AMOUNT, TOKEN_PRECISION),
      usdcAmount: randomBigIntInRange(MIN_AMOUNT, MAX_AMOUNT, USDC_PRECISION),
    });
  }
  return MerkleUtils.sortAddressList(input);
};

export function assertStakingProgramError(
  error: unknown,
  code: InferenceStakingErrors
) {
  const errorName =
    InferenceStakingProgramSdk.getErrorNameFromTransactionError(error);
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
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature,
  });
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
  if (!TEST_WITH_RELAY) {
    return;
  }

  try {
    const host = process.env.SOLANA_PROGRAMS_DB_HOST;
    if (host != null) {
      console.warn("\n- Local DB host provided, database state will be reset.");
      const pool = new Pool({
        host,
        port: Number(process.env.SOLANA_PROGRAMS_DB_PORT),
        user: process.env.SOLANA_PROGRAMS_DB_USERNAME,
        password: process.env.SOLANA_PROGRAMS_DB_PASSWORD,
        database: process.env.SOLANA_PROGRAMS_DB_NAME,
        ssl: false,
      });

      const query = `
        truncate pool_overview;
        truncate operator_pools cascade;
        truncate staking_records;
        truncate reward_records;
        truncate operator_pool_reward_claims;
        truncate solana_transactions cascade;
        truncate epoch_finalizations cascade;
      `;

      await pool.query(query);
      console.warn("- Database state reset successfully.\n");
    }
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
