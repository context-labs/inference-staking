import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { IDL } from "./idl";

/**
 * Creates an Anchor program instance of the Inference.net staking program.
 * @param provider
 * @returns
 */
export const createProgram = (provider: AnchorProvider): Program<typeof IDL> => {
  return new Program(IDL, provider);
};
