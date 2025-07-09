import * as anchor from "@coral-xyz/anchor";
import type { VersionedTransactionResponse } from "@solana/web3.js";
import {
  PublicKey,
  VersionedMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { expect, describe, it } from "bun:test";
import { assert } from "chai";
import invariant from "invariant";

import { InferenceStakingProgramSdk } from "@sdk/src";

import { TEST_PROGRAM_ID } from "@tests/lib/setup";

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

const STAKE_SERIALIZED_MESSAGE =
  "AgEECri/mvpV+O6DG3bGWy6t4XknMoEBs0nObKgHicgJCwETpCMeDx0ftDk5Dvtt/HLRd9tJ9PsgP2MKsayLjFYPKNU60dnT+vZhIegQTg5vHThrpo4aERI1vYjbBL/RXPOhwD7Z4endTo7ztWe2tvw0j0f2FzhrLCvh9mXpCd6UnC889d2X9Yc75LNZ6uWmUPbkHaN5ZhsHqyZ+n3rq2MCKWdUNe6blDJV9hRMkcQQlKq5A0pE78HIjSJFBzRgQPY3RG5MAyktcWq/A/jgh8F0H5mzEoqL0RRGp/XHb7ocC1sm/CWgofnGNtnIcDCHJJ7KosDuO2fa/+NzKb3Cd3W8g8vLjbY2RylkXJ/nYbuKM3tK8vYq0hgR6Wg5z6ah7dKhJrQbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpc1PZXok81XyryoVNFC3ufyQi9YTvmYazfIALD8rGu0sBBwgBCAUCBgQDCRDOsMoSyNGzbM4DAAAAAAAA";

const ACCRUE_REWARD_TRANSACTION_RESPONSE = {
  blockTime: 1752069363,
  meta: {
    computeUnitsConsumed: 86639,
    err: null,
    fee: 5000,
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            accounts: [5, 8, 1],
            data: "3DWs17QRsfR9",
            programIdIndex: 12,
            stackHeight: 2,
          },
          {
            accounts: [5, 7, 1],
            data: "3DZEzk5FPDKm",
            programIdIndex: 12,
            stackHeight: 2,
          },
          {
            accounts: [6, 2, 1],
            data: "3YMFCRNhnjDy",
            programIdIndex: 12,
            stackHeight: 2,
          },
          {
            accounts: [6, 3, 1],
            data: "3pMgMVcykGkF",
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
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 144432 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 137324 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 130216 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 123107 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program data: C8QH6W/9qSgLqYVh4VJoPsRmt2JvuuzhFAkDU3hhKwun+hBwkxEi4wEAAAAAAAAAAOzyIIp8SQBAl1ZUsUkAAACV3c/o7j8AAFcVUaGNCQDQpRVVbBIAAHDxQP9ENwAA",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG consumed 86639 of 200000 compute units",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG success",
    ],
    postBalances: [
      499999999999885000, 5526240, 2039280, 2039280, 1726080, 2039280, 2039280,
      2039280, 2039280, 6389280, 2310720, 1141440, 929020800,
    ],
    postTokenBalances: [
      {
        accountIndex: 2,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "60769479750000",
          decimals: 6,
          uiAmount: 60769479.75,
          uiAmountString: "60769479.75",
        },
      },
      {
        accountIndex: 3,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "20256493250000",
          decimals: 6,
          uiAmount: 20256493.25,
          uiAmountString: "20256493.25",
        },
      },
      {
        accountIndex: 5,
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
        accountIndex: 6,
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
        accountIndex: 7,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "24741750220000000",
          decimals: 9,
          uiAmount: 24741750.22,
          uiAmountString: "24741750.22",
        },
      },
      {
        accountIndex: 8,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "2688998780000000",
          decimals: 9,
          uiAmount: 2688998.78,
          uiAmountString: "2688998.78",
        },
      },
    ],
    preBalances: [
      499999999999890000, 5526240, 2039280, 2039280, 1726080, 2039280, 2039280,
      2039280, 2039280, 6389280, 2310720, 1141440, 929020800,
    ],
    preTokenBalances: [
      {
        accountIndex: 2,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
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
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 6,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 5,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "20684606000000000",
          decimals: 9,
          uiAmount: 20684606,
          uiAmountString: "20684606",
        },
      },
      {
        accountIndex: 6,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "81025973000000",
          decimals: 6,
          uiAmount: 81025973,
          uiAmountString: "81025973",
        },
      },
      {
        accountIndex: 7,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "6746143000000000",
          decimals: 9,
          uiAmount: 6746143,
          uiAmountString: "6746143",
        },
      },
      {
        accountIndex: 8,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
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
        "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        "6hVr9kDDhHqTWdq7kh8wzwyvUxkPvyMoXfjYFZnsqraF",
        "7c31NNYUoJq2pG3sSGZ3E88edvLhtwYtf1sLYzEVVAa4",
        "938Fy9E14vt9722YHtFYSwb3zEa1wCcouR9fuGHvq7Wf",
        "AnFBZDLbMdQCWW2sZief65oJkp6ZZA97cJ97rBKqR6nK",
        "B7Q5uVbRxzw3PqPJSDWtZyrunw8eEmHmY3gKZBeNaQXs",
        "FqJutVBr9c72weebHw6fV9wUNJyZfb7VYfRUMJ82up5g",
        "HkwMbbAAW9vtGpmpLZZuw8oHSe2JCse1PjnzzojefV89",
        "nXQn15Yg5uQAQsGm9789gxFhwFBoEMjHdktDp1r6CpS",
        "EmsktPJ6h3jCCNJY9fSpgW3HgNnEVeiWGuuQnFSPVYvA",
        "stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG",
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      ],
      recentBlockhash: "4k49JoxxiPa6xir1QkgTjx8nrav2RKoE8X2eYUHhB3WZ",
      instructions: [
        {
          accounts: [1, 10, 9, 4, 5, 6, 7, 8, 2, 3, 12],
          data: "HfgB5xVgEP4yhv73ccA4Bq6t1X5PJsuTfHuXA89Udaqsd",
          programIdIndex: 11,
          stackHeight: null,
        },
      ],
      indexToProgramIds: {},
    },
    signatures: [
      "2LZak1rvdUpeu1cAJgginwP4op8E68wzyDrvm1WHkg5DpCzVZSxgGVHE9cwXfB1CErjt8DijrTBbCLERKuJAo1WR",
    ],
  },
  version: "legacy",
};

const ACCRUE_REWARD_SERIALIZED_MESSAGE =
  "AQADDbi/mvpV+O6DG3bGWy6t4XknMoEBs0nObKgHicgJCwETTDfxr3kOE/Kb4p9a3Eg67+j2vYnBcl+4TKyf6Nvpq7ZUqkjuM2kRCKIHF+NT9FI6tYZYSl9PeRTRE3ydTlgzLGIft+1oGyaD55+1fKbGg9capc8QZ2hSAt78LJ6YevHBd2jdHuoqR+2fBdDp2Xjo1SjKiGg1crTe+/QB9uPAASCRUFq4IyffsXNC47rvLYrImuOigz69PdsXbVYxV3mq+JY4dLd02pqUOduGnZV+Y1odVkkZhGLbDv0+4/nl9X1S3GO/sbdr/MlM9Kpc7lOnJOL0YgtpDVgKG65DQS+X1nv4/GzVVvU9CvouTUYdFkFL5WjwqZQHuK5uTDrH4Xf8DguphWHhUmg+xGa3Ym+67OEUCQNTeGErC6f6EHCTESLjzKbgWgXUEPg+nEetnOCk+tP6RnOCBnJ57SSo34P9wscNCZA4ZC+gGjJ2Bi6+fHlE3weuSiev+dLbHhp6ymNwuwbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpN5qW8bDCEcOtzqmaLDDjIKNys8psUQ4322OGhaOiGEoBCwsBCgkEBQYHCAIDDCE4GwKgRrCrQQAAAAAAAAAAAADs8iCKfEkAQJdWVLFJAAA=";

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
  it("should decode a Stake transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      STAKE_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      STAKE_SERIALIZED_MESSAGE
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
        case "mint":
        case "newAdmin":
        case "newProgramAdmin":
        case "newStakingRecord":
        case "payer":
        case "programAdmin":
        case "receiver":
        case "rewardFeeTokenAccount":
        case "rewardRecord":
        case "rewardTokenAccount":
        case "stakingRecord":
        case "systemProgram":
        case "usdcMint":
        case "usdcTokenAccount":
        default: {
          assert.fail(`Unhandled case reached: ${account.name}`);
        }
      }
    }
  });

  it("should decode an AccrueReward transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      ACCRUE_REWARD_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      ACCRUE_REWARD_SERIALIZED_MESSAGE
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
      ACCRUE_REWARD_TRANSACTION_RESPONSE.transaction.message.accountKeys;

    const findAccountIndex = (account: { pubkey: PublicKey }) => {
      return accountKeys.findIndex((key) => key === account.pubkey.toString());
    };

    const stakedTokenAccountIndex = findAccountIndex(stakedTokenAccount);
    const rewardFeeTokenAccountIndex = findAccountIndex(rewardFeeTokenAccount);
    const poolUsdcVaultIndex = findAccountIndex(poolUsdcVault);
    const usdcFeeTokenAccountIndex = findAccountIndex(usdcFeeTokenAccount);

    const findBalanceChange = (accountIndex: number, mint: string) => {
      const preBalance =
        ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.preTokenBalances.find(
          (tb) => tb.accountIndex === accountIndex && tb.mint === mint
        );
      const postBalance =
        ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.postTokenBalances.find(
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
      ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages
    );
    const event = accrueRewardEvents.find((event) =>
      event.data.operatorPool.equals(operatorPool.pubkey)
    );
    invariant(
      event != null && accrueRewardEvents.length === 1,
      "invalid accrueRewardEvents"
    );
    const {
      totalRewardTokenPayout,
      totalAccruedUsdcEarnings,
      delegatorTokenRewards,
      operatorTokenCommission,
      delegatorUsdcEarnings,
      operatorUsdcCommission,
    } = event.data;

    assert(
      delegatorTokenRewards
        .add(operatorTokenCommission)
        .eq(totalRewardTokenPayout)
    );
    assert(
      totalRewardTokenPayout.eq(new anchor.BN(totalRewardsShare.toString()))
    );
    assert(
      totalAccruedUsdcEarnings.eq(new anchor.BN(totalUsdcShare.toString()))
    );
    assert(
      operatorUsdcCommission
        .add(delegatorUsdcEarnings)
        .eq(totalAccruedUsdcEarnings)
    );
  });
});
