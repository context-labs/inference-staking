import * as anchor from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const { BN, getProvider } = anchor;

export const INF_STAKING = new PublicKey(
  "7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb"
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

  // Airdrop SOL to all users
  const txns = await Promise.all([
    provider.connection.requestAirdrop(payerKp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(signer3Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user1Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user2Kp.publicKey, LAMPORTS_PER_SOL),
    provider.connection.requestAirdrop(user3Kp.publicKey, LAMPORTS_PER_SOL),
  ]);

  await Promise.all(
    txns.map((txn) => provider.connection.confirmTransaction(txn, "finalized"))
  );

  const tokenMint = await createMint(
    provider.connection,
    payerKp,
    signer1Kp.publicKey,
    signer1Kp.publicKey,
    9
  );

  // Mint tokens to all users
  const createAndMintToAta = async (user: Keypair) => {
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
    createAndMintToAta(signer1Kp),
    createAndMintToAta(signer2Kp),
    createAndMintToAta(signer3Kp),
    createAndMintToAta(user1Kp),
    createAndMintToAta(user2Kp),
    createAndMintToAta(user3Kp),
  ]);
  await Promise.all(
    txns2.map((txn) => provider.connection.confirmTransaction(txn, "finalized"))
  );

  const [poolOverview] = PublicKey.findProgramAddressSync(
    [Buffer.from("PoolOverview")],
    INF_STAKING
  );
  const [rewardTokenAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("RewardToken")],
    INF_STAKING
  );
  const [operatorPool1] = PublicKey.findProgramAddressSync(
    [new BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("OperatorPool")],
    INF_STAKING
  );
  const [operatorPool2] = PublicKey.findProgramAddressSync(
    [new BN(2).toArrayLike(Buffer, "le", 8), Buffer.from("OperatorPool")],
    INF_STAKING
  );
  const [operatorPool3] = PublicKey.findProgramAddressSync(
    [new BN(3).toArrayLike(Buffer, "le", 8), Buffer.from("OperatorPool")],
    INF_STAKING
  );
  const [operatorPool4] = PublicKey.findProgramAddressSync(
    [new BN(4).toArrayLike(Buffer, "le", 8), Buffer.from("OperatorPool")],
    INF_STAKING
  );
  const pool1 = {
    pool: operatorPool1,
    stakedTokenAccount: PublicKey.findProgramAddressSync(
      [operatorPool1.toBuffer(), Buffer.from("StakedToken")],
      INF_STAKING
    )[0],
    feeTokenAccount: PublicKey.findProgramAddressSync(
      [operatorPool1.toBuffer(), Buffer.from("FeeToken")],
      INF_STAKING
    )[0],
    signer1Record: PublicKey.findProgramAddressSync(
      [
        operatorPool1.toBuffer(),
        signer1Kp.publicKey.toBuffer(),
        Buffer.from("StakingRecord"),
      ],
      INF_STAKING
    )[0],
    user1Record: PublicKey.findProgramAddressSync(
      [
        operatorPool1.toBuffer(),
        user1Kp.publicKey.toBuffer(),
        Buffer.from("StakingRecord"),
      ],
      INF_STAKING
    )[0],
  };
  const pool2 = {
    pool: operatorPool2,
    stakedTokenAccount: PublicKey.findProgramAddressSync(
      [operatorPool2.toBuffer(), Buffer.from("StakedToken")],
      INF_STAKING
    )[0],
    feeTokenAccount: PublicKey.findProgramAddressSync(
      [operatorPool2.toBuffer(), Buffer.from("FeeToken")],
      INF_STAKING
    )[0],
    signer1Record: PublicKey.findProgramAddressSync(
      [
        operatorPool2.toBuffer(),
        signer1Kp.publicKey.toBuffer(),
        Buffer.from("StakingRecord"),
      ],
      INF_STAKING
    )[0],
  };
  const pool3 = {
    pool: operatorPool3,
  };
  const pool4 = {
    pool: operatorPool4,
  };

  const rewardRecords = {
    1: PublicKey.findProgramAddressSync(
      [new BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("RewardRecord")],
      INF_STAKING
    )[0],
    2: PublicKey.findProgramAddressSync(
      [new BN(2).toArrayLike(Buffer, "le", 8), Buffer.from("RewardRecord")],
      INF_STAKING
    )[0],
    3: PublicKey.findProgramAddressSync(
      [new BN(3).toArrayLike(Buffer, "le", 8), Buffer.from("RewardRecord")],
      INF_STAKING
    )[0],
    4: PublicKey.findProgramAddressSync(
      [new BN(4).toArrayLike(Buffer, "le", 8), Buffer.from("RewardRecord")],
      INF_STAKING
    )[0],
  };

  const rewardEpochs = {
    2: [
      {
        address: operatorPool1.toString(),
        amount: 100,
      },
      {
        address: operatorPool2.toString(),
        amount: 200,
      },
      {
        address: operatorPool3.toString(),
        amount: 300,
      },
      {
        address: operatorPool4.toString(),
        amount: 400,
      },
    ].sort((a, b) => a.address.localeCompare(b.address)),
  };

  return {
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
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
