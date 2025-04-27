import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStaking } from "@sdk/src/idl";

import type {
  ConstructMerkleTreeInput,
  GenerateMerkleProofInput,
} from "@tests/lib/merkle";
import { MerkleUtils } from "@tests/lib/merkle";
import type { SetupTestResult } from "@tests/lib/setup";
import { setupTests } from "@tests/lib/setup";
import {
  assertStakingRecordCreatedState,
  debug,
  formatBN,
  generateRewardsForEpoch,
  randomIntInRange,
  setEpochFinalizationState,
} from "@tests/lib/utils";

const NUMBER_OF_EPOCHS = 3;

describe("multi-epoch lifecycle tests", () => {
  let setup: SetupTestResult;
  let connection: Connection;
  let program: Program<InferenceStaking>;
  const epochRewards: ConstructMerkleTreeInput[][] = [];

  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(5);
  const autoStakeFees = false;
  const commissionRateBps = 1_500;
  const allowDelegation = true;
  const minOperatorShareBps = 1_000;
  const allowPoolCreation = true;
  const isStakingHalted = false;
  const isWithdrawalHalted = false;

  before(async () => {
    setup = await setupTests();
    program = setup.sdk.program;
    connection = program.provider.connection;
  });

  it("Create PoolOverview successfully", async () => {
    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        usdcMint: setup.usdcTokenMint,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.programAdmin.equals(setup.poolOverviewAdmin));
    assert(poolOverview.mint.equals(setup.tokenMint));

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

    assert(poolOverview.programAdmin.equals(setup.poolOverviewAdmin));
    assert(poolOverview.mint.equals(setup.tokenMint));
    assert.isEmpty(poolOverview.haltAuthorities);
    assert(poolOverview.totalPools.isZero());
    assert(poolOverview.completedRewardEpoch.isZero());
    assert(poolOverview.unclaimedRewards.isZero());
  });

  it("Update PoolOverview authorities successfully", async () => {
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
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(
      poolOverview.programAdmin.equals(setup.poolOverviewAdminKp.publicKey)
    );
    assert(poolOverview.slashingAuthorities.length === 1);
    assert(
      poolOverview.slashingAuthorities[0]?.equals(setup.slashingAuthority)
    );
    assert(poolOverview.haltAuthorities.length === 1);
    assert(poolOverview.haltAuthorities[0]?.equals(setup.haltingAuthority));
    assert(poolOverview.rewardDistributionAuthorities.length === 1);
    assert(
      poolOverview.rewardDistributionAuthorities[0]?.equals(
        setup.rewardDistributionAuthority
      )
    );
  });

  it("Create OperatorPools", async () => {
    for (let i = 0; i < setup.pools.length; i++) {
      const pool = setup.pools[i];
      assert(pool != null);
      await program.methods
        .createOperatorPool({
          autoStakeFees,
          commissionRateBps,
          allowDelegation,
        })
        .accountsStrict({
          payer: setup.payer,
          admin: pool.admin,
          operatorPool: pool.pool,
          stakingRecord: pool.stakingRecord,
          stakedTokenAccount: pool.stakedTokenAccount,
          feeTokenAccount: pool.feeTokenAccount,
          poolOverview: setup.poolOverview,
          mint: setup.tokenMint,
          usdcPayoutDestination: pool.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, pool.adminKp])
        .rpc();

      const operatorPool = await program.account.operatorPool.fetch(pool.pool);
      assert(operatorPool.poolId.eqn(i + 1));
      assert(operatorPool.admin.equals(pool.admin));
      assert(operatorPool.operatorStakingRecord.equals(pool.stakingRecord));
      assert.equal(operatorPool.autoStakeFees, autoStakeFees);
      assert.equal(operatorPool.commissionRateBps, commissionRateBps);
      assert.isNull(operatorPool.newCommissionRateBps);
      assert.equal(operatorPool.allowDelegation, allowDelegation);
      assert(operatorPool.totalStakedAmount.isZero());
      assert(operatorPool.totalShares.isZero());
      assert(operatorPool.totalUnstaking.isZero());
      assert.isNull(operatorPool.closedAt);
      assert(!operatorPool.isHalted);
      assert(operatorPool.rewardLastClaimedEpoch.eqn(0));
      assert(operatorPool.accruedRewards.isZero());
      assert(operatorPool.accruedCommission.isZero());

      const stakingRecord = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );
      assert(stakingRecord.owner.equals(pool.admin));
      assert(stakingRecord.operatorPool.equals(pool.pool));
      assert(stakingRecord.shares.isZero());
      assert(stakingRecord.tokensUnstakeAmount.isZero());
      assert(stakingRecord.unstakeAtTimestamp.isZero());
    }
  });

  it("Stake operator pool admins", async () => {
    debug(
      `\nPerforming admin stake instructions for ${setup.pools.length} operator pools`
    );
    for (const pool of setup.pools) {
      const stakeAmount = new anchor.BN(randomIntInRange(100_000, 1_000_000));

      const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        setup.payerKp,
        setup.tokenMint,
        pool.admin
      );

      await mintTo(
        connection,
        setup.payerKp,
        setup.tokenMint,
        ownerTokenAccount.address,
        setup.tokenHolderKp,
        stakeAmount.toNumber()
      );

      const poolPre = await program.account.operatorPool.fetch(pool.pool);
      const stakingRecordPre = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );

      await program.methods
        .stake(stakeAmount)
        .accountsStrict({
          owner: pool.admin,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          ownerStakingRecord: pool.stakingRecord,
          operatorStakingRecord: pool.stakingRecord,
          stakedTokenAccount: pool.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          ownerTokenAccount: ownerTokenAccount.address,
        })
        .signers([pool.adminKp])
        .rpc();

      const poolPost = await program.account.operatorPool.fetch(pool.pool);
      const stakingRecordPost = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );

      assertStakingRecordCreatedState({
        poolPost,
        poolPre,
        stakingRecordPost,
        stakingRecordPre,
        stakeAmount,
      });

      debug(
        `- Staked ${stakeAmount.toString()} tokens for Operator Pool ${pool.pool.toString()}`
      );
    }
  });

  it("Stake random amounts for every delegator", async () => {
    debug(
      `\nPerforming delegator stake instructions for ${setup.delegatorKeypairs.length} delegators`
    );
    for (let i = 0; i < setup.delegatorKeypairs.length; i++) {
      const delegatorKp = setup.delegatorKeypairs[i];
      assert(delegatorKp != null);
      const pool = setup.pools[i % setup.pools.length];
      assert(pool != null);

      const stakingRecord = setup.sdk.stakingRecordPda(
        pool.pool,
        delegatorKp.publicKey
      );

      await program.methods
        .createStakingRecord()
        .accountsStrict({
          payer: setup.payer,
          owner: delegatorKp.publicKey,
          operatorPool: pool.pool,
          stakingRecord,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, delegatorKp])
        .rpc();

      const poolPre = await program.account.operatorPool.fetch(pool.pool);
      const stakingRecordPre = await program.account.stakingRecord.fetch(
        stakingRecord
      );

      assert(stakingRecordPre.owner.equals(delegatorKp.publicKey));
      assert(stakingRecordPre.operatorPool.equals(pool.pool));
      assert(stakingRecordPre.shares.isZero());
      assert(stakingRecordPre.tokensUnstakeAmount.isZero());
      assert(stakingRecordPre.unstakeAtTimestamp.isZero());

      const stakeAmount = new anchor.BN(
        Math.floor(randomIntInRange(10_000, 100_000))
      );

      const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        setup.payerKp,
        setup.tokenMint,
        delegatorKp.publicKey
      );

      await mintTo(
        connection,
        setup.payerKp,
        setup.tokenMint,
        ownerTokenAccount.address,
        setup.tokenHolderKp,
        stakeAmount.toNumber()
      );

      await program.methods
        .stake(stakeAmount)
        .accountsStrict({
          owner: delegatorKp.publicKey,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          ownerStakingRecord: stakingRecord,
          operatorStakingRecord: pool.stakingRecord,
          stakedTokenAccount: pool.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          ownerTokenAccount: ownerTokenAccount.address,
        })
        .signers([delegatorKp])
        .rpc();

      const poolPost = await program.account.operatorPool.fetch(pool.pool);
      const stakingRecordPost = await program.account.stakingRecord.fetch(
        stakingRecord
      );

      assertStakingRecordCreatedState({
        poolPost,
        poolPre,
        stakingRecordPost,
        stakingRecordPre,
        stakeAmount,
      });

      debug(
        `- Staked ${stakeAmount.toString()} tokens for delegator ${delegatorKp.publicKey.toString()}`
      );
    }
  });

  it("Create reward records", async () => {
    debug(`\nCreating reward records for ${NUMBER_OF_EPOCHS} epochs`);
    for (let i = 1; i <= NUMBER_OF_EPOCHS; i++) {
      const rewards = generateRewardsForEpoch(
        setup.pools.map((pool) => pool.pool)
      );
      epochRewards.push(rewards);
      const merkleTree = MerkleUtils.constructMerkleTree(rewards);
      const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree))];
      let totalRewards = new anchor.BN(0);
      for (const addressInput of rewards) {
        totalRewards = totalRewards.addn(Number(addressInput.tokenAmount));
      }
      let totalUsdcAmount = new anchor.BN(0);
      for (const addressInput of rewards) {
        totalUsdcAmount = totalUsdcAmount.addn(Number(addressInput.usdcAmount));
      }

      await mintTo(
        connection,
        setup.payerKp,
        setup.tokenMint,
        setup.rewardTokenAccount,
        setup.tokenHolderKp,
        totalRewards.toNumber()
      );

      await mintTo(
        connection,
        setup.payerKp,
        setup.usdcTokenMint,
        setup.usdcTokenAccount,
        setup.tokenHolderKp,
        totalUsdcAmount.toNumber()
      );

      await setEpochFinalizationState({
        setup,
        program,
      });

      const rewardRecord = setup.sdk.rewardRecordPda(new anchor.BN(i));

      const tokens = formatBN(totalRewards);
      const usdc = formatBN(totalUsdcAmount);
      debug(
        `Creating RewardRecord for epoch ${i} - total token reward = ${tokens} - total USDC payout = ${usdc}`
      );

      await program.methods
        .createRewardRecord({
          merkleRoots,
          totalRewards,
          totalUsdcPayout: totalUsdcAmount,
        })
        .accountsStrict({
          payer: setup.payer,
          authority: setup.rewardDistributionAuthority,
          poolOverview: setup.poolOverview,
          rewardRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
        .rpc();

      const rewardRecordAccount = await program.account.rewardRecord.fetch(
        rewardRecord
      );
      assert(rewardRecordAccount.epoch.eqn(i));
      assert(rewardRecordAccount.totalRewards.eq(totalRewards));
      for (let i = 0; i < rewardRecordAccount.merkleRoots.length; i++) {
        assert.deepEqual(
          rewardRecordAccount.merkleRoots[i],
          Array.from(merkleRoots[i] ?? [])
        );
      }
    }
  });

  it(`Accrue Rewards successfully for ${NUMBER_OF_EPOCHS} epochs`, async () => {
    const commissionFeeMap = new Map<string, anchor.BN>();

    for (let i = 1; i <= NUMBER_OF_EPOCHS; i++) {
      debug(`\nAccruing rewards for Epoch ${i}`);

      for (const pool of setup.pools) {
        const isFinalEpochClaim = i === NUMBER_OF_EPOCHS;

        const epochReward = epochRewards[i - 1];
        assert(epochReward != null);
        const merkleTree = MerkleUtils.constructMerkleTree(epochReward);
        const nodeIndex = epochReward.findIndex(
          (x) => x.address == pool.pool.toString()
        );
        const proofInputs = {
          ...epochReward[nodeIndex],
          index: nodeIndex,
          merkleTree,
        } as GenerateMerkleProofInput;

        const epochRewardsForPool = epochRewards
          .flatMap((epochReward) =>
            epochReward.find((x) => x.address == pool.pool.toString())
          )
          .filter((x) => x != null);
        const totalRewardsForPool = epochRewardsForPool.reduce(
          (acc, curr) => acc.add(new anchor.BN(Number(curr.tokenAmount))),
          new anchor.BN(0)
        );

        const { proof, proofPath } =
          MerkleUtils.generateMerkleProof(proofInputs);

        const poolOverviewPre = await program.account.poolOverview.fetch(
          setup.poolOverview
        );
        const operatorPre = await program.account.operatorPool.fetch(pool.pool);
        const operatorStakingRecordPre =
          await program.account.stakingRecord.fetch(pool.stakingRecord);
        const rewardBalancePre = await connection.getTokenAccountBalance(
          setup.rewardTokenAccount
        );
        const stakedBalancePre = await connection.getTokenAccountBalance(
          pool.stakedTokenAccount
        );
        const feeBalancePre = await connection.getTokenAccountBalance(
          pool.feeTokenAccount
        );

        const rewardAmount = new anchor.BN(Number(proofInputs.tokenAmount));
        const usdcAmount = new anchor.BN(Number(proofInputs.usdcAmount));

        const rewardRecord = setup.sdk.rewardRecordPda(new anchor.BN(i));

        const tokens = formatBN(rewardAmount);
        const usdc = formatBN(usdcAmount);
        debug(
          `- Calling AccrueReward for Operator Pool ${pool.pool.toString()} - rewardAmount = ${tokens} - usdcAmount = ${usdc}`
        );

        await program.methods
          .accrueReward({
            merkleIndex: 0,
            proof: proof.map((arr) => Array.from(arr)),
            proofPath,
            rewardAmount,
            usdcAmount,
          })
          .accountsStrict({
            poolOverview: setup.poolOverview,
            rewardRecord,
            operatorPool: pool.pool,
            operatorStakingRecord: pool.stakingRecord,
            rewardTokenAccount: setup.rewardTokenAccount,
            stakedTokenAccount: pool.stakedTokenAccount,
            feeTokenAccount: pool.feeTokenAccount,
            usdcTokenAccount: setup.usdcTokenAccount,
            usdcPayoutDestination: pool.usdcTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        const operatorPool = await program.account.operatorPool.fetch(
          pool.pool
        );

        assert(operatorPool.rewardLastClaimedEpoch.eqn(i));
        assert(operatorPool.totalShares.eq(operatorPre.totalShares));
        assert(operatorPool.totalUnstaking.eq(operatorPre.totalUnstaking));
        assert.isNull(operatorPool.newCommissionRateBps);

        // Verify that operator's shares remain unchanged with auto-stake disabled.
        const operatorStakingRecord = await program.account.stakingRecord.fetch(
          pool.stakingRecord
        );
        assert(
          operatorStakingRecordPre.shares.eq(operatorStakingRecord.shares)
        );

        const commissionFees = rewardAmount.muln(commissionRateBps / 10_000);
        const currentCommissionFeesForPool =
          commissionFeeMap.get(pool.pool.toString()) ?? new anchor.BN(0);
        commissionFeeMap.set(
          pool.pool.toString(),
          currentCommissionFeesForPool.add(commissionFees)
        );

        if (isFinalEpochClaim) {
          // Verify that unclaimedRewards on PoolOverview is updated.
          const poolOverview = await program.account.poolOverview.fetch(
            setup.poolOverview
          );
          assert(
            poolOverviewPre.unclaimedRewards
              .sub(poolOverview.unclaimedRewards)
              .eq(totalRewardsForPool)
          );

          // Verify that token balance changes are correct.
          const rewardBalance = await connection.getTokenAccountBalance(
            setup.rewardTokenAccount
          );
          const stakedBalance = await connection.getTokenAccountBalance(
            pool.stakedTokenAccount
          );
          const feeBalance = await connection.getTokenAccountBalance(
            pool.feeTokenAccount
          );
          assert(
            totalRewardsForPool.eqn(
              Number(rewardBalancePre.value.amount) -
                Number(rewardBalance.value.amount)
            )
          );

          const commissionFees = commissionFeeMap.get(pool.pool.toString());
          assert(commissionFees != null);

          const delegatorRewards = totalRewardsForPool.sub(commissionFees);

          // Verify that claimed delegator rewards are added to OperatorPool
          // and rewardLastClaimedEpoch is updated.
          assert(
            operatorPool.totalStakedAmount
              .sub(operatorPre.totalStakedAmount)
              .eq(delegatorRewards)
          );
          assert(operatorPool.accruedRewards.isZero());
          assert(operatorPool.accruedCommission.isZero());

          assert(
            commissionFees.eqn(
              Number(feeBalance.value.amount) -
                Number(feeBalancePre.value.amount)
            )
          );
          assert(
            delegatorRewards.eqn(
              Number(stakedBalance.value.amount) -
                Number(stakedBalancePre.value.amount)
            )
          );
        }
      }
    }
  });
});
