import type { AnchorProvider } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Program, AnchorError, BorshCoder } from "@coral-xyz/anchor";
import type { AccountMeta, VersionedTransaction } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import type { InferenceStaking } from "./idl";
import { getIdlWithProgramId, IDL } from "./idl";
import type {
  InferenceStakingErrors,
  DecodedAirdropProgramInstruction,
  InferenceStakingInstructions,
  InstructionArgsMap,
  InstructionAccountsMap,
  OperatorPoolAccountStruct,
  PoolOverviewAccountStruct,
  RewardRecordAccountStruct,
  StakingRecordAccountStruct,
} from "./types";
import type { SolanaEnvironment } from "./utils";
import { getProgramIdFromEnvironment, capitalize, toCamelCase } from "./utils";

export class InferenceStakingProgramSDK {
  program: Program<InferenceStaking>;

  constructor(args: {
    provider: AnchorProvider;
    environment: SolanaEnvironment;
  }) {
    const { provider, environment } = args;
    const programId = getProgramIdFromEnvironment(environment);
    const idl = getIdlWithProgramId(programId);
    this.program = new Program<InferenceStaking>(idl, provider);
  }

  poolOverviewPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("PoolOverview", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  operatorPoolPda(operatorPoolId: BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        operatorPoolId.toArrayLike(Buffer, "le", 8),
        Buffer.from("OperatorPool", "utf-8"),
      ],
      this.program.programId
    );
    return pda;
  }

  stakingRecordPda(operatorPoolPda: PublicKey, owner: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        operatorPoolPda.toBuffer(),
        owner.toBuffer(),
        Buffer.from("StakingRecord", "utf-8"),
      ],
      this.program.programId
    );
    return pda;
  }

  stakedTokenPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [operatorPoolPda.toBuffer(), Buffer.from("StakedToken", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  feeTokenPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [operatorPoolPda.toBuffer(), Buffer.from("FeeToken", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  rewardRecordPda(epoch: BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        epoch.toArrayLike(Buffer, "le", 8),
        Buffer.from("RewardRecord", "utf-8"),
      ],
      this.program.programId
    );
    return pda;
  }

  rewardTokenPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("RewardToken", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  async fetchPoolOverview(): Promise<PoolOverviewAccountStruct> {
    const poolOverviewPda = this.poolOverviewPda();
    return this.program.account.poolOverview.fetch(poolOverviewPda);
  }

  async fetchOperatorPool(
    operatorPoolId: BN
  ): Promise<OperatorPoolAccountStruct> {
    const operatorPoolPda = this.operatorPoolPda(operatorPoolId);
    return this.program.account.operatorPool.fetch(operatorPoolPda);
  }

  async fetchOperatorPoolByAddress(
    operatorPoolAddress: PublicKey
  ): Promise<OperatorPoolAccountStruct> {
    return this.program.account.operatorPool.fetch(operatorPoolAddress);
  }

  async fetchStakingRecord(
    operatorPoolPda: PublicKey,
    owner: PublicKey
  ): Promise<StakingRecordAccountStruct> {
    const stakingRecordPda = this.stakingRecordPda(operatorPoolPda, owner);
    return this.program.account.stakingRecord.fetch(stakingRecordPda);
  }

  async fetchOperatorStakingRecord(
    operatorPoolPda: PublicKey
  ): Promise<StakingRecordAccountStruct> {
    const operatorPool = await this.fetchOperatorPoolByAddress(operatorPoolPda);
    return this.program.account.stakingRecord.fetch(
      operatorPool.operatorStakingRecord
    );
  }

  async fetchRewardRecord(epoch: BN): Promise<RewardRecordAccountStruct> {
    const rewardRecordPda = this.rewardRecordPda(epoch);
    return this.program.account.rewardRecord.fetch(rewardRecordPda);
  }

  async fetchAllOperatorPools(): Promise<
    { publicKey: PublicKey; account: OperatorPoolAccountStruct }[]
  > {
    return this.program.account.operatorPool.all();
  }

  async fetchAllStakingRecordsForOwner(
    owner: PublicKey
  ): Promise<{ publicKey: PublicKey; account: StakingRecordAccountStruct }[]> {
    return this.program.account.stakingRecord.all([
      {
        memcmp: {
          offset: 8,
          bytes: owner.toBase58(),
        },
      },
    ]);
  }

  async fetchAllStakingRecordsForPool(
    operatorPoolPda: PublicKey
  ): Promise<{ publicKey: PublicKey; account: StakingRecordAccountStruct }[]> {
    return this.program.account.stakingRecord.all([
      {
        memcmp: {
          offset: 8 + 32,
          bytes: operatorPoolPda.toBase58(),
        },
      },
    ]);
  }

  async fetchAllRewardRecords(): Promise<
    { publicKey: PublicKey; account: RewardRecordAccountStruct }[]
  > {
    return this.program.account.rewardRecord.all();
  }

  async fetchRewardRecordForEpoch(
    epoch: BN
  ): Promise<RewardRecordAccountStruct> {
    const rewardRecordPda = this.rewardRecordPda(epoch);
    return this.program.account.rewardRecord.fetch(rewardRecordPda);
  }

  async fetchLatestRewardRecord(): Promise<RewardRecordAccountStruct> {
    const poolOverview = await this.fetchPoolOverview();
    const latestEpoch = poolOverview.completedRewardEpoch;
    return this.fetchRewardRecordForEpoch(latestEpoch);
  }

  async hasStakingRecord(
    operatorPoolPda: PublicKey,
    owner: PublicKey
  ): Promise<boolean> {
    try {
      const stakingRecordPda = this.stakingRecordPda(operatorPoolPda, owner);
      await this.program.account.stakingRecord.fetch(stakingRecordPda);
      return true;
    } catch {
      return false;
    }
  }

  async fetchStakedTokenAccountBalance(
    operatorPoolPda: PublicKey
  ): Promise<BN> {
    const stakedTokenPda = this.stakedTokenPda(operatorPoolPda);
    const tokenAccountInfo =
      await this.program.provider.connection.getTokenAccountBalance(
        stakedTokenPda
      );
    return new BN(tokenAccountInfo.value.amount);
  }

  async fetchFeeTokenAccountBalance(operatorPoolPda: PublicKey): Promise<BN> {
    const feeTokenPda = this.feeTokenPda(operatorPoolPda);
    const tokenAccountInfo =
      await this.program.provider.connection.getTokenAccountBalance(
        feeTokenPda
      );
    return new BN(tokenAccountInfo.value.amount);
  }

  async fetchRewardTokenAccountBalance(): Promise<BN> {
    const rewardTokenPda = this.rewardTokenPda();
    const tokenAccountInfo =
      await this.program.provider.connection.getTokenAccountBalance(
        rewardTokenPda
      );
    return new BN(tokenAccountInfo.value.amount);
  }

  static getErrorNameFromTransactionLogs(
    logs: string[]
  ): InferenceStakingErrors | undefined {
    for (const log of logs) {
      const errorName = IDL.errors.find(
        (e) =>
          log.includes(e.msg) &&
          log.includes(capitalize(e.name)) &&
          log.includes(e.code.toString())
      );
      if (errorName) {
        return errorName.name;
      }
    }
  }

  static getErrorNameFromTransactionError(
    error: unknown
  ): InferenceStakingErrors | undefined {
    if (error instanceof AnchorError) {
      const { errorMessage, errorCode } = error.error;
      const errorName = IDL.errors.find(
        (e) =>
          errorMessage === e.msg &&
          errorCode.number === e.code &&
          capitalize(e.name) === errorCode.code
      );
      if (errorName) {
        return errorName.name;
      }
    }
  }

  static getErrorMsgFromErrorName(
    errorName: InferenceStakingErrors | undefined
  ): string | undefined {
    const error = IDL.errors.find((e) => e.name === errorName);
    return error?.msg;
  }

  static getErrorMsgFromTransactionError(error: unknown): string | undefined {
    const errorName = this.getErrorNameFromTransactionError(error);
    return this.getErrorMsgFromErrorName(errorName);
  }

  static getErrorMsgFromTransactionLogs(logs: string[]): string | undefined {
    const errorName = this.getErrorNameFromTransactionLogs(logs);
    return this.getErrorMsgFromErrorName(errorName);
  }

  decodeTransaction(
    tx: VersionedTransaction
  ): DecodedAirdropProgramInstruction[] {
    const final: DecodedAirdropProgramInstruction[] = [];
    const borshCoder = new BorshCoder(this.program.idl);
    if (tx.message.version === "legacy") {
      for (const instruction of tx.message.instructions) {
        try {
          const decodedIx = borshCoder.instruction.decode(
            instruction.data,
            "base58"
          );

          if (decodedIx == null) {
            throw new Error("Failed to decode instruction");
          }

          const name = decodedIx.name as InferenceStakingInstructions;

          const decodedInstructionArguments = decodedIx.data as {
            args: InstructionArgsMap[InferenceStakingInstructions];
          };
          const args = decodedInstructionArguments.args;

          const accountsMeta: AccountMeta[] = instruction.accounts.map(
            (idx) => ({
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              pubkey: tx.message.getAccountKeys().get(idx)!,
              isSigner: tx.message.isAccountSigner(idx),
              isWritable: tx.message.isAccountWritable(idx),
            })
          );

          const decodedAccounts = borshCoder.instruction.format(
            decodedIx,
            accountsMeta
          );

          const accounts: InstructionAccountsMap<InferenceStakingInstructions> =
            {};
          for (const account of decodedAccounts?.accounts ?? []) {
            const name = toCamelCase(account.name ?? "");
            accounts[name as keyof typeof accounts] = account;
          }

          const result: DecodedAirdropProgramInstruction = {
            name,
            args,
            accounts,
          };

          final.push(result);
        } catch {
          // No-op.
        }
      }
    }
    return final;
  }
}
