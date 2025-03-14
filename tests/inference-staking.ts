import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { InferenceStaking } from "../target/types/inference_staking";
import { setupTests } from "./utils";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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

  it("Create OperatorPool 1 successfully", async () => {
    const autoStakeFees = false;
    const commissionRateBps = 1500;
    const allowDelegation = true;

    await program.methods
      .createOperatorPool(autoStakeFees, commissionRateBps, allowDelegation)
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

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPool.poolId.eqn(1));
    assert(operatorPool.admin.equals(setup.signer1));
    assert(
      operatorPool.operatorStakingRecord.equals(setup.pool1.signer1Record)
    );
    assert.equal(operatorPool.autoStakeFees, autoStakeFees);
    assert.equal(operatorPool.commissionRateBps, commissionRateBps);
    assert.isNull(operatorPool.newCommissionRateBps);
    assert.equal(operatorPool.allowDelegation, allowDelegation);
    assert(operatorPool.totalStakedAmount.isZero());
    assert(operatorPool.totalShares.isZero());
    assert(operatorPool.totalUnstaking.isZero());
    assert.isNull(operatorPool.closedAt);
    assert(!operatorPool.isHalted);
    assert(operatorPool.rewardLastClaimedEpoch.isZero());
    assert(operatorPool.accruedRewards.isZero());
    assert(operatorPool.accruedCommission.isZero());

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(stakingRecord.owner.equals(setup.signer1));
    assert(stakingRecord.operatorPool.equals(setup.pool1.pool));
    assert(stakingRecord.shares.isZero());
    assert(stakingRecord.unstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });
});
