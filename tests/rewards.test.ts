import * as anchor from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import { SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { assert } from "chai";

import type { InferenceStaking } from "@sdk/src/idl";
import { TokenEmissionsUtils } from "@sdk/src/token-emissions.utils";

import { MerkleUtils } from "@tests/lib/merkle";
import type {
  GenerateMerkleProofInput,
  ConstructMerkleTreeInput,
} from "@tests/lib/merkle";
import type { SetupTestResult } from "@tests/lib/setup";
import {
  setupTests,
  TEST_UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
} from "@tests/lib/setup";
import {
  assertError,
  assertStakingProgramError,
  generateRewardsForEpoch,
  handleMarkEpochAsFinalizing,
} from "@tests/lib/utils";

describe("Reward creation and accrual tests", () => {
  let setup: SetupTestResult;
  let connection: Connection;
  let program: anchor.Program<InferenceStaking>;

  const autoStakeFees = true;
  const rewardCommissionRateBps = 1_500;
  const newRewardCommissionRateBps = 0;
  const usdcCommissionRateBps = 10_000;
  const newUsdcCommissionRateBps = 10_000;
  const allowDelegation = true;
  const allowPoolCreation = true;
  const operatorPoolRegistrationFee = new anchor.BN(1_000);
  const minOperatorTokenStake = new anchor.BN(0);
  const isStakingHalted = false;
  const isWithdrawalHalted = false;
  const isAccrueRewardHalted = false;
  const delegatorUnstakeDelaySeconds = new anchor.BN(8);
  const operatorUnstakeDelaySeconds = new anchor.BN(20);
  const slashingDelaySeconds = new anchor.BN(3);

  let bigMerkleTree: Uint8Array[][];
  let bigRewardsInput: ConstructMerkleTreeInput[] = [];

  before(async () => {
    setup = await setupTests();
    program = setup.sdk.program;
    connection = program.provider.connection;

    await program.methods
      .createPoolOverview()
      .accountsStrict({
        payer: setup.payer,
        programAdmin: setup.poolOverviewAdmin,
        poolOverview: setup.poolOverview,
        rewardTokenAccount: setup.rewardTokenAccount,
        usdcTokenAccount: setup.usdcTokenAccount,
        mint: setup.tokenMint,
        usdcMint: setup.usdcTokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        registrationFeePayoutWallet: setup.registrationFeePayoutWallet,
        slashingDestinationTokenAccount: setup.slashingDestinationTokenAccount,
        slashingDestinationUsdcAccount: setup.slashingDestinationUsdcAccount,
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
        isAccrueRewardHalted,
        allowPoolCreation,
        minOperatorTokenStake,
        delegatorUnstakeDelaySeconds,
        operatorUnstakeDelaySeconds,
        operatorPoolRegistrationFee,
        slashingDelaySeconds,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        registrationFeePayoutWallet: null,
        slashingDestinationTokenAccount: null,
        slashingDestinationUsdcAccount: null,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

    await program.methods
      .createOperatorPool({
        autoStakeFees: setup.pool2.autoStakeFees,
        rewardCommissionRateBps: setup.pool2.rewardCommissionRateBps,
        usdcCommissionRateBps: setup.pool2.usdcCommissionRateBps,
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
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        usdcFeeTokenAccount: setup.pool2.usdcCommissionFeeTokenVault,
        adminTokenAccount: setup.pool2.adminTokenAccount,
        registrationFeePayoutTokenAccount:
          setup.registrationFeePayoutTokenAccount,
        operatorUsdcVault: setup.sdk.poolDelegatorUsdcEarningsVaultPda(
          setup.pool2.pool
        ),
        usdcMint: setup.usdcTokenMint,
      })
      .signers([setup.payerKp, setup.pool2.adminKp])
      .rpc();
  });

  it("Fail to create future RewardRecord", async () => {
    try {
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const root = MerkleUtils.getTreeRoot(merkleTree);
      const merkleRoots = [Array.from(root)];
      await handleMarkEpochAsFinalizing({ program, setup });
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
    }
  });

  it("Create RewardRecord should require amounts to be zero if no merkle roots are provided", async () => {
    try {
      await handleMarkEpochAsFinalizing({ program, setup });
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
    }
  });

  it("Create RewardRecord 1 successfully", async () => {
    await handleMarkEpochAsFinalizing({ program, setup });
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
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        adminTokenAccount: setup.pool1.adminTokenAccount,
        registrationFeePayoutTokenAccount:
          setup.registrationFeePayoutTokenAccount,
        operatorUsdcVault: setup.sdk.poolDelegatorUsdcEarningsVaultPda(
          setup.pool1.pool
        ),
        usdcMint: setup.usdcTokenMint,
      })
      .signers([setup.payerKp, setup.pool1.adminKp])
      .rpc();

    const ownerTokenAccount = getAssociatedTokenAddressSync(
      setup.tokenMint,
      setup.pool1.admin
    );
    await program.methods
      .stake({ tokenAmount: new anchor.BN(150_000) })
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
      .stake({ tokenAmount: new anchor.BN(400_000) })
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
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([setup.delegator1Kp])
      .rpc();

    await program.methods
      .updateOperatorPool({
        newRewardCommissionRateBps: { rateBps: newRewardCommissionRateBps },
        newUsdcCommissionRateBps: { rateBps: newUsdcCommissionRateBps },
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
        poolOverview: setup.poolOverview,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([setup.pool1.adminKp])
      .rpc();
  });

  it("Fail to create RewardRecord 1 again", async () => {
    try {
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const root = MerkleUtils.getTreeRoot(merkleTree);
      const merkleRoots = [Array.from(root)];
      await handleMarkEpochAsFinalizing({ program, setup });
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
    }
  });

  it("Fail to create RewardRecord with insufficient tokens", async () => {
    try {
      const { totalRewards } = TokenEmissionsUtils.getTokenRewardsForEpoch({
        epoch: BigInt(2),
        uptimeRewardsPercentage: TEST_UPTIME_REWARDS_PERCENTAGE_PER_EPOCH,
      });
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const root = MerkleUtils.getTreeRoot(merkleTree);
      const merkleRoots = [Array.from(root)];
      await handleMarkEpochAsFinalizing({ program, setup });
      await program.methods
        .createRewardRecord({
          merkleRoots,
          totalRewards: new anchor.BN(totalRewards.toString()),
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
    }
  });

  it("Create RewardRecord with insufficient rewards", async () => {
    const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
    const root = MerkleUtils.getTreeRoot(merkleTree);
    const merkleRoots = [Array.from(root)];
    let totalRewards = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalRewards = totalRewards.add(
        new anchor.BN(addressInput.tokenAmount.toString())
      );
    }
    let totalUSDC = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
      totalUSDC = totalUSDC.add(
        new anchor.BN(addressInput.usdcAmount.toString())
      );
    }

    // Should fail with insufficient rewards.
    try {
      await handleMarkEpochAsFinalizing({ program, setup });
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
    }

    await mintTo(
      connection,
      setup.payerKp,
      setup.tokenMint,
      setup.rewardTokenAccount,
      setup.tokenHolderKp,
      BigInt(totalRewards.toString())
    );

    try {
      await handleMarkEpochAsFinalizing({ program, setup });
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
    }

    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      setup.usdcTokenAccount,
      setup.tokenHolderKp,
      BigInt(totalUSDC.toString())
    );

    // Should succeed with sufficient rewards.
    await handleMarkEpochAsFinalizing({ program, setup });
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
      totalRewards = totalRewards.add(
        new anchor.BN(addressInput.tokenAmount.toString())
      );
    }
    let totalUsdcAmount = new anchor.BN(0);
    for (const addressInput of setup.rewardEpochs[2]) {
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

    await handleMarkEpochAsFinalizing({ program, setup });
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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
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
              (setup.rewardEpochs[2][nodeIndex]?.tokenAmount ?? 0n) + 1n
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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
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
              (setup.rewardEpochs[2][nodeIndex]?.usdcAmount ?? 0n) + 1n
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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidProof");
    }
  });

  it("Fail to accrue rewards when accrue reward is halted", async () => {
    await program.methods
      .updatePoolOverview({
        ...setup.sdk.getEmptyPoolOverviewFieldsForUpdateInstruction(),
        isAccrueRewardHalted: true,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        registrationFeePayoutWallet: null,
        slashingDestinationTokenAccount: null,
        slashingDestinationUsdcAccount: null,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();

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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();
      assert(false);
    } catch (err) {
      assertStakingProgramError(err, "accrueRewardHalted");
    }

    await program.methods
      .updatePoolOverview({
        ...setup.sdk.getEmptyPoolOverviewFieldsForUpdateInstruction(),
        isAccrueRewardHalted: false,
      })
      .accountsStrict({
        programAdmin: setup.poolOverviewAdminKp.publicKey,
        poolOverview: setup.poolOverview,
        registrationFeePayoutWallet: null,
        slashingDestinationTokenAccount: null,
        slashingDestinationUsdcAccount: null,
      })
      .signers([setup.poolOverviewAdminKp])
      .rpc();
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
        rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        usdcTokenAccount: setup.usdcTokenAccount,
        poolUsdcVault: setup.pool1.poolUsdcVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc();

    const commissionFees = rewardAmount
      .mul(new anchor.BN(rewardCommissionRateBps))
      .div(new anchor.BN(10_000));
    const delegatorRewards = rewardAmount.sub(commissionFees);

    // Check that OperatorPool's commission rate is not updated since there's 1 more epoch to claim.
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert.equal(
      operatorPool.newRewardCommissionRateBps,
      newRewardCommissionRateBps
    );
    assert.equal(operatorPool.rewardCommissionRateBps, rewardCommissionRateBps);

    // Check that rewards accrued are accumulated.
    assert(operatorPool.accruedRewardCommission.eq(commissionFees));
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

    // Verify operator's USDC account balance remains unchanged
    // (USDC is only accumulated on-chain, not distributed to operator's wallet)
    const usdcBalancePost = await connection.getTokenAccountBalance(
      setup.pool1.usdcTokenAccount
    );

    assert(
      new anchor.BN(usdcBalancePost.value.amount).eq(
        new anchor.BN(usdcBalancePre.value.amount)
      ),
      "Operator's USDC account should remain unchanged"
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
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          poolUsdcVault: setup.pool1.poolUsdcVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
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
    const usdcFeeTokenAccountPre = await connection.getTokenAccountBalance(
      setup.pool1.usdcCommissionFeeTokenVault
    );
    const poolUsdcVaultPre = await connection.getTokenAccountBalance(
      setup.pool1.poolUsdcVault
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
        rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        usdcTokenAccount: setup.usdcTokenAccount,
        poolUsdcVault: setup.pool1.poolUsdcVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc();

    const commissionFees = rewardAmount
      .mul(new anchor.BN(rewardCommissionRateBps))
      .div(new anchor.BN(10_000));

    const delegatorRewards = rewardAmount.sub(commissionFees);
    const totalTokensTransferred = commissionFees
      .add(delegatorRewards)
      .add(operatorPre.accruedRewardCommission)
      .add(operatorPre.accruedRewards);

    // Calculate USDC commission
    const usdcCommissionRateBps = operatorPre.usdcCommissionRateBps;
    const usdcCommissionFees = operatorPre.accruedUsdcCommission
      .add(usdcAmount)
      .mul(new anchor.BN(usdcCommissionRateBps))
      .div(new anchor.BN(10_000));
    const delegatorUsdcEarnings = operatorPre.accruedUsdcCommission
      .add(usdcAmount)
      .sub(usdcCommissionFees);

    const amountToStakedAccount = operatorPre.totalStakedAmount.add(
      operatorPre.accruedRewards.add(delegatorRewards)
    );

    const tokenAmount = operatorPre.accruedRewardCommission.add(commissionFees);
    const sharesPrinted = tokenAmount
      .mul(operatorPre.totalShares)
      .div(amountToStakedAccount);

    // Check that OperatorPool's commission rate is updated.
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool1.pool
    );
    assert.isNull(operatorPool.newRewardCommissionRateBps);
    assert.equal(
      operatorPool.rewardCommissionRateBps,
      newRewardCommissionRateBps
    );

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
    assert(operatorPool.accruedRewardCommission.isZero());
    assert(operatorPool.accruedUsdcCommission.isZero());

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
      setup.pool1.rewardCommissionFeeTokenVault
    );
    assert(
      totalTokensTransferred.eq(
        new anchor.BN(rewardBalancePre.value.amount).sub(
          new anchor.BN(rewardBalance.value.amount)
        )
      )
    );
    assert(
      totalTokensTransferred.eq(
        new anchor.BN(stakedBalance.value.amount).sub(
          new anchor.BN(stakedBalancePre.value.amount)
        )
      )
    );
    assert(new anchor.BN(feeBalance.value.amount).isZero());

    // Verify USDC commission went to fee vault
    const usdcFeeTokenAccountPost = await connection.getTokenAccountBalance(
      setup.pool1.usdcCommissionFeeTokenVault
    );
    const poolUsdcVaultPost = await connection.getTokenAccountBalance(
      setup.pool1.poolUsdcVault
    );

    assert(
      new anchor.BN(usdcFeeTokenAccountPost.value.amount)
        .sub(new anchor.BN(usdcFeeTokenAccountPre.value.amount))
        .eq(usdcCommissionFees),
      "USDC commission should be transferred to USDC fee vault"
    );

    assert(
      new anchor.BN(poolUsdcVaultPost.value.amount)
        .sub(new anchor.BN(poolUsdcVaultPre.value.amount))
        .eq(delegatorUsdcEarnings),
      "Delegator USDC earnings should be transferred to pool USDC vault"
    );
  });

  it("Create RewardRecord 4 with large merkle tree", async () => {
    const addresses: PublicKey[] = [setup.pool1.pool];
    for (let i = 2; i <= 500_000; i++) {
      addresses.push(PublicKey.unique());
    }

    const rewards = generateRewardsForEpoch(addresses, 4, "3");
    const totalRewards = rewards.reduce(
      (acc, { tokenAmount }) => acc + tokenAmount,
      0n
    );
    const totalUSDC = rewards.reduce(
      (acc, { usdcAmount }) => acc + usdcAmount,
      0n
    );

    bigMerkleTree = MerkleUtils.constructMerkleTree(rewards);
    bigRewardsInput = rewards;
    const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(bigMerkleTree))];

    await mintTo(
      connection,
      setup.payerKp,
      setup.tokenMint,
      setup.rewardTokenAccount,
      setup.tokenHolderKp,
      totalRewards
    );

    await mintTo(
      connection,
      setup.payerKp,
      setup.usdcTokenMint,
      setup.usdcTokenAccount,
      setup.tokenHolderKp,
      totalUSDC
    );

    await handleMarkEpochAsFinalizing({ program, setup });
    await program.methods
      .createRewardRecord({
        merkleRoots,
        totalRewards: new anchor.BN(totalRewards.toString()),
        totalUsdcPayout: new anchor.BN(totalUSDC.toString()),
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
    const nodeIndex = bigRewardsInput.findIndex(
      (x) => x.address == setup.pool1.pool.toString()
    );

    const proofInputs = {
      ...bigRewardsInput[nodeIndex],
      index: nodeIndex,
      merkleTree: bigMerkleTree,
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
        rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        usdcTokenAccount: setup.usdcTokenAccount,
        poolUsdcVault: setup.pool1.poolUsdcVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc();
  });

  it("Create more RewardRecords after pool closure", async () => {
    await program.methods
      .closeOperatorPool()
      .accountsStrict({
        admin: setup.pool1.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool1.pool,
      })
      .signers([setup.pool1.adminKp])
      .rpc();

    const createRewardRecord = async (epoch: 5 | 6 | 7) => {
      // Use same reward values as epoch 2
      const merkleTree = MerkleUtils.constructMerkleTree(setup.rewardEpochs[2]);
      const merkleRoots = [Array.from(MerkleUtils.getTreeRoot(merkleTree))];
      let totalRewards = new anchor.BN(0);
      for (const addressInput of setup.rewardEpochs[2]) {
        totalRewards = totalRewards.add(
          new anchor.BN(addressInput.tokenAmount.toString())
        );
      }
      let totalUsdcAmount = new anchor.BN(0);
      for (const addressInput of setup.rewardEpochs[2]) {
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

      await handleMarkEpochAsFinalizing({ program, setup });
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
          rewardRecord: setup.rewardRecords[epoch],
          rewardTokenAccount: setup.rewardTokenAccount,
          usdcTokenAccount: setup.usdcTokenAccount,
          systemProgram: SystemProgram.programId,
        })
        .signers([setup.payerKp, setup.rewardDistributionAuthorityKp])
        .rpc();
    };

    await createRewardRecord(5);
    await createRewardRecord(6);
    await createRewardRecord(7);
  });

  it("Fail to accrue reward after pool closure", async () => {
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
        poolUsdcVault: setup.pool1.poolUsdcVault,
        poolOverview: setup.poolOverview,
        rewardRecord: setup.rewardRecords[5],
        operatorPool: setup.pool1.pool,
        operatorStakingRecord: setup.pool1.stakingRecord,
        rewardTokenAccount: setup.rewardTokenAccount,
        stakedTokenAccount: setup.pool1.stakedTokenAccount,
        rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
        usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
        usdcTokenAccount: setup.usdcTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .rpc();

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
          poolUsdcVault: setup.pool1.poolUsdcVault,
          poolOverview: setup.poolOverview,
          rewardRecord: setup.rewardRecords[6],
          operatorPool: setup.pool1.pool,
          operatorStakingRecord: setup.pool1.stakingRecord,
          rewardTokenAccount: setup.rewardTokenAccount,
          stakedTokenAccount: setup.pool1.stakedTokenAccount,
          rewardFeeTokenAccount: setup.pool1.rewardCommissionFeeTokenVault,
          usdcFeeTokenAccount: setup.pool1.usdcCommissionFeeTokenVault,
          usdcTokenAccount: setup.usdcTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        })
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "closedPool");
    }
  });

  it("Use emergency bypass to catch up pool2 to current epoch", async () => {
    // Verify pool2 starts at epoch 0
    let operatorPool = await program.account.operatorPool.fetch(
      setup.pool2.pool
    );

    assert.equal(operatorPool.rewardLastClaimedEpoch.toNumber(), 0);

    // Get the current completed reward epoch
    const poolOverview = await program.account.poolOverview.fetch(
      setup.poolOverview
    );
    const completedEpoch = poolOverview.completedRewardEpoch.toNumber();
    assert(completedEpoch >= 6, "Should have at least 6 completed epochs");

    // Use emergency bypass to bump pool2 from epoch 0 to epoch 5
    for (let epoch = 0; epoch < 5; epoch++) {
      await program.methods
        .accrueRewardEmergencyBypass()
        .accountsStrict({
          admin: setup.pool2.admin,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool2.pool,
          currentPoolRewardRecord:
            setup.rewardRecords[(epoch + 1) as 1 | 2 | 3 | 4 | 5 | 6],
          nextPoolRewardRecord:
            setup.rewardRecords[(epoch + 2) as 1 | 2 | 3 | 4 | 5 | 6],
        })
        .signers([setup.pool2.adminKp])
        .rpc();

      // Verify the epoch was incremented
      operatorPool = await program.account.operatorPool.fetch(setup.pool2.pool);
      assert.equal(
        operatorPool.rewardLastClaimedEpoch.toNumber(),
        epoch + 1,
        `Should have incremented to epoch ${epoch + 1}`
      );
    }

    // Verify pool2 is now at epoch 5
    assert.equal(operatorPool.rewardLastClaimedEpoch.toNumber(), 5);
  });

  it("Fail emergency bypass with wrong admin", async () => {
    try {
      await program.methods
        .accrueRewardEmergencyBypass()
        .accountsStrict({
          admin: setup.pool1.admin, // Wrong admin for pool2
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool2.pool,
          currentPoolRewardRecord: setup.rewardRecords[6],
          nextPoolRewardRecord: setup.rewardRecords[6], // Invalid - using same record
        })
        .signers([setup.pool1.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertError(error, "ConstraintHasOne");
    }
  });

  it("Fail emergency bypass with invalid epoch progression", async () => {
    try {
      // Try to skip ahead too far - from epoch 5 to epoch 3 (backwards)
      await program.methods
        .accrueRewardEmergencyBypass()
        .accountsStrict({
          admin: setup.pool2.admin,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool2.pool,
          currentPoolRewardRecord: setup.rewardRecords[3], // Wrong - should be epoch 6
          nextPoolRewardRecord: setup.rewardRecords[4],
        })
        .signers([setup.pool2.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "invalidEmergencyBypassEpoch");
    }
  });

  it("Fail emergency bypass when pool is already caught up", async () => {
    // First, use emergency bypass to catch pool2 up to epoch 6
    await program.methods
      .accrueRewardEmergencyBypass()
      .accountsStrict({
        admin: setup.pool2.admin,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool2.pool,
        currentPoolRewardRecord: setup.rewardRecords[6],
        nextPoolRewardRecord: setup.rewardRecords[7],
      })
      .signers([setup.pool2.adminKp])
      .rpc();

    // Verify pool2 is now at epoch 6
    const operatorPool = await program.account.operatorPool.fetch(
      setup.pool2.pool
    );
    assert.equal(operatorPool.rewardLastClaimedEpoch.toNumber(), 6);

    // Try to bypass again when already caught up
    try {
      await program.methods
        .accrueRewardEmergencyBypass()
        .accountsStrict({
          admin: setup.pool2.admin,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool2.pool,
          currentPoolRewardRecord: setup.rewardRecords[6], // Invalid - pool already claimed epoch 6
          nextPoolRewardRecord: setup.rewardRecords[6],
        })
        .signers([setup.pool2.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      // This will fail because pool's reward_last_claimed_epoch (6) + 1 != current_pool_reward_record.epoch (6)
      assertStakingProgramError(error, "invalidEmergencyBypassEpoch");
    }
  });

  it("Fail emergency bypass on halted pool", async () => {
    // Create pool3 and then halt it
    await program.methods
      .createOperatorPool({
        autoStakeFees: setup.pool3.autoStakeFees,
        rewardCommissionRateBps: setup.pool3.rewardCommissionRateBps,
        usdcCommissionRateBps: setup.pool3.usdcCommissionRateBps,
        allowDelegation,
        name: setup.pool3.name,
        description: setup.pool3.description,
        websiteUrl: setup.pool3.websiteUrl,
        avatarImageUrl: setup.pool3.avatarImageUrl,
        operatorAuthKeys: null,
      })
      .accountsStrict({
        payer: setup.payer,
        admin: setup.pool3.admin,
        operatorPool: setup.pool3.pool,
        stakingRecord: setup.pool3.stakingRecord,
        stakedTokenAccount: setup.pool3.stakedTokenAccount,
        rewardFeeTokenAccount: setup.pool3.rewardCommissionFeeTokenVault,
        poolOverview: setup.poolOverview,
        mint: setup.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        usdcFeeTokenAccount: setup.pool3.usdcCommissionFeeTokenVault,
        adminTokenAccount: setup.pool3.adminTokenAccount,
        registrationFeePayoutTokenAccount:
          setup.registrationFeePayoutTokenAccount,
        operatorUsdcVault: setup.sdk.poolDelegatorUsdcEarningsVaultPda(
          setup.pool3.pool
        ),
        usdcMint: setup.usdcTokenMint,
      })
      .signers([setup.payerKp, setup.pool3.adminKp])
      .rpc();

    // Set halt status on pool3
    await program.methods
      .setHaltStatus({ isHalted: true })
      .accountsStrict({
        authority: setup.haltingAuthority,
        poolOverview: setup.poolOverview,
        operatorPool: setup.pool3.pool,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .signers([setup.haltingAuthorityKp])
      .rpc();

    // Try emergency bypass on halted pool
    try {
      await program.methods
        .accrueRewardEmergencyBypass()
        .accountsStrict({
          admin: setup.pool3.admin,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool3.pool,
          currentPoolRewardRecord: setup.rewardRecords[1],
          nextPoolRewardRecord: setup.rewardRecords[2],
        })
        .signers([setup.pool3.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "operatorPoolHalted");
    }
  });

  it("Fail emergency bypass on closed pool", async () => {
    // Pool1 was closed earlier in the tests
    try {
      await program.methods
        .accrueRewardEmergencyBypass()
        .accountsStrict({
          admin: setup.pool1.admin,
          poolOverview: setup.poolOverview,
          operatorPool: setup.pool1.pool,
          currentPoolRewardRecord: setup.rewardRecords[5],
          nextPoolRewardRecord: setup.rewardRecords[6],
        })
        .signers([setup.pool1.adminKp])
        .rpc();
      assert(false);
    } catch (error) {
      assertStakingProgramError(error, "closedPool");
    }
  });
});
