import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { INF_STAKING, setupTests, sleep } from "./utils";
import {
  ClaimUnstakeEvent,
  CompleteAccrueRewardEvent,
  SlashStakeEvent,
  StakeEvent,
  UnstakeEvent,
} from "inference-staking/src/eventTypes";
import { createProgram, MerkleUtils } from "inference-staking";

describe("inference-staking", () => {
  let setup: Awaited<ReturnType<typeof setupTests>>;

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = createProgram(anchor.AnchorProvider.env());

  const connection = program.provider.connection;

  // Configs
  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);
  const autoStakeFees = false;
  const commissionRateBps = 1500;
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
      const code = error.error.errorCode.code;
      assert.equal(code, "InvalidAuthority");
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
      const code = error.error.errorCode.code;
      assert.equal(code, "RequireGteViolated");
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
      const code = error.error.errorCode.code;
      assert.equal(code, "InvalidAuthority");
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
      const code = error.error.errorCode.code;
      assert.equal(code, "AuthoritiesExceeded");
    }
  });

  it("Fail to create OperatorPool with invalid commission rate", async () => {
    try {
      // Expect failure as commission cannot excceed 100%.
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
      const code = error.error.errorCode.code;
      assert.equal(code, "RequireGteViolated");
    }
  });
});
