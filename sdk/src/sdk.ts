import type { AnchorProvider, ProgramAccount } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Program, AnchorError, BorshCoder } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import type {
  AccountInfo,
  AccountMeta,
  VersionedTransaction,
} from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import { USDC_PRECISION_FACTOR } from "./constants";
import {
  OPERATOR_POOL_DISCRIMINATOR,
  STAKING_RECORD_DISCRIMINATOR,
  REWARD_RECORD_DISCRIMINATOR,
} from "./discriminators";
import type { InferenceStaking } from "./idl";
import { getIdlWithProgramId, IDL } from "./idl";
import type {
  InferenceStakingErrors,
  DecodedStakingProgramInstruction,
  InferenceStakingInstructions,
  InstructionArgsMap,
  InstructionAccountsMap,
  OperatorPoolAccountStruct,
  PoolOverviewAccountStruct,
  RewardRecordAccountStruct,
  StakingRecordAccountStruct,
  AccountMetaWithName,
  InferenceStakingAccountName,
  InferenceStakingAccountStructName,
} from "./types";
import {
  batchArray,
  capitalize,
  executeWithRetries,
  limitConcurrency,
  toCamelCase,
  zipArrays,
} from "./utils";

export class InferenceStakingProgramSdk {
  coder: BorshCoder;
  program: Program<InferenceStaking>;

  constructor(args: { provider: AnchorProvider; programId: PublicKey }) {
    const { provider, programId } = args;
    const idl = getIdlWithProgramId(programId);
    this.coder = new BorshCoder(idl);
    this.program = new Program<InferenceStaking>(idl, provider);
  }

  /** ************************************************************************
   *  Program State Account PDAs
   *************************************************************************** */

  poolOverviewPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("PoolOverview", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  operatorPoolPda(operatorPoolAdmin: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("OperatorPool", "utf-8"), operatorPoolAdmin.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  stakingRecordPda(operatorPoolPda: PublicKey, owner: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("StakingRecord", "utf-8"),
        operatorPoolPda.toBuffer(),
        owner.toBuffer(),
      ],
      this.program.programId
    );
    return pda;
  }

  rewardRecordPda(epoch: BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("RewardRecord", "utf-8"),
        epoch.toArrayLike(Buffer, "le", 8),
      ],
      this.program.programId
    );
    return pda;
  }

  /** ************************************************************************
   *  Program On-Chain Vault PDAs
   *************************************************************************** */

  globalTokenRewardVaultPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("GlobalTokenRewardVault", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  globalUsdcEarningsVaultPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("GlobalUsdcEarningsVault", "utf-8")],
      this.program.programId
    );
    return pda;
  }

  poolStakedTokenVaultPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("PoolStakedTokenVault", "utf-8"),
        operatorPoolPda.toBuffer(),
      ],
      this.program.programId
    );
    return pda;
  }

  poolRewardCommissionTokenVaultPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("PoolRewardCommissionTokenVault", "utf-8"),
        operatorPoolPda.toBuffer(),
      ],
      this.program.programId
    );
    return pda;
  }

  poolUsdcCommissionTokenVaultPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("PoolUsdcCommissionTokenVault", "utf-8"),
        operatorPoolPda.toBuffer(),
      ],
      this.program.programId
    );
    return pda;
  }

  poolDelegatorUsdcEarningsVaultPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("PoolDelegatorUsdcEarningsVault", "utf-8"),
        operatorPoolPda.toBuffer(),
      ],
      this.program.programId
    );
    return pda;
  }

  /** ************************************************************************
   *  Account Lookup Methods
   *************************************************************************** */

  async fetchPoolOverview(): Promise<PoolOverviewAccountStruct> {
    const poolOverviewPda = this.poolOverviewPda();
    return this.program.account.poolOverview.fetch(poolOverviewPda);
  }

  async fetchOperatorPoolByPda(
    operatorPoolPda: PublicKey
  ): Promise<OperatorPoolAccountStruct> {
    return this.program.account.operatorPool.fetch(operatorPoolPda);
  }

  async fetchStakingRecord(
    stakingRecordPda: PublicKey
  ): Promise<StakingRecordAccountStruct> {
    return this.program.account.stakingRecord.fetch(stakingRecordPda);
  }

  async fetchOperatorStakingRecord(
    operatorPoolPda: PublicKey
  ): Promise<StakingRecordAccountStruct> {
    const operatorPool = await this.fetchOperatorPoolByPda(operatorPoolPda);
    return this.program.account.stakingRecord.fetch(
      operatorPool.operatorStakingRecord
    );
  }

  async fetchRewardRecord(epoch: BN): Promise<RewardRecordAccountStruct> {
    const rewardRecordPda = this.rewardRecordPda(epoch);
    return this.program.account.rewardRecord.fetch(rewardRecordPda);
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

  /** ************************************************************************
   *  Get Program Account Methods
   *************************************************************************** */

  async #handleFetchAccountPubkeys(
    discriminator: number[]
  ): Promise<PublicKey[]> {
    const connection = this.program.provider.connection;
    const result = await executeWithRetries(async () => {
      const accounts = await connection.getProgramAccounts(
        this.program.programId,
        {
          // Return no data, we only want the public keys at this stage.
          dataSlice: { offset: 0, length: 0 },
          // Filter on the discriminator (first 8‑bytes of every Anchor account).
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: bs58.encode(discriminator),
              },
            },
          ],
          commitment: "finalized",
        }
      );

      return accounts.map((a) => a.pubkey);
    });
    return result;
  }

  async #handleFetchAccountInfos(pubkeys: PublicKey[]) {
    const connection = this.program.provider.connection;
    return await executeWithRetries(async () => {
      const accountInfos = await connection.getMultipleAccountsInfo(
        pubkeys,
        "finalized"
      );
      return accountInfos;
    });
  }

  #handleDecodeAccount<T>(
    accountName: InferenceStakingAccountStructName,
    data: Buffer
  ): T {
    return this.coder.accounts.decode<T>(accountName, data);
  }

  #handleFetchAccountsInfos<T>(
    accountName: InferenceStakingAccountStructName,
    accountInfosWithPubkeys: [PublicKey, AccountInfo<Buffer> | null][]
  ): ProgramAccount<T>[] {
    const results: ProgramAccount<T>[] = [];
    for (const [publicKey, info] of accountInfosWithPubkeys) {
      if (info == null) {
        continue;
      }

      const account = this.#handleDecodeAccount<T>(accountName, info.data);
      results.push({
        account,
        publicKey,
      });
    }
    return results;
  }

  async fetchOperatorPoolPubkeys(): Promise<PublicKey[]> {
    if (OPERATOR_POOL_DISCRIMINATOR == null) {
      throw new Error("OPERATOR_POOL_DISCRIMINATOR is not defined");
    }
    return await this.#handleFetchAccountPubkeys(OPERATOR_POOL_DISCRIMINATOR);
  }

  async fetchOperatorPoolAccounts(
    pubkeys: PublicKey[]
  ): Promise<ProgramAccount<OperatorPoolAccountStruct>[]> {
    if (pubkeys.length === 0) {
      return [];
    }

    const BATCH_SIZE = 100;

    const batches = batchArray(pubkeys, BATCH_SIZE);
    const final = await limitConcurrency(batches, async (batch) => {
      const accountInfos = await this.#handleFetchAccountInfos(batch);
      const accountInfosWithPubkeys = zipArrays(batch, accountInfos);
      return this.#handleFetchAccountsInfos<OperatorPoolAccountStruct>(
        "operatorPool",
        accountInfosWithPubkeys
      );
    });

    return final.flat();
  }

  async fetchStakingRecordPubkeys(): Promise<PublicKey[]> {
    if (STAKING_RECORD_DISCRIMINATOR == null) {
      throw new Error("STAKING_RECORD_DISCRIMINATOR is not defined");
    }
    return await this.#handleFetchAccountPubkeys(STAKING_RECORD_DISCRIMINATOR);
  }

  async fetchStakingRecordAccounts(
    pubkeys: PublicKey[]
  ): Promise<ProgramAccount<StakingRecordAccountStruct>[]> {
    if (pubkeys.length === 0) {
      return [];
    }

    const BATCH_SIZE = 100;

    const batches = batchArray(pubkeys, BATCH_SIZE);
    const final = await limitConcurrency(batches, async (batch) => {
      const accountInfos = await this.#handleFetchAccountInfos(batch);
      const accountInfosWithPubkeys = zipArrays(batch, accountInfos);
      return this.#handleFetchAccountsInfos<StakingRecordAccountStruct>(
        "stakingRecord",
        accountInfosWithPubkeys
      );
    });

    return final.flat();
  }

  async fetchRewardRecordPubkeys(): Promise<PublicKey[]> {
    if (REWARD_RECORD_DISCRIMINATOR == null) {
      throw new Error("REWARD_RECORD_DISCRIMINATOR is not defined");
    }
    return await this.#handleFetchAccountPubkeys(REWARD_RECORD_DISCRIMINATOR);
  }

  async fetchRewardRecordAccounts(
    pubkeys: PublicKey[]
  ): Promise<ProgramAccount<RewardRecordAccountStruct>[]> {
    if (pubkeys.length === 0) {
      return [];
    }

    const BATCH_SIZE = 100;

    const batches = batchArray(pubkeys, BATCH_SIZE);
    const final = await limitConcurrency(batches, async (batch) => {
      const accountInfos = await this.#handleFetchAccountInfos(batch);
      const accountInfosWithPubkeys = zipArrays(batch, accountInfos);
      return this.#handleFetchAccountsInfos<RewardRecordAccountStruct>(
        "rewardRecord",
        accountInfosWithPubkeys
      );
    });

    return final.flat();
  }

  /** ************************************************************************
   *  Token Account Balance Methods
   *************************************************************************** */

  async fetchStakedTokenAccountBalance(
    operatorPoolPda: PublicKey
  ): Promise<BN> {
    const stakedTokenPda = this.poolStakedTokenVaultPda(operatorPoolPda);
    const tokenAccountInfo =
      await this.program.provider.connection.getTokenAccountBalance(
        stakedTokenPda
      );
    return new BN(tokenAccountInfo.value.amount);
  }

  async fetchFeeTokenAccountBalance(operatorPoolPda: PublicKey): Promise<BN> {
    const feeTokenPda = this.poolRewardCommissionTokenVaultPda(operatorPoolPda);
    const tokenAccountInfo =
      await this.program.provider.connection.getTokenAccountBalance(
        feeTokenPda
      );
    return new BN(tokenAccountInfo.value.amount);
  }

  async fetchRewardTokenAccountBalance(): Promise<BN> {
    const rewardTokenPda = this.globalTokenRewardVaultPda();
    const tokenAccountInfo =
      await this.program.provider.connection.getTokenAccountBalance(
        rewardTokenPda
      );
    return new BN(tokenAccountInfo.value.amount);
  }

  /** ************************************************************************
   *  Helper Methods
   *************************************************************************** */

  getEmptyPoolOverviewFieldsForUpdateInstruction() {
    type EmptyUpdateFields = Parameters<
      typeof this.program.methods.updatePoolOverview
    >[0];
    const empty: EmptyUpdateFields = {
      isStakingHalted: null,
      isWithdrawalHalted: null,
      isAccrueRewardHalted: null,
      allowPoolCreation: null,
      operatorPoolRegistrationFee: null,
      minOperatorTokenStake: null,
      delegatorUnstakeDelaySeconds: null,
      operatorUnstakeDelaySeconds: null,
    };
    return empty;
  }

  getEmptyOperatorPoolFieldsForUpdateInstruction() {
    type EmptyUpdateFields = Parameters<
      typeof this.program.methods.updateOperatorPool
    >[0];
    const empty: EmptyUpdateFields = {
      newRewardCommissionRateBps: null,
      newUsdcCommissionRateBps: null,
      autoStakeFees: null,
      allowDelegation: null,
      name: null,
      description: null,
      websiteUrl: null,
      avatarImageUrl: null,
      operatorAuthKeys: null,
    };
    return empty;
  }

  /**
   * Calculates the total available USDC earnings for a staking record,
   * including both settled (accrued_usdc_earnings) and unsettled amounts.
   *
   * This mirrors the calculation logic in has_unclaimed_usdc_earnings.
   */
  getAvailableUsdcEarningsForStakingRecord(args: {
    accruedUsdcEarnings: string;
    cumulativeUsdcPerShare: string;
    lastSettledUsdcPerShare: string;
    stakingRecordShares: string;
  }): BN {
    let totalEarnings = new BN(args.accruedUsdcEarnings);

    const cumulativeUsdcPerShare = new BN(
      args.cumulativeUsdcPerShare.toString()
    );
    const lastSettledUsdcPerShare = new BN(
      args.lastSettledUsdcPerShare.toString()
    );

    const usdcPerShareSettlementDelta = cumulativeUsdcPerShare.sub(
      lastSettledUsdcPerShare
    );

    const shares = new BN(args.stakingRecordShares);
    if (usdcPerShareSettlementDelta.gt(new BN(0)) && shares.gt(new BN(0))) {
      const unsettled = shares
        .mul(usdcPerShareSettlementDelta)
        .div(USDC_PRECISION_FACTOR);

      totalEarnings = totalEarnings.add(unsettled);
    }

    return totalEarnings;
  }

  /** ************************************************************************
   *  Error Handling Methods
   *************************************************************************** */

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

  static getProgramErrorFromTransactionError(
    error: unknown
  ): InferenceStakingErrors | undefined {
    const message = error instanceof Error ? error.message : null;
    if (message == null) {
      return undefined;
    }

    const matchedError = IDL.errors.find((e) => message.includes(e.msg));
    return matchedError?.name;
  }

  static getErrorMsgFromTransactionError(error: unknown): string | undefined {
    const errorName = this.getErrorNameFromTransactionError(error);
    return this.getErrorMsgFromErrorName(errorName);
  }

  static getErrorMsgFromTransactionLogs(logs: string[]): string | undefined {
    const errorName = this.getErrorNameFromTransactionLogs(logs);
    return this.getErrorMsgFromErrorName(errorName);
  }

  /** ************************************************************************
   *  Transaction Decoding Method
   *************************************************************************** */

  decodeTransaction(
    tx: VersionedTransaction
  ): DecodedStakingProgramInstruction[] {
    const final: DecodedStakingProgramInstruction[] = [];
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

          const args =
            decodedIx.data as InstructionArgsMap[InferenceStakingInstructions];

          const accountsMeta: AccountMeta[] = instruction.accounts.map(
            (idx) => {
              const pubkey = tx.message.getAccountKeys().get(idx);
              if (pubkey == null) {
                throw new Error(`No pubkey exists for account index: ${idx}`);
              }
              return {
                pubkey,
                isSigner: tx.message.isAccountSigner(idx),
                isWritable: tx.message.isAccountWritable(idx),
              };
            }
          );

          const decodedAccounts = borshCoder.instruction.format(
            decodedIx,
            accountsMeta
          );

          const accounts: InstructionAccountsMap<InferenceStakingInstructions> =
            {};

          for (const account of decodedAccounts?.accounts ?? []) {
            const name = toCamelCase(
              account.name ?? ""
            ) as InferenceStakingAccountName;
            const accountMeta: AccountMetaWithName = {
              ...account,
              name,
            };
            accounts[name] = accountMeta;
          }

          const result = {
            name,
            args,
            accounts,
          } as DecodedStakingProgramInstruction;

          final.push(result);
        } catch {
          // No-op.
        }
      }
    }
    return final;
  }
}
