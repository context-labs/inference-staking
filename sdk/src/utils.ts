import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import promiseLimit from "promise-limit";

export function assertUnreachable(x: never): never {
  throw new Error(
    `Received a value which should not exist: ${JSON.stringify(x)}`
  );
}

export function toCamelCase(text: string): string {
  return text
    .split(/\s+/)
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join("");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function batchArray<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

export function zipArrays<T, U>(array1: T[], array2: U[]): [T, U][] {
  if (array1.length !== array2.length) {
    throw new Error("Arrays must be of the same length");
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return array1.map((val, i) => [val, array2[i]!]);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ExecuteWithRetriesOptions = {
  retries?: number;
  retryDelayMs?: number;
  retryBackoffDelayMs?: number;
};

export async function executeWithRetries<T>(
  fn: () => Promise<T>,
  options: ExecuteWithRetriesOptions = {}
) {
  const {
    retries = 5,
    retryDelayMs = 250,
    retryBackoffDelayMs = 1_000,
  } = options;

  try {
    return await fn();
  } catch (e) {
    if (retries === 0) {
      throw e;
    }

    const delay = retryDelayMs + retryBackoffDelayMs;
    await sleep(delay);
    return executeWithRetries(fn, {
      retries,
      retryDelayMs: delay,
      retryBackoffDelayMs,
    });
  }
}

export async function limitConcurrency<T, R>(
  arr: T[],
  fn: (val: T) => Promise<R>,
  concurrencyLimit = 10
): Promise<R[]> {
  const limit = promiseLimit<R>(concurrencyLimit);
  return Promise.all(arr.map((item) => limit(() => fn(item))));
}

export function deserializeMerkleProof(proof: string[]): Uint8Array[] {
  return proof.map((node) => bs58.decode(node));
}

export function parseKeypairFromString(
  keypairString: string | undefined | null
): Keypair | null {
  if (keypairString == null) {
    return null;
  }

  try {
    return Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(keypairString) as number[])
    );
  } catch {
    return null;
  }
}
