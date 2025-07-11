import * as anchor from "@coral-xyz/anchor";
import type { VersionedTransactionResponse, PublicKey } from "@solana/web3.js";
import { VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import { describe, it } from "bun:test";
import { assert } from "chai";
import invariant from "invariant";

import { InferenceStakingProgramSdk } from "@sdk/src";

import { TEST_PROGRAM_ID } from "@tests/lib/setup";

const V1_ACCRUE_REWARD_TRANSACTION_RESPONSE = {
  blockTime: 1752245525,
  meta: {
    computeUnitsConsumed: 90028,
    err: null,
    fee: 5000,
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            accounts: [4, 9, 2],
            data: "3DVoBsiaAiMV",
            programIdIndex: 12,
            stackHeight: 2,
          },
          {
            accounts: [4, 8, 2],
            data: "3Dcjs7gyu13D",
            programIdIndex: 12,
            stackHeight: 2,
          },
          {
            accounts: [5, 1, 2],
            data: "3di6E1GNgHGK",
            programIdIndex: 12,
            stackHeight: 2,
          },
          {
            accounts: [5, 3, 2],
            data: "3j4Bk4mNRi7H",
            programIdIndex: 12,
            stackHeight: 2,
          },
        ],
      },
    ],
    loadedAddresses: {
      readonly: [],
      writable: [],
    },
    logMessages: [
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG invoke [1]",
      "Program log: Instruction: AccrueReward",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 141051 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 133940 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 126830 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 119719 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program data: C8QH6W/9qSjrwnEtl1MkaObePa9EY3qYRxypC9AFcaZ0Wbnvz2gmaQEAAAAAAAAAACwgFHPLWwBA7suLvTkAAADyKnPK4SIAADr1oKjpOACw8tgoTisAAJD78mJvDgAA",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG consumed 90028 of 200000 compute units",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG success",
    ],
    postBalances: [
      499999999999885000, 2039280, 5526240, 2039280, 2039280, 2039280, 1726080,
      6389280, 2039280, 2039280, 2310720, 1141440, 929020800,
    ],
    postTokenBalances: [
      {
        accountIndex: 1,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "15871564250000",
          decimals: 6,
          uiAmount: 15871564.25,
          uiAmountString: "15871564.25",
        },
      },
      {
        accountIndex: 3,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "47614692750000",
          decimals: 6,
          uiAmount: 47614692.75,
          uiAmountString: "47614692.75",
        },
      },
      {
        accountIndex: 4,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 9,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 5,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 6,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 8,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "21734838840000000",
          decimals: 9,
          uiAmount: 21734838.84,
          uiAmountString: "21734838.84",
        },
      },
      {
        accountIndex: 9,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "16019509160000000",
          decimals: 9,
          uiAmount: 16019509.16,
          uiAmountString: "16019509.16",
        },
      },
    ],
    preBalances: [
      499999999999890000, 2039280, 5526240, 2039280, 2039280, 2039280, 1726080,
      6389280, 2039280, 2039280, 2310720, 1141440, 929020800,
    ],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 6,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 3,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 6,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 4,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "25837918000000000",
          decimals: 9,
          uiAmount: 25837918,
          uiAmountString: "25837918",
        },
      },
      {
        accountIndex: 5,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "63486257000000",
          decimals: 6,
          uiAmount: 63486257,
          uiAmountString: "63486257",
        },
      },
      {
        accountIndex: 8,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "11916430000000000",
          decimals: 9,
          uiAmount: 11916430,
          uiAmountString: "11916430",
        },
      },
      {
        accountIndex: 9,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 9,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
    ],
    rewards: [],
    status: {
      Ok: null,
    },
  },
  slot: 32,
  transaction: {
    message: {
      header: {
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 3,
        numRequiredSignatures: 1,
      },
      accountKeys: [
        "DSBUSi6mGSKeKXab2hxGeiJeXrXM65NCCpTtPG19RZ3Y",
        "3mgnDJHzErrfKtF1yxruxf7qKi8DBkQZZkcFovsads2E",
        "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        "8dqzDu3SHkBiibASy6ekTUbvpHJEhCocjBUrGC7WJCiv",
        "AnFBZDLbMdQCWW2sZief65oJkp6ZZA97cJ97rBKqR6nK",
        "B7Q5uVbRxzw3PqPJSDWtZyrunw8eEmHmY3gKZBeNaQXs",
        "D4UdDaNXWKg3bgs778jVXpJpCiHpScMnoybVh41edkvM",
        "GsJmvbtDdWc4ehmP9gKFsgQ7X7iTyouAzaSUC4zbdvwS",
        "HymVGVNVMHzG4EWkTqmkSV3Ng6FJwM8yrrwwaKvTRoWe",
        "Hz1pxAT3aexH9U8gGBkswFUp3Dd18yj9fDrWoVYQFMun",
        "EmsktPJ6h3jCCNJY9fSpgW3HgNnEVeiWGuuQnFSPVYvA",
        "stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG",
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      ],
      recentBlockhash: "6fZ5jS7yFBDBTMCFLzuSKPKSsVDF8eH4ThaoojYNpis4",
      instructions: [
        {
          accounts: [2, 10, 7, 6, 4, 5, 8, 9, 1, 3, 12],
          data: "HfgB5xVgEP4yhv73ccA4Bq6sv8CDeBga8pKHLeNhKzEsH",
          programIdIndex: 11,
          stackHeight: null,
        },
      ],
      indexToProgramIds: {},
    },
    signatures: [
      "2MrmzwGByo5fVU27RK8WuouKRigAD7u4FhC5FYcBni9CBN3oqHKYLzG6cYf1T6vaQ6e8j79LKLusDbwqBi1khi1T",
    ],
  },
  version: "legacy",
};

const V1_ACCRUE_REWARD_SERIALIZED_MESSAGE =
  "AQADDbi/mvpV+O6DG3bGWy6t4XknMoEBs0nObKgHicgJCwETKSnohhq2kz5TMr2KVBFUIRznvGxaWF3OpnjpAfHbPX9MN/GveQ4T8pvin1rcSDrv6Pa9icFyX7hMrJ/o2+mrtnFyG1+g74S1YdJZERWP3x6HG/lyyAJh2S+1CYqW2AyDkVBauCMn37FzQuO67y2KyJrjooM+vT3bF21WMVd5qviWOHS3dNqalDnbhp2VfmNaHVZJGYRi2w79PuP55fV9UrMwOHgrLkRKWryGu7rOQFgN04t8rFkvVPMAhqQkLPjS68JxLZdTJGjm3j2vRGN6mEccqQvQBXGmdFm5789oJmn8RdFyYVrRbHHw14+I2wqzAsyhY4dh1dtRA5lePyLNr/xWCCAdQVDqu5ygli7OhYPzPqxHcY124uY9s38m2BTFzKbgWgXUEPg+nEetnOCk+tP6RnOCBnJ57SSo34P9wscNCZA4ZC+gGjJ2Bi6+fHlE3weuSiev+dLbHhp6ymNwuwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpVCrHtt4cTHeyLshM43VUIs5Mqcz1DR9yS2Q1ygMC9aMBCwsCCgcGBAUICQEDDCE4GwKgRrCrQQAAAAAAAAAAAAAsIBRzy1sAQO7Li705AAA=";

function reconstructVersionedTransaction(
  versionedTransactionResponse: VersionedTransactionResponse,
  serializedMessage: string
) {
  const deserializedMessage = Buffer.from(serializedMessage, "base64");
  const message = VersionedMessage.deserialize(deserializedMessage);
  const signatures = versionedTransactionResponse.transaction.signatures.map(
    (sig) => Buffer.from(sig, "base64")
  );
  return new VersionedTransaction(message, signatures);
}

describe("InferenceStakingProgramSdk decodeTransaction", () => {
  it("should decode an AccrueReward transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      V1_ACCRUE_REWARD_SERIALIZED_MESSAGE
    );
    const tx = sdk.decodeTransaction(versionedTransaction);

    const ix = tx.find((ix) => ix.name === "accrueReward");
    invariant(ix, "accrueRewardIx undefined");

    const {
      operatorPool,
      poolUsdcVault,
      rewardFeeTokenAccount,
      stakedTokenAccount,
      usdcFeeTokenAccount,
    } = ix.accounts;
    invariant(operatorPool, "operatorPool undefined");
    invariant(poolUsdcVault, "poolUsdcVault undefined");
    invariant(rewardFeeTokenAccount, "rewardFeeTokenAccount undefined");
    invariant(stakedTokenAccount, "stakedTokenAccount undefined");
    invariant(usdcFeeTokenAccount, "usdcFeeTokenAccount undefined");

    const accountKeys =
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.transaction.message.accountKeys;

    const findAccountIndex = (account: { pubkey: PublicKey }) => {
      return accountKeys.findIndex((key) => key === account.pubkey.toString());
    };

    const stakedTokenAccountIndex = findAccountIndex(stakedTokenAccount);
    const rewardFeeTokenAccountIndex = findAccountIndex(rewardFeeTokenAccount);
    const poolUsdcVaultIndex = findAccountIndex(poolUsdcVault);
    const usdcFeeTokenAccountIndex = findAccountIndex(usdcFeeTokenAccount);

    const findBalanceChange = (accountIndex: number, mint: string) => {
      const preBalance =
        V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.preTokenBalances.find(
          (tb) => tb.accountIndex === accountIndex && tb.mint === mint
        );
      const postBalance =
        V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.postTokenBalances.find(
          (tb) => tb.accountIndex === accountIndex && tb.mint === mint
        );

      if (!preBalance || !postBalance) return 0n;

      const preAmount = BigInt(preBalance.uiTokenAmount.amount);
      const postAmount = BigInt(postBalance.uiTokenAmount.amount);
      return postAmount - preAmount;
    };

    const TOKEN_MINT = "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi";
    const USDC_MINT = "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV";

    const delegatorRewardShare = findBalanceChange(
      stakedTokenAccountIndex,
      TOKEN_MINT
    );
    const operatorRewardCommissionShare = findBalanceChange(
      rewardFeeTokenAccountIndex,
      TOKEN_MINT
    );
    const delegatorUsdcShare = findBalanceChange(poolUsdcVaultIndex, USDC_MINT);
    const operatorUsdcCommissionShare = findBalanceChange(
      usdcFeeTokenAccountIndex,
      USDC_MINT
    );

    const totalRewardsShare =
      delegatorRewardShare + operatorRewardCommissionShare;
    const totalUsdcShare = delegatorUsdcShare + operatorUsdcCommissionShare;

    const accrueRewardEvents = sdk.getAccrueRewardEvents(
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages
    );
    const event = accrueRewardEvents.find((event) =>
      event.data.operatorPool.equals(operatorPool.pubkey)
    );
    invariant(
      event != null && accrueRewardEvents.length === 1,
      "invalid accrueRewardEvents"
    );
    const {
      totalRewardsTransferred,
      totalUsdcTransferred,
      delegatorRewards,
      operatorRewardCommission,
      delegatorUsdcEarnings,
      operatorUsdcCommission,
    } = event.data;

    assert(
      delegatorRewards.add(operatorRewardCommission).eq(totalRewardsTransferred)
    );
    assert(
      totalRewardsTransferred.eq(new anchor.BN(totalRewardsShare.toString()))
    );
    assert(totalUsdcTransferred.eq(new anchor.BN(totalUsdcShare.toString())));
    assert(
      operatorUsdcCommission.add(delegatorUsdcEarnings).eq(totalUsdcTransferred)
    );
  });
});
