import * as fs from "fs";
import * as path from "path";

// This script populates the `idl.ts` file in the `sdk/src` directory with
// the generated program IDL types.

const idlSourcePath = path.join("target", "types", "inference_staking.ts");
const idlOutputPath = path.join("sdk", "src", "idl.ts");

try {
  const typesContent = fs.readFileSync(idlSourcePath, "utf-8");

  const typeDefStart = typesContent.indexOf("export type InferenceStaking =");
  if (typeDefStart === -1) {
    throw new Error("Could not find type definition in the source file");
  }

  const openingBracePos = typesContent.indexOf("{", typeDefStart);
  if (openingBracePos === -1) {
    throw new Error("Could not find opening brace in type definition");
  }

  let braceCount = 1;
  let endPos = openingBracePos + 1;

  while (braceCount > 0 && endPos < typesContent.length) {
    if (typesContent[endPos] === "{") braceCount++;
    if (typesContent[endPos] === "}") braceCount--;
    endPos++;
  }

  if (braceCount !== 0) {
    throw new Error("Mismatched braces in type definition");
  }

  const typeContent = typesContent.substring(openingBracePos, endPos).trim();

  const outputContent = `import type { PublicKey } from "@solana/web3.js";
  
  type Mutable<T> = {
  -readonly [K in keyof T]: Mutable<T[K]>;
};

// This is the Anchor generated program IDL, which is generated in our build process.
// Don't edit the finally manually - you can regenerate it by running 'bun run build'
// at the root level of the project.
const _IDL = ${typeContent} as const;

export type InferenceStaking = Mutable<typeof _IDL>;

export const getIdlWithProgramId = (programId: PublicKey): InferenceStaking => {
  const result = {
    ..._IDL,
    address: programId.toBase58(),
  };
  return result as InferenceStaking;
};

export const IDL = _IDL as InferenceStaking;

`;

  fs.mkdirSync(path.dirname(idlOutputPath), { recursive: true });
  fs.writeFileSync(idlOutputPath, outputContent);
  console.log(
    `Successfully copied IDL from ${idlSourcePath} to ${idlOutputPath}`
  );
  console.log("✅ IDL generation complete");
} catch (error) {
  console.error("Error processing IDL file:", error);
  process.exit(1);
}
