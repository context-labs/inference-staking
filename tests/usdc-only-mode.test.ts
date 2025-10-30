import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStaking } from "@sdk/src/idl";

import type { GenerateMerkleProofInput } from "@tests/lib/merkle";
import { MerkleUtils } from "@tests/lib/merkle";
import type { SetupTestResult } from "@tests/lib/setup";
import { setupTests } from "@tests/lib/setup";
import {
  assertStakingProgramError,
  sleep,
  handleMarkEpochAsFinalizing,
  generateRewardsForEpoch,
} from "@tests/lib/utils";

describe("USDC-only mode tests", () => {
  let setup: SetupTestResult;
  let connection: Connection;
  let program: Program<InferenceStaking>;
  let epoch2Rewards: ReturnType<typeof generateRewardsForEpoch>;

  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(5);
  const autoStakeFees = false;
  const rewardCommissionRateBps = 10_000; // 100% for USDC-only mode
  const usdcCommissionRateBps = 10_000; // 100% for USDC-only mode
  const allowDelegation = true;
  const allowPoolCreation = true;
  const operatorPoolRegistrationFee = new anchor.BN(1_000);
  const minOperatorTokenStake = new anchor.BN(1_000);
  const isStakingHalted = false;
  const isWithdrawalHalted = false;
  const isAccrueRewardHalted = false;
  const slashingDelaySeconds = new anchor.BN(3);

  before(async () => {
    setup = await setupTests();
    program = setup.sdk.program;
    connection = program.provider.connection;
  });

  it("Create PoolOverview in USDC-only mode successfully", async () => {
    await program.methods
      .createPoolOverview({
        isTokenMintUsdc: true,
        tokenRewardsEnabled: false,
      })
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        mint: setup.usdcTokenMint, // Using USDC mint as the main mint
        tokenProgram: TOKEN_PROGRAM_ID,
        usdcMint: setup.usdcTokenMint,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
        registrationFeePayoutWallet: setup.registrationFeePayoutWallet,
        slashingDestinationTokenAccount: setup.slashingDestinationTokenAccount,
        slashingDestinationUsdcAccount: setup.slashingDestinationUsdcAccount,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.programAdmin.equals(setup.poolOverviewAdmin));
    assert(poolOverview.mint.equals(setup.usdcTokenMint));
    assert.equal(poolOverview.isTokenMintUsdc, true);
    assert.equal(poolOverview.tokenRewardsEnabled, false);

    // Check that all other values are set to default.
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
        slashingDelaySeconds,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
        registrationFeePayoutWallet: null,
        slashingDestinationTokenAccount: null,
        slashingDestinationUsdcAccount: null,
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

  it("Create empty RewardRecord 1 successfully", async () => {
    await handleMarkEpochAsFinalizing({
      setup,
      program,
    });

    // Create an empty record with no rewards.
    await program.methods
      .createRewardRecord({
        merkleRoots: [],
        totalRewards: new anchor.BN(0),
        totalUsdcPayout: new anchor.BN(0),
      })
      .accountsStrict({
        payer: setup.payer,
        authority: setup.rewardDistributionAuthority,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[1],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
      .rpc();

    const poolOverviewPost = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverviewPost.isEpochFinalizing === false);
  });

  it("Create OperatorPool with 100% commission rates successfully", async () => {
    // Need to create token account for admin since we're using USDC mint
    const adminTokenAccount = getAssociatedTokenAddressSync(
      setup.usdcTokenMint,
      setup.pool1.admin
    );

    // Mint tokens to admin for registration fee
    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      adminTokenAccount,
      setup.tokenHolderKp,
      BigInt(100_000_000) // 100 USDC with 6 decimals
    );

    await program.methods
      .createOperatorPool({
        autoStakeFees,
        rewardCommissionRateBps,
        usdcCommissionRateBps,
        allowDelegation,
        name: setup.pool1.name,
        description: setup.pool1.description,
        websiteUrl: setup.pool1.websiteUrl,
        avatarImageUrl: setup.pool1.avatarImageUrl,
        operatorAuthKeys: null,
      })
      .accountsStrict({
        payer: setup.payer,
        admin: setup.pool1.admin,
        operatorPool: setup.pool1.pool,
        stakingRecord: setup.pool1.stakingRecord,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
        poolOverview: setup.poolOverview,
        mint: setup.usdcTokenMint, // Using USDC mint
        tokenProgram: TOKEN_PROGRAM_ID,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        systemProgram: SystemProgram.programId,
        adminTokenAccount,
        registrationFeePayoutTokenAccount:
          setup.registrationFeePayoutUsdcAccount, // Use USDC version
        operatorUsdcVault: setup.pool1.poolUsdcVault,
        usdcMint: setup.usdcTokenMint,
      })
      .signers([setup.payerKp, setup.pool1.adminKp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPool.admin.equals(setup.pool1.admin));
    assert(operatorPool.initialPoolAdmin.equals(setup.pool1.admin));
    assert.equal(operatorPool.rewardCommissionRateBps, rewardCommissionRateBps);
    assert.equal(operatorPool.usdcCommissionRateBps, usdcCommissionRateBps);
    assert.equal(operatorPool.allowDelegation, allowDelegation);
  });

  it("Fail to create OperatorPool with commission rates < 100%", async () => {
    const adminTokenAccount = getAssociatedTokenAddressSync(
      setup.usdcTokenMint,
      setup.pool2.admin
    );

    // Mint tokens to admin for registration fee
    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      adminTokenAccount,
      setup.tokenHolderKp,
      BigInt(100_000_000) // 100 USDC with 6 decimals
    );

    try {
      await program.methods
        .createOperatorPool({
          autoStakeFees,
          rewardCommissionRateBps: 5_000, // 50% - should fail
          usdcCommissionRateBps: 5_000, // 50% - should fail
          allowDelegation,
          name: setup.pool2.name,
          description: setup.pool2.description,
          websiteUrl: setup.pool2.websiteUrl,
          avatarImageUrl: setup.pool2.avatarImageUrl,
          operatorAuthKeys: null,
        })
        .accountsStrict({
          payer: setup.payer,
          admin: setup.pool2.admin,
          operatorPool: setup.pool2.pool,
          stakingRecord: setup.pool2.stakingRecord,
          stakedTokenAccount: setup.pool2.stakedTokenAccount,
          rewardFeeTokenAccount: setup.pool2.rewardCommissionFeeTokenVault,
          poolOverview: setup.poolOverview,
          mint: setup.usdcTokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          usdcFeeTokenAccount: setup.pool2.usdcCommissionFeeTokenVault,
          systemProgram: SystemProgram.programId,
          adminTokenAccount,
          registrationFeePayoutTokenAccount:
            setup.registrationFeePayoutUsdcAccount, // Use USDC version
          operatorUsdcVault: setup.pool2.poolUsdcVault,
          usdcMint: setup.usdcTokenMint,
        })
        .signers([setup.payerKp, setup.pool2.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(
        error,
        "invalidCommissionRateForDisabledRewards"
      );
    }
  });

  it("Fail to create delegator staking record", async () => {
    try {
      await program.methods
        .createStakingRecord()
        .accountsStrict({
          payer: setup.payer,
          owner: setup.delegator1,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.delegatorStakingRecord,
          systemProgram: SystemProgram.programId,
          poolOverview: setup.poolOverview,
        })
        .signers([setup.payerKp, setup.delegator1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "delegatorStakingDisabled");
    }
  });

  it("Operator can stake successfully", async () => {
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.usdcTokenMint,
      setup.pool1.admin
    );
    const stakeAmount = new anchor.BN(50_000_000); // 50 USDC

    await program.methods
      .stake({ tokenAmount: stakeAmount })
      .accountsStrict({
        owner: setup.pool1.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.stakingRecord,
        operatorStakingRecord: setup.pool1.stakingRecord,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([setup.pool1.adminKp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    assert(operatorPool.totalStakedAmount.eq(stakeAmount));
    assert(operatorPool.totalShares.eq(stakeAmount));
    assert(operatorPool.totalUnstaking.isZero());

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.stakingRecord
    );
    assert(stakingRecord.shares.eq(stakeAmount));
  });

  it("Create reward record with zero token rewards", async () => {
    // Create rewards for only pool1 since it's the only pool we created in USDC-only mode
    // Store this in the module-level variable so other tests can reuse the same data
    epoch2Rewards = generateRewardsForEpoch([setup.pool1.pool], 2).map(
      (reward) => ({
        ...reward,
        // Token rewards are disabled in USDC-only mode, so keep leaves consistent
        // with zero token amounts to satisfy on-chain proof verification.
        tokenAmount: BigInt(0),
      })
    );
    const merkleTree = MerkleUtils.constructMerkleTree(epoch2Rewards);
    const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree))];
    const totalRewards = new anchor.BN(0); // No token rewards in USDC-only mode
    let totalUsdcAmount = new anchor.BN(0);

    for (const reward of epoch2Rewards) {
      totalUsdcAmount = totalUsdcAmount.add(
        new anchor.BN(reward.usdcAmount.toString())
      );
    }

    // Mint USDC for rewards
    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      setup.usdcTokenAccount,
      setup.tokenHolderKp,
      BigInt(totalUsdcAmount.toString())
    );

    await handleMarkEpochAsFinalizing({
      setup,
      program,
    });

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
        rewardRecord: setup.rewardRecords[2],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
      .rpc();

    const rewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    assert(rewardRecord.epoch.eqn(2));
    assert(rewardRecord.totalRewards.eq(totalRewards));
    assert(rewardRecord.totalRewards.isZero()); // Verify zero token rewards
  });

  it("Fail to accrue non-zero token rewards", async () => {
    // Use the same rewards we created in the previous test
    const merkleTree = MerkleUtils.constructMerkleTree(epoch2Rewards);
    const nodeIndex = epoch2Rewards.findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const proofInputs = {
      ...epoch2Rewards[nodeIndex],
      index: nodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);

    const rewardAmount = new anchor.BN(1_000); // Non-zero reward should fail
    const usdcAmount = new anchor.BN(proofInputs.usdcAmount.toString());

    try {
      await program.methods
        .accrueReward({
          merkleIndex: 0,
          rewardAmount,
          usdcAmount,
          proof: proof.map((p) => Array.from(p)),
          proofPath,
        })
        .accountsStrict({
          poolUsdcVault: setup.pool1.poolUsdcVault,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardRecord: setup.rewardRecords[2],
          rewardTokenAccount: setup.rewardTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "tokenRewardsDisabled");
    }
  });

  it("Accrue USDC earnings successfully", async () => {
    // Use the same rewards we created in the previous tests
    const merkleTree = MerkleUtils.constructMerkleTree(epoch2Rewards);
    const nodeIndex = epoch2Rewards.findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const proofInputs = {
      ...epoch2Rewards[nodeIndex],
      index: nodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);

    const rewardAmount = new anchor.BN(0); // Zero token rewards
    const usdcAmount = new anchor.BN(proofInputs.usdcAmount.toString());

    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    await program.methods
      .accrueReward({
        merkleIndex: 0,
        rewardAmount,
        usdcAmount,
        proof: proof.map((p) => Array.from(p)),
        proofPath,
      })
      .accountsStrict({
        poolUsdcVault: setup.pool1.poolUsdcVault,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.stakingRecord,
        rewardRecord: setup.rewardRecords[2],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    // Verify no token rewards were accrued
    assert(
      operatorPool.accruedRewards.eq(operatorPoolPre.accruedRewards),
      "Token rewards should not increase"
    );
    assert(
      operatorPool.accruedRewards.isZero(),
      "Token rewards should be zero"
    );

    // USDC per share should not increase since there's no delegator staking
    assert(
      operatorPool.cumulativeUsdcPerShare.eq(
        operatorPoolPre.cumulativeUsdcPerShare
      ),
      "USDC per share should not change"
    );
  });

  it("Operator can unstake successfully", async () => {
    const unstakeAmount = new anchor.BN(10_000_000); // 10 USDC
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.stakingRecord
    );

    await program.methods
      .unstake({ sharesAmount: unstakeAmount })
      .accountsStrict({
        owner: setup.pool1.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.stakingRecord,
        operatorStakingRecord: setup.pool1.stakingRecord,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([setup.pool1.adminKp])
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
    assert(operatorPool.totalUnstaking.eq(unstakeAmount));

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.stakingRecord
    );
    assert(stakingRecordPre.shares.sub(stakingRecord.shares).eq(unstakeAmount));
    assert(stakingRecord.tokensUnstakeAmount.eq(unstakeAmount));
  });

  it("Operator can claim unstake successfully", async () => {
    // Sleep till delay duration has elapsed
    await sleep(operatorUnstakeDelaySeconds.toNumber() * 2 * 1_000);

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.usdcTokenMint,
      setup.pool1.admin
    );

    const [ownerTokenAccountBalancePre, programTokenAccountBalancePre] =
      await Promise.all([
        connection.getTokenAccountBalance(ownerTokenAccount),
        connection.getTokenAccountBalance(setup.pool1.stakedTokenAccount),
      ]);

    await program.methods
      .claimUnstake()
      .accountsStrict({
        owner: setup.pool1.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.stakingRecord,
        operatorStakingRecord: setup.pool1.stakingRecord,
        ownerTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc();

    const [ownerTokenAccountBalancePost, programTokenAccountBalancePost] =
      await Promise.all([
        connection.getTokenAccountBalance(ownerTokenAccount),
        connection.getTokenAccountBalance(setup.pool1.stakedTokenAccount),
      ]);

    const unstakeAmount = new anchor.BN(10_000_000); // From previous test

    assert(
      new anchor.BN(ownerTokenAccountBalancePost.value.amount)
        .sub(new anchor.BN(ownerTokenAccountBalancePre.value.amount))
        .eq(unstakeAmount)
    );

    assert(
      new anchor.BN(programTokenAccountBalancePre.value.amount)
        .sub(new anchor.BN(programTokenAccountBalancePost.value.amount))
        .eq(unstakeAmount)
    );

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.stakingRecord
    );
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });
});
