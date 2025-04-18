import type { AnchorProvider } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

import { IDL } from "./idl";

export const createProgram = (
  provider: AnchorProvider
): Program<typeof IDL> => {
  return new Program(IDL, provider);
};
