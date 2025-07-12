import type { InferenceStakingEvents, ParsedEvent } from "./events";
import type { DecodedStakingProgramInstruction } from "./types";

export type InferenceStakingProgramVersion = "v1";

export type InferenceStakingDecodedTransactionResult = {
  version: "v1";
  instructions: DecodedStakingProgramInstruction[];
  events: ParsedEvent[];
  getEventByInstructionIndex: (
    instructionIndex: number
  ) => ParsedEvent | undefined;
  getInstructionEventByType: <T extends InferenceStakingEvents>(
    eventType: T,
    instructionIndex: number
  ) => ParsedEvent<T> | undefined;
};
