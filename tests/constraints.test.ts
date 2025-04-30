import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStaking } from "@sdk/src/idl";

import type { SetupTestResult } from "@tests/lib/setup";
import { setupTests } from "@tests/lib/setup";
import { assertStakingProgramError, assertError } from "@tests/lib/utils";

describe("Additional tests for instruction constraints", () => {
  let setup: SetupTestResult;
  let program: anchor.Program<InferenceStaking>;

  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);
  const autoStakeFees = false;
  const allowDelegation = true;
  const minOperatorShareBps = 1_000;
  const allowPoolCreation = true;
  const isStakingHalted = false;
  const isWithdrawalHalted = false;

  before(async () => {
    setup = await setupTests();
    program = setup.sdk.program;
  });

  it("Fail to create PoolOverview with an invalid USDC mint", async () => {
    try {
      await program.methods
        .createPoolOverview()
        .accountsStrict({
          payer: setup.payer,
          programAdmin: setup.signer,
          poolOverview: setup.poolOverview,
          rewardTokenAccount: setup.rewardTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          usdcMint: setup.invalidUsdcTokenMint,
          mint: setup.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.signerKp])
        .rpc();
    } catch (err) {
      assertStakingProgramError(err, "invalidUsdcMint");
    }
  });

  it("Create PoolOverview and update with a valid admin", async () => {
    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        usdcMint: setup.usdcTokenMint,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();

    await program.methods
      .updatePoolOverview({
        isStakingHalted,
        isWithdrawalHalted,
        allowPoolCreation,
        minOperatorShareBps,
        delegatorUnstakeDelaySeconds,
        operatorUnstakeDelaySeconds,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Fail to update PoolOverview with invalid admin", async () => {
    try {
      await program.methods
        .updatePoolOverview({
          ...setup.sdk.getEmptyPoolOverviewFieldsForUpdateInstruction(),
          isStakingHalted: true,
        })
        .accountsStrict({
          programAdmin: setup.haltingAuthorityKp.publicKey,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.haltingAuthorityKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
  });

  it("Updating PoolOverview new program admin requires the current and new program admin to sign", async () => {
    const poolOverviewPre = await program.account.poolOverview.fetch(
      setup.poolOverview
    );

    assert(poolOverviewPre.programAdmin.equals(setup.poolOverviewAdmin));

    try {
      await program.methods
        .updatePoolOverviewAuthorities({
          newRewardDistributionAuthorities: null,
          newHaltAuthorities: null,
          newSlashingAuthorities: null,
        })
        .accountsStrict({
          newProgramAdmin: setup.signerKp.publicKey,
          programAdmin: setup.poolOverviewAdmin,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "Signature verification failed");
    }

    try {
      await program.methods
        .updatePoolOverviewAuthorities({
          newRewardDistributionAuthorities: null,
          newHaltAuthorities: null,
          newSlashingAuthorities: null,
        })
        .accountsStrict({
          newProgramAdmin: setup.signerKp.publicKey,
          programAdmin: setup.poolOverviewAdmin,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.signerKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "Signature verification failed");
    }

    const poolOverviewAfterFailedUpdates =
      await program.account.poolOverview.fetch(setup.poolOverview);

    assert(
      poolOverviewAfterFailedUpdates.programAdmin.equals(
        setup.poolOverviewAdmin
      )
    );

    await program.methods
      .updatePoolOverviewAuthorities({
        newRewardDistributionAuthorities: null,
        newHaltAuthorities: null,
        newSlashingAuthorities: null,
      })
      .accountsStrict({
        newProgramAdmin: setup.signerKp.publicKey,
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp, setup.signerKp])
      .rpc();

    const poolOverviewPost = await program.account.poolOverview.fetch(
      setup.poolOverview
    );

    assert(poolOverviewPost.programAdmin.equals(setup.signerKp.publicKey));
  });

  it("Fail to update PoolOverview with with invalid min operator share", async () => {
    try {
      // Expect failure as min operator share cannot exceed 100%
      await program.methods
        .updatePoolOverview({
          ...setup.sdk.getEmptyPoolOverviewFieldsForUpdateInstruction(),
          minOperatorShareBps: 100_01,
        })
        .accountsStrict({
          programAdmin: setup.signer,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.signerKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "RequireGteViolated");
    }
  });

  it("Fail to update PoolOverview authorities with invalid admin", async () => {
    try {
      await program.methods
        .updatePoolOverviewAuthorities({
          newRewardDistributionAuthorities: [
            setup.rewardDistributionAuthorityKp.publicKey,
          ],
          newHaltAuthorities: [setup.haltingAuthorityKp.publicKey],
          newSlashingAuthorities: [setup.slashingAuthorityKp.publicKey],
        })
        .accountsStrict({
          newProgramAdmin: null,
          programAdmin: setup.poolOverviewAdminKp.publicKey,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
  });

  it("Fail to update PoolOverview authorities with more than 5 keys", async () => {
    try {
      await program.methods
        .updatePoolOverviewAuthorities({
          newRewardDistributionAuthorities: [
            setup.poolOverviewAdminKp.publicKey,
          ],
          newHaltAuthorities: [
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
            PublicKey.unique(),
          ],
          newSlashingAuthorities: [setup.poolOverviewAdminKp.publicKey],
        })
        .accountsStrict({
          newProgramAdmin: null,
          programAdmin: setup.signerKp.publicKey,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.signerKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "authoritiesExceeded");
    }
  });

  it("Fail to create OperatorPool with invalid commission rate", async () => {
    try {
      // Expect failure as commission cannot exceed 100%.
      await program.methods
        .createOperatorPool({
          autoStakeFees,
          commissionRateBps: 110_00,
          allowDelegation,
          name: setup.pool1.name,
          description: setup.pool1.description,
          websiteUrl: setup.pool1.websiteUrl,
          avatarImageUrl: setup.pool1.avatarImageUrl,
        })
        .accountsStrict({
          payer: setup.payer,
          admin: setup.pool1.admin,
          operatorPool: setup.pool1.pool,
          stakingRecord: setup.pool1.stakingRecord,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          poolOverview: setup.poolOverview,
          mint: setup.tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
        })
        .signers([setup.payerKp, setup.pool1.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "RequireGteViolated");
    }
  });

  it("Fail to update epoch is finalizing state with invalid authority", async () => {
    try {
      await program.methods
        .updateIsEpochFinalizing({
          isEpochFinalizing: true,
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          authority: setup.poolOverviewAdminKp.publicKey,
        })
        .signers([setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
  });
});
