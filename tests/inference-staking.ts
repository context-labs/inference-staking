import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { InferenceStaking } from "../target/types/inference_staking";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { setupTests, sleep } from "./utils";
import { constructMerkleTree, generateMerkleProof } from "./merkle";

describe("inference-staking", () => {
  let setup;

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace
    .inferenceStaking as Program<InferenceStaking>;
  const connection = program.provider.connection;

  // Configs
  const unstakeDelaySeconds = new anchor.BN(8);

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
        rewardTokenAccount: setup.rewardTokenAccount,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
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
    assert(operatorPool.rewardLastClaimedEpoch.eqn(1));
    assert(operatorPool.accruedRewards.isZero());
    assert(operatorPool.accruedCommission.isZero());

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(stakingRecord.owner.equals(setup.signer1));
    assert(stakingRecord.operatorPool.equals(setup.pool1.pool));
    assert(stakingRecord.shares.isZero());
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it("Create StakingRecord successfully", async () => {
    await program.methods
      .createStakingRecord()
      .accountsStrict({
        payer: setup.payer,
        owner: setup.user1,
        operatorPool: setup.pool1.pool,
        stakingRecord: setup.pool1.user1Record,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.user1Kp])
      .rpc();

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );
    assert(stakingRecord.owner.equals(setup.user1));
    assert(stakingRecord.operatorPool.equals(setup.pool1.pool));
    assert(stakingRecord.shares.isZero());
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it("Stake for operator successfully", async () => {
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );
    const stakeAmount = new anchor.BN(150_000);

    await program.methods
      .stake(stakeAmount)
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPool.totalStakedAmount.eq(stakeAmount));
    assert(operatorPool.totalShares.eq(stakeAmount));
    assert(operatorPool.totalUnstaking.isZero());

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(stakingRecord.shares.eq(stakeAmount));

    // Verify remaining fields are unchanged.
    assert(stakingRecord.owner.equals(setup.signer1));
    assert(stakingRecord.operatorPool.equals(setup.pool1.pool));
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it("Stake for user successfully", async () => {
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.user1
    );
    const stakeAmount = new anchor.BN(400_000);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    await program.methods
      .stake(stakeAmount)
      .accountsStrict({
        owner: setup.user1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.user1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount,
      })
      .signers([setup.user1Kp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPool.totalStakedAmount
        .sub(operatorPoolPre.totalStakedAmount)
        .eq(stakeAmount)
    );
    assert(
      operatorPool.totalShares.sub(operatorPoolPre.totalShares).eq(stakeAmount)
    );
    assert(operatorPool.totalUnstaking.isZero());

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );
    assert(stakingRecord.shares.eq(stakeAmount));

    // Verify remaining fields are unchanged.
    assert(stakingRecord.owner.equals(setup.user1));
    assert(stakingRecord.operatorPool.equals(setup.pool1.pool));
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it.skip("Unstake for user successfully", async () => {
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.user1
    );
    const unstakeAmount = new anchor.BN(10_000);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );

    await program.methods
      .unstake(unstakeAmount)
      .accountsStrict({
        owner: setup.user1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.user1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.user1Kp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPoolPre.totalStakedAmount
        .sub(operatorPool.totalStakedAmount)
        .eq(unstakeAmount)
    );
    assert(
      operatorPoolPre.totalShares
        .sub(operatorPool.totalShares)
        .eq(unstakeAmount)
    );
    // Token:Share at 1:1 ratio
    assert(operatorPool.totalUnstaking.eq(unstakeAmount));

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );
    assert(stakingRecordPre.shares.sub(stakingRecord.shares).eq(unstakeAmount));
    assert(stakingRecord.tokensUnstakeAmount.eq(unstakeAmount));

    const currentTimestamp = Date.now() / 1000;
    assert.approximately(
      stakingRecord.unstakeAtTimestamp.toNumber(),
      currentTimestamp + unstakeDelaySeconds.toNumber(),
      3
    );
  });

  it.skip("Claim unstake for user successfully", async () => {
    await sleep(unstakeDelaySeconds.toNumber() * 1000);

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.user1
    );
    const tokenBalancePre =
      await connection.getTokenAccountBalance(ownerTokenAccount);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );

    await program.methods
      .claimUnstake()
      .accountsStrict({
        owner: setup.user1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.user1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
        ownerTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPoolPre.totalUnstaking
        .sub(operatorPool.totalUnstaking)
        .eq(stakingRecordPre.tokensUnstakeAmount)
    );

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );
    const tokenBalancePost =
      await connection.getTokenAccountBalance(ownerTokenAccount);
    const amountClaimed =
      Number(tokenBalancePost.value.amount) -
      Number(tokenBalancePre.value.amount);

    assert(stakingRecordPre.tokensUnstakeAmount.eqn(amountClaimed));
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it("Create RewardRecord 1 successfully", async () => {
    // Create an empty record with no rewards.
    await program.methods
      .createRewardRecord([], new anchor.BN(0))
      .accountsStrict({
        payer: setup.payer,
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[1],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.signer1Kp])
      .rpc();
  });

  it("Create RewardRecord 2 successfully", async () => {
    const rewardAddresses = setup.rewardEpochs[1].addresses;
    const rewardAmounts = setup.rewardEpochs[1].amounts;

    const merkleTree = constructMerkleTree(rewardAddresses, rewardAmounts);

    const merkleRoots = [merkleTree[merkleTree.length - 1][0]];
    let totalRewards = new anchor.BN(0);
    for (const amount of rewardAmounts) {
      totalRewards = totalRewards.addn(amount);
    }

    // Fund rewardTokenAccount
    await mintTo(
      connection,
      setup.payerKp,
      setup.tokenMint,
      setup.rewardTokenAccount,
      setup.signer1Kp,
      totalRewards.toNumber()
    );

    // Create a record for epoch 2 with rewards for Operator 1 to 4.
    await program.methods
      .createRewardRecord(merkleRoots, totalRewards)
      .accountsStrict({
        payer: setup.payer,
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.signer1Kp])
      .rpc();

    const rewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    assert(rewardRecord.epoch.eqn(2));
    assert(rewardRecord.totalRewards.eq(totalRewards));
    for (let i = 0; i < rewardRecord.merkleRoots.length; i++) {
      assert.deepEqual(rewardRecord.merkleRoots[i], Array.from(merkleRoots[i]));
    }
  });

  it("Accrue Rewards successfully", async () => {
    const rewardAddresses = setup.rewardEpochs[1].addresses;
    const rewardAmounts = setup.rewardEpochs[1].amounts;
    const { proof, proofPath } = generateMerkleProof(
      rewardAddresses,
      rewardAmounts,
      0
    );

    await program.methods
      .accrueReward(0, proof, proofPath, new anchor.BN(100))
      .accountsStrict({
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });
});
