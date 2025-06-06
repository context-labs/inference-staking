import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStaking } from "@sdk/src/idl";

import { MerkleUtils } from "@tests/lib/merkle";
import type {
  GenerateMerkleProofInput,
  ConstructMerkleTreeInput,
} from "@tests/lib/merkle";
import type { SetupTestResult } from "@tests/lib/setup";
import { setupTests } from "@tests/lib/setup";
import {
  assertError,
  assertStakingProgramError,
  setEpochFinalizationState,
} from "@tests/lib/utils";

describe("Reward creation and accrual tests", () => {
  let setup: SetupTestResult;
  let connection: Connection;
  let program: anchor.Program<InferenceStaking>;

  const autoStakeFees = true;
  const commissionRateBps = 1_500;
  const newCommissionRateBps = 0;
  const allowDelegation = true;
  const minOperatorShareBps = 0;
  const allowPoolCreation = true;
  const isStakingHalted = false;
  const isWithdrawalHalted = false;
  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);

  let merkleTree4: Uint8Array[][];
  const rewardInputs4: ConstructMerkleTreeInput[] = [];

  before(async () => {
    setup = await setupTests();
    program = setup.sdk.program;
    connection = program.provider.connection;

    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        mint: setup.tokenMint,
        usdcMint: setup.usdcTokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.poolOverviewAdminKp])
      .rpc();

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
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

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
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
  });

  it("Fail to create future RewardRecord", async () => {
    try {
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const root = MerkleUtils.getTreeRoot(merkleTree);
      const merkleRoots = [Array.from(root)];
      await setEpochFinalizationState({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots,
          totalRewards: new anchor.BN(0),
          totalUsdcPayout: new anchor.BN(0),
        })
        .accountsStrict({
          payer: setup.payer,
          authority: setup.rewardDistributionAuthorityKp.publicKey,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          rewardTokenAccount: setup.rewardTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "ConstraintSeeds");
    } finally {
      await setEpochFinalizationState({
        program,
        setup,
        isEpochFinalizing: false,
      });
    }
  });

  it("Create RewardRecord should require amounts to be zero if no merkle roots are provided", async () => {
    try {
      await setEpochFinalizationState({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots: [],
          totalRewards: new anchor.BN(100),
          totalUsdcPayout: new anchor.BN(100),
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
      assert(false);
    } catch (error) {
      assertError(error, "RequireEqViolated");
    } finally {
      await setEpochFinalizationState({
        program,
        setup,
        isEpochFinalizing: false,
      });
    }
  });

  it("Create RewardRecord 1 successfully", async () => {
    await setEpochFinalizationState({ program, setup });
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
  });

  it("Create Operator Pool and Staking Record successfully", async () => {
    await program.methods
      .createOperatorPool({
        autoStakeFees,
        commissionRateBps,
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
        feeTokenAccount: setup.pool1.feeTokenAccount,
        poolOverview: setup.poolOverview,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        usdcPayoutDestination: setup.pool1.usdcTokenAccount,
      })
      .signers([setup.payerKp, setup.pool1.adminKp])
      .rpc();

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.pool1.admin
    );
    await program.methods
      .stake(new anchor.BN(150_000))
      .accountsStrict({
        owner: setup.pool1.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.stakingRecord,
        operatorStakingRecord: setup.pool1.stakingRecord,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount,
      })
      .signers([setup.pool1.adminKp])
      .rpc();

    await program.methods
      .createStakingRecord()
      .accountsStrict({
        payer: setup.payer,
        owner: setup.delegator1,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.delegatorStakingRecord,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.delegator1Kp])
      .rpc();

    await program.methods
      .stake(new anchor.BN(400_000))
      .accountsStrict({
        owner: setup.delegator1,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
        ownerStakingRecord: setup.pool1.delegatorStakingRecord,
        operatorStakingRecord: setup.pool1.stakingRecord,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        ownerTokenAccount: getAssociatedTokenAddressSync(
          setup.tokenMint,
          setup.delegator1
        ),
      })
      .signers([setup.delegator1Kp])
      .rpc();

    await program.methods
      .updateOperatorPool({
        newCommissionRateBps: { rateBps: newCommissionRateBps },
        autoStakeFees: true,
        allowDelegation: false,
        name: setup.pool1.name,
        description: setup.pool1.description,
        websiteUrl: setup.pool1.websiteUrl,
        avatarImageUrl: setup.pool1.avatarImageUrl,
        operatorAuthKeys: null,
      })
      .accountsStrict({
        admin: setup.pool1.admin,
        operatorPool: setup.pool1.pool,
        usdcPayoutDestination: null,
      })
      .signers([setup.pool1.adminKp])
      .rpc();
  });

  it("Fail to create RewardRecord 1 again", async () => {
    try {
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const root = MerkleUtils.getTreeRoot(merkleTree);
      const merkleRoots = [Array.from(root)];
      await setEpochFinalizationState({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots,
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
      assert(false);
    } catch (error) {
      assertError(error, "ConstraintSeeds");
    } finally {
      await setEpochFinalizationState({
        program,
        setup,
        isEpochFinalizing: false,
      });
    }
  });

  it("Fail to create RewardRecord with insufficient tokens", async () => {
    try {
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const root = MerkleUtils.getTreeRoot(merkleTree);
      const merkleRoots = [Array.from(root)];
      await setEpochFinalizationState({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots,
          totalRewards: new anchor.BN(100_000),
          totalUsdcPayout: new anchor.BN(0),
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
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "insufficientRewards");
    } finally {
      await setEpochFinalizationState({
        program,
        setup,
        isEpochFinalizing: false,
      });
    }
  });

  it("Create RewardRecord with insufficient rewards", async () => {
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const root = MerkleUtils.getTreeRoot(merkleTree);
    const merkleRoots = [Array.from(root)];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalRewards = totalRewards.addn(Number(addressInput.tokenAmount));
    }
    let totalUSDC = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalUSDC = totalUSDC.addn(Number(addressInput.usdcAmount));
    }

    // Should fail with insufficient rewards.
    try {
      await setEpochFinalizationState({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots,
          totalRewards,
          totalUsdcPayout: new anchor.BN(0),
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
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "insufficientRewards");
    } finally {
      await setEpochFinalizationState({
        program,
        setup,
        isEpochFinalizing: false,
      });
    }

    // Fund rewardTokenAccount
    await mintTo(
      connection,
      setup.payerKp,
      setup.tokenMint,
      setup.rewardTokenAccount,
      setup.tokenHolderKp,
      totalRewards.toNumber()
    );

    try {
      await setEpochFinalizationState({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots,
          totalRewards,
          totalUsdcPayout: totalUSDC,
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
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "insufficientUsdc");
    } finally {
      await setEpochFinalizationState({
        program,
        setup,
        isEpochFinalizing: false,
      });
    }

    // Fund usdcTokenAccount
    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      setup.usdcTokenAccount,
      setup.tokenHolderKp,
      totalUSDC.toNumber()
    );

    // Should succeed with sufficient rewards.
    await setEpochFinalizationState({ program, setup });
    await program.methods
      .createRewardRecord({
        merkleRoots,
        totalRewards,
        totalUsdcPayout: totalUSDC,
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
  });

  it("Create RewardRecord with multiple roots", async () => {
    const merkleTree1 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[3].slice(0, 1)
    );
    const merkleTree2 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[3].slice(1, 2)
    );
    const merkleTree3 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[3].slice(2, 3)
    );
    const merkleTree4 = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[3].slice(3, 4)
    );

    const merkleRoots = [
      Array.from(MerkleUtils.getTreeRoot(merkleTree1)),
      Array.from(MerkleUtils.getTreeRoot(merkleTree2)),
      Array.from(MerkleUtils.getTreeRoot(merkleTree3)),
      Array.from(MerkleUtils.getTreeRoot(merkleTree4)),
    ];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[3]) {
      totalRewards = totalRewards.addn(Number(addressInput.tokenAmount));
    }
    let totalUsdcAmount = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
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

    await setEpochFinalizationState({ program, setup });
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
        rewardRecord: setup.rewardRecords[3],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
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
        .accrueReward({
          merkleIndex: treeIndex,
          proof: proof.map((arr) => Array.from(arr)),
          proofPath,
          rewardAmount: new anchor.BN(proofInputs.tokenAmount.toString()),
          usdcAmount: new anchor.BN(proofInputs.usdcAmount.toString()),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[3],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
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

    const invalidProofInputs = {
      ...setup.rewardEpochs[2][wrongNodeIndex],
      index: wrongNodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;
    const validProofInputs = {
      ...setup.rewardEpochs[2][nodeIndex],
      index: nodeIndex,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof: invalidProof, proofPath: invalidProofPath } =
      MerkleUtils.generateMerkleProof(invalidProofInputs);
    const { proof: validProof, proofPath: validProofPath } =
      MerkleUtils.generateMerkleProof(validProofInputs);

    try {
      // Use proof and proof path for a different node
      await program.methods
        .accrueReward({
          merkleIndex: 0,
          proof: invalidProof.map((arr) => Array.from(arr)),
          proofPath: invalidProofPath,
          rewardAmount: new anchor.BN(
            setup.rewardEpochs[2][nodeIndex]?.tokenAmount.toString() ?? "0"
          ),
          usdcAmount: new anchor.BN(
            setup.rewardEpochs[2][nodeIndex]?.usdcAmount.toString() ?? "0"
          ),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidProof");
    }

    try {
      // Use proof and proof path with different lengths
      await program.methods
        .accrueReward({
          merkleIndex: 0,
          proof: validProof.map((arr) => Array.from(arr)),
          proofPath: validProofPath.concat(true),
          rewardAmount: new anchor.BN(
            setup.rewardEpochs[2][nodeIndex]?.tokenAmount.toString() ?? "0"
          ),
          usdcAmount: new anchor.BN(
            setup.rewardEpochs[2][nodeIndex]?.usdcAmount.toString() ?? "0"
          ),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidProof");
    }

    try {
      // Use a valid proof with an valid token amount
      await program.methods
        .accrueReward({
          merkleIndex: 0,
          proof: validProof.map((arr) => Array.from(arr)),
          proofPath: validProofPath,
          rewardAmount: new anchor.BN(
            (
              Number(setup.rewardEpochs[2][nodeIndex]?.tokenAmount ?? 0) + 1
            ).toString()
          ),
          usdcAmount: new anchor.BN(
            setup.rewardEpochs[2][nodeIndex]?.usdcAmount.toString() ?? "0"
          ),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidProof");
    }

    try {
      // Use a valid proof with an invalid USDC amount
      await program.methods
        .accrueReward({
          merkleIndex: 0,
          proof: validProof.map((arr) => Array.from(arr)),
          proofPath: validProofPath,
          rewardAmount: new anchor.BN(
            setup.rewardEpochs[2][nodeIndex]?.tokenAmount.toString() ?? "0"
          ),
          usdcAmount: new anchor.BN(
            (
              Number(setup.rewardEpochs[2][nodeIndex]?.usdcAmount ?? 0) + 1
            ).toString()
          ),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidProof");
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
    const usdcBalancePre = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );

    const rewardAmount = new anchor.BN(proofInputs.tokenAmount.toString());
    const usdcAmount = new anchor.BN(proofInputs.usdcAmount.toString());
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
        operatorStakingRecord: setup.pool1.stakingRecord,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        usdcPayoutDestination: setup.pool1.usdcTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const commissionFees = rewardAmount.muln(commissionRateBps / 10_000);
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

    const usdcBalancePost = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );

    assert(
      new anchor.BN(usdcBalancePost.value.amount).eq(
        new anchor.BN(usdcBalancePre.value.amount)
      )
    );
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
        .accrueReward({
          merkleIndex: 0,
          proof: proof.map((arr) => Array.from(arr)),
          proofPath,
          rewardAmount: new anchor.BN(proofInputs.tokenAmount.toString()),
          usdcAmount: new anchor.BN(proofInputs.usdcAmount.toString()),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[2],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "ConstraintRaw");
    }
  });

  it("Accrue Rewards for epoch 3 successfully", async () => {
    const treeIndex = setup.rewardEpochs[3].findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );
    const merkleTree = MerkleUtils.constructMerkleTree(
      setup.rewardEpochs[3].slice(treeIndex, treeIndex + 1)
    );
    const proofInputs = {
      ...setup.rewardEpochs[3][treeIndex],
      index: 0,
      merkleTree,
    } as GenerateMerkleProofInput;
    const { proof, proofPath } = MerkleUtils.generateMerkleProof(proofInputs);
    const operatorPre = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    const operatorStakingRecordPre = await program.account.stakingRecord.fetch(
      setup.pool1.stakingRecord
    );
    const rewardBalancePre = await connection.getTokenAccountBalance(
      setup.rewardTokenAccount
    );
    const stakedBalancePre = await connection.getTokenAccountBalance(
      setup.pool1.stakedTokenAccount
    );
    const usdcTokenAccountPre = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );
    const usdcBalancePre = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );

    const rewardAmount = new anchor.BN(proofInputs.tokenAmount.toString());
    const usdcAmount = new anchor.BN(proofInputs.usdcAmount.toString());
    await program.methods
      .accrueReward({
        merkleIndex: treeIndex,
        proof: proof.map((arr) => Array.from(arr)),
        proofPath,
        rewardAmount,
        usdcAmount,
      })
      .accountsStrict({
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[3],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.stakingRecord,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        usdcPayoutDestination: setup.pool1.usdcTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const commissionFees = rewardAmount.muln(commissionRateBps / 10_000);

    const delegatorRewards = rewardAmount.sub(commissionFees);
    const totalTokensTransferred = commissionFees
      .add(delegatorRewards)
      .add(operatorPre.accruedCommission)
      .add(operatorPre.accruedRewards);

    const amountToStakedAccount = operatorPre.totalStakedAmount.add(
      operatorPre.accruedRewards.add(delegatorRewards)
    );

    const tokenAmount = operatorPre.accruedCommission.add(commissionFees);
    const sharesPrinted = tokenAmount
      .mul(operatorPre.totalShares)
      .div(amountToStakedAccount);

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
      setup.pool1.stakingRecord
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

    const usdcTokenAccountPost = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );
    const usdcBalancePost = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );

    assert(
      new anchor.BN(usdcTokenAccountPost.value.amount)
        .sub(usdcAmount)
        .eq(new anchor.BN(usdcTokenAccountPre.value.amount))
    );

    assert(
      new anchor.BN(usdcBalancePost.value.amount).eq(
        usdcAmount.addn(Number(usdcBalancePre.value.amount))
      )
    );
  });

  it("Create RewardRecord 4 with large merkle tree", async () => {
    let totalRewards = new anchor.BN(0);
    let totalUSDC = new anchor.BN(0);
    for (let i = 0; i <= 500_000; i++) {
      rewardInputs4.push({
        address: PublicKey.unique().toString(),
        tokenAmount: BigInt(i * 100),
        usdcAmount: BigInt(i * 100),
      });
      totalRewards = totalRewards.addn(i * 100);
      totalUSDC = totalUSDC.addn(i * 100);
    }

    // Add OperatorPool 1 as a recipient.
    rewardInputs4.push({
      address: setup.pool1.pool.toString(),
      tokenAmount: BigInt(10_000),
      usdcAmount: BigInt(50),
    });
    rewardInputs4.sort((a, b) => a.address.localeCompare(b.address));

    merkleTree4 = MerkleUtils.constructMerkleTree(rewardInputs4);
    const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree4))];

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
      totalUSDC.toNumber()
    );

    await setEpochFinalizationState({ program, setup });
    await program.methods
      .createRewardRecord({
        merkleRoots,
        totalRewards,
        totalUsdcPayout: totalUSDC,
      })
      .accountsStrict({
        payer: setup.payer,
        authority: setup.rewardDistributionAuthority,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[4],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
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

    const rewardAmount = new anchor.BN(proofInputs.tokenAmount.toString());
    const usdcAmount = new anchor.BN(proofInputs.usdcAmount.toString());
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
        rewardRecord: setup.rewardRecords[4],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.stakingRecord,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        feeTokenAccount: setup.pool1.feeTokenAccount,
        usdcPayoutDestination: setup.pool1.usdcTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });

  it("Create another RewardRecord after pool closure", async () => {
    // Close OperatorPool
    await program.methods
      .closeOperatorPool()
      .accountsStrict({
        admin: setup.pool1.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.pool1.adminKp])
      .rpc();

    // Use same reward values as epoch 2
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

    await setEpochFinalizationState({ program, setup });
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
        rewardRecord: setup.rewardRecords[5],
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
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
        .accrueReward({
          merkleIndex: 0,
          proof: proof.map((arr) => Array.from(arr)),
          proofPath,
          rewardAmount: new anchor.BN(proofInputs.tokenAmount.toString()),
          usdcAmount: new anchor.BN(proofInputs.usdcAmount.toString()),
        })
        .accountsStrict({
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[5],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          feeTokenAccount: setup.pool1.feeTokenAccount,
          usdcPayoutDestination: setup.pool1.usdcTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "closedPool");
    }
  });
});
