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

const V2_ACCRUE_REWARD_TRANSACTION_RESPONSE = {
  blockTime: 1752248102,
  meta: {
    computeUnitsConsumed: 94269,
    err: null,
    fee: 5000,
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            accounts: [7, 5, 3],
            data: "3azJJV7deruE",
            programIdIndex: 13,
            stackHeight: 2,
          },
          {
            accounts: [7, 2, 3],
            data: "3asycoKwiPq1",
            programIdIndex: 13,
            stackHeight: 2,
          },
          {
            accounts: [8, 1, 3],
            data: "3DZwcprg4dvf",
            programIdIndex: 13,
            stackHeight: 2,
          },
          {
            accounts: [8, 4, 3],
            data: "3DWbgK6ph5Pd",
            programIdIndex: 13,
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
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 137745 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 130640 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 123534 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 116429 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program log: Current instruction index: 0",
      "Program log: new_arg: true",
      "Program data: C8QH6W/9qSj7b6bc6fVQBVhDdm2Oj+K0ZTO4qFnRfp+RCCbyCXbVFAEAAAAAAAAAAMpV3EdsUwEA+HWnUjgAAIARQJTX6TIAgLgVSHCCIAEAUBx6hA0AAACoWS3OKgAAAQ==",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG consumed 94269 of 200000 compute units",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG success",
    ],
    postBalances: [
      499999999999885000, 2039280, 2039280, 5526240, 2039280, 2039280, 1726080,
      2039280, 2039280, 6389280, 2310720, 1141440, 0, 929020800,
    ],
    postTokenBalances: [
      {
        accountIndex: 1,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "47065012480000",
          decimals: 6,
          uiAmount: 47065012.48,
          uiAmountString: "47065012.48",
        },
      },
      {
        accountIndex: 2,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "29528796950000000",
          decimals: 9,
          uiAmount: 29528796.95,
          uiAmountString: "29528796.95",
        },
      },
      {
        accountIndex: 4,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "14862635520000",
          decimals: 6,
          uiAmount: 14862635.52,
          uiAmountString: "14862635.52",
        },
      },
      {
        accountIndex: 5,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "81208212050000000",
          decimals: 9,
          uiAmount: 81208212.05,
          uiAmountString: "81208212.05",
        },
      },
      {
        accountIndex: 7,
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
        accountIndex: 8,
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
    ],
    preBalances: [
      499999999999890000, 2039280, 2039280, 5526240, 2039280, 2039280, 1726080,
      2039280, 2039280, 6389280, 2310720, 1141440, 0, 929020800,
    ],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 6,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 2,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "15197936000000000",
          decimals: 9,
          uiAmount: 15197936,
          uiAmountString: "15197936",
        },
      },
      {
        accountIndex: 4,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
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
        owner: "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 9,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 7,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "95539073000000000",
          decimals: 9,
          uiAmount: 95539073,
          uiAmountString: "95539073",
        },
      },
      {
        accountIndex: 8,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "61927648000000",
          decimals: 6,
          uiAmount: 61927648,
          uiAmountString: "61927648",
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
        numReadonlyUnsignedAccounts: 4,
        numRequiredSignatures: 1,
      },
      accountKeys: [
        "DSBUSi6mGSKeKXab2hxGeiJeXrXM65NCCpTtPG19RZ3Y",
        "49ck7XUqMNKjjt7F7rd1A4GajqyErGgko9jZ8jHxwPov",
        "5BCRWNyubqKWPKZfp6DX8yABVy3YCW7mQ6sXUoFV2jks",
        "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        "74ZGwSHLqeAZTCVSnDL982rfJKNC76ww8PRfxzhD9164",
        "7GxEWpczB3VMH9VuDwkTiRkccGjgNtFMfv42p9Ek5WbF",
        "9mFgCk3XX6EJmt3BnxHhwJxYGqVujZ3L577r3DiWpTqR",
        "AnFBZDLbMdQCWW2sZief65oJkp6ZZA97cJ97rBKqR6nK",
        "B7Q5uVbRxzw3PqPJSDWtZyrunw8eEmHmY3gKZBeNaQXs",
        "HvW5VvZ1HuaKTkHWVqc1f14rHTvG1Q1KmrG6XHSyqgXm",
        "EmsktPJ6h3jCCNJY9fSpgW3HgNnEVeiWGuuQnFSPVYvA",
        "stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG",
        "Sysvar1nstructions1111111111111111111111111",
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      ],
      recentBlockhash: "7nEN97SxaHoCTgc7ZU5ewcjeD3g3pGqf6XzZvD8J7jZp",
      instructions: [
        {
          accounts: [3, 10, 9, 6, 7, 8, 2, 5, 1, 4, 13, 12],
          data: "2GZhuWswaA4QZHbPgYAAy4oJx51s9eMK8wKPBYvcagQuDjW",
          programIdIndex: 11,
          stackHeight: null,
        },
      ],
      indexToProgramIds: {},
    },
    signatures: [
      "2Cv9nCoywMd934YwGCWBrMFu5bfudc1gNedHzQsjV1NAvbscUKW2yL3TEpc53PSiy7RfMDnrufmz6Vkq1dbutDJ6",
    ],
  },
  version: "legacy",
};

const V2_ACCRUE_REWARD_SERIALIZED_MESSAGE =
  "AQAEDri/mvpV+O6DG3bGWy6t4XknMoEBs0nObKgHicgJCwETLsgfUmxgUhvStFIQ/jlwVHpYJj7ATFnE7P+FO+B0LJk+C3imVHxvU74ATYcZ6pgUuKBTQ8eFHBqbiCb3AKuhgEw38a95DhPym+KfWtxIOu/o9r2JwXJfuEysn+jb6au2Wg9bctVDMwPpOlprjdpAGy8xJliSBO2Ph8spVBW5W+VdPEktbndpSz6vIJrwzFAO4n6KzCx/l/zLQsgQYT/qxoIzpSXM45uCerTUplYK6GbgqfJKOIUMzAybP6WToDRokVBauCMn37FzQuO67y2KyJrjooM+vT3bF21WMVd5qviWOHS3dNqalDnbhp2VfmNaHVZJGYRi2w79PuP55fV9Uvtvptzp9VAFWEN2bY6P4rRlM7ioWdF+n5EIJvIJdtUUzKbgWgXUEPg+nEetnOCk+tP6RnOCBnJ57SSo34P9wscNCZA4ZC+gGjJ2Bi6+fHlE3weuSiev+dLbHhp6ymNwuwan1RcYe9FmNdrUBFX9wsDBJMaPIVZ1pdu6y18IAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKlkvF6GAuzWVOEPKsA78oC2S++21n4UC8qv12lD5TkDNwELDAMKCQYHCAIFAQQNDCI4GwKgRrCrQQAAAAAAAAAAAADKVdxHbFMBAPh1p1I4AAAB";

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
  it("should decode a V1 AccrueReward transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      V1_ACCRUE_REWARD_SERIALIZED_MESSAGE
    );
    const { tx } = sdk.handleDecodeTransaction(
      versionedTransaction,
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
      "v1"
    );

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

    // @ts-expect-error - instructions is not in the V1 IDL
    const instructions = ix.accounts.instructions;
    invariant(instructions == null, "instructions undefined");

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

    const accrueRewardEvents = sdk.getEventTypeV1(
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
      "accrueRewardEvent"
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

  it("should decode a V2 AccrueReward transaction correctly", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      V2_ACCRUE_REWARD_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      V2_ACCRUE_REWARD_SERIALIZED_MESSAGE
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
      instructions,
    } = ix.accounts;
    invariant(operatorPool, "operatorPool undefined");
    invariant(poolUsdcVault, "poolUsdcVault undefined");
    invariant(rewardFeeTokenAccount, "rewardFeeTokenAccount undefined");
    invariant(stakedTokenAccount, "stakedTokenAccount undefined");
    invariant(usdcFeeTokenAccount, "usdcFeeTokenAccount undefined");
    invariant(instructions, "instructions undefined");

    const accountKeys =
      V2_ACCRUE_REWARD_TRANSACTION_RESPONSE.transaction.message.accountKeys;

    const findAccountIndex = (account: { pubkey: PublicKey }) => {
      return accountKeys.findIndex((key) => key === account.pubkey.toString());
    };

    const stakedTokenAccountIndex = findAccountIndex(stakedTokenAccount);
    const rewardFeeTokenAccountIndex = findAccountIndex(rewardFeeTokenAccount);
    const poolUsdcVaultIndex = findAccountIndex(poolUsdcVault);
    const usdcFeeTokenAccountIndex = findAccountIndex(usdcFeeTokenAccount);

    const findBalanceChange = (accountIndex: number, mint: string) => {
      const preBalance =
        V2_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.preTokenBalances.find(
          (tb) => tb.accountIndex === accountIndex && tb.mint === mint
        );
      const postBalance =
        V2_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.postTokenBalances.find(
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

    const accrueRewardEvents = sdk.getEventType(
      V2_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
      "accrueRewardEvent"
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

  it("combined decode method", () => {
    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransactionV1 = reconstructVersionedTransaction(
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      V1_ACCRUE_REWARD_SERIALIZED_MESSAGE
    );
    const resultV1 = sdk.handleDecodeTransaction(
      versionedTransactionV1,
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
      "v1"
    );

    const ix = resultV1.tx.find((ix) => ix.name === "accrueReward");
    invariant(ix, "accrueRewardIx undefined");
    // @ts-expect-error - instructions is not in the V2 IDL
    const instructions = ix.accounts.instructions;
    invariant(instructions == null, "instructions undefined");

    // @ts-expect-error - newArg is not in the V1 IDL
    const newArg = ix.args.args.newArg;
    assert(newArg == null, "newArg undefined");

    const accrueRewardEventsV1 = sdk.getEventTypeV1(
      V1_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
      "accrueRewardEvent"
    );
    invariant(
      accrueRewardEventsV1.length === 1,
      "invalid accrueRewardEventsV1"
    );
    const eventV1 = accrueRewardEventsV1[0];
    invariant(eventV1, "eventV1 undefined");

    // @ts-expect-error - newArg is not in the V1 IDL
    const x = eventV1.data.newArg;
    assert(x == null, "x undefined");

    const versionedTransactionV2 = reconstructVersionedTransaction(
      V2_ACCRUE_REWARD_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      V2_ACCRUE_REWARD_SERIALIZED_MESSAGE
    );
    const resultV2 = sdk.handleDecodeTransaction(
      versionedTransactionV2,
      V2_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
      "v2"
    );

    const { version, tx } = resultV2;
    if (version === "v2") {
      const ix = tx.find((ix) => ix.name === "accrueReward");
      invariant(ix, "accrueRewardIx undefined");
      const instructionsAccount = ix.accounts.instructions;
      invariant(instructionsAccount, "instructionsAccount undefined");

      const newArg = ix.args.args.newArg;
      assert(newArg, "newArg undefined");
      assert(typeof newArg === "boolean", "newArg is boolean");

      const accrueRewardEvents = sdk.getEventType(
        V2_ACCRUE_REWARD_TRANSACTION_RESPONSE.meta.logMessages,
        "accrueRewardEvent"
      );
      invariant(accrueRewardEvents.length === 1, "invalid accrueRewardEvents");
      const event = accrueRewardEvents[0];
      invariant(event, "event undefined");
      const { newArg: eventNewArg } = event.data;
      assert(eventNewArg, "eventNewArg undefined");
      assert(typeof eventNewArg === "boolean", "eventNewArg is boolean");
    }
  });
});
