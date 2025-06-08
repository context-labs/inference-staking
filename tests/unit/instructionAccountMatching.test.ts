import { expect, describe, it } from "bun:test";
import { assert } from "chai";

import type { InferenceStakingAccountName } from "@sdk/src";
import { IDL } from "@sdk/src/idl";

function assertUnreachable(x: never): never {
  throw new Error(
    `Received a value which should not exist: ${JSON.stringify(x)}`
  );
}

function getIdlAccounts(): InferenceStakingAccountName[] {
  const idlAccounts = IDL.instructions.flatMap((instruction) =>
    instruction.accounts.map((account) => account.name)
  );
  const idlAccountsSet = new Set(idlAccounts);
  return Array.from(idlAccountsSet);
}

// this test just verifies that the InferenceStakingAccountName contains all
// of the instruction accounts that are defined in the IDL.
describe("Instruction Account Matching", () => {
  it("InferenceStakingAccountName should contain all of the instruction accounts that are defined in the IDL", () => {
    const accounts = getIdlAccounts();
    expect(accounts).toBeDefined();
    const seen = new Map<InferenceStakingAccountName, number>();
    for (const account of accounts) {
      seen.set(account, (seen.get(account) ?? 0) + 1);
      switch (account) {
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
        case "poolOverview":
        case "programAdmin":
        case "receiver":
        case "rewardRecord":
        case "rewardTokenAccount":
        case "stakedTokenAccount":
        case "stakingRecord":
        case "systemProgram":
        case "tokenProgram":
        case "usdcMint":
        case "usdcPayoutWallet":
        case "usdcPayoutTokenAccount":
        case "usdcTokenAccount":
          assert.ok(seen.get(account) === 1);
          break;
        default: {
          assertUnreachable(account);
        }
      }
    }
    for (const [account, count] of seen.entries()) {
      if (count !== 1) {
        assert.fail(`Account ${account} was seen ${count} times`);
      }
    }
  });
});
