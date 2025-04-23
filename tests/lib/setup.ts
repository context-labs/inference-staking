import * as anchor from "@coral-xyz/anchor";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { InferenceStakingProgramSDK } from "@sdk/src";

import { confirmTransaction } from "@tests/lib/utils";

const { BN, getProvider } = anchor;

export type SetupTestResult = Awaited<ReturnType<typeof setupTests>>;

const TEST_PROGRAM_ID = new PublicKey(
  "5dBQfWVYj4izDGuZkvceHVNudoJoccX9SUkgRDEv9eoj"
);

const USDC_MINT_KEYPAIR = Keypair.fromSecretKey(
  new Uint8Array([
    179, 226, 235, 137, 212, 133, 83, 227, 197, 150, 39, 172, 72, 134, 146, 231,
    220, 198, 81, 152, 12, 117, 216, 195, 20, 82, 251, 130, 193, 30, 63, 168,
    13, 139, 113, 149, 149, 88, 251, 227, 190, 32, 230, 211, 250, 20, 69, 65,
    50, 215, 194, 71, 128, 3, 170, 71, 107, 32, 162, 208, 118, 28, 240, 48,
  ])
);

export async function setupTests() {
  const payerKp = new Keypair();
  const poolOverviewAdminKp = new Keypair();
  const signer1Kp = new Keypair();
  const signer2Kp = new Keypair();
  const signer3Kp = new Keypair();
  const user1Kp = new Keypair();
  const user2Kp = new Keypair();
  const user3Kp = new Keypair();
  const haltAuthority1Kp = new Keypair();

  const provider = getProvider();
  const sdk = new InferenceStakingProgramSDK({
    provider: anchor.AnchorProvider.env(),
    programId: TEST_PROGRAM_ID,
  });

  const txs = await Promise.all([
    provider.connection.requestAirdrop(payerKp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer3Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user3Kp.publicKey, LAMPORTS_PER_SOL),
  ]);

  await Promise.all(
    txs.map((signature) => confirmTransaction(provider.connection, signature))
  );

  const tokenMint = await createMint(
    provider.connection,
    payerKp,
    signer1Kp.publicKey,
    signer1Kp.publicKey,
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
      signer1Kp,
      10 ** 10
    );
  };

  const txns2 = await Promise.all([
    createAndMintToAta(signer1Kp, tokenMint),
    createAndMintToAta(signer2Kp, tokenMint),
    createAndMintToAta(signer3Kp, tokenMint),
    createAndMintToAta(user1Kp, tokenMint),
    createAndMintToAta(user2Kp, tokenMint),
    createAndMintToAta(user3Kp, tokenMint),
  ]);
  await Promise.all(
    txns2.map((txn) => confirmTransaction(provider.connection, txn))
  );

  const usdcTokenMint = await createMint(
    provider.connection,
    payerKp,
    signer1Kp.publicKey,
    signer1Kp.publicKey,
    9,
    USDC_MINT_KEYPAIR
  );

  await confirmTransaction(
    provider.connection,
    await createAndMintToAta(payerKp, usdcTokenMint)
  );

  const poolOverview = sdk.poolOverviewPda();
  const rewardTokenAccount = sdk.rewardTokenPda();
  const usdcTokenAccount = sdk.usdcTokenPda();
  const operatorPool1 = sdk.operatorPoolPda(new BN(1));
  const operatorPool2 = sdk.operatorPoolPda(new BN(2));
  const operatorPool3 = sdk.operatorPoolPda(new BN(3));
  const operatorPool4 = sdk.operatorPoolPda(new BN(4));

  const signer1UsdcTokenAccount = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    payerKp,
    usdcTokenMint,
    signer1Kp.publicKey
  );

  const pool1 = {
    pool: operatorPool1,
    stakedTokenAccount: sdk.stakedTokenPda(operatorPool1),
    feeTokenAccount: sdk.feeTokenPda(operatorPool1),
    signer1Record: sdk.stakingRecordPda(operatorPool1, signer1Kp.publicKey),
    user1Record: sdk.stakingRecordPda(operatorPool1, user1Kp.publicKey),
    usdcTokenAccount: signer1UsdcTokenAccount.address,
  };
  const pool2 = {
    pool: operatorPool2,
    stakedTokenAccount: sdk.stakedTokenPda(operatorPool2),
    feeTokenAccount: sdk.feeTokenPda(operatorPool2),
    signer1Record: sdk.stakingRecordPda(operatorPool2, signer1Kp.publicKey),
    usdcTokenAccount: signer1UsdcTokenAccount.address,
  };
  const pool3 = {
    pool: operatorPool3,
  };
  const pool4 = {
    pool: operatorPool4,
  };

  const rewardRecords = {
    1: sdk.rewardRecordPda(new BN(1)),
    2: sdk.rewardRecordPda(new BN(2)),
    3: sdk.rewardRecordPda(new BN(3)),
    4: sdk.rewardRecordPda(new BN(4)),
    5: sdk.rewardRecordPda(new BN(5)),
  };

  const rewardEpochs = {
    2: [
      {
        address: operatorPool1.toString(),
        amount: 100n,
        usdcAmount: 0n,
      },
      {
        address: operatorPool2.toString(),
        amount: 200n,
        usdcAmount: 0n,
      },
      {
        address: operatorPool3.toString(),
        amount: 300n,
        usdcAmount: 0n,
      },
      {
        address: operatorPool4.toString(),
        amount: 400n,
        usdcAmount: 0n,
      },
    ].sort((a, b) => a.address.localeCompare(b.address)),
  };

  return {
    sdk,
    payerKp,
    payer: payerKp.publicKey,
    poolOverviewAdminKp,
    signer1Kp,
    signer1: signer1Kp.publicKey,
    signer2Kp,
    signer2: signer2Kp.publicKey,
    signer3Kp,
    signer3: signer3Kp.publicKey,
    haltAuthority1Kp,
    provider,
    user1Kp,
    user1: user1Kp.publicKey,
    user2Kp,
    user2: user2Kp.publicKey,
    user3Kp,
    user3: user3Kp.publicKey,
    tokenMint,
    poolOverview,
    pool1,
    pool2,
    pool3,
    pool4,
    rewardTokenAccount,
    rewardRecords,
    rewardEpochs,
    usdcTokenMint,
    usdcTokenAccount,
  };
}
