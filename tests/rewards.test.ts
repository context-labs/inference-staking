import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

import { InferenceStakingProgramSDK } from "@sdk/src/sdk";

import { MerkleUtils } from "@tests/lib/merkle";
import type {
  GenerateMerkleProofInput,
  MerkleTreeAddressInput,
} from "@tests/lib/merkle";

import { assertError, setupTests } from "./lib/utils";

describe("Test Reward Creation and Accrual", () => {
  let setup: Awaited<ReturnType<typeof setupTests>>;

  anchor.setProvider(anchor.AnchorProvider.env());
  const sdk = new InferenceStakingProgramSDK({
    provider: anchor.AnchorProvider.env(),
    environment: "localnet",
  });
  const program = sdk.program;
  const connection = program.provider.connection;

  const autoStakeFees = true;
  const commissionRateBps = 1500;
  const newCommissionRateBps = 0;
  const allowDelegation = true;
  const minOperatorShareBps = 0;
  const allowPoolCreation = true;
  const isWithdrawalHalted = false;
  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);

  let merkleTree4: Uint8Array[][];
  const rewardInputs4: MerkleTreeAddressInput[] = [];

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
      assertError(error, "ConstraintSeeds");
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
      assertError(error, "ConstraintSeeds");
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
      assertError(error, "InsufficientRewards");
    }
  });

  it("Create RewardRecord with insufficient rewards", async () => {
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const merkleRoots = [merkleTree.at(-1)?.[0]];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalRewards = totalRewards.addn(addressInput.amount);
    }

    // Should fail with insufficient rewards.
    try {
      await program.methods
        // @ts-expect-error - ignore.
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
      assertError(error, "InsufficientRewards");
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
      // @ts-expect-error - ignore.
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
    const merkleTree1 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[2].slice(0, 1)
    );
    const merkleTree2 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[2].slice(1, 2)
    );
    const merkleTree3 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[2].slice(2, 3)
    );
    const merkleTree4 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[2].slice(3, 4)
    );

    const merkleRoots = [
      merkleTree1.at(-1)?.[0],
      merkleTree2.at(-1)?.[0],
      merkleTree3.at(-1)?.[0],
      merkleTree4.at(-1)?.[0],
    ];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalRewards = totalRewards.addn(addressInput.amount);
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
      // @ts-expect-error - ignore.
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
      assert.deepEqual(
        rewardRecord.merkleRoots[i],
        Array.from(merkleRoots[i] ?? [])
      );
    }
  });

  it("Accrue Rewards fail without claim next epoch first", async () => {
    const treeIndex = setup.rewardEpochs[2].findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const merkleTree = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[2].slice(treeIndex, treeIndex + 1)
    );
    const proofInputs = {
      ...setup.rewardEpochs[2][treeIndex],
      index: 0,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);

    try {
      await program.methods
        .accrueReward(
          treeIndex,
          proof as unknown as number[][],
          proofPath,
          new anchor.BN(proofInputs.amount)
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
      assertError(error, "ConstraintRaw");
    }
  });

  it("Fail to accrue rewards with invalid proof", async () => {
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const nodeIndex = setup.rewardEpochs[2].findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const wrongNodeIndex = setup.rewardEpochs[2].findIndex(
      (x) => x.address == setup.pool2.pool.toString()
    );
    const proofInputs = {
      ...setup.rewardEpochs[2][wrongNodeIndex],
      index: wrongNodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);

    try {
      // Use proof and proof path for a different node
      await program.methods
        .accrueReward(
          0,
          proof as unknown as number[][],
          proofPath,
          new anchor.BN(setup.rewardEpochs[2][nodeIndex]?.amount ?? 0)
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
      assertError(error, "InvalidProof");
    }

    try {
      // Use proof and proof path with different lengths
      await program.methods
        .accrueReward(
          0,
          proof as unknown as number[][],
          [true, false, false],
          new anchor.BN(setup.rewardEpochs[2][nodeIndex]?.amount ?? 0)
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
      assertError(error, "InvalidProof");
    }
  });

  it("Accrue Rewards for epoch 2 successfully", async () => {
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const nodeIndex = setup.rewardEpochs[2].findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const proofInputs = {
      ...setup.rewardEpochs[2][nodeIndex],
      index: nodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const poolOverviewPre = await program.account.poolOverview.fetch(
      setup.poolOverview
    );

    const rewardAmount = new anchor.BN(proofInputs.amount);
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
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const nodeIndex = setup.rewardEpochs[2].findIndex(
        (x) => x.address == setup.pool1.pool.toString()
      );
      const proofInputs = {
        ...setup.rewardEpochs[2][nodeIndex],
        index: nodeIndex,
        merkleTree,
      } as GenerateMerkleProofInput;
      const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);
      await program.methods
        .accrueReward(
          0,
          proof as unknown as number[][],
          proofPath,
          new anchor.BN(proofInputs.amount)
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
      assertError(error, "ConstraintRaw");
    }
  });

  it("Accrue Rewards for epoch 3 successfully", async () => {
    const treeIndex = setup.rewardEpochs[2].findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const merkleTree = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[2].slice(treeIndex, treeIndex + 1)
    );
    const proofInputs = {
      ...setup.rewardEpochs[2][treeIndex],
      index: 0,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);
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

    const rewardAmount = new anchor.BN(proofInputs.amount);
    await program.methods
      .accrueReward(
        treeIndex,
        proof as unknown as number[][],
        proofPath,
        rewardAmount
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

  it("Create RewardRecord 4 with large merkle tree", async () => {
    // Distribute reward to 500000 pools.
    let totalRewards = new anchor.BN(0);
    for (let i = 0; i <= 500000; i++) {
      rewardInputs4.push({
        address: PublicKey.unique().toString(),
        amount: i * 100,
      });
      totalRewards = totalRewards.addn(i * 100);
    }

    // Add OperatorPool 1 as a recipient.
    rewardInputs4.push({
      address: setup.pool1.pool.toString(),
      amount: 10000,
    });
    rewardInputs4.sort((a, b) => a.address.localeCompare(b.address));

    merkleTree4 = MerkleUtils.constructMerkleTree(rewardInputs4);
    const merkleRoots = [merkleTree4.at(-1)?.[0]];

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
      // @ts-expect-error - ignore.
      .createRewardRecord(merkleRoots, totalRewards)
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[4],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Accrue Rewards for epoch 4 successfully", async () => {
    const nodeIndex = rewardInputs4.findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const proofInputs = {
      ...rewardInputs4[nodeIndex],
      index: nodeIndex,
      merkleTree: merkleTree4,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);

    const rewardAmount = new anchor.BN(proofInputs.amount);
    await program.methods
      .accrueReward(0, proof as unknown as number[][], proofPath, rewardAmount)
      .accountsStrict({
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[4],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  it("Create another RewardRecord after pool closure", async () => {
    // Close OperatorPool
    await program.methods
      .closeOperatorPool()
      .accountsStrict({
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.signer1Kp])
      .rpc();

    // Use same reward values as epoch 2
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const merkleRoots = [merkleTree.at(-1)?.[0]];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalRewards = totalRewards.addn(addressInput.amount);
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
      // @ts-expect-error - ignore.
      .createRewardRecord(merkleRoots, totalRewards)
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[5],
        rewardTokenAccount: setup.rewardTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Fail to accrue reward after pool closure", async () => {
    try {
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const nodeIndex = setup.rewardEpochs[2].findIndex(
        (x) => x.address == setup.pool1.pool.toString()
      );
      const proofInputs = {
        ...setup.rewardEpochs[2][nodeIndex],
        index: nodeIndex,
        merkleTree,
      } as GenerateMerkleProofInput;
      const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);
      await program.methods
        .accrueReward(
          0,
          proof as unknown as number[][],
          proofPath,
          new anchor.BN(proofInputs.amount)
        )
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[5],
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
      assertError(error, "ClosedPool");
    }
  });
});
