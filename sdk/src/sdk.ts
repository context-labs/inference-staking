import type { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Program, AnchorError, BorshCoder } from "@coral-xyz/anchor";
import type {
  AccountMeta,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import type { InferenceStaking } from "./idl";
import { getIdlWithProgramId, IDL } from "./idl";
import type {
  InferenceStakingErrors,
  DecodedAirdropProgramInstruction,
  InferenceStakingInstructions,
  InstructionArgsMap,
  InstructionAccountsMap,
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
        Buffer.from("OperatorPool", "utf-8"),
        Buffer.from([operatorPoolId.toNumber()]),
      ],
      this.program.programId
    );
    return pda;
  }

  stakingRecordPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("StakingRecord", "utf-8"), operatorPoolPda.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  stakedTokenPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("StakedToken", "utf-8"), operatorPoolPda.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  feeTokenPda(operatorPoolPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("FeeToken", "utf-8"), operatorPoolPda.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  rewardRecordPda(epoch: BN): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("RewardRecord", "utf-8"), Buffer.from([epoch.toNumber()])],
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
    tx: VersionedTransactionResponse
  ): DecodedAirdropProgramInstruction[] {
    const final: DecodedAirdropProgramInstruction[] = [];
    const borshCoder = new BorshCoder(this.program.idl);
    if (tx.transaction.message.version === "legacy") {
      for (const instruction of tx.transaction.message.instructions) {
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
              pubkey: tx.transaction.message.getAccountKeys().get(idx)!,
              isSigner: tx.transaction.message.isAccountSigner(idx),
              isWritable: tx.transaction.message.isAccountWritable(idx),
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
