import * as anchor from "@coral-xyz/anchor";
import type { VersionedTransactionResponse } from "@solana/web3.js";
import {
  PublicKey,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { expect, describe, it } from "bun:test";
import { assert } from "chai";

import { InferenceStakingProgramSdk } from "@sdk/src";

import { TEST_PROGRAM_ID } from "@tests/lib/setup";

const UPDATE_OPERATOR_POOL_TRANSACTION_RESPONSE = {
  meta: {
    err: null,
    fee: 10000,
    status: { Ok: null },
    rewards: [],
    logMessages: [
      "Program dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm invoke [1]",
      "Program log: Instruction: UpdatePoolOverview",
      "Program dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm consumed 4182 of 200000 compute units",
      "Program dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm success",
    ],
    preBalances: [2990712320, 2000000000, 5199120, 1141440],
    postBalances: [2990702320, 2000000000, 5199120, 1141440],
    loadedAddresses: { readonly: [], writable: [] },
    preTokenBalances: [],
    innerInstructions: [],
    postTokenBalances: [],
    computeUnitsConsumed: 4182,
  },
  slot: 1887,
  version: "legacy",
  blockTime: 1745887264,
  transaction: {
    message: {
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 1,
      },
      accountKeys: [
        "pay6rd5BMKsh7DhTyHcSTNmWVqANYCnBXj6tfkt5Mk3",
        "adm1SjNKJ6u68bBE7WxCpSXuhDRim9F5MG89uuTmUZ3",
        "GJnSKot4d9BTv9B92HeUFW3Cvn6SvwSFM2aNpo4Ubwhe",
        "dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm",
      ],
      instructions: [
        {
          data: "41XxSMRxpeSbiknR8MR6o",
          accounts: [1, 2],
          stackHeight: null,
          programIdIndex: 3,
        },
      ],
      recentBlockhash: "3BCd7N6cC8aUXbAiibdGUMdx2e8d3VwEoXGxybZCojgt",
      indexToProgramIds: {},
    },
    signatures: [
      "41UmnyxmABk97W7NKoWy2w7tzNcbdhweViyuxgTbKS6c7KGHNmA5NoHEqqaDzshJtTHzZoBSYgAcGefAvzbtsZRN",
      "3kM9GNhW8gmDrzxh8NUdaMFgtpgk5fGzDee11bYjY2vAHaA8Qsau9AJgY6SiNsd7LJtKSaXX2ZpXCtCBA14fKS9g",
    ],
  },
};

const UPDATE_OPERATOR_POOL_SERIALIZED_MESSAGE =
  "AgEBBAwwtHYgam7TUwVtH9HrFtYukouTQMdIFg6Mf4ndEftACJ263juqRDccGkDesiw83ucRU+bqAZlpvQz90nluVw7jbY2RylkXJ/nYbuKM3tK8vYq0hgR6Wg5z6ah7dKhJrQloKH5xjbZyHAwhySeyqLA7jtn2v/jcym9wnd1vIPLyIFRS2fJ1yOmynQ20Eejg4Zu9i9JHe8BkvqCnVDUjXVEBAwIBAg9rj2sMloo0uAAAAQEAAAA=";

const STAKE_TRANSACTION_RESPONSE = {
  meta: {
    err: null,
    fee: 10000,
    status: { Ok: null },
    rewards: [],
    logMessages: [
      "Program dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm invoke [1]",
      "Program log: Instruction: Stake",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 172168 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program data: 4oa8rRMhS6860dnT+vZhIegQTg5vHThrpo4aERI1vYjbBL/RXPOhwA17puUMlX2FEyRxBCUqrkDSkTvwciNIkUHNGBA9jdEbzgMAAAAAAABVVToAAAAAAAAAAAAAAAAA",
      "Program dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm consumed 35395 of 200000 compute units",
      "Program dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm success",
    ],
    preBalances: [
      499999999999750000, 1000000000000, 1559040, 2039280, 2039280, 5435760,
      1559040, 1141440, 5199120, 929020800,
    ],
    postBalances: [
      499999999999740000, 1000000000000, 1559040, 2039280, 2039280, 5435760,
      1559040, 1141440, 5199120, 929020800,
    ],
    loadedAddresses: { readonly: [], writable: [] },
    preTokenBalances: [
      {
        mint: "2csffgjj8A5RbbT2ynmsy5ihnM2nBBomtK53fuynpe2v",
        owner: "udfC5nTvrbnVU8YCutFVfVfFwg3hJBhUZfhwhy4AT4n",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        accountIndex: 3,
        uiTokenAmount: {
          amount: "3821959",
          decimals: 9,
          uiAmount: 0.003821959,
          uiAmountString: "0.003821959",
        },
      },
      {
        mint: "2csffgjj8A5RbbT2ynmsy5ihnM2nBBomtK53fuynpe2v",
        owner: "C3ivPQuSHmVywBvUt93m2nCW1RxmtTUBYcxFdwsNRk5J",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        accountIndex: 4,
        uiTokenAmount: {
          amount: "974",
          decimals: 9,
          uiAmount: 0.000000974,
          uiAmountString: "0.000000974",
        },
      },
    ],
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            data: "3ov8kzqzu13V",
            accounts: [4, 3, 1],
            stackHeight: 2,
            programIdIndex: 9,
          },
        ],
      },
    ],
    postTokenBalances: [
      {
        mint: "2csffgjj8A5RbbT2ynmsy5ihnM2nBBomtK53fuynpe2v",
        owner: "udfC5nTvrbnVU8YCutFVfVfFwg3hJBhUZfhwhy4AT4n",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        accountIndex: 3,
        uiTokenAmount: {
          amount: "3822933",
          decimals: 9,
          uiAmount: 0.003822933,
          uiAmountString: "0.003822933",
        },
      },
      {
        mint: "2csffgjj8A5RbbT2ynmsy5ihnM2nBBomtK53fuynpe2v",
        owner: "C3ivPQuSHmVywBvUt93m2nCW1RxmtTUBYcxFdwsNRk5J",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        accountIndex: 4,
        uiTokenAmount: {
          amount: "0",
          decimals: 9,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
    ],
    computeUnitsConsumed: 35395,
  },
  slot: 53,
  version: "legacy",
  blockTime: 1746736549,
  transaction: {
    message: {
      header: {
        numRequiredSignatures: 2,
        numReadonlySignedAccounts: 1,
        numReadonlyUnsignedAccounts: 4,
      },
      accountKeys: [
        "DSBUSi6mGSKeKXab2hxGeiJeXrXM65NCCpTtPG19RZ3Y",
        "C3ivPQuSHmVywBvUt93m2nCW1RxmtTUBYcxFdwsNRk5J",
        "4xcEuDtpKkKAiSwnNkNhtLRFDTz7pnjcwPZgaRKBy7DH",
        "5ELyUHC6Z9vhC51pVKcmzTzvg8GZN3EZWei6CzJJUxkT",
        "HYks8zo5NqnzTG4rYycyG48tdZxX3R4FXBErv7t3hPx8",
        "udfC5nTvrbnVU8YCutFVfVfFwg3hJBhUZfhwhy4AT4n",
        "AtqdZoAoMJvVKF4kLyiSsrLkbYYXiZas4LMNtbAojhgz",
        "dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm",
        "GJnSKot4d9BTv9B92HeUFW3Cvn6SvwSFM2aNpo4Ubwhe",
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      ],
      instructions: [
        {
          data: "SXLVHmrGRvp51miBAeVc4P",
          accounts: [1, 8, 5, 2, 6, 4, 3, 9],
          stackHeight: null,
          programIdIndex: 7,
        },
      ],
      recentBlockhash: "8mC3Rejt8VviNScFV3sUrYRnmDWAn3umNPbSMTMnzZTp",
      indexToProgramIds: {},
    },
    signatures: [
      "2yFha8p1ora8WnSHXokorghF2f9LD7oWDjqiwVNoXhaRVTASmtD35wLWeK7cpAKV322Af7xLhifH7VDxKB5zWg7V",
      "2FpRvwb56B6yeCpAKXEkqJ3KgDHQdLcFSUmZSMEEBV9vZK86keh8s8vvtdx6Aqtd2G7wX1xY2Na5dpawDxwKig7b",
    ],
  },
};

const STAKE_SERIALIZE_MESSAGE =
  "AgEECri/mvpV+O6DG3bGWy6t4XknMoEBs0nObKgHicgJCwETpCMeDx0ftDk5Dvtt/HLRd9tJ9PsgP2MKsayLjFYPKNU60dnT+vZhIegQTg5vHThrpo4aERI1vYjbBL/RXPOhwD7Z4endTo7ztWe2tvw0j0f2FzhrLCvh9mXpCd6UnC889d2X9Yc75LNZ6uWmUPbkHaN5ZhsHqyZ+n3rq2MCKWdUNe6blDJV9hRMkcQQlKq5A0pE78HIjSJFBzRgQPY3RG5MAyktcWq/A/jgh8F0H5mzEoqL0RRGp/XHb7ocC1sm/CWgofnGNtnIcDCHJJ7KosDuO2fa/+NzKb3Cd3W8g8vLjbY2RylkXJ/nYbuKM3tK8vYq0hgR6Wg5z6ah7dKhJrQbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpc1PZXok81XyryoVNFC3ufyQi9YTvmYazfIALD8rGu0sBBwgBCAUCBgQDCRDOsMoSyNGzbM4DAAAAAAAA";

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
  it("should decode an UpdateOperatorPool transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      UPDATE_OPERATOR_POOL_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      UPDATE_OPERATOR_POOL_SERIALIZED_MESSAGE
    );
    const tx = sdk.decodeTransaction(versionedTransaction);

    expect(tx).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ix = tx[0]!;
    const ixName = ix.name;
    expect(ixName).toBe("updatePoolOverview");
    if (ixName === "updatePoolOverview") {
      // @ts-expect-error - the following should type error!
      const caller = ix.accounts.stakingRecord;
      expect(caller).not.toBeDefined();
    }

    for (const account of Object.values(ix.accounts)) {
      switch (account.name) {
        case "poolOverview":
        case "programAdmin":
          expect(account).toBeDefined();
          expect(new PublicKey(account.pubkey)).toBeDefined();
          break;
        case "admin":
        case "authority":
        case "destination":
        case "feeTokenAccount":
        case "mint":
        case "newAdmin":
        case "newProgramAdmin":
        case "newStakingRecord":
        case "operatorPool":
        case "operatorStakingRecord":
        case "owner":
        case "ownerStakingRecord":
        case "ownerTokenAccount":
        case "payer":
        case "receiver":
        case "rewardRecord":
        case "rewardTokenAccount":
        case "stakedTokenAccount":
        case "stakingRecord":
        case "systemProgram":
        case "tokenProgram":
        case "usdcMint":
        case "usdcPayoutDestination":
        case "usdcTokenAccount":
        default: {
          assert.fail(`Unhandled case reached: ${account.name}`);
        }
      }
    }
  });

  it.only("should decode a Stake transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      STAKE_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      STAKE_SERIALIZE_MESSAGE
    );
    const tx = sdk.decodeTransaction(versionedTransaction);

    expect(tx).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const ix = tx[0]!;
    const ixName = ix.name;
    expect(ixName).toBe("stake");
    if (ixName === "stake") {
      // @ts-expect-error - the following should type error!
      const caller = ix.accounts.stakingRecord;
      expect(caller).not.toBeDefined();
    }

    expect("tokenAmount" in ix.args).toBe(true);

    for (const account of Object.values(ix.accounts)) {
      switch (account.name) {
        case "operatorPool":
        case "operatorStakingRecord":
        case "owner":
        case "ownerStakingRecord":
        case "ownerTokenAccount":
        case "poolOverview":
        case "stakedTokenAccount":
        case "tokenProgram":
          expect(account).toBeDefined();
          expect(new PublicKey(account.pubkey)).toBeDefined();
          break;
        case "admin":
        case "authority":
        case "destination":
        case "feeTokenAccount":
        case "mint":
        case "newAdmin":
        case "newProgramAdmin":
        case "newStakingRecord":
        case "payer":
        case "programAdmin":
        case "receiver":
        case "rewardRecord":
        case "rewardTokenAccount":
        case "stakingRecord":
        case "systemProgram":
        case "usdcMint":
        case "usdcPayoutDestination":
        case "usdcTokenAccount":
        default: {
          assert.fail(`Unhandled case reached: ${account.name}`);
        }
      }
    }
  });
});
