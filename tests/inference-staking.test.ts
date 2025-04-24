import * as anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

import type {
  StakeEvent,
  UnstakeEvent,
  CompleteAccrueRewardEvent,
  ClaimUnstakeEvent,
  SlashStakeEvent,
} from "@sdk/src/eventTypes";
import type { InferenceStaking } from "@sdk/src/idl";

import type { GenerateMerkleProofInput } from "@tests/lib/merkle";
import { MerkleUtils } from "@tests/lib/merkle";
import type { SetupTestResult } from "@tests/lib/setup";
import { setupTests } from "@tests/lib/setup";
import {
  assertError,
  assertStakingProgramError,
  sleep,
} from "@tests/lib/utils";

describe("inference-staking program tests", () => {
  let setup: SetupTestResult;
  let connection: Connection;
  let program: Program<InferenceStaking>;

  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(5);
  const autoStakeFees = false;
  const commissionRateBps = 1500;
  const allowDelegation = true;
  const minOperatorShareBps = 1000;
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
        programAdmin: setup.signer1,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        usdcMint: setup.usdcTokenMint,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.programAdmin.equals(setup.signer1));
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

  it("Fail to create OperatorPool when pool creation is disabled", async () => {
    try {
      await program.methods
        .createOperatorPool({
          autoStakeFees,
          commissionRateBps,
          allowDelegation,
        })
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
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "poolCreationDisabled");
    }
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
        programAdmin: setup.signer1,
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
    assert(poolOverview.programAdmin.equals(setup.signer1));
    assert(poolOverview.mint.equals(setup.tokenMint));
    assert.isEmpty(poolOverview.haltAuthorities);
    assert(poolOverview.totalPools.isZero());
    assert(poolOverview.completedRewardEpoch.isZero());
    assert(poolOverview.unclaimedRewards.isZero());
  });

  it("Update partial PoolOverview authorities successfully", async () => {
    // Update only halt authorities
    await program.methods
      .updatePoolOverviewAuthorities({
        newProgramAdmin: null,
        newRewardDistributionAuthorities: null,
        newHaltAuthorities: [setup.user1],
        newSlashingAuthorities: null,
      })
      .accountsStrict({
        programAdmin: setup.signer1,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(poolOverview.programAdmin.equals(setup.signer1));
    assert(poolOverview.slashingAuthorities.length === 0);
    assert(poolOverview.haltAuthorities.length === 1);
    assert(poolOverview.haltAuthorities[0]?.equals(setup.user1));
    assert(poolOverview.rewardDistributionAuthorities.length === 0);
  });

  it("Update PoolOverview authorities successfully", async () => {
    await program.methods
      .updatePoolOverviewAuthorities({
        newProgramAdmin: setup.poolOverviewAdminKp.publicKey,
        newRewardDistributionAuthorities: [setup.poolOverviewAdminKp.publicKey],
        newHaltAuthorities: [setup.haltAuthority1Kp.publicKey],
        newSlashingAuthorities: [setup.poolOverviewAdminKp.publicKey],
      })
      .accountsStrict({
        programAdmin: setup.signer1,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    assert(
      poolOverview.programAdmin.equals(setup.poolOverviewAdminKp.publicKey)
    );
    assert(poolOverview.slashingAuthorities.length === 1);
    assert(
      poolOverview.slashingAuthorities[0]?.equals(
        setup.poolOverviewAdminKp.publicKey
      )
    );
    assert(poolOverview.haltAuthorities.length === 1);
    assert(
      poolOverview.haltAuthorities[0]?.equals(setup.haltAuthority1Kp.publicKey)
    );
    assert(poolOverview.rewardDistributionAuthorities.length === 1);
    assert(
      poolOverview.rewardDistributionAuthorities[0]?.equals(
        setup.poolOverviewAdminKp.publicKey
      )
    );
  });

  it("Create OperatorPool 1 successfully", async () => {
    await program.methods
      .createOperatorPool({
        autoStakeFees,
        commissionRateBps,
        allowDelegation,
      })
      .accountsStrict({
        payer: setup.payer,
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
        stakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        poolOverview: setup.poolOverview,
        mint: setup.tokenMint,
        usdcPayoutDestination: setup.pool1.usdcTokenAccount,
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

  it("Fail to update operator pool with invalid commission rate", async () => {
    try {
      // Expect failure as commission cannot exceed 100%.
      await program.methods
        .updateOperatorPool({
          newCommissionRateBps: 150_00,
          autoStakeFees: true,
          allowDelegation: false,
        })
        .accountsStrict({
          admin: setup.signer1,
          operatorPool: setup.pool1.pool,
          usdcPayoutDestination: null,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "RequireGteViolated");
    }
  });

  it("Fail to update operator pool with invalid USDC payout destination", async () => {
    try {
      const invalidUsdcPayoutDestination =
        await getOrCreateAssociatedTokenAccount(
          connection,
          setup.payerKp,
          setup.invalidUsdcTokenMint,
          setup.signer1
        );
      await program.methods
        .updateOperatorPool({
          newCommissionRateBps: null,
          autoStakeFees: null,
          allowDelegation: null,
        })
        .accountsStrict({
          admin: setup.signer1,
          operatorPool: setup.pool1.pool,
          usdcPayoutDestination: invalidUsdcPayoutDestination.address,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "ConstraintTokenMint");
    }
  });

  it("Should update OperatorPool USDC payout destination successfully", async () => {
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const owner = Keypair.generate();
    const usdcPayoutDestination = await getOrCreateAssociatedTokenAccount(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      owner.publicKey
    );
    await program.methods
      .updateOperatorPool({
        newCommissionRateBps: null,
        autoStakeFees: null,
        allowDelegation: null,
      })
      .accountsStrict({
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
        usdcPayoutDestination: usdcPayoutDestination.address,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(
      operatorPool.usdcPayoutDestination.equals(usdcPayoutDestination.address)
    );
    assert(
      operatorPoolPre.usdcPayoutDestination.toString() !==
        operatorPool.usdcPayoutDestination.toString()
    );

    await program.methods
      .updateOperatorPool({
        newCommissionRateBps: null,
        autoStakeFees: null,
        allowDelegation: null,
      })
      .accountsStrict({
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
        usdcPayoutDestination: operatorPoolPre.usdcPayoutDestination,
      })
      .signers([setup.signer1Kp])
      .rpc();
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
        usdcPayoutDestination: null,
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
        usdcPayoutDestination: null,
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

  it("Fail to stake for user when min. operator shares is not met", async () => {
    try {
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        setup.tokenMint,
        setup.user1
      );
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
          ownerTokenAccount,
        })
        .signers([setup.user1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "minOperatorSharesNotMet");
    }
  });

  it("Stake for operator successfully", async () => {
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );
    const stakeAmount = new anchor.BN(150_000);

    const eventPromise = new Promise<StakeEvent>((resolve) => {
      const listenerId = program.addEventListener("stakeEvent", (event) => {
        void program.removeEventListener(listenerId);
        resolve(event);
      });
    });

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

    const event = await eventPromise;

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(event.stakingRecord.equals(setup.pool1.signer1Record));
    assert(event.operatorPool.equals(setup.pool1.pool));
    assert(event.stakeAmount.eq(stakeAmount));
    assert(event.totalStakedAmount.eq(operatorPool.totalStakedAmount));
    assert(event.totalUnstaking.eq(operatorPool.totalUnstaking));

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

  it("Fail to change operator staking record with insufficient share", async () => {
    try {
      // Expect to fail since user 1 hasn't staked yet.
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
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "minOperatorSharesNotMet");
    }
  });

  it("Fail to stake when delegation is disabled", async () => {
    await program.methods
      .updateOperatorPool({
        newCommissionRateBps: null,
        autoStakeFees,
        allowDelegation: false,
      })
      .accountsStrict({
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
        usdcPayoutDestination: null,
      })
      .signers([setup.signer1Kp])
      .rpc();
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(!operatorPool.allowDelegation);

    try {
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
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "stakingNotAllowed");
    }
  });

  it("Stake for operator successfully even when delegation is disabled", async () => {
    await program.methods
      .stake(new anchor.BN(100))
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount: getAssociatedTokenAddressSync(
          setup.tokenMint,
          setup.signer1
        ),
      })
      .signers([setup.signer1Kp])
      .rpc();

    // Allow delegation
    await program.methods
      .updateOperatorPool({
        newCommissionRateBps: null,
        autoStakeFees,
        allowDelegation: true,
      })
      .accountsStrict({
        admin: setup.signer1,
        operatorPool: setup.pool1.pool,
        usdcPayoutDestination: null,
      })
      .signers([setup.signer1Kp])
      .rpc();
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

  it("Fail to close StakingRecord with staked tokens", async () => {
    try {
      await program.methods
        .closeStakingRecord()
        .accountsStrict({
          receiver: setup.payer,
          owner: setup.user1,
          stakingRecord: setup.pool1.user1Record,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.user1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "AccountNotEmpty");
    }
  });

  it("Fail to unstake more shares than in StakingRecord", async () => {
    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );

    try {
      await program.methods
        .unstake(stakingRecord.shares.addn(1))
        .accountsStrict({
          owner: setup.user1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.user1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
        })
        .signers([setup.user1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "RequireGteViolated");
    }
  });

  it("Fail to unstake if global withdrawal is halted", async () => {
    // Halt withdrawal
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: true,
        allowPoolCreation: null,
        minOperatorShareBps: null,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    try {
      await program.methods
        .unstake(new anchor.BN(1))
        .accountsStrict({
          owner: setup.user1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.user1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
        })
        .signers([setup.user1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "withdrawalsHalted");
    }

    // Revert halt withdrawal
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: false,
        allowPoolCreation: null,
        minOperatorShareBps: null,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Fail to unstake for operator if operator falls below min share", async () => {
    // Change min share to 99%
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: null,
        allowPoolCreation: null,
        minOperatorShareBps: 9900,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    try {
      await program.methods
        .unstake(new anchor.BN(1))
        .accountsStrict({
          owner: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.signer1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "minOperatorSharesNotMet");
    }
  });

  it("Unstake for user successfully", async () => {
    const unstakeAmount = new anchor.BN(10_000);
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );

    // Expect unstaking to be successful even when operator falls below min. share.
    const eventPromise = new Promise<UnstakeEvent>((resolve) => {
      const listenerId = program.addEventListener("unstakeEvent", (event) => {
        void program.removeEventListener(listenerId);
        resolve(event);
      });
    });

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

    const event = await eventPromise;

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(event.stakingRecord.equals(setup.pool1.user1Record));
    assert(event.operatorPool.equals(setup.pool1.pool));
    assert(event.unstakeAmount.eq(unstakeAmount));
    assert(event.totalStakedAmount.eq(operatorPool.totalStakedAmount));
    assert(event.totalUnstaking.eq(operatorPool.totalUnstaking));

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

    // Revert min share to default.
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: null,
        allowPoolCreation: null,
        minOperatorShareBps,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
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
    const unstakeAmount = new anchor.BN(10_000);
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
    const expectedShares = unstakeAmount
      .mul(operatorPoolPre.totalShares)
      .div(operatorPoolPre.totalStakedAmount);
    assert(
      operatorPool.totalShares
        .sub(operatorPoolPre.totalShares)
        .eq(expectedShares)
    );

    assert(
      operatorPool.totalStakedAmount
        .sub(operatorPoolPre.totalStakedAmount)
        .eq(unstakeAmount)
    );
    assert(
      operatorPoolPre.totalUnstaking.eq(
        operatorPool.totalUnstaking.add(unstakeAmount)
      )
    );

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(
      stakingRecord.shares.sub(stakingRecordPre.shares).eq(expectedShares)
    );
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());

    // Resume unstaking
    await program.methods
      .unstake(expectedShares)
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

  it("Fail to claim unstake before delay is complete", async () => {
    try {
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        setup.tokenMint,
        setup.user1
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

      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "pendingDelay");
    }
  });

  it("Fail to create RewardRecord with invalid authority", async () => {
    try {
      await program.methods
        .createRewardRecord({
          merkleRoots: [],
          totalRewards: new anchor.BN(0),
          totalUsdcPayout: new anchor.BN(0),
        })
        .accountsStrict({
          payer: setup.payer,
          authority: setup.signer1Kp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[1],
          rewardTokenAccount: setup.rewardTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
  });

  it("Create RewardRecord 1 successfully", async () => {
    // Create an empty record with no rewards.
    await program.methods
      .createRewardRecord({
        merkleRoots: [],
        totalRewards: new anchor.BN(0),
        totalUsdcPayout: new anchor.BN(0),
      })
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[1],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Create RewardRecord 2 successfully", async () => {
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree))];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalRewards = totalRewards.addn(Number(addressInput.tokenAmount));
    }
    let totalUsdcAmount = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalUsdcAmount = totalUsdcAmount.addn(Number(addressInput.usdcAmount));
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

    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      setup.usdcTokenAccount,
      setup.signer1Kp,
      totalUsdcAmount.toNumber()
    );

    // Create a record for epoch 2 with rewards for Operator 1 to 4.
    await program.methods
      .createRewardRecord({
        merkleRoots,
        totalRewards,
        totalUsdcPayout: totalUsdcAmount,
      })
      .accountsStrict({
        payer: setup.payer,
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
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
      assert.deepEqual(
        rewardRecord.merkleRoots[i],
        Array.from(merkleRoots[i] ?? [])
      );
    }
  });

  it("Create OperatorPool 2 successfully", async () => {
    await program.methods
      .createOperatorPool({
        autoStakeFees,
        commissionRateBps,
        allowDelegation,
      })
      .accountsStrict({
        payer: setup.payer,
        admin: setup.signer2,
        operatorPool: setup.pool2.pool,
        stakingRecord: setup.pool2.signer2Record,
        stakedTokenAccount: setup.pool2.stakedTokenAccount,
        feeTokenAccount: setup.pool2.feeTokenAccount,
        poolOverview: setup.poolOverview,
        mint: setup.tokenMint,
        usdcPayoutDestination: setup.pool2.usdcTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.signer2Kp])
      .rpc();

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool2.pool
    );
    assert(operatorPool.poolId.eqn(2));
    assert(operatorPool.admin.equals(setup.signer2));
    assert(
      operatorPool.operatorStakingRecord.equals(setup.pool2.signer2Record)
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
    assert(operatorPool.rewardLastClaimedEpoch.eqn(3));
    assert(operatorPool.accruedRewards.isZero());
    assert(operatorPool.accruedCommission.isZero());

    const stakingRecord = await program.account.stakingRecord.fetch(
      setup.pool2.signer2Record
    );
    assert(stakingRecord.owner.equals(setup.signer2));
    assert(stakingRecord.operatorPool.equals(setup.pool2.pool));
    assert(stakingRecord.shares.isZero());
    assert(stakingRecord.tokensUnstakeAmount.isZero());
    assert(stakingRecord.unstakeAtTimestamp.isZero());
  });

  it("Fail to modify RewardRecord with invalid authority", async () => {
    try {
      await program.methods
        .modifyRewardRecord({
          merkleRoots: [],
        })
        .accountsStrict({
          authority: setup.signer1Kp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
  });

  it("PoolOverview admin modifies RewardRecord successfully", async () => {
    const addressInputs = [
      {
        address: setup.pool1.pool.toString(),
        tokenAmount: 200n,
        usdcAmount: 0n,
      },
      {
        address: setup.pool2.pool.toString(),
        tokenAmount: 100n,
        usdcAmount: 0n,
      },
      {
        address: setup.pool3.pool.toString(),
        tokenAmount: 300n,
        usdcAmount: 0n,
      },
      {
        address: setup.pool4.pool.toString(),
        tokenAmount: 400n,
        usdcAmount: 0n,
      },
    ].sort((a, b) => a.address.localeCompare(b.address));
    const merkleTree = MerkleUtils.constructMerkleTree(addressInputs);
    const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree))];
    let epoch1RewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    const prevMerkleRoots = epoch1RewardRecord.merkleRoots;

    await program.methods
      .modifyRewardRecord({
        merkleRoots,
      })
      .accountsStrict({
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[2],
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    epoch1RewardRecord = await program.account.rewardRecord.fetch(
      setup.rewardRecords[2]
    );
    assert.deepEqual(epoch1RewardRecord.merkleRoots, merkleRoots);

    // Set root back to previous
    await program.methods
      .modifyRewardRecord({
        merkleRoots: prevMerkleRoots,
      })
      .accountsStrict({
        authority: setup.poolOverviewAdminKp.publicKey,
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

  it("Fail to stake before rewards are claimed", async () => {
    try {
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        setup.tokenMint,
        setup.user1
      );
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
          ownerTokenAccount,
        })
        .signers([setup.user1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "unclaimedRewards");
    }
  });

  it("Fail to unstake before rewards are claimed", async () => {
    try {
      await program.methods
        .unstake(new anchor.BN(1))
        .accountsStrict({
          owner: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.signer1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "unclaimedRewards");
    }
  });

  it("Fail to cancel unstake before rewards are claimed", async () => {
    try {
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
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "unclaimedRewards");
    }
  });

  it("Fail to claim unstake before rewards are claimed", async () => {
    try {
      // Sleep till delay duration has elapsed.
      await sleep(delegatorUnstakeDelaySeconds.toNumber() * 1000);
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        setup.tokenMint,
        setup.user1
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

      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "unclaimedRewards");
    }
  });

  it("Accrue Rewards successfully", async () => {
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

    const rewardAmount = new anchor.BN(Number(proofInputs.tokenAmount));
    const usdcAmount = new anchor.BN(Number(proofInputs.tokenAmount));

    const eventPromise = new Promise<CompleteAccrueRewardEvent>((resolve) => {
      const listenerId = program.addEventListener(
        "completeAccrueRewardEvent",
        (event) => {
          void program.removeEventListener(listenerId);
          resolve(event);
        }
      );
    });

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
        rewardRecord: setup.rewardRecords[2],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        usdcPayoutDestination: setup.pool1.usdcTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const event = await eventPromise;

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(event.operatorPool.equals(setup.pool1.pool));
    assert(event.totalStakedAmount.eq(operatorPool.totalStakedAmount));
    assert(event.totalUnstaking.eq(operatorPool.totalUnstaking));
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

  it("Fail to claim unstake if global withdrawal is halted", async () => {
    // Halt withdrawal
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: true,
        allowPoolCreation: null,
        minOperatorShareBps: null,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    try {
      await program.methods
        .claimUnstake()
        .accountsStrict({
          owner: setup.user1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.user1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
          ownerTokenAccount: getAssociatedTokenAddressSync(
            setup.tokenMint,
            setup.user1
          ),
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "withdrawalsHalted");
    }

    // Revert halt withdrawal
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: false,
        allowPoolCreation: null,
        minOperatorShareBps: null,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Fail to claim unstake for operator if operator falls below min share", async () => {
    // Change min share to 99%
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: null,
        allowPoolCreation: null,
        minOperatorShareBps: 9900,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    try {
      await program.methods
        .claimUnstake()
        .accountsStrict({
          owner: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.signer1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
          ownerTokenAccount: getAssociatedTokenAddressSync(
            setup.tokenMint,
            setup.signer1
          ),
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "minOperatorSharesNotMet");
    }

    // Revert min share to default.
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: null,
        allowPoolCreation: null,
        minOperatorShareBps,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Claim unstake for user successfully", async () => {
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

    const eventPromise = new Promise<ClaimUnstakeEvent>((resolve) => {
      const listenerId = program.addEventListener(
        "claimUnstakeEvent",
        (event) => {
          void program.removeEventListener(listenerId);
          resolve(event);
        }
      );
    });

    // Call the claimUnstake method
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

    const event = await eventPromise;

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(event.stakingRecord.equals(setup.pool1.user1Record));
    assert(event.operatorPool.equals(setup.pool1.pool));
    assert(event.unstakeAmount.eq(stakingRecordPre.tokensUnstakeAmount));
    assert(event.totalStakedAmount.eq(operatorPool.totalStakedAmount));
    assert(event.totalUnstaking.eq(operatorPool.totalUnstaking));

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

  it("Fail to claim unstake for operator if pool is halted", async () => {
    // Halt pool
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

    try {
      await program.methods
        .claimUnstake()
        .accountsStrict({
          owner: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.signer1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
          ownerTokenAccount: getAssociatedTokenAddressSync(
            setup.tokenMint,
            setup.signer1
          ),
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "unstakingNotAllowed");
    }

    // Revert halt pool
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
  });

  it("Claim unstake for operator successfully", async () => {
    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );
    const tokenBalancePre = await connection.getTokenAccountBalance(
      ownerTokenAccount
    );
    const operatorPoolPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );

    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );

    await program.methods
      .claimUnstake()
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
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
      setup.pool1.signer1Record
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

  it("Fail to slash OperatorPool stake with invalid authority", async () => {
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );

    try {
      await program.methods
        .slashStake({ sharesAmount: new anchor.BN(1) })
        .accountsStrict({
          authority: setup.signer1Kp.publicKey,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.signer1Record,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          destination: destinationTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
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

    const eventPromise = new Promise<SlashStakeEvent>((resolve) => {
      const listenerId = program.addEventListener(
        "slashStakeEvent",
        (event) => {
          void program.removeEventListener(listenerId);
          resolve(event);
        }
      );
    });
    await program.methods
      .slashStake({ sharesAmount: sharesToSlash })
      .accountsStrict({
        authority: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.signer1Record,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        destination: destinationTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    const event = await eventPromise;

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

    assert(event.stakingRecord.equals(setup.pool1.signer1Record));
    assert(event.operatorPool.equals(setup.pool1.pool));
    assert(event.slashedAmount.eq(expectedStakeRemoved));
    assert(event.totalStakedAmount.eq(operatorPoolPost.totalStakedAmount));
    assert(event.totalUnstaking.eq(operatorPoolPost.totalUnstaking));

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

    // Assert destination received tokens
    assert(
      new anchor.BN(destinationBalancePost.value.amount).eq(
        new anchor.BN(destinationBalancePre.value.amount).add(
          expectedStakeRemoved
        )
      ),
      "Destination token account must receive the slashed amount"
    );
  });

  it("Fail to set halt status with invalid authority", async () => {
    try {
      await program.methods
        .setHaltStatus({
          isHalted: true,
        })
        .accountsStrict({
          authority: setup.signer1Kp.publicKey,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
        })
        .signers([setup.signer1Kp])
        .rpc();

      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidAuthority");
    }
  });

  it("PoolOverview admin should set halt status", async () => {
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

    const operatorPoolPost = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPoolPost.isHalted, "OperatorPool must be halted");
  });

  it("Fail to unstake for Operator when pool is halted", async () => {
    try {
      await program.methods
        .unstake(new anchor.BN(1))
        .accountsStrict({
          owner: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          ownerStakingRecord: setup.pool1.signer1Record,
          operatorStakingRecord: setup.pool1.signer1Record,
        })
        .signers([setup.signer1Kp])
        .rpc();

      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "unstakingNotAllowed");
    }
  });

  it("Fail to stake to OperatorPool when it's halted", async () => {
    try {
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        setup.tokenMint,
        setup.user1
      );
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
          ownerTokenAccount,
        })
        .signers([setup.user1Kp])
        .rpc();

      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "operatorPoolHalted");
    }
  });

  it("Fail to close OperatorPool when it's halted", async () => {
    try {
      await program.methods
        .closeOperatorPool()
        .accountsStrict({
          admin: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "operatorPoolHalted");
    }
  });

  it("Fail to withdraw Operator commission if pool is halted", async () => {
    try {
      await program.methods
        .withdrawOperatorCommission()
        .accountsStrict({
          admin: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          destination: getAssociatedTokenAddressSync(
            setup.tokenMint,
            setup.signer1
          ),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "operatorPoolHalted");
    }

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

    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(!operatorPool.isHalted, "OperatorPool must be unhalted");
  });

  it("Fail to withdraw Operator commission if global withdrawal is halted", async () => {
    // Halt withdrawal
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: true,
        allowPoolCreation: null,
        minOperatorShareBps: null,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    try {
      await program.methods
        .withdrawOperatorCommission()
        .accountsStrict({
          admin: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          destination: getAssociatedTokenAddressSync(
            setup.tokenMint,
            setup.signer1
          ),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "withdrawalsHalted");
    }

    // Revert halt withdrawal
    await program.methods
      .updatePoolOverview({
        isStakingHalted: null,
        isWithdrawalHalted: false,
        allowPoolCreation: null,
        minOperatorShareBps: null,
        delegatorUnstakeDelaySeconds: null,
        operatorUnstakeDelaySeconds: null,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
  });

  it("OperatorPool 1 Admin should be able to withdraw reward commission", async () => {
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );
    const [feeTokenAccountPre, destinationPre] = await Promise.all([
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

    const [feeTokenAccountPost, destinationPost] = await Promise.all([
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

  it("Fail to close StakingRecord with unstaking tokens", async () => {
    // Unstake all remaining tokens for user 1
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );
    await program.methods
      .unstake(stakingRecordPre.shares)
      .accountsStrict({
        owner: setup.user1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.user1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.user1Kp])
      .rpc();

    const stakingRecordPost = await program.account.stakingRecord.fetch(
      setup.pool1.user1Record
    );
    assert(stakingRecordPost.shares.isZero());
    assert(!stakingRecordPost.tokensUnstakeAmount.isZero());

    // Expect closing of StakingRecord to fail when there are tokens unstaking
    try {
      await program.methods
        .closeStakingRecord()
        .accountsStrict({
          receiver: setup.payer,
          owner: setup.user1,
          stakingRecord: setup.pool1.user1Record,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.user1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "accountNotEmpty");
    }
  });

  it("Should close StakingRecord successfully", async () => {
    const user2Record = setup.sdk.stakingRecordPda(
      setup.pool1.pool,
      setup.user2
    );
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

  it("Should close OperatorPool successfully", async () => {
    await program.methods
      .closeOperatorPool()
      .accountsStrict({
        admin: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert(operatorPool.closedAt?.eq(poolOverview.completedRewardEpoch));
  });

  it("Fail to close OperatorPool when it's already closed", async () => {
    try {
      await program.methods
        .closeOperatorPool()
        .accountsStrict({
          admin: setup.signer1,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
        })
        .signers([setup.signer1Kp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "closedPool");
    }
  });

  it("Fail to stake to OperatorPool when it's closed", async () => {
    try {
      const ownerTokenAccount = getAssociatedTokenAddressSync(
        setup.tokenMint,
        setup.user1
      );
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
          ownerTokenAccount,
        })
        .signers([setup.user1Kp])
        .rpc();

      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "closedPool");
    }
  });

  it("Unstake for operator below min. share is successful when pool is closed.", async () => {
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const stakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(!stakingRecordPre.shares.isZero());

    // Expect unstaking of all shares to be successful.
    await program.methods
      .unstake(stakingRecordPre.shares)
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
      })
      .signers([setup.signer1Kp])
      .rpc();

    const stakingRecordPost = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    const expectedTokens = stakingRecordPre.shares
      .mul(operatorPool.totalStakedAmount)
      .div(operatorPool.totalShares);
    assert(stakingRecordPost.shares.isZero());
    assert(
      stakingRecordPost.tokensUnstakeAmount
        .sub(stakingRecordPre.tokensUnstakeAmount)
        .eq(expectedTokens)
    );
  });

  it("Claim unstake for operator below min. share is successful when pool is closed.", async () => {
    // Sleep till delay duration has elapsed.
    await sleep((operatorUnstakeDelaySeconds.toNumber() + 2) * 1000);

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.signer1
    );

    await program.methods
      .claimUnstake()
      .accountsStrict({
        owner: setup.signer1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.signer1Record,
        operatorStakingRecord: setup.pool1.signer1Record,
        ownerTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const stakingRecordPost = await program.account.stakingRecord.fetch(
      setup.pool1.signer1Record
    );
    assert(stakingRecordPost.shares.isZero());
    assert(stakingRecordPost.unstakeAtTimestamp.isZero());
    assert(stakingRecordPost.tokensUnstakeAmount.isZero());
  });
});
