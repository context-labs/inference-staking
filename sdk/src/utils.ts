import { PublicKey } from "@solana/web3.js";

export type SolanaEnvironment =
  | "mainnet-beta"
  | "testnet"
  | "devnet"
  | "localnet";

export function getProgramIdFromEnvironment(
  environment: SolanaEnvironment
): PublicKey {
  switch (environment) {
    case "mainnet-beta":
      return new PublicKey("11111111111111111111111111111111");
    case "devnet":
      return new PublicKey("infrC4g9ZJMcDyvhjN4zLL6r634RCyzYv5riwk8jp28");
    case "localnet":
      return new PublicKey("5dBQfWVYj4izDGuZkvceHVNudoJoccX9SUkgRDEv9eoj");
    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
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
