import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { InferenceStaking } from "../target/types/inference_staking";
import { setupTests } from "./utils";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("inference-staking", () => {
  let setup;

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .inferenceStaking as Program<InferenceStaking>;

  before(async () => {
    setup = await setupTests();
  });

  it("Create PoolOverview successfully", async () => {
    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
        mint: setup.tokenMint,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.admin.equals(setup.signer1));
    assert(poolOverview.mint.equals(setup.tokenMint));

    // Check that all other values are set to default.
    assert.isEmpty(poolOverview.haltAuthorities);
    assert(!poolOverview.isWithdrawalHalted);
    assert(!poolOverview.allowPoolCreation);
    assert.equal(poolOverview.minOperatorShareBps, 0);
    assert(poolOverview.unstakeDelaySeconds.isZero());
    assert(poolOverview.totalPools.isZero());
    assert(poolOverview.completedRewardEpoch.isZero());
    assert(poolOverview.unclaimedRewards.isZero());
  });

  it("Update PoolOverview successfully", async () => {
    const unstakeDelaySeconds = new anchor.BN(20);
    const minOperatorShareBps = 1000;
    const allowPoolCreation = true;
    const isWithdrawalHalted = false;

    await program.methods
      .updatePoolOverview(
        isWithdrawalHalted,
        allowPoolCreation,
        minOperatorShareBps,
        unstakeDelaySeconds
      )
      .accountsStrict({
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );

    assert.equal(poolOverview.isWithdrawalHalted, isWithdrawalHalted);
    assert.equal(poolOverview.allowPoolCreation, allowPoolCreation);
    assert.equal(poolOverview.minOperatorShareBps, minOperatorShareBps);
    assert(poolOverview.unstakeDelaySeconds.eq(unstakeDelaySeconds));

    // Check that all other values remain the same.
    assert(poolOverview.admin.equals(setup.signer1));
    assert(poolOverview.mint.equals(setup.tokenMint));
    assert.isEmpty(poolOverview.haltAuthorities);
    assert(poolOverview.totalPools.isZero());
    assert(poolOverview.completedRewardEpoch.isZero());
    assert(poolOverview.unclaimedRewards.isZero());
  });
});
