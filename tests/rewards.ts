import * as anchor from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { setupTests } from "./utils";
import {
  createProgram,
  constructMerkleTree,
  generateMerkleProof,
} from "inference-staking";

describe("Test Reward Creation and Accrual", () => {
  let setup: Awaited<ReturnType<typeof setupTests>>;

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = createProgram(anchor.AnchorProvider.env());

  const connection = program.provider.connection;

  // Configs
  const autoStakeFees = true;
  const commissionRateBps = 1500;
  const newCommissionRateBps = 0;
  const allowDelegation = true;
  const minOperatorShareBps = 0;
  const allowPoolCreation = true;
  const isWithdrawalHalted = false;
  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);

  before(async () => {
    setup = await setupTests();

    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();

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

    await program.methods
      .updatePoolOverview(
        isWithdrawalHalted,
        allowPoolCreation,
        minOperatorShareBps,
        delegatorUnstakeDelaySeconds,
        operatorUnstakeDelaySeconds
      )
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

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

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );
    await program.methods
      .stake(new anchor.BN(150_000))
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
    await program.methods
      .stake(new anchor.BN(400_000))
      .accountsStrict({
        owner: setup.user1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.user1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount: getAssociatedTokenAddressSync(
          setup.tokenMint,
          setup.user1
        ),
      })
      .signers([setup.user1Kp])
      .rpc();

    // Change CommissionFeeBps
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
  });

  it("Fail to create future RewardReward", async () => {
    try {
      await program.methods
        .createRewardRecord([], new anchor.BN(0))
        .accountsStrict({
          payer: setup.payer,
          authority: setup.poolOverviewAdminKp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          rewardTokenAccount: setup.rewardTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      const code = error.error.errorCode.code;
      assert.equal(code, "ConstraintSeeds");
    }
  });

  it("Create RewardRecord 1 successfully", async () => {
    // Create an empty record with no rewards.
    await program.methods
      .createRewardRecord([], new anchor.BN(0))
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[1],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Fail to create RewardRecord 1 again", async () => {
    try {
      await program.methods
        .createRewardRecord([], new anchor.BN(0))
        .accountsStrict({
          payer: setup.payer,
          authority: setup.poolOverviewAdminKp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[1],
          rewardTokenAccount: setup.rewardTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      const code = error.error.errorCode.code;
      assert.equal(code, "ConstraintSeeds");
    }
  });

  it("Fail to create RewardRecord with insufficient tokens", async () => {
    try {
      await program.methods
        .createRewardRecord([], new anchor.BN(100_000))
        .accountsStrict({
          payer: setup.payer,
          authority: setup.poolOverviewAdminKp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          rewardTokenAccount: setup.rewardTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      const code = error.error.errorCode.code;
      assert.equal(code, "InsufficientRewards");
    }
  });

  it("Create RewardRecord with insufficient rewards", async () => {
    const rewardAddresses = setup.rewardEpochs[2].addresses;
    const rewardAmounts = setup.rewardEpochs[2].amounts;

    const merkleTree = constructMerkleTree(rewardAddresses, rewardAmounts);

    const merkleRoots = [merkleTree[merkleTree.length - 1][0]];
    let totalRewards = new anchor.BN(0);
    for (const amount of rewardAmounts) {
      totalRewards = totalRewards.addn(amount);
    }

    // Should fail with insufficent rewards.
    try {
      await program.methods
        // @ts-ignore
        .createRewardRecord(merkleRoots, totalRewards)
        .accountsStrict({
          payer: setup.payer,
          authority: setup.poolOverviewAdminKp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          rewardTokenAccount: setup.rewardTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.poolOverviewAdminKp])
        .rpc();
      assert(false);
    } catch (error) {
      const code = error.error.errorCode.code;
      assert.equal(code, "InsufficientRewards");
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

    // Should succeed with sufficent rewards.
    await program.methods
      // @ts-ignore
      .createRewardRecord(merkleRoots, totalRewards)
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Create RewardRecord with multiple roots", async () => {
    const rewardAddresses = setup.rewardEpochs[2].addresses;
    const rewardAmounts = setup.rewardEpochs[2].amounts;

    const merkleTree1 = constructMerkleTree(
      [rewardAddresses[0]],
      [rewardAmounts[0]]
    );
    const merkleTree2 = constructMerkleTree(
      [rewardAddresses[1]],
      [rewardAmounts[1]]
    );
    const merkleTree3 = constructMerkleTree(
      [rewardAddresses[2]],
      [rewardAmounts[2]]
    );
    const merkleTree4 = constructMerkleTree(
      [rewardAddresses[3]],
      [rewardAmounts[3]]
    );

    const merkleRoots = [
      merkleTree1.at(-1)[0],
      merkleTree2.at(-1)[0],
      merkleTree3.at(-1)[0],
      merkleTree4.at(-1)[0],
    ];
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

    await program.methods
      // @ts-ignore
      .createRewardRecord(merkleRoots, totalRewards)
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[3],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();

    const rewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[3]
    );
    assert(rewardRecord.epoch.eqn(3));
    assert(rewardRecord.totalRewards.eq(totalRewards));
    for (let i = 0; i < rewardRecord.merkleRoots.length; i++) {
      assert.deepEqual(rewardRecord.merkleRoots[i], Array.from(merkleRoots[i]));
    }
  });

  it("Accrue Rewards fail without claim next epoch first", async () => {
    const rewardAddresses = setup.rewardEpochs[2].addresses;
    const rewardAmounts = setup.rewardEpochs[2].amounts;
    const { proof, proofPath } = generateMerkleProof(
      [rewardAddresses[0]],
      [rewardAmounts[0]],
      0
    );

    try {
      await program.methods
        .accrueReward(
          0,
          proof as unknown as number[][],
          proofPath,
          new anchor.BN(rewardAmounts[0])
        )
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[3],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.signer1Record,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    } catch (error) {
      const code = error.error.errorCode.code;
      assert.equal(code, "ConstraintRaw");
    }
  });

  it("Accrue Rewards for epoch 2 sucessfully", async () => {
    const rewardAddresses = setup.rewardEpochs[2].addresses;
    const rewardAmounts = setup.rewardEpochs[2].amounts;
    const { proof, proofPath } = generateMerkleProof(
      rewardAddresses,
      rewardAmounts,
      0
    );
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const poolOverviewPre = await program.account.poolOverview.fetch(
      setup.poolOverview
    );

    const rewardAmount = new anchor.BN(rewardAmounts[0]);
    await program.methods
      .accrueReward(0, proof as unknown as number[][], proofPath, rewardAmount)
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

    const commissionFees = rewardAmount.muln(commissionRateBps / 10000);
    const delegatorRewards = rewardAmount.sub(commissionFees);

    // Check that OperatorPool's commission rate is not updated since there's 1 more epoch to claim.
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert.equal(operatorPool.newCommissionRateBps, newCommissionRateBps);
    assert.equal(operatorPool.commissionRateBps, commissionRateBps);

    // Check that rewards accrued are accumulated.
    assert(operatorPool.accruedCommission.eq(commissionFees));
    assert(operatorPool.accruedRewards.eq(delegatorRewards));
    assert(operatorPool.rewardLastClaimedEpoch.eqn(2));

    // Check that other states are not changed
    assert(operatorPool.totalShares.eq(operatorPoolPre.totalShares));
    assert(
      operatorPool.totalStakedAmount.eq(operatorPoolPre.totalStakedAmount)
    );
    assert(operatorPool.totalUnstaking.eq(operatorPoolPre.totalUnstaking));

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.unclaimedRewards.eq(poolOverviewPre.unclaimedRewards));
  });

  it("Fail to accrue epoch 2 again", async () => {
    try {
      const rewardAddresses = setup.rewardEpochs[2].addresses;
      const rewardAmounts = setup.rewardEpochs[2].amounts;
      const { proof, proofPath } = generateMerkleProof(
        rewardAddresses,
        rewardAmounts,
        0
      );

      await program.methods
        .accrueReward(
          0,
          proof as unknown as number[][],
          proofPath,
          new anchor.BN(rewardAmounts[0])
        )
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
      assert(false);
    } catch (error) {
      const code = error.error.errorCode.code;
      assert.equal(code, "ConstraintRaw");
    }
  });

  it("Accrue Rewards for epoch 3 sucessfully", async () => {
    const rewardAddresses = setup.rewardEpochs[2].addresses;
    const rewardAmounts = setup.rewardEpochs[2].amounts;
    const { proof, proofPath } = generateMerkleProof(
      [rewardAddresses[0]],
      [rewardAmounts[0]],
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

    const rewardAmount = new anchor.BN(rewardAmounts[0]);
    await program.methods
      .accrueReward(0, proof as unknown as number[][], proofPath, rewardAmount)
      .accountsStrict({
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[3],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const commissionFees = rewardAmount.muln(commissionRateBps / 10000);
    const delegatorRewards = rewardAmount.sub(commissionFees);
    const totalTokensTransferred = commissionFees
      .add(delegatorRewards)
      .add(operatorPre.accruedCommission)
      .add(operatorPre.accruedRewards);

    const newDelegatorsStake =
      operatorPre.totalStakedAmount.add(delegatorRewards);
    const tokensPerShare =
      newDelegatorsStake.toNumber() / operatorPre.totalShares.toNumber();
    const sharesPrinted = commissionFees
      .add(operatorPre.accruedCommission)
      .divn(tokensPerShare);

    // Check that OperatorPool's commission rate is updated.
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert.isNull(operatorPool.newCommissionRateBps);
    assert.equal(operatorPool.commissionRateBps, newCommissionRateBps);

    // Check that total staked and shares are updated for auto-stake and rewards accrual.
    assert(
      operatorPool.totalStakedAmount
        .sub(operatorPre.totalStakedAmount)
        .eq(totalTokensTransferred)
    );
    assert(operatorPool.rewardLastClaimedEpoch.eqn(3));
    assert(
      operatorPool.totalShares.sub(operatorPre.totalShares).eq(sharesPrinted)
    );
    assert(operatorPool.totalUnstaking.eq(operatorPre.totalUnstaking));
    assert(operatorPool.accruedRewards.isZero());
    assert(operatorPool.accruedCommission.isZero());

    // Check that operator's stake has increased.
    const operatorStakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(
      operatorStakingRecord.shares
        .sub(operatorStakingRecordPre.shares)
        .eq(sharesPrinted)
    );

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
      totalTokensTransferred.eqn(
        Number(rewardBalancePre.value.amount) -
          Number(rewardBalance.value.amount)
      )
    );
    assert(
      totalTokensTransferred.eqn(
        Number(stakedBalance.value.amount) -
          Number(stakedBalancePre.value.amount)
      )
    );
    assert.equal(Number(feeBalance.value.amount), 0); // All fees are auto-staked
  });
});
