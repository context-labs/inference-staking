import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";

import { InferenceStakingProgramSdk } from "@sdk/src";

import { DELEGATOR_COUNT, OPERATOR_POOL_SIZE } from "@tests/lib/const";
import {
  airdrop,
  batchArray,
  confirmTransaction,
  generateRewardsForEpoch,
  range,
  shortId,
} from "@tests/lib/utils";

const { BN, getProvider } = anchor;

export type SetupTestResult = Awaited<ReturnType<typeof setupTests>>;

type SetupPoolType = {
  name: string;
  description: string;
  websiteUrl: string;
  avatarImageUrl: string;
  admin: PublicKey;
  adminKp: Keypair;
  feeTokenAccount: PublicKey;
  pool: PublicKey;
  stakedTokenAccount: PublicKey;
  stakingRecord: PublicKey;
  usdcTokenAccount: PublicKey;
  delegatorStakingRecord: PublicKey;
};

export const TEST_PROGRAM_ID = new PublicKey(
  "dinfV1dqxfSJYCRV2QY4yREdgcdoEkzynZXZs6kxeSm"
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
  const payerKp = new Keypair();
  const signerKp = new Keypair();
  const tokenHolderKp = new Keypair();
  const poolOverviewAdminKp = new Keypair();
  const rewardDistributionAuthorityKp = new Keypair();
  const haltingAuthorityKp = new Keypair();
  const slashingAuthorityKp = new Keypair();
  const admin1Kp = new Keypair();
  const admin2Kp = new Keypair();
  const admin3Kp = new Keypair();
  const admin4Kp = new Keypair();
  const admin5Kp = new Keypair();
  const delegator1Kp = new Keypair();
  const delegator2Kp = new Keypair();
  const delegator3Kp = new Keypair();
  const delegator4Kp = new Keypair();
  const delegator5Kp = new Keypair();
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
      delegator1Kp,
      delegator2Kp,
      delegator3Kp,
      delegator4Kp,
      delegator5Kp,
    ].map((recipient) => airdrop(provider, recipient))
  );

  for (const batch of batchArray(delegatorKeypairs, 10)) {
    await Promise.all(batch.map((recipient) => airdrop(provider, recipient)));
  }

  const tokenMint = await createMint(
    provider.connection,
    payerKp,
    tokenHolderKp.publicKey,
    tokenHolderKp.publicKey,
    9
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

  const usdcTokenMint = await createMint(
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

  const invalidUsdcTokenMint = await createMint(
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
  const rewardTokenAccount = sdk.rewardTokenPda();
  const usdcTokenAccount = sdk.usdcTokenPda();
  const operatorPool1 = sdk.operatorPoolPda(new BN(1));
  const operatorPool2 = sdk.operatorPoolPda(new BN(2));
  const operatorPool3 = sdk.operatorPoolPda(new BN(3));
  const operatorPool4 = sdk.operatorPoolPda(new BN(4));
  const operatorPool5 = sdk.operatorPoolPda(new BN(5));

  const getPoolSetup = async ({
    adminKeypair,
    operatorPool,
    delegatorKeypair,
  }: {
    adminKeypair: Keypair;
    operatorPool: PublicKey;
    delegatorKeypair: Keypair;
  }): Promise<SetupPoolType> => {
    const adminUsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payerKp,
      usdcTokenMint,
      adminKeypair.publicKey
    );
    return {
      name: `Test Operator ${shortId()}`,
      description: `Test Description ${shortId()}`,
      websiteUrl: `https://test.com/${shortId()}`,
      avatarImageUrl: `https://test.com/${shortId()}`,
      admin: adminKeypair.publicKey,
      adminKp: adminKeypair,
      feeTokenAccount: sdk.feeTokenPda(operatorPool),
      pool: operatorPool,
      stakedTokenAccount: sdk.stakedTokenPda(operatorPool),
      stakingRecord: sdk.stakingRecordPda(operatorPool, adminKeypair.publicKey),
      usdcTokenAccount: adminUsdcTokenAccount.address,
      delegatorStakingRecord: sdk.stakingRecordPda(
        operatorPool,
        delegatorKeypair.publicKey
      ),
    };
  };

  const [pool1, pool2, pool3, pool4, pool5] = await Promise.all([
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
  ]);

  const poolIds = range(OPERATOR_POOL_SIZE).map((i) =>
    sdk.operatorPoolPda(new BN(i + 1))
  );
  const pools = await Promise.all(
    poolIds.map(async (poolId) => {
      return getPoolSetup({
        operatorPool: poolId,
        adminKeypair: Keypair.generate(),
        delegatorKeypair: Keypair.generate(),
      });
    })
  );

  const rewardRecords = {
    1: sdk.rewardRecordPda(new BN(1)),
    2: sdk.rewardRecordPda(new BN(2)),
    3: sdk.rewardRecordPda(new BN(3)),
    4: sdk.rewardRecordPda(new BN(4)),
    5: sdk.rewardRecordPda(new BN(5)),
  };

  const fixedPoolIds = [
    operatorPool1,
    operatorPool2,
    operatorPool3,
    operatorPool4,
  ];

  const rewardEpochs = {
    2: generateRewardsForEpoch(fixedPoolIds),
    3: generateRewardsForEpoch(fixedPoolIds),
  };

  return {
    sdk,
    payerKp,
    payer: payerKp.publicKey,
    poolOverviewAdminKp,
    poolOverviewAdmin: poolOverviewAdminKp.publicKey,
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
    pools,
    rewardTokenAccount,
    rewardRecords,
    rewardEpochs,
    usdcTokenMint,
    usdcTokenAccount,
    invalidUsdcTokenMint,
  };
}
