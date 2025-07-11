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
  blockTime: 1752262215,
  meta: {
    computeUnitsConsumed: 90418,
    err: null,
    fee: 5000,
    innerInstructions: [
      {
        index: 0,
        instructions: [
          {
            accounts: [6, 8, 4],
            data: "3DZCx3EnSR8s",
            programIdIndex: 13,
            stackHeight: 2,
          },
          {
            accounts: [6, 9, 4],
            data: "3DbqXUM5hvHm",
            programIdIndex: 13,
            stackHeight: 2,
          },
          {
            accounts: [7, 2, 4],
            data: "3DaG3yTcE7S7",
            programIdIndex: 13,
            stackHeight: 2,
          },
          {
            accounts: [7, 1, 4],
            data: "3DULacwUUM2F",
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
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 140905 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 133791 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 126680 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 4645 of 119568 compute units",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program data: C8QH6W/9qSgAAEG71A46Y4E6/N4UnzfLAMNIOcMWQnrhKTsB1eN1lURxAQAAAAAAAAAAbkrcar4JAQDEM1A5PQAAANpabKbjHwAAlO9vxNrpAAAUdx/WHwAAALC8MGMdAAA=",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG consumed 90418 of 200000 compute units",
      "Program stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG success",
    ],
    postBalances: [
      499999999999885000, 2039280, 2039280, 9959760, 12653280, 1733040, 2039280,
      2039280, 2039280, 2039280, 4099440, 1141440, 0, 929020800,
    ],
    postTokenBalances: [
      {
        accountIndex: 1,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "35004511360000",
          decimals: 6,
          uiAmount: 35004511.36,
          uiAmountString: "35004511.36",
        },
      },
      {
        accountIndex: 2,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "32311856640000",
          decimals: 6,
          uiAmount: 32311856.64,
          uiAmountString: "32311856.64",
        },
      },
      {
        accountIndex: 6,
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
        accountIndex: 7,
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
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "65824206800000000",
          decimals: 9,
          uiAmount: 65824206.8,
          uiAmountString: "65824206.8",
        },
      },
      {
        accountIndex: 9,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "23440767200000000",
          decimals: 9,
          uiAmount: 23440767.2,
          uiAmountString: "23440767.2",
        },
      },
    ],
    preBalances: [
      499999999999890000, 2039280, 2039280, 9959760, 12653280, 1733040, 2039280,
      2039280, 2039280, 2039280, 4099440, 1141440, 0, 929020800,
    ],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
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
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 6,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 6,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "74800235000000000",
          decimals: 9,
          uiAmount: 74800235,
          uiAmountString: "74800235",
        },
      },
      {
        accountIndex: 7,
        mint: "usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV",
        owner: "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "67316368000000",
          decimals: 6,
          uiAmount: 67316368,
          uiAmountString: "67316368",
        },
      },
      {
        accountIndex: 8,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "0",
          decimals: 9,
          uiAmount: null,
          uiAmountString: "0",
        },
      },
      {
        accountIndex: 9,
        mint: "int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi",
        owner: "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        uiTokenAmount: {
          amount: "14464739000000000",
          decimals: 9,
          uiAmount: 14464739,
          uiAmountString: "14464739",
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
        "3Swuqh28FrJ5FXBBnNvrdewZ6jQCXcnVCew8V5DQ3CGc",
        "3xQ2tuLu4DeFESbrfup5bNeY9dKtynWHnsADX9KyZQEd",
        "5RbcmZ6CQSEdc1WyRCyrgSgWEZ6CPY4fqToMkYtatAzU",
        "68XTp3hD99sPY6Q8NWaoLWBgR2itfks9uJg2D8zyk2gd",
        "8q8doFwhe5XbDH5aSg3M1mKiHLk1aMhc2EuykiXjfriC",
        "AnFBZDLbMdQCWW2sZief65oJkp6ZZA97cJ97rBKqR6nK",
        "B7Q5uVbRxzw3PqPJSDWtZyrunw8eEmHmY3gKZBeNaQXs",
        "GWx3RFDLK75WV4TwWqVASawnq4RLehtp8CjNWvK7x9d6",
        "Ha26dNHRdy2Sz9kF9SqWA73da3UJ6rPJXaHWbkpDQxeR",
        "EmsktPJ6h3jCCNJY9fSpgW3HgNnEVeiWGuuQnFSPVYvA",
        "stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG",
        "Sysvar1nstructions1111111111111111111111111",
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      ],
      recentBlockhash: "GFTanGfRJw7tKEtci9SNZDN4RVC5dorBqHueWmNS9FNL",
      instructions: [
        {
          accounts: [4, 10, 3, 5, 6, 7, 9, 8, 2, 1, 13, 12],
          data: "HfgB5xVgEP4yhv73ccA4Bq6swyZVQUxQfxZRq4SoCoWj9",
          programIdIndex: 11,
          stackHeight: null,
        },
      ],
      indexToProgramIds: {},
    },
    signatures: [
      "dGzpeuESKL7mjqfkkWguuCQaXgrAar1vMYvvyVFGwqwvro4ze3aDFbQmsN1HTnp8phTjbsAknbv4stckPFkAAby",
    ],
  },
  version: "legacy",
};

const ACCRUE_REWARD_SERIALIZED_MESSAGE =
  "AQAEDri/mvpV+O6DG3bGWy6t4XknMoEBs0nObKgHicgJCwETJFz7b8NrZoK5hkpXyE9dCXkPzMTdSzGEhH6JEiaDBlUr6FyJoJKrL1JSBtc9/LasXHm1b+6sfN6XoWOADMmKEkG71A46Y4E6/N4UnzfLAMNIOcMWQnrhKTsB1eN1lURxTDfxr3kOE/Kb4p9a3Eg67+j2vYnBcl+4TKyf6Nvpq7Z0VlHR69ejKD81BqW8ixT9y8zQPyMO8cFAW+ZoQGlMSZFQWrgjJ9+xc0Ljuu8tisia46KDPr092xdtVjFXear4ljh0t3TampQ524adlX5jWh1WSRmEYtsO/T7j+eX1fVLmi2IZHVJSiJUghi8FniZotf0JbXyk1cIGwVF47STsRfYwZd5EfVVnG2rQdpJYGD65T+5PkByGdWpa7FNg/ZyuzKbgWgXUEPg+nEetnOCk+tP6RnOCBnJ57SSo34P9wscNCZA4ZC+gGjJ2Bi6+fHlE3weuSiev+dLbHhp6ymNwuwan1RcYe9FmNdrUBFX9wsDBJMaPIVZ1pdu6y18IAAAABt324ddloZPZy+FGzut5rBy0he1fWzeROoz1hX7/AKnik3334Cq3pOeYorEvqIOsEBg17yweqYHVev4nTpRLPQELDAQKAwUGBwkIAgENDCE4GwKgRrCrQQAAAAAAAAAAAABuStxqvgkBAMQzUDk9AAA=";

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
