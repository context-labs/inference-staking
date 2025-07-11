import type { InferenceStakingEvents, ParsedEvent } from "./events";
import type { DecodedStakingProgramInstruction } from "./types";

export type InferenceStakingProgramVersion = "v1";

export type InferenceStakingDecodedTransactionResult = {
  version: "v1";
  tx: DecodedStakingProgramInstruction[];
  events: ParsedEvent[];
  getInstructionEventByType: <T extends InferenceStakingEvents>(
    eventType: T,
    instructionIndex: number
  ) => ParsedEvent<T> | undefined;
};
