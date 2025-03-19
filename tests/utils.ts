import { BN, getProvider } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const INF_STAKING = new PublicKey(
  "7NuTZJFDezrh8n73HxY22gvPrXnGeRqDAoFDnXHnMjQb"
);

export const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
};

export async function setupTests() {
  const payerKp = new Keypair();
  const signer1Kp = new Keypair();
  const signer2Kp = new Keypair();
  const signer3Kp = new Keypair();
  const user1Kp = new Keypair();
  const user2Kp = new Keypair();
  const user3Kp = new Keypair();
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

  const rewardRecords = {
    1: PublicKey.findProgramAddressSync(
      [new BN(1).toArrayLike(Buffer, "le", 8), Buffer.from("RewardRecord")],
      INF_STAKING
    )[0],
    2: PublicKey.findProgramAddressSync(
      [new BN(2).toArrayLike(Buffer, "le", 8), Buffer.from("RewardRecord")],
      INF_STAKING
    )[0],
  };

  const epoch1Addresses = [
    operatorPool1.toString(),
    operatorPool2.toString(),
    operatorPool3.toString(),
    operatorPool4.toString(),
  ];
  const epoch1Amounts = [100, 200, 300, 400];
  const rewardEpochs = {
    1: {
      addresses: epoch1Addresses,
      amounts: epoch1Amounts,
    },
  };

  return {
    payerKp,
    payer: payerKp.publicKey,
    signer1Kp,
    signer1: signer1Kp.publicKey,
    signer2Kp,
    signer2: signer2Kp.publicKey,
    signer3Kp,
    signer3: signer3Kp.publicKey,
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
    rewardTokenAccount,
    rewardRecords,
    rewardEpochs,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
