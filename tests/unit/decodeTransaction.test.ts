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

const VERSIONED_TRANSACTION_RESPONSE = {
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

const SERIALIZED_MESSAGE =
  "AgEBBAwwtHYgam7TUwVtH9HrFtYukouTQMdIFg6Mf4ndEftACJ263juqRDccGkDesiw83ucRU+bqAZlpvQz90nluVw7jbY2RylkXJ/nYbuKM3tK8vYq0hgR6Wg5z6ah7dKhJrQloKH5xjbZyHAwhySeyqLA7jtn2v/jcym9wnd1vIPLyIFRS2fJ1yOmynQ20Eejg4Zu9i9JHe8BkvqCnVDUjXVEBAwIBAg9rj2sMloo0uAAAAQEAAAA=";

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
  it("should decode the transaction", () => {
    anchor.setProvider(anchor.AnchorProvider.env());

    const sdk = new InferenceStakingProgramSdk({
      provider: anchor.AnchorProvider.env(),
      programId: TEST_PROGRAM_ID,
    });

    const versionedTransaction = reconstructVersionedTransaction(
      VERSIONED_TRANSACTION_RESPONSE as unknown as VersionedTransactionResponse,
      SERIALIZED_MESSAGE
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
        case "poolOverview": {
          expect(account).toBeDefined();
          expect(new PublicKey(account.pubkey)).toBeDefined();
          break;
        }
        case "programAdmin": {
          expect(account).toBeDefined();
          expect(new PublicKey(account.pubkey)).toBeDefined();
          break;
        }
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
});
