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
import { deserializeMerkleProof, executeWithRetries } from "@sdk/src/utils";

import {
  EPOCH_CLAIM_FREQUENCY,
  NUMBER_OF_EPOCHS,
  SHOULD_CLOSE_ACCOUNTS,
  SHOULD_UNSTAKE,
  TEST_WITH_RELAY,
} from "@tests/lib/const";
import type {
  ConstructMerkleTreeInput,
  GenerateMerkleProofInput,
} from "@tests/lib/merkle";
import { MerkleUtils } from "@tests/lib/merkle";
import type { SetupPoolType, SetupTestResult } from "@tests/lib/setup";
import { setupTests } from "@tests/lib/setup";
import { TrpcHttpClient } from "@tests/lib/trpc";
import {
  assertStakingRecordCreatedState,
  convertToTokenUnitAmount,
  debug,
  formatBN,
  generateRewardsForEpoch,
  randomIntInRange,
  setEpochFinalizationState,
} from "@tests/lib/utils";

type GetRewardClaimInputsInput = {
  epochRewards: ConstructMerkleTreeInput[][];
  pool: SetupPoolType;
  epoch: number;
  trpc: TrpcHttpClient;
};

type GetRewardClaimInputsOutput = {
  merkleIndex: number;
  proof: number[][];
  proofPath: boolean[];
  rewardAmount: anchor.BN;
  usdcAmount: anchor.BN;
};

async function getRewardClaimInputs({
  epochRewards,
  pool,
  epoch,
  trpc,
}: GetRewardClaimInputsInput): Promise<GetRewardClaimInputsOutput | null> {
  if (TEST_WITH_RELAY) {
    debug(
      "- End-to-end test flow is enabled, fetching reward claim eligibility from Relay..."
    );
    const response = await trpc.checkRewardClaimEligibility(
      pool.pool.toString(),
      BigInt(epoch)
    );

    const {
      merkleRewardAmount,
      merkleTreeIndex,
      merkleUsdcAmount,
      proof,
      proofPath,
    } = response;

    assert(
      merkleRewardAmount != null,
      "Merkle reward amount should not be null"
    );
    assert(merkleUsdcAmount != null, "Merkle usdc amount should not be null");
    assert(proof != null, "Proof should not be null");
    assert(proofPath != null, "Proof path should not be null");
    assert(merkleTreeIndex != null, "Merkle tree index should not be null");

    const deserializedProof = deserializeMerkleProof(proof);

    return {
      merkleIndex: merkleTreeIndex,
      proof: deserializedProof.map((arr) => Array.from(arr)),
      proofPath,
      rewardAmount: new anchor.BN(merkleRewardAmount.toString()),
      usdcAmount: new anchor.BN(merkleUsdcAmount.toString()),
    };
  } else {
    if (epoch > epochRewards.length) {
      debug(`Epoch ${epoch} reward data not available yet, skipping`);
      return null;
    }

    const epochReward = epochRewards[epoch - 1];
    assert(epochReward != null, `No reward data found for epoch ${epoch}`);

    const merkleTree = MerkleUtils.constructMerkleTree(epochReward);
    const nodeIndex = epochReward.findIndex(
      (x) => x.address == pool.pool.toString()
    );

    if (nodeIndex === -1) {
      debug(
        `No rewards for pool ${pool.pool.toString()} in epoch ${epoch}, skipping`
      );
      return null;
    }

    const proofInputs = {
      ...epochReward[nodeIndex],
      index: nodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;

    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);
    const rewardAmount = new anchor.BN(proofInputs.tokenAmount.toString());
    const usdcAmount = new anchor.BN(proofInputs.usdcAmount.toString());

    return {
      merkleIndex: 0,
      proof: proof.map((arr) => Array.from(arr)),
      proofPath,
      rewardAmount,
      usdcAmount,
    };
  }
}

async function handleAccrueRewardForEpochs({
  epochRewards,
  setup,
  program,
  connection,
  trpc,
}: {
  epochRewards: ConstructMerkleTreeInput[][];
  setup: SetupTestResult;
  program: Program<InferenceStaking>;
  connection: Connection;
  trpc: TrpcHttpClient;
}) {
  const commissionFeeMap = new Map<string, anchor.BN>();
  const poolOverview = await program.account.poolOverview.fetch(
    setup.poolOverview
  );
  const currentCompletedEpoch = poolOverview.completedRewardEpoch.toNumber();

  for (const pool of setup.pools) {
    const operatorPool = await program.account.operatorPool.fetch(pool.pool);
    const lastClaimedEpoch = operatorPool.rewardLastClaimedEpoch.toNumber();

    if (!commissionFeeMap.has(pool.pool.toString())) {
      commissionFeeMap.set(pool.pool.toString(), new anchor.BN(0));
    }

    const rewardClaimsForPool: anchor.BN[] = [];

    for (
      let epoch = lastClaimedEpoch + 1;
      epoch <= currentCompletedEpoch;
      epoch++
    ) {
      const isFinalEpochClaim = epoch === currentCompletedEpoch;
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
      const rewardRecord = setup.sdk.rewardRecordPda(new anchor.BN(epoch));

      const claimData = await getRewardClaimInputs({
        epochRewards,
        pool,
        epoch,
        trpc,
      });

      if (claimData == null) {
        debug(`No claim data found for epoch ${epoch}, skipping`);
        continue;
      }

      const { rewardAmount, usdcAmount, proof, proofPath } = claimData;

      const tokens = formatBN(rewardAmount);
      const usdc = formatBN(usdcAmount);

      debug(
        `- Claiming Epoch ${epoch} rewards for Operator Pool ${pool.pool.toString()} - rewardAmount = ${tokens} - usdcAmount = ${usdc}`
      );

      rewardClaimsForPool.push(rewardAmount);

      const signature = await program.methods
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
          usdcPayoutTokenAccount: pool.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      if (TEST_WITH_RELAY) {
        await trpc.insertAndProcessTransactionBySignature(signature);
      }

      const commissionFees = rewardAmount
        .mul(new anchor.BN(pool.commissionRateBps))
        .div(new anchor.BN(10_000));
      const currentCommissionFeesForPool =
        commissionFeeMap.get(pool.pool.toString()) ?? new anchor.BN(0);
      commissionFeeMap.set(
        pool.pool.toString(),
        currentCommissionFeesForPool.add(commissionFees)
      );

      const operatorPool = await program.account.operatorPool.fetch(pool.pool);
      assert(
        operatorPool.rewardLastClaimedEpoch.eqn(epoch),
        `Pool reward last claimed epoch should be ${epoch}`
      );
      assert(
        operatorPool.totalShares.eq(operatorPre.totalShares),
        "Total shares should remain unchanged"
      );
      assert(
        operatorPool.totalUnstaking.eq(operatorPre.totalUnstaking),
        "Total unstaking should remain unchanged"
      );
      assert.isNull(
        operatorPool.newCommissionRateBps,
        "New commission rate should be null"
      );

      // Verify that operator's shares remain unchanged with auto-stake disabled.
      const operatorStakingRecord = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );
      assert(
        operatorStakingRecordPre.shares.eq(operatorStakingRecord.shares),
        "Operator staking record shares should remain unchanged"
      );

      if (isFinalEpochClaim) {
        const claimedEpochsRewardsForPool = epochRewards
          .slice(lastClaimedEpoch, epoch)
          .flatMap((epochReward) =>
            epochReward.find((x) => x.address == pool.pool.toString())
          )
          .filter((x) => x != null);

        const totalClaimedRewardsForPool = TEST_WITH_RELAY
          ? rewardClaimsForPool.reduce(
              (acc, curr) => acc.add(curr),
              new anchor.BN(0)
            )
          : claimedEpochsRewardsForPool.reduce(
              (acc, curr) =>
                acc.add(new anchor.BN(curr.tokenAmount.toString())),
              new anchor.BN(0)
            );

        const poolOverview = await program.account.poolOverview.fetch(
          setup.poolOverview
        );
        assert(
          poolOverviewPre.unclaimedRewards
            .sub(poolOverview.unclaimedRewards)
            .eq(totalClaimedRewardsForPool),
          "Unclaimed rewards should be reduced by the total claimed amount"
        );

        const rewardBalance = await connection.getTokenAccountBalance(
          setup.rewardTokenAccount
        );
        const stakedBalance = await connection.getTokenAccountBalance(
          pool.stakedTokenAccount
        );
        const feeBalance = await connection.getTokenAccountBalance(
          pool.feeTokenAccount
        );

        const diff = new anchor.BN(rewardBalancePre.value.amount).sub(
          new anchor.BN(rewardBalance.value.amount)
        );
        assert(
          totalClaimedRewardsForPool.eq(diff),
          `Reward token account balance should be reduced by claimed amount: ${totalClaimedRewardsForPool.toString()} received: ${diff.toString()}`
        );

        const commissionFees = commissionFeeMap.get(pool.pool.toString());
        assert(commissionFees != null, "Commission fees should be tracked");
        const delegatorRewards = totalClaimedRewardsForPool.sub(commissionFees);

        // Verify that claimed delegator rewards are added to OperatorPool
        const stakedAmountDiff = operatorPool.totalStakedAmount.sub(
          operatorPre.totalStakedAmount
        );

        assert(
          stakedAmountDiff.eq(delegatorRewards),
          `Total staked amount should increase by delegator rewards, total staked amount diff: ${stakedAmountDiff.toString()}, delegator rewards: ${delegatorRewards.toString()}`
        );
        assert(
          operatorPool.accruedRewards.isZero(),
          `Accrued rewards should be zero, was ${operatorPool.accruedRewards.toString()}`
        );
        assert(
          operatorPool.accruedCommission.isZero(),
          `Accrued commission should be zero, was ${operatorPool.accruedCommission.toString()}`
        );
        assert(
          operatorPool.accruedUsdcPayout.isZero(),
          `Accrued USDC payout should be zero, was ${operatorPool.accruedUsdcPayout.toString()}`
        );

        // Verify token balances
        const feeBalanceDiff = new anchor.BN(feeBalance.value.amount).sub(
          new anchor.BN(feeBalancePre.value.amount)
        );
        assert(
          commissionFees.eq(feeBalanceDiff),
          `Fee token account balance should increase by commission fees, was ${feeBalance.value.amount} - ${feeBalancePre.value.amount}`
        );
        const stakedBalanceDiff = new anchor.BN(stakedBalance.value.amount).sub(
          new anchor.BN(stakedBalancePre.value.amount)
        );
        assert(
          delegatorRewards.eq(stakedBalanceDiff),
          `Staked token account balance should increase by delegator rewards, was ${stakedBalance.value.amount} - ${stakedBalancePre.value.amount}`
        );
      }
    }
  }
}

describe("multi-epoch lifecycle tests", () => {
  let setup: SetupTestResult;
  let connection: Connection;
  let program: Program<InferenceStaking>;

  let totalDistributedRewards = new anchor.BN(0);
  const epochRewards: ConstructMerkleTreeInput[][] = [];

  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(5);
  const allowDelegation = true;
  const allowPoolCreation = true;
  const operatorPoolRegistrationFee = new anchor.BN(1_000);
  const minOperatorTokenStake = new anchor.BN(1_000);
  const isStakingHalted = false;
  const isWithdrawalHalted = false;
  const isAccrueRewardHalted = false;

  const trpc = new TrpcHttpClient();

  before(async () => {
    setup = await setupTests();
    program = setup.sdk.program;
    connection = program.provider.connection;

    if (TEST_WITH_RELAY) {
      await trpc.login();
    }
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
        registrationFeePayoutWallet: setup.registrationFeePayoutWallet,
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
    assert(poolOverview.minOperatorTokenStake.isZero());
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
        isAccrueRewardHalted,
        allowPoolCreation,
        minOperatorTokenStake,
        delegatorUnstakeDelaySeconds,
        operatorUnstakeDelaySeconds,
        operatorPoolRegistrationFee,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
        registrationFeePayoutWallet: null,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );

    assert.equal(poolOverview.isWithdrawalHalted, isWithdrawalHalted);
    assert.equal(poolOverview.allowPoolCreation, allowPoolCreation);
    assert(poolOverview.minOperatorTokenStake.eq(minOperatorTokenStake));
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
    for (const pool of setup.pools) {
      await program.methods
        .createOperatorPool({
          autoStakeFees: pool.autoStakeFees,
          commissionRateBps: pool.commissionRateBps,
          allowDelegation,
          name: pool.name,
          description: pool.description,
          websiteUrl: pool.websiteUrl,
          avatarImageUrl: pool.avatarImageUrl,
          operatorAuthKeys: null,
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
          usdcPayoutWallet: pool.usdcPayoutWallet,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          adminTokenAccount: pool.adminTokenAccount,
          registrationFeePayoutTokenAccount:
            setup.registrationFeePayoutTokenAccount,
        })
        .signers([setup.payerKp, pool.adminKp])
        .rpc();

      const operatorPool = await program.account.operatorPool.fetch(pool.pool);
      assert(operatorPool.admin.equals(pool.admin));
      assert(operatorPool.initialPoolAdmin.equals(pool.admin));
      assert(operatorPool.operatorStakingRecord.equals(pool.stakingRecord));
      assert.equal(operatorPool.autoStakeFees, pool.autoStakeFees);
      assert.equal(operatorPool.commissionRateBps, pool.commissionRateBps);
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

  it("Stake all operator pool admins", async () => {
    debug(
      `\nPerforming admin stake instructions for ${setup.pools.length} operator pools`
    );
    let counter = 1;
    for (const pool of setup.pools) {
      const stakeAmount = new anchor.BN(
        convertToTokenUnitAmount(randomIntInRange(1_000_000, 10_000_000))
      );

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
        BigInt(stakeAmount.toString())
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

      const stakeAmountString = formatBN(stakeAmount);
      const tracker = `${counter}/${setup.pools.length}`;
      debug(
        `- [${tracker}] Staked ${stakeAmountString} tokens for Operator Pool ${pool.pool.toString()}`
      );
      counter++;
    }
  });

  it("Stake for every delegator", async () => {
    debug(
      `\nPerforming delegator stake instructions for ${setup.delegatorKeypairs.length} delegators`
    );
    let counter = 1;
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
          ownerStakingRecord: stakingRecord,
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
        convertToTokenUnitAmount(randomIntInRange(100_000, 1_000_000))
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
        BigInt(stakeAmount.toString())
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

      const stakeAmountString = formatBN(stakeAmount);
      const tracker = `${counter}/${setup.delegatorKeypairs.length}`;
      debug(
        `- [${tracker}] Staked ${stakeAmountString} tokens for delegator ${delegatorKp.publicKey.toString()} to pool ${pool.pool.toString()}`
      );
      counter++;
    }
  });

  it("Create reward records", async () => {
    debug(`\nCreating reward records for ${NUMBER_OF_EPOCHS} epochs`);
    let counter = 1;
    for (let epoch = 1; epoch <= NUMBER_OF_EPOCHS; epoch++) {
      if (TEST_WITH_RELAY) {
        debug(
          `- End-to-end test flow is enabled, submitting epoch finalization request for epoch ${epoch}...`
        );

        await executeWithRetries(
          async () => {
            const response = await trpc.executeEpochFinalization();
            if (response.status !== "200") {
              console.error(response);
              throw new Error(
                "executeEpochFinalization returned with non-200 status"
              );
            }
          },
          {
            retries: 10,
            retryDelayMs: 100,
          }
        );

        const claims = await trpc.getRewardClaimsForEpoch(BigInt(epoch));

        for (const claim of claims.rewardClaims) {
          assert(claim.proof != null);
          assert(claim.proofPath != null);
          assert(claim.merkleTreeIndex != null);
          assert(claim.merkleUsdcAmount != null);
          assert(claim.merkleRewardAmount != null);
        }

        const totalRewards = claims.rewardClaims.reduce((acc, claim) => {
          assert(
            claim.merkleRewardAmount != null,
            "merkleRewardAmount cannot be null"
          );
          return acc.add(new anchor.BN(claim.merkleRewardAmount.toString()));
        }, new anchor.BN(0));

        const totalUsdcAmount = claims.rewardClaims.reduce((acc, claim) => {
          assert(
            claim.merkleUsdcAmount != null,
            "merkleUsdcAmount cannot be null"
          );
          return acc.add(new anchor.BN(claim.merkleUsdcAmount.toString()));
        }, new anchor.BN(0));

        const expectedEpochRewards = await trpc.getRewardEmissionsForEpoch(
          BigInt(epoch)
        );

        const expectedTotalRewards =
          expectedEpochRewards.rewardEmissions.totalRewards;
        assert(
          new anchor.BN(expectedTotalRewards.toString()).eq(totalRewards),
          `Total rewards for epoch ${epoch}: ${totalRewards.toString()} do not match expected rewards: ${expectedTotalRewards.toString()}`
        );

        totalDistributedRewards = totalDistributedRewards.add(totalRewards);

        const totalRewardsString = formatBN(totalRewards);
        debug(
          `- ✅ Total rewards for epoch ${epoch} match expected epoch reward emissions: ${totalRewardsString}`
        );

        await mintTo(
          connection,
          setup.payerKp,
          setup.tokenMint,
          setup.rewardTokenAccount,
          setup.tokenHolderKp,
          BigInt(totalRewards.toString())
        );

        await mintTo(
          connection,
          setup.payerKp,
          setup.usdcTokenMint,
          setup.usdcTokenAccount,
          setup.tokenHolderKp,
          BigInt(totalUsdcAmount.toString())
        );

        await executeWithRetries(
          async () => {
            const response = await trpc.createRewardRecord();
            if (response.status !== "200") {
              console.error(response);
              throw new Error(
                "createRewardRecord returned with non-200 status"
              );
            }
          },
          {
            retries: 10,
            retryDelayMs: 100,
          }
        );
      } else {
        const rewards = generateRewardsForEpoch(
          setup.pools.map((pool) => pool.pool)
        );
        epochRewards.push(rewards);
        const merkleTree = MerkleUtils.constructMerkleTree(rewards);
        const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree))];
        let totalRewards = new anchor.BN(0);
        for (const addressInput of rewards) {
          totalRewards = totalRewards.add(
            new anchor.BN(addressInput.tokenAmount.toString())
          );
        }
        let totalUsdcAmount = new anchor.BN(0);
        for (const addressInput of rewards) {
          totalUsdcAmount = totalUsdcAmount.add(
            new anchor.BN(addressInput.usdcAmount.toString())
          );
        }

        await mintTo(
          connection,
          setup.payerKp,
          setup.tokenMint,
          setup.rewardTokenAccount,
          setup.tokenHolderKp,
          BigInt(totalRewards.toString())
        );

        await mintTo(
          connection,
          setup.payerKp,
          setup.usdcTokenMint,
          setup.usdcTokenAccount,
          setup.tokenHolderKp,
          BigInt(totalUsdcAmount.toString())
        );

        await setEpochFinalizationState({
          setup,
          program,
        });

        const rewardRecord = setup.sdk.rewardRecordPda(new anchor.BN(epoch));

        const tokens = formatBN(totalRewards);
        const usdc = formatBN(totalUsdcAmount);
        const tracker = `${counter}/${NUMBER_OF_EPOCHS}`;
        debug(
          `- [${tracker}] Creating RewardRecord for epoch ${epoch} - total token reward = ${tokens} - total USDC payout = ${usdc}`
        );
        counter++;

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
        assert(rewardRecordAccount.epoch.eqn(epoch));
        assert(rewardRecordAccount.totalRewards.eq(totalRewards));
        for (let i = 0; i < rewardRecordAccount.merkleRoots.length; i++) {
          assert.deepEqual(
            rewardRecordAccount.merkleRoots[i],
            Array.from(merkleRoots[i] ?? [])
          );
        }
      }

      if (epoch % EPOCH_CLAIM_FREQUENCY === 0) {
        debug(
          `\nStart reward claims for all existing rewards up to epoch ${epoch}`
        );
        await handleAccrueRewardForEpochs({
          connection,
          epochRewards,
          program,
          setup,
          trpc,
        });
        debug("");
      }
    }
  });

  it("Accrue Rewards for any remaining epochs", async () => {
    await handleAccrueRewardForEpochs({
      connection,
      epochRewards,
      program,
      setup,
      trpc,
    });
  });

  it("Unstake for all delegators successfully", async () => {
    if (!SHOULD_UNSTAKE) {
      debug("End-to-end test flow is enabled, skipping unstake");
      return;
    }

    debug(
      `\nPerforming unstake instructions for ${setup.delegatorKeypairs.length} delegators`
    );

    let counter = 1;
    for (let i = 0; i < setup.delegatorKeypairs.length; i++) {
      const delegatorKp = setup.delegatorKeypairs[i];
      assert(delegatorKp != null);
      const pool = setup.pools[i % setup.pools.length];
      assert(pool != null);

      const stakingRecord = setup.sdk.stakingRecordPda(
        pool.pool,
        delegatorKp.publicKey
      );

      const stakingRecordPre = await program.account.stakingRecord.fetch(
        stakingRecord
      );
      const operatorPoolPre = await program.account.operatorPool.fetch(
        pool.pool
      );

      // Unstake all shares for this delegator
      await program.methods
        .unstake(stakingRecordPre.shares)
        .accountsStrict({
          owner: delegatorKp.publicKey,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          ownerStakingRecord: stakingRecord,
          operatorStakingRecord: pool.stakingRecord,
        })
        .signers([delegatorKp])
        .rpc();

      const stakingRecordPost = await program.account.stakingRecord.fetch(
        stakingRecord
      );
      const operatorPoolPost = await program.account.operatorPool.fetch(
        pool.pool
      );

      // Verify the shares are reduced in the staking record
      assert(
        stakingRecordPost.shares.isZero(),
        "Staking record shares should be zero after unstaking"
      );

      // Verify tokens unstake amount is set correctly
      const expectedTokens = stakingRecordPre.shares
        .mul(operatorPoolPre.totalStakedAmount)
        .div(operatorPoolPre.totalShares);
      assert(
        stakingRecordPost.tokensUnstakeAmount.eq(expectedTokens),
        "Tokens unstake amount should match expected value"
      );

      // Verify unstake timestamp is set correctly
      const currentTimestamp = Date.now() / 1_000;
      assert.approximately(
        stakingRecordPost.unstakeAtTimestamp.toNumber(),
        currentTimestamp + delegatorUnstakeDelaySeconds.toNumber(),
        10,
        "Unstake timestamp should be approximately current time plus delay"
      );

      // Verify operator pool state changes
      assert(
        operatorPoolPost.totalShares.eq(
          operatorPoolPre.totalShares.sub(stakingRecordPre.shares)
        ),
        "Operator pool total shares should be reduced by unstaked shares"
      );
      assert(
        operatorPoolPost.totalStakedAmount.eq(
          operatorPoolPre.totalStakedAmount.sub(expectedTokens)
        ),
        "Operator pool total staked amount should be reduced by unstaked tokens"
      );
      assert(
        operatorPoolPost.totalUnstaking.eq(
          operatorPoolPre.totalUnstaking.add(expectedTokens)
        ),
        "Operator pool total unstaking should be increased by unstaked tokens"
      );

      const sharesString = formatBN(stakingRecordPre.shares);
      const tokensString = formatBN(expectedTokens);
      const tracker = `${counter}/${setup.delegatorKeypairs.length}`;
      debug(
        `- [${tracker}] Unstaked ${sharesString} shares (${tokensString} tokens) for delegator ${delegatorKp.publicKey.toString()}`
      );
      counter++;
    }
  });

  it("Claim unstake for all delegators successfully", async () => {
    if (!SHOULD_UNSTAKE) {
      debug("End-to-end test flow is enabled, skipping claim unstake");
      return;
    }

    debug(
      `\nWaiting for delegator unstake delay (${delegatorUnstakeDelaySeconds.toString()} seconds) to elapse...`
    );
    await new Promise((resolve) =>
      setTimeout(resolve, (delegatorUnstakeDelaySeconds.toNumber() + 2) * 1_000)
    );

    debug(
      `\nPerforming claim unstake instructions for ${setup.delegatorKeypairs.length} delegators`
    );

    let counter = 1;
    for (let i = 0; i < setup.delegatorKeypairs.length; i++) {
      const delegatorKp = setup.delegatorKeypairs[i];
      assert(delegatorKp != null);
      const pool = setup.pools[i % setup.pools.length];
      assert(pool != null);

      const stakingRecord = setup.sdk.stakingRecordPda(
        pool.pool,
        delegatorKp.publicKey
      );

      const stakingRecordPre = await program.account.stakingRecord.fetch(
        stakingRecord
      );
      const operatorPoolPre = await program.account.operatorPool.fetch(
        pool.pool
      );

      const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        setup.payerKp,
        setup.tokenMint,
        delegatorKp.publicKey
      );

      const tokenBalancePre = await connection.getTokenAccountBalance(
        ownerTokenAccount.address
      );

      await program.methods
        .claimUnstake()
        .accountsStrict({
          owner: delegatorKp.publicKey,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          ownerStakingRecord: stakingRecord,
          operatorStakingRecord: pool.stakingRecord,
          ownerTokenAccount: ownerTokenAccount.address,
          stakedTokenAccount: pool.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const stakingRecordPost = await program.account.stakingRecord.fetch(
        stakingRecord
      );
      const operatorPoolPost = await program.account.operatorPool.fetch(
        pool.pool
      );
      const tokenBalancePost = await connection.getTokenAccountBalance(
        ownerTokenAccount.address
      );

      // Verify staking record is properly reset
      assert(
        stakingRecordPost.tokensUnstakeAmount.isZero(),
        "Tokens unstake amount should be zero after claim"
      );
      assert(
        stakingRecordPost.unstakeAtTimestamp.isZero(),
        "Unstake timestamp should be zero after claim"
      );

      // Verify operator pool total unstaking is decreased
      assert(
        operatorPoolPost.totalUnstaking.eq(
          operatorPoolPre.totalUnstaking.sub(
            stakingRecordPre.tokensUnstakeAmount
          )
        ),
        "Operator pool total unstaking should be decreased by claimed amount"
      );

      // Verify tokens were received in owner's account
      const amountClaimed = new anchor.BN(tokenBalancePost.value.amount).sub(
        new anchor.BN(tokenBalancePre.value.amount)
      );
      assert(
        amountClaimed.eq(stakingRecordPre.tokensUnstakeAmount),
        "Amount claimed should match tokens unstake amount"
      );

      const amountClaimedString = formatBN(amountClaimed);
      const tracker = `${counter}/${setup.delegatorKeypairs.length}`;
      debug(
        `- [${tracker}] Claimed ${amountClaimedString} tokens for delegator ${delegatorKp.publicKey.toString()}`
      );
      counter++;
    }
  });

  it("Close staking records for all delegators successfully", async () => {
    if (!SHOULD_CLOSE_ACCOUNTS) {
      debug("End-to-end test flow is enabled, skipping close staking records");
      return;
    }

    debug(
      `\nClosing staking records for ${setup.delegatorKeypairs.length} delegators`
    );

    let counter = 1;
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
        .closeStakingRecord()
        .accountsStrict({
          receiver: setup.payer,
          owner: delegatorKp.publicKey,
          ownerStakingRecord: stakingRecord,
          systemProgram: SystemProgram.programId,
        })
        .signers([delegatorKp])
        .rpc();

      const stakingRecordAccount =
        await program.account.stakingRecord.fetchNullable(stakingRecord);
      assert.isNull(
        stakingRecordAccount,
        "Staking record should be closed after closing"
      );

      const tracker = `${counter}/${setup.delegatorKeypairs.length}`;
      debug(
        `- [${tracker}] Closed staking record for delegator ${delegatorKp.publicKey.toString()}`
      );
      counter++;
    }
  });

  it("Withdraw operator commissions successfully", async () => {
    debug(`\nWithdrawing commission for ${setup.pools.length} operator pools`);

    let counter = 1;
    for (const pool of setup.pools) {
      const feeTokenAccountPre = await connection.getTokenAccountBalance(
        pool.feeTokenAccount
      );

      if (new anchor.BN(feeTokenAccountPre.value.amount).isZero()) {
        debug(
          `- No commission to withdraw for Operator Pool ${pool.pool.toString()}`
        );
        continue;
      }

      const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        setup.payerKp,
        setup.tokenMint,
        pool.admin
      );

      const ownerTokenBalancePre = await connection.getTokenAccountBalance(
        ownerTokenAccount.address
      );

      await program.methods
        .withdrawOperatorCommission()
        .accountsStrict({
          admin: pool.admin,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          feeTokenAccount: pool.feeTokenAccount,
          destination: ownerTokenAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([pool.adminKp])
        .rpc();

      const feeTokenAccountPost = await connection.getTokenAccountBalance(
        pool.feeTokenAccount
      );
      const ownerTokenBalancePost = await connection.getTokenAccountBalance(
        ownerTokenAccount.address
      );

      // Verify fee token account is emptied
      assert.equal(
        feeTokenAccountPost.value.amount,
        "0",
        "Fee token account should be empty after withdrawal"
      );

      // Verify tokens were received in owner's account
      const amountWithdrawn = new anchor.BN(
        ownerTokenBalancePost.value.amount
      ).sub(new anchor.BN(ownerTokenBalancePre.value.amount));
      assert(
        amountWithdrawn.eq(new anchor.BN(feeTokenAccountPre.value.amount)),
        "Amount withdrawn should match fee token account balance"
      );

      const amountWithdrawnString = formatBN(amountWithdrawn);
      const tracker = `${counter}/${setup.pools.length}`;
      debug(
        `- [${tracker}] Withdrew ${amountWithdrawnString} tokens in commission for Operator Pool ${pool.pool.toString()}`
      );
      counter++;
    }
  });

  it("Verify token accounting and token vault balances - all should be reset to zero", async () => {
    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(
      poolOverview.unclaimedRewards.isZero(),
      `Unclaimed rewards should be zero, was ${poolOverview.unclaimedRewards.toString()}`
    );
    assert(
      poolOverview.unclaimedUsdcPayout.isZero(),
      `Unclaimed USDC payout should be zero, was ${poolOverview.unclaimedUsdcPayout.toString()}`
    );

    const tokenVault = setup.sdk.rewardTokenPda();
    const tokenBalance = await connection.getTokenAccountBalance(tokenVault);
    assert(
      new anchor.BN(tokenBalance.value.amount).isZero(),
      `Token balance should be zero, was ${tokenBalance.value.amount}`
    );

    const usdcVault = setup.sdk.usdcTokenPda();
    const usdcBalance = await connection.getTokenAccountBalance(usdcVault);
    assert(
      new anchor.BN(usdcBalance.value.amount).isZero(),
      `USDC balance should be zero, was ${usdcBalance.value.amount}`
    );
  });

  it("Unstake for all operator admins successfully", async () => {
    if (!SHOULD_UNSTAKE) {
      debug("End-to-end test flow is enabled, skipping unstake");
      return;
    }

    debug(
      `\nPerforming unstake instructions for ${setup.pools.length} operator admins`
    );

    let counter = 1;
    for (const pool of setup.pools) {
      const stakingRecordPre = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );

      if (stakingRecordPre.shares.isZero()) {
        debug(
          `- No shares to unstake for Operator Pool ${pool.pool.toString()}`
        );
        continue;
      }

      const operatorPoolPre = await program.account.operatorPool.fetch(
        pool.pool
      );

      // Unstake all shares for this operator
      await program.methods
        .unstake(stakingRecordPre.shares)
        .accountsStrict({
          owner: pool.admin,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          ownerStakingRecord: pool.stakingRecord,
          operatorStakingRecord: pool.stakingRecord,
        })
        .signers([pool.adminKp])
        .rpc();

      const stakingRecordPost = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );
      const operatorPoolPost = await program.account.operatorPool.fetch(
        pool.pool
      );

      // Verify the shares are reduced in the staking record
      assert(
        stakingRecordPost.shares.isZero(),
        "Staking record shares should be zero after unstaking"
      );

      // Verify tokens unstake amount is set correctly
      const expectedTokens = stakingRecordPre.shares
        .mul(operatorPoolPre.totalStakedAmount)
        .div(operatorPoolPre.totalShares);
      assert(
        stakingRecordPost.tokensUnstakeAmount.eq(expectedTokens),
        "Tokens unstake amount should match expected value"
      );

      // Verify unstake timestamp is set correctly
      const currentTimestamp = Date.now() / 1_000;
      assert.approximately(
        stakingRecordPost.unstakeAtTimestamp.toNumber(),
        currentTimestamp + operatorUnstakeDelaySeconds.toNumber(),
        10,
        "Unstake timestamp should be approximately current time plus delay"
      );

      // Verify operator pool state changes
      assert(
        operatorPoolPost.totalShares.isZero(),
        "Operator pool total shares should be zero after operator unstakes all"
      );
      assert(
        operatorPoolPost.totalStakedAmount.isZero(),
        "Operator pool total staked amount should be zero after operator unstakes all"
      );
      assert(
        operatorPoolPost.totalUnstaking.eq(
          operatorPoolPre.totalUnstaking.add(expectedTokens)
        ),
        "Operator pool total unstaking should be increased by unstaked tokens"
      );

      const sharesString = formatBN(stakingRecordPre.shares);
      const tokensString = formatBN(expectedTokens);
      const tracker = `${counter}/${setup.pools.length}`;
      debug(
        `- [${tracker}] Unstaked ${sharesString} shares (${tokensString} tokens) for operator ${pool.admin.toString()}`
      );
      counter++;
    }
  });

  it("Claim unstake for all operator admins successfully", async () => {
    if (!SHOULD_UNSTAKE) {
      debug("End-to-end test flow is enabled, skipping claim unstake");
      return;
    }

    debug(
      `\nWaiting for operator unstake delay (${operatorUnstakeDelaySeconds.toString()} seconds) to elapse...`
    );
    await new Promise((resolve) =>
      setTimeout(resolve, (operatorUnstakeDelaySeconds.toNumber() + 2) * 1_000)
    );

    debug(
      `\nPerforming claim unstake instructions for ${setup.pools.length} operator admins`
    );

    let counter = 1;
    for (const pool of setup.pools) {
      const stakingRecordPre = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );

      if (stakingRecordPre.tokensUnstakeAmount.isZero()) {
        debug(`- No tokens to claim for Operator Pool ${pool.pool.toString()}`);
        continue;
      }

      const operatorPoolPre = await program.account.operatorPool.fetch(
        pool.pool
      );

      const ownerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        setup.payerKp,
        setup.tokenMint,
        pool.admin
      );

      const tokenBalancePre = await connection.getTokenAccountBalance(
        ownerTokenAccount.address
      );

      await program.methods
        .claimUnstake()
        .accountsStrict({
          owner: pool.admin,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
          ownerStakingRecord: pool.stakingRecord,
          operatorStakingRecord: pool.stakingRecord,
          ownerTokenAccount: ownerTokenAccount.address,
          stakedTokenAccount: pool.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      const stakingRecordPost = await program.account.stakingRecord.fetch(
        pool.stakingRecord
      );
      const operatorPoolPost = await program.account.operatorPool.fetch(
        pool.pool
      );
      const tokenBalancePost = await connection.getTokenAccountBalance(
        ownerTokenAccount.address
      );

      // Verify staking record is properly reset
      assert(
        stakingRecordPost.tokensUnstakeAmount.isZero(),
        "Tokens unstake amount should be zero after claim"
      );
      assert(
        stakingRecordPost.unstakeAtTimestamp.isZero(),
        "Unstake timestamp should be zero after claim"
      );

      // Verify operator pool total unstaking is decreased
      assert(
        operatorPoolPost.totalUnstaking.eq(
          operatorPoolPre.totalUnstaking.sub(
            stakingRecordPre.tokensUnstakeAmount
          )
        ),
        "Operator pool total unstaking should be decreased by claimed amount"
      );

      // Verify operator pool total unstaking is now zero after all claims
      assert(
        operatorPoolPost.totalUnstaking.isZero(),
        "Operator pool total unstaking should be zero after all unstake claims"
      );

      // Verify tokens were received in owner's account
      const amountClaimed = new anchor.BN(tokenBalancePost.value.amount).sub(
        new anchor.BN(tokenBalancePre.value.amount)
      );
      assert(
        amountClaimed.eq(stakingRecordPre.tokensUnstakeAmount),
        "Amount claimed should match tokens unstake amount"
      );

      const amountClaimedString = formatBN(amountClaimed);
      const tracker = `${counter}/${setup.pools.length}`;
      debug(
        `- [${tracker}] Claimed ${amountClaimedString} tokens for operator ${pool.admin.toString()}`
      );
      counter++;
    }
  });

  it("Close all operator pools successfully", async () => {
    if (!SHOULD_CLOSE_ACCOUNTS) {
      debug("End-to-end test flow is enabled, skipping close operator pools");
      return;
    }

    debug(`\nClosing ${setup.pools.length} operator pools`);

    let counter = 1;
    for (const pool of setup.pools) {
      await program.methods
        .closeOperatorPool()
        .accountsStrict({
          admin: pool.admin,
          poolOverview: setup.poolOverview,
          operatorPool: pool.pool,
        })
        .signers([pool.adminKp])
        .rpc();

      const operatorPool = await program.account.operatorPool.fetch(pool.pool);
      const poolOverview = await program.account.poolOverview.fetch(
        setup.poolOverview
      );

      assert(
        operatorPool.closedAt?.eq(poolOverview.completedRewardEpoch),
        "Operator pool closedAt should match the completed reward epoch"
      );

      const tracker = `${counter}/${setup.pools.length}`;
      debug(`- [${tracker}] Closed Operator Pool ${pool.pool.toString()}`);
      counter++;
    }
  });

  it("Close all operator staking records successfully", async () => {
    if (!SHOULD_CLOSE_ACCOUNTS) {
      debug(
        "End-to-end test flow is enabled, skipping close operator staking records"
      );
      return;
    }

    debug(
      `\nClosing staking records for ${setup.pools.length} operator admins`
    );

    let counter = 1;
    for (const pool of setup.pools) {
      await program.methods
        .closeStakingRecord()
        .accountsStrict({
          receiver: setup.payer,
          owner: pool.admin,
          ownerStakingRecord: pool.stakingRecord,
          systemProgram: SystemProgram.programId,
        })
        .signers([pool.adminKp])
        .rpc();

      const stakingRecordAccount =
        await program.account.stakingRecord.fetchNullable(pool.stakingRecord);
      assert.isNull(
        stakingRecordAccount,
        "Operator staking record should be closed after closing"
      );

      const tracker = `${counter}/${setup.pools.length}`;
      debug(
        `- [${tracker}] Closed staking record for operator ${pool.admin.toString()}`
      );
      counter++;
    }
  });

  it("Final state validation check", async () => {
    if (!TEST_WITH_RELAY) {
      debug(
        "End-to-end test flow is disabled, skipping final state validation"
      );
      return;
    }

    const result = await trpc.runProgramAccountStateValidation();
    console.log("Program state validation result:");
    console.log(result);
    assert(result.isStateValid, "Program account state validation failed.");

    const totalDistributedRewardsString = formatBN(totalDistributedRewards);
    debug("✅ Program account state is valid. Test completed successfully.");
    debug(`Total rewards distributed: ${totalDistributedRewardsString}`);
  });
});
