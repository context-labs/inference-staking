import * as anchor from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";

import { InferenceStakingProgramSdk } from "@sdk/src";
import { limitConcurrency } from "@sdk/src/utils";

import {
  DELEGATOR_COUNT,
  OPERATOR_POOL_SIZE,
  PAYER_KEYPAIR,
  PROGRAM_ADMIN_KEYPAIR,
  REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR,
  HALTING_AUTHORITY_KEYPAIR,
  SLASHING_AUTHORITY_KEYPAIR,
  TOKEN_MINT_OWNER_KEYPAIR,
} from "@tests/lib/const";
import {
  airdrop,
  batchArray,
  confirmTransaction,
  createMintIfNotExists,
  debug,
  generateRewardsForEpoch,
  randomIntInRange,
  range,
  resetDatabaseState,
  shortId,
} from "@tests/lib/utils";

const { BN, getProvider } = anchor;

export type SetupTestResult = Awaited<ReturnType<typeof setupTests>>;

export type SetupPoolType = {
  name: string;
  description: string | null;
  websiteUrl: string | null;
  avatarImageUrl: string | null;
  admin: PublicKey;
  adminKp: Keypair;
  rewardCommissionFeeTokenVault: PublicKey;
  pool: PublicKey;
  stakedTokenAccount: PublicKey;
  stakingRecord: PublicKey;
  usdcCommissionFeeTokenVault: PublicKey;
  usdcTokenAccount: PublicKey;
  delegatorStakingRecord: PublicKey;
  autoStakeFees: boolean;
  rewardCommissionRateBps: number;
  usdcCommissionRateBps: number;
  adminTokenAccount: PublicKey;
  poolUsdcVault: PublicKey;
};

export const TEST_PROGRAM_ID = new PublicKey(
  "stkxmBvNyGRH6FWi4tjFtPpL9XmwnT9ZpqrQnUogvHG"
);

// int8Wz7gp4UtncS6pnCcvUjFjAspXG4yqv1AZV3M2Xi
const TEST_TOKEN_MINT_KEYPAIR = Keypair.fromSecretKey(
  new Uint8Array([
    101, 245, 18, 230, 236, 232, 156, 68, 239, 68, 94, 211, 20, 252, 37, 219,
    199, 171, 83, 129, 206, 5, 180, 141, 125, 105, 89, 132, 0, 93, 221, 255, 10,
    180, 177, 12, 183, 5, 46, 67, 225, 37, 68, 71, 221, 237, 247, 234, 118, 203,
    150, 34, 241, 195, 105, 206, 230, 233, 141, 58, 173, 240, 239, 89,
  ])
);

// usdEkK5GbzC22bd2gKMFpt6sY2YETm2eaCiu7bBheZV
const TEST_USDC_MINT_KEYPAIR = Keypair.fromSecretKey(
  new Uint8Array([
    179, 226, 235, 137, 212, 133, 83, 227, 197, 150, 39, 172, 72, 134, 146, 231,
    220, 198, 81, 152, 12, 117, 216, 195, 20, 82, 251, 130, 193, 30, 63, 168,
    13, 139, 113, 149, 149, 88, 251, 227, 190, 32, 230, 211, 250, 20, 69, 65,
    50, 215, 194, 71, 128, 3, 170, 71, 107, 32, 162, 208, 118, 28, 240, 48,
  ])
);

export async function setupTests() {
  await resetDatabaseState();

  debug(
    `- Running test setup for ${OPERATOR_POOL_SIZE} operator pools and ${DELEGATOR_COUNT} delegators`
  );

  const payerKp = PAYER_KEYPAIR ?? new Keypair();
  const registrationFeePayoutWalletKp = new Keypair();
  const signerKp = new Keypair();
  const tokenHolderKp = TOKEN_MINT_OWNER_KEYPAIR ?? new Keypair();
  const poolOverviewAdminKp = PROGRAM_ADMIN_KEYPAIR ?? new Keypair();
  const rewardDistributionAuthorityKp =
    REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR ?? new Keypair();
  const haltingAuthorityKp = HALTING_AUTHORITY_KEYPAIR ?? new Keypair();
  const slashingAuthorityKp = SLASHING_AUTHORITY_KEYPAIR ?? new Keypair();
  const admin1Kp = new Keypair();
  const admin2Kp = new Keypair();
  const admin3Kp = new Keypair();
  const admin4Kp = new Keypair();
  const admin5Kp = new Keypair();
  const admin6Kp = new Keypair();
  const delegator1Kp = new Keypair();
  const delegator2Kp = new Keypair();
  const delegator3Kp = new Keypair();
  const delegator4Kp = new Keypair();
  const delegator5Kp = new Keypair();
  const delegator6Kp = new Keypair();
  const delegatorKeypairs = range(DELEGATOR_COUNT).map(() => new Keypair());

  const provider = getProvider();
  const sdk = new InferenceStakingProgramSdk({
    provider: anchor.AnchorProvider.env(),
    programId: TEST_PROGRAM_ID,
  });

  await Promise.all(
    [
      payerKp,
      signerKp,
      admin1Kp,
      admin2Kp,
      admin3Kp,
      admin4Kp,
      admin5Kp,
      admin6Kp,
      delegator1Kp,
      delegator2Kp,
      delegator3Kp,
      delegator4Kp,
      delegator5Kp,
    ].map((recipient) => airdrop(provider, recipient))
  );

  debug(`- Airdropping SOL to ${delegatorKeypairs.length} delegators`);

  for (const batch of batchArray(delegatorKeypairs, 10)) {
    await Promise.all(batch.map((recipient) => airdrop(provider, recipient)));
  }

  const tokenMint = await createMintIfNotExists(
    provider.connection,
    payerKp,
    tokenHolderKp.publicKey,
    tokenHolderKp.publicKey,
    9,
    TEST_TOKEN_MINT_KEYPAIR
  );

  const createAndMintToAta = async (user: Keypair, tokenMint: PublicKey) => {
    const ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payerKp,
      tokenMint,
      user.publicKey
    );
    return mintTo(
      provider.connection,
      payerKp,
      tokenMint,
      ata.address,
      tokenHolderKp,
      10 ** 10
    );
  };

  const txs2 = await Promise.all([
    createAndMintToAta(signerKp, tokenMint),
    createAndMintToAta(admin1Kp, tokenMint),
    createAndMintToAta(admin2Kp, tokenMint),
    createAndMintToAta(admin3Kp, tokenMint),
    createAndMintToAta(admin4Kp, tokenMint),
    createAndMintToAta(admin5Kp, tokenMint),
    createAndMintToAta(delegator1Kp, tokenMint),
    createAndMintToAta(delegator2Kp, tokenMint),
    createAndMintToAta(delegator3Kp, tokenMint),
  ]);
  await Promise.all(
    txs2.map((txn) => confirmTransaction(provider.connection, txn))
  );

  const usdcTokenMint = await createMintIfNotExists(
    provider.connection,
    payerKp,
    tokenHolderKp.publicKey,
    tokenHolderKp.publicKey,
    6,
    TEST_USDC_MINT_KEYPAIR
  );

  await confirmTransaction(
    provider.connection,
    await createAndMintToAta(payerKp, usdcTokenMint)
  );

  const invalidUsdcTokenMint = await createMintIfNotExists(
    provider.connection,
    payerKp,
    tokenHolderKp.publicKey,
    tokenHolderKp.publicKey,
    6,
    Keypair.generate()
  );

  await confirmTransaction(
    provider.connection,
    await createAndMintToAta(payerKp, invalidUsdcTokenMint)
  );

  const poolOverview = sdk.poolOverviewPda();
  const rewardTokenAccount = sdk.globalTokenRewardVaultPda();
  const usdcTokenAccount = sdk.globalUsdcEarningsVaultPda();
  const operatorPool1 = sdk.operatorPoolPda(admin1Kp.publicKey);
  const operatorPool2 = sdk.operatorPoolPda(admin2Kp.publicKey);
  const operatorPool3 = sdk.operatorPoolPda(admin3Kp.publicKey);
  const operatorPool4 = sdk.operatorPoolPda(admin4Kp.publicKey);
  const operatorPool5 = sdk.operatorPoolPda(admin5Kp.publicKey);
  const operatorPool6 = sdk.operatorPoolPda(admin6Kp.publicKey);

  const getPoolSetup = async ({
    adminKeypair,
    operatorPool,
    delegatorKeypair,
  }: {
    adminKeypair: Keypair;
    operatorPool: PublicKey;
    delegatorKeypair: Keypair;
  }): Promise<SetupPoolType> => {
    try {
      const adminUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payerKp,
        usdcTokenMint,
        adminKeypair.publicKey
      );
      const adminTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payerKp,
        tokenMint,
        adminKeypair.publicKey
      );
      const rewardFeeTokenAccount =
        sdk.poolRewardCommissionTokenVaultPda(operatorPool);
      const usdcCommissionFeeTokenVault =
        sdk.poolUsdcCommissionTokenVaultPda(operatorPool);
      const stakedTokenAccount = sdk.poolStakedTokenVaultPda(operatorPool);
      const stakingRecord = sdk.stakingRecordPda(
        operatorPool,
        adminKeypair.publicKey
      );
      const poolUsdcVault = sdk.poolDelegatorUsdcEarningsVaultPda(operatorPool);
      return {
        name: `Test Operator ${shortId()}`,
        description: `Test Description ${shortId()}`,
        websiteUrl: `https://test.com/${shortId()}`,
        avatarImageUrl: null,
        admin: adminKeypair.publicKey,
        adminKp: adminKeypair,
        rewardCommissionFeeTokenVault: rewardFeeTokenAccount,
        pool: operatorPool,
        stakedTokenAccount,
        stakingRecord,
        usdcCommissionFeeTokenVault,
        usdcTokenAccount: adminUsdcTokenAccount.address,
        delegatorStakingRecord: sdk.stakingRecordPda(
          operatorPool,
          delegatorKeypair.publicKey
        ),
        autoStakeFees: false,
        rewardCommissionRateBps: randomIntInRange(0, 100) * 100,
        usdcCommissionRateBps: randomIntInRange(0, 100) * 100,
        adminTokenAccount: adminTokenAccount.address,
        poolUsdcVault,
      };
    } catch (err) {
      console.log(`Error getting pool setup for ${operatorPool.toBase58()}`);
      console.error(err);
      throw err;
    }
  };

  const [pool1, pool2, pool3, pool4, pool5, pool6] = await Promise.all([
    getPoolSetup({
      operatorPool: operatorPool1,
      adminKeypair: admin1Kp,
      delegatorKeypair: delegator1Kp,
    }),
    getPoolSetup({
      operatorPool: operatorPool2,
      adminKeypair: admin2Kp,
      delegatorKeypair: delegator2Kp,
    }),
    getPoolSetup({
      operatorPool: operatorPool3,
      adminKeypair: admin3Kp,
      delegatorKeypair: delegator3Kp,
    }),
    getPoolSetup({
      operatorPool: operatorPool4,
      adminKeypair: admin4Kp,
      delegatorKeypair: delegator4Kp,
    }),
    getPoolSetup({
      operatorPool: operatorPool5,
      adminKeypair: admin5Kp,
      delegatorKeypair: delegator5Kp,
    }),
    getPoolSetup({
      operatorPool: operatorPool6,
      adminKeypair: admin6Kp,
      delegatorKeypair: delegator6Kp,
    }),
  ]);

  const pools = await limitConcurrency(
    range(OPERATOR_POOL_SIZE),
    async () => {
      const adminKeypair = Keypair.generate();
      const operatorPool = sdk.operatorPoolPda(adminKeypair.publicKey);
      return getPoolSetup({
        operatorPool,
        adminKeypair,
        delegatorKeypair: Keypair.generate(),
      });
    },
    10
  );

  const rewardRecords = {
    1: sdk.rewardRecordPda(new BN(1)),
    2: sdk.rewardRecordPda(new BN(2)),
    3: sdk.rewardRecordPda(new BN(3)),
    4: sdk.rewardRecordPda(new BN(4)),
    5: sdk.rewardRecordPda(new BN(5)),
    6: sdk.rewardRecordPda(new BN(6)),
    7: sdk.rewardRecordPda(new BN(7)),
  };

  const fixedPoolIds = [
    operatorPool1,
    operatorPool2,
    operatorPool3,
    operatorPool4,
  ];

  const rewardEpochs = {
    2: generateRewardsForEpoch(fixedPoolIds, 2),
    3: generateRewardsForEpoch(fixedPoolIds, 3),
  };

  const registrationFeePayoutTokenAccount =
    await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payerKp,
      tokenMint,
      registrationFeePayoutWalletKp.publicKey
    );

  debug(`- Test setup complete\n`);

  return {
    sdk,
    payerKp,
    payer: payerKp.publicKey,
    poolOverviewAdminKp,
    poolOverviewAdmin: poolOverviewAdminKp.publicKey,
    registrationFeePayoutWalletKp,
    registrationFeePayoutWallet: registrationFeePayoutWalletKp.publicKey,
    registrationFeePayoutTokenAccount:
      registrationFeePayoutTokenAccount.address,
    rewardDistributionAuthorityKp,
    rewardDistributionAuthority: rewardDistributionAuthorityKp.publicKey,
    haltingAuthorityKp,
    haltingAuthority: haltingAuthorityKp.publicKey,
    slashingAuthorityKp,
    slashingAuthority: slashingAuthorityKp.publicKey,
    tokenHolderKp,
    tokenHolder: tokenHolderKp.publicKey,
    signerKp: signerKp,
    signer: signerKp.publicKey,
    provider,
    delegator1Kp: delegator1Kp,
    delegator1: delegator1Kp.publicKey,
    delegator2Kp: delegator2Kp,
    delegator2: delegator2Kp.publicKey,
    delegator3Kp: delegator3Kp,
    delegator3: delegator3Kp.publicKey,
    delegatorKeypairs,
    tokenMint,
    poolOverview,
    pool1,
    pool2,
    pool3,
    pool4,
    pool5,
    pool6,
    pools,
    rewardTokenAccount,
    rewardRecords,
    rewardEpochs,
    usdcTokenMint,
    usdcTokenAccount,
    invalidUsdcTokenMint,
  };
}
