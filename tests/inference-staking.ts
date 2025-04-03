import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { INF_STAKING, setupTests, sleep } from "./utils";
import { constructMerkleTree, generateMerkleProof } from "./merkle";
import { createProgram } from "inference-staking";

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
    assert(poolOverview.delegatorUnstakeDelaySeconds.isZero());
    assert(poolOverview.operatorUnstakeDelaySeconds.isZero());
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
        delegatorUnstakeDelaySeconds,
        operatorUnstakeDelaySeconds
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
    assert(
      poolOverview.delegatorUnstakeDelaySeconds.eq(delegatorUnstakeDelaySeconds)
    );
    assert(
      poolOverview.operatorUnstakeDelaySeconds.eq(operatorUnstakeDelaySeconds)
    );

    // Check that all other values remain the same.
    assert(poolOverview.admin.equals(setup.signer1));
    assert(poolOverview.mint.equals(setup.tokenMint));
    assert.isEmpty(poolOverview.haltAuthorities);
    assert(poolOverview.totalPools.isZero());
    assert(poolOverview.completedRewardEpoch.isZero());
    assert(poolOverview.unclaimedRewards.isZero());
  });

  it("Update PoolOverview authorities successfully", async () => {
    await program.methods
      .updatePoolOverviewAuthorities(setup.poolOverviewAdminKp.publicKey, [
        setup.haltAuthority1Kp.publicKey,
      ])
      .accountsStrict({
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.admin.equals(setup.poolOverviewAdminKp.publicKey));
    assert(poolOverview.haltAuthorities.length === 1);
    assert(
      poolOverview.haltAuthorities[0].equals(setup.haltAuthority1Kp.publicKey)
    );
  });

  it("Create OperatorPool 1 successfully", async () => {
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

  it("OperatorPool change admin successfully", async () => {
    await program.methods
      .changeOperatorAdmin()
      .accountsStrict({
        admin: setup.signer1,
        newAdmin: setup.signer2,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.signer1Kp, setup.signer2Kp])
      .rpc();

    let operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPool.admin.equals(setup.signer2), "Admin should be signer2");

    // Set back to signer 1
    await program.methods
      .changeOperatorAdmin()
      .accountsStrict({
        admin: setup.signer2,
        newAdmin: setup.signer1,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.signer1Kp, setup.signer2Kp])
      .rpc();
    operatorPool = await program.account.operatorPool.fetch(setup.pool1.pool);
    assert(operatorPool.admin.equals(setup.signer1), "Admin should be signer1");
  });

  it("Should update OperatorPool successfully", async () => {
    const newCommissionRateBps = 1500;
    await program.methods
      .updateOperatorPool({
        newCommissionRateBps,
        autoStakeFees: true,
        allowDelegation: false,
      })
      .accountsStrict({
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.signer1Kp])
      .rpc();

    let operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPool.newCommissionRateBps === newCommissionRateBps,
      "New commission rate should be set"
    );
    assert(operatorPool.autoStakeFees === true, "Auto stake should be true");
    assert(
      operatorPool.allowDelegation === false,
      "Allow delegation should be false"
    );
    // Reset to original values
    await program.methods
      .updateOperatorPool({
        newCommissionRateBps: null,
        autoStakeFees,
        allowDelegation,
      })
      .accountsStrict({
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.signer1Kp])
      .rpc();

    operatorPool = await program.account.operatorPool.fetch(setup.pool1.pool);
    assert.isNull(
      operatorPool.newCommissionRateBps,
      "New commission rate should be set back to None"
    );
    assert(
      operatorPool.autoStakeFees === autoStakeFees,
      "Auto stake should be original value"
    );
    assert(
      operatorPool.allowDelegation === allowDelegation,
      "Allow delegation should be original value"
    );
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

  // TODO should verify the token amount was transferred correctly?
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

  it("Unstake for user successfully", async () => {
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
      currentTimestamp + delegatorUnstakeDelaySeconds.toNumber(),
      3
    );
  });

  it("Unstake for operator successfully", async () => {
    const unstakeAmount = new anchor.BN(10_000);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );

    await program.methods
      .unstake(unstakeAmount)
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.signer1Kp])
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
    assert(
      operatorPool.totalUnstaking.eq(
        operatorPoolPre.totalUnstaking.add(unstakeAmount)
      )
    );

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(stakingRecordPre.shares.sub(stakingRecord.shares).eq(unstakeAmount));
    assert(stakingRecord.tokensUnstakeAmount.eq(unstakeAmount));

    const currentTimestamp = Date.now() / 1000;
    assert.approximately(
      stakingRecord.unstakeAtTimestamp.toNumber(),
      currentTimestamp + operatorUnstakeDelaySeconds.toNumber(),
      3
    );
  });

  it("Cancel unstake successfully", async () => {
    const unstakeShares = new anchor.BN(10_000);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );

    await program.methods
      .cancelUnstake()
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    // Token:Share at 1:1 ratio
    assert(
      operatorPool.totalStakedAmount
        .sub(operatorPoolPre.totalStakedAmount)
        .eq(unstakeShares)
    );
    assert(
      operatorPool.totalShares
        .sub(operatorPoolPre.totalShares)
        .eq(unstakeShares)
    );
    assert(
      operatorPoolPre.totalUnstaking.eq(
        operatorPool.totalUnstaking.add(unstakeShares)
      )
    );

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(stakingRecord.shares.sub(stakingRecordPre.shares).eq(unstakeShares));
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());

    // Resume unstaking
    await program.methods
      .unstake(unstakeShares)
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.signer1Kp])
      .rpc();
  });

  it("Create RewardRecord 1 successfully", async () => {
    // Create an empty record with no rewards.
    await program.methods
      .createRewardRecord([], new anchor.BN(0))
      .accountsStrict({
        payer: setup.payer,
        admin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[1],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
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
      // @ts-ignore
      .createRewardRecord(merkleRoots, totalRewards)
      .accountsStrict({
        payer: setup.payer,
        admin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
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

  it("PoolOverview admin modifies RewardRecord successfully", async () => {
    const epoch1Addresses = [
      setup.pool1.pool.toString(),
      setup.pool2.pool.toString(),
      setup.pool3.pool.toString(),
      setup.pool4.pool.toString(),
    ];
    const epoch1Amounts = [200, 100, 300, 400];

    const merkleTree = constructMerkleTree(epoch1Addresses, epoch1Amounts);

    const merkleRoots = [merkleTree[merkleTree.length - 1][0]];
    let epoch1RewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    const prevMerkleRoots = epoch1RewardRecord.merkleRoots;

    await program.methods
      // @ts-ignore
      .modifyRewardRecord({
        merkleRoots: merkleRoots,
      })
      .accountsStrict({
        admin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    epoch1RewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    assert.deepEqual(
      epoch1RewardRecord.merkleRoots,
      merkleRoots.map((root) => Array.from(root))
    );

    // Set root back to previous
    await program.methods
      // @ts-ignore
      .modifyRewardRecord({
        merkleRoots: prevMerkleRoots,
      })
      .accountsStrict({
        admin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
    epoch1RewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    assert.deepEqual(epoch1RewardRecord.merkleRoots, prevMerkleRoots);
  });

  it("Accrue Rewards successfully", async () => {
    const rewardAddresses = setup.rewardEpochs[1].addresses;
    const rewardAmounts = setup.rewardEpochs[1].amounts;
    const { proof, proofPath } = generateMerkleProof(
      rewardAddresses,
      rewardAmounts,
      0
    );
    const poolOverviewPre = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    const operatorPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const operatorStakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    const rewardBalancePre = await connection.getTokenAccountBalance(
      setup.rewardTokenAccount
    );
    const stakedBalancePre = await connection.getTokenAccountBalance(
      setup.pool1.stakedTokenAccount
    );
    const feeBalancePre = await connection.getTokenAccountBalance(
      setup.pool1.feeTokenAccount
    );

    const rewardAmount = new anchor.BN(100);
    await program.methods
      .accrueReward(0, proof, proofPath, rewardAmount)
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

    // Verify that unclaimedRewards on PoolOverview is updated.
    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(
      poolOverviewPre.unclaimedRewards
        .sub(poolOverview.unclaimedRewards)
        .eq(rewardAmount)
    );

    const commissionFees = rewardAmount.muln(commissionRateBps / 10000);
    const delegatorRewards = rewardAmount.sub(commissionFees);

    // Verify that claimed delegator rewards are added to OperatorPool
    // and rewardLastClaimedEpoch is updated.
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPool.totalStakedAmount
        .sub(operatorPre.totalStakedAmount)
        .eq(delegatorRewards)
    );
    assert(operatorPool.rewardLastClaimedEpoch.eqn(2));
    assert(operatorPool.totalShares.eq(operatorPre.totalShares));
    assert(operatorPool.totalUnstaking.eq(operatorPre.totalUnstaking));
    assert(operatorPool.accruedRewards.isZero());
    assert(operatorPool.accruedCommission.isZero());
    assert.isNull(operatorPool.newCommissionRateBps);

    // Verify that operator's shares remain unchanged with auto-stake disabled.
    const operatorStakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(operatorStakingRecordPre.shares.eq(operatorStakingRecord.shares));

    // Verify that token balance changes are correct.
    const rewardBalance = await connection.getTokenAccountBalance(
      setup.rewardTokenAccount
    );
    const stakedBalance = await connection.getTokenAccountBalance(
      setup.pool1.stakedTokenAccount
    );
    const feeBalance = await connection.getTokenAccountBalance(
      setup.pool1.feeTokenAccount
    );
    assert(
      rewardAmount.eqn(
        Number(rewardBalancePre.value.amount) -
          Number(rewardBalance.value.amount)
      )
    );
    assert(
      commissionFees.eqn(
        Number(feeBalance.value.amount) - Number(feeBalancePre.value.amount)
      )
    );
    assert(
      delegatorRewards.eqn(
        Number(stakedBalance.value.amount) -
          Number(stakedBalancePre.value.amount)
      )
    );
  });

  it.skip("Claim unstake for user successfully", async () => {
    await sleep(delegatorUnstakeDelaySeconds.toNumber() * 1000);

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.user1
    );
    const tokenBalancePre = await connection.getTokenAccountBalance(
      ownerTokenAccount
    );
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
    const tokenBalancePost = await connection.getTokenAccountBalance(
      ownerTokenAccount
    );
    const amountClaimed =
      Number(tokenBalancePost.value.amount) -
      Number(tokenBalancePre.value.amount);

    assert(stakingRecordPre.tokensUnstakeAmount.eqn(amountClaimed));
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it("Admin should be able to slash OperatorPool 1 stake", async () => {
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );

    const [
      destinationBalancePre,
      operatorPoolTokenAccountPre,
      operatorStakingRecordPre,
      operatorPoolPre,
    ] = await Promise.all([
      connection.getTokenAccountBalance(destinationTokenAccount),
      connection.getTokenAccountBalance(setup.pool1.stakedTokenAccount),
      program.account.stakingRecord.fetch(setup.pool1.signer1Record),
      program.account.operatorPool.fetch(setup.pool1.pool),
    ]);

    // Slash 5% of the operator's stake.
    const sharesToSlash = operatorStakingRecordPre.shares.divn(20);
    const expectedStakeRemoved = operatorPoolPre.totalStakedAmount
      .mul(sharesToSlash)
      .div(operatorPoolPre.totalShares);

    await program.methods
      .slashStake({ sharesAmount: sharesToSlash })
      .accountsStrict({
        admin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        destination: destinationTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    const [
      destinationBalancePost,
      operatorPoolTokenAccountPost,
      operatorStakingRecordPost,
      operatorPoolPost,
    ] = await Promise.all([
      connection.getTokenAccountBalance(destinationTokenAccount),
      connection.getTokenAccountBalance(setup.pool1.stakedTokenAccount),
      program.account.stakingRecord.fetch(setup.pool1.signer1Record),
      program.account.operatorPool.fetch(setup.pool1.pool),
    ]);

    // Assert change in Operator stake
    assert(
      operatorStakingRecordPost.shares
        .add(sharesToSlash)
        .eq(operatorStakingRecordPre.shares),
      "StakingRecord Shares must decrement"
    );
    // Assert change in OperatorPool
    assert(
      operatorPoolPost.totalShares.eq(
        operatorPoolPre.totalShares.sub(sharesToSlash)
      ),
      "OperatorPool total shares must decrement"
    );
    assert(
      operatorPoolPost.totalStakedAmount.eq(
        operatorPoolPre.totalStakedAmount.sub(expectedStakeRemoved)
      ),
      "OperatorPool total staked amount must decrement"
    );

    // Assert OperatorPool token account sent tokens
    assert(
      new anchor.BN(operatorPoolTokenAccountPost.value.amount).eq(
        new anchor.BN(operatorPoolTokenAccountPre.value.amount).sub(
          expectedStakeRemoved
        )
      ),
      "OperatorPool token account must send the slashed amount"
    );

    // Assert destination recevied tokens
    assert(
      new anchor.BN(destinationBalancePost.value.amount).eq(
        new anchor.BN(destinationBalancePre.value.amount).add(
          expectedStakeRemoved
        )
      ),
      "Destination token account must receive the slashed amount"
    );
  });

  it("OperatorPool 1 Admin should be able to withdraw reward commission", async () => {
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );
    const [operatorPoolPre, feeTokenAccountPre, destinationPre] =
      await Promise.all([
        program.account.operatorPool.fetch(setup.pool1.pool),
        connection.getTokenAccountBalance(setup.pool1.feeTokenAccount),
        connection.getTokenAccountBalance(destinationTokenAccount),
      ]);

    await program.methods
      .withdrawOperatorCommission()
      .accountsStrict({
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        destination: destinationTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const [operatorPoolPost, feeTokenAccountPost, destinationPost] =
      await Promise.all([
        program.account.operatorPool.fetch(setup.pool1.pool),
        connection.getTokenAccountBalance(setup.pool1.feeTokenAccount),
        connection.getTokenAccountBalance(destinationTokenAccount),
      ]);

    // Assert Fee TokenAccount has 0 balance
    assert(
      feeTokenAccountPost.value.amount === "0",
      "Fee TokenAccount must have 0 balance"
    );

    // Assert fee balance was transferred to destination
    assert(
      new anchor.BN(destinationPost.value.amount)
        .sub(new anchor.BN(destinationPre.value.amount))
        .eq(new anchor.BN(feeTokenAccountPre.value.amount)),
      "Destination must receive the fee balance"
    );
  });

  it("PoolOverview admin should update halt status status", async () => {
    await program.methods
      .setHaltStatus({
        isHalted: true,
      })
      .accountsStrict({
        authority: setup.haltAuthority1Kp.publicKey,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.haltAuthority1Kp])
      .rpc();

    let operatorPoolPost = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPoolPost.isHalted, "OperatorPool must be halted");

    // Set back to unhalted
    await program.methods
      .setHaltStatus({
        isHalted: false,
      })
      .accountsStrict({
        authority: setup.haltAuthority1Kp.publicKey,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.haltAuthority1Kp])
      .rpc();

    operatorPoolPost = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    assert(!operatorPoolPost.isHalted, "OperatorPool must be unhalted");
  });

  it("OperatorPool admin should update StakingRecord successfully", async () => {
    // Set StakingRecord to user1's, then changes it back.
    await program.methods
      .changeOperatorStakingRecord()
      .accountsStrict({
        admin: setup.signer1,
        owner: setup.user1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        newStakingRecord: setup.pool1.user1Record,
      })
      .signers([setup.signer1Kp, setup.user1Kp])
      .rpc();

    let operatorPoolPost = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    assert(
      operatorPoolPost.operatorStakingRecord.equals(setup.pool1.user1Record),
      "OperatorPool1 should use user1 StakingRecord"
    );

    await program.methods
      .changeOperatorStakingRecord()
      .accountsStrict({
        admin: setup.signer1,
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.user1Record,
        newStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.signer1Kp])
      .rpc();

    operatorPoolPost = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPoolPost.operatorStakingRecord.equals(setup.pool1.signer1Record),
      "OperatorPool1 should use signer1 StakingRecord"
    );
  });

  it("Should close StakingRecord successfully", async () => {
    const user2Record = PublicKey.findProgramAddressSync(
      [
        setup.pool1.pool.toBuffer(),
        setup.user2.toBuffer(),
        Buffer.from("StakingRecord"),
      ],
      INF_STAKING
    )[0];
    await program.methods
      .createStakingRecord()
      .accountsStrict({
        payer: setup.payer,
        owner: setup.user2,
        operatorPool: setup.pool1.pool,
        stakingRecord: user2Record,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.user2Kp])
      .rpc();

    const stakingRecord = await program.account.stakingRecord.fetch(
      user2Record
    );
    assert.isNotNull(stakingRecord);
    await program.methods
      .closeStakingRecord()
      .accountsStrict({
        receiver: setup.payer,
        owner: setup.user2,
        stakingRecord: user2Record,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.user2Kp])
      .rpc();
    const closedStakingRecord =
      await program.account.stakingRecord.fetchNullable(user2Record);
    assert.isNull(closedStakingRecord, "StakingRecord should have closed");
  });

  // TODO: Add test for accruing of past epoch rewards for same OperatorPool.
  // TODO: Add test for accruing with auto-stake enabled for same OperatorPool.
  // TODO: Add test for accruing with commission fee change for OperatorPool.
});
