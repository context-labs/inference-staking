import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

import { InferenceStakingProgramSDK } from "@sdk/src/sdk";

import { setupTests, assertError } from "./lib/utils";

describe("Additional tests for instruction constraints", () => {
  let setup: Awaited<ReturnType<typeof setupTests>>;

  anchor.setProvider(anchor.AnchorProvider.env());
  const sdk = new InferenceStakingProgramSDK({
    provider: anchor.AnchorProvider.env(),
    environment: "localnet",
  });
  const program = sdk.program;

  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);
  const autoStakeFees = false;
  const allowDelegation = true;
  const minOperatorShareBps = 1000;
  const allowPoolCreation = true;
  const isWithdrawalHalted = false;

  before(async () => {
    setup = await setupTests();
    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.signer1,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.signer1Kp])
      .rpc();

    await program.methods
      .updatePoolOverview(
        isWithdrawalHalted,
        allowPoolCreation,
        minOperatorShareBps,
        delegatorUnstakeDelaySeconds,
        operatorUnstakeDelaySeconds
      )
      .accountsStrict({
        programAdmin: setup.signer1,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.signer1Kp])
      .rpc();
  });

  it("Fail to update PoolOverview with invalid admin", async () => {
    try {
      await program.methods
        .updatePoolOverview(
          isWithdrawalHalted,
          allowPoolCreation,
          minOperatorShareBps,
          delegatorUnstakeDelaySeconds,
          operatorUnstakeDelaySeconds
        )
        .accountsStrict({
          programAdmin: setup.haltAuthority1Kp.publicKey,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.haltAuthority1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "InvalidAuthority");
    }
  });

  it("Fail to update PoolOverview with with invalid min operator share", async () => {
    try {
      // Expect failure as min operator share cannot exceed 100%
      await program.methods
        .updatePoolOverview(
          isWithdrawalHalted,
          allowPoolCreation,
          100_01,
          delegatorUnstakeDelaySeconds,
          operatorUnstakeDelaySeconds
        )
        .accountsStrict({
          programAdmin: setup.signer1,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "RequireGteViolated");
    }
  });

  it("Fail to update PoolOverview authorities with invalid admin", async () => {
    try {
      await program.methods
        .updatePoolOverviewAuthorities(
          setup.poolOverviewAdminKp.publicKey,
          [setup.poolOverviewAdminKp.publicKey],
          [setup.haltAuthority1Kp.publicKey],
          [setup.poolOverviewAdminKp.publicKey]
        )
        .accountsStrict({
          programAdmin: setup.poolOverviewAdminKp.publicKey,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "InvalidAuthority");
    }
  });

  it("Fail to update PoolOverview authorities with more than 5 keys", async () => {
    try {
      await program.methods
        .updatePoolOverviewAuthorities(
          setup.poolOverviewAdminKp.publicKey,
          [setup.poolOverviewAdminKp.publicKey],
          [
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
          ],
          [setup.poolOverviewAdminKp.publicKey]
        )
        .accountsStrict({
          programAdmin: setup.signer1Kp.publicKey,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "AuthoritiesExceeded");
    }
  });

  it("Fail to create OperatorPool with invalid commission rate", async () => {
    try {
      // Expect failure as commission cannot exceed 100%.
      await program.methods
        .createOperatorPool(autoStakeFees, 110_00, allowDelegation)
        .accountsStrict({
          payer: setup.payer,
          admin: setup.signer1,
          operatorPool: setup.pool1.pool,
          stakingRecord: setup.pool1.signer1Record,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          poolOverview: setup.poolOverview,
          mint: setup.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "RequireGteViolated");
    }
  });
});
