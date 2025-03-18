import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import { arraysEqual } from "./utils";

function sha256(message: Uint8Array) {
  const hash = createHash("sha256").update(message).digest();
  return new Uint8Array(hash);
}

// Check that input wallets and amounts are of valid type and length.
const validateInputs = (wallets: string[], amounts: number[]) => {
  if (wallets.length != amounts.length)
    throw new Error("Wallets and amounts length mismatch");
  if (wallets.length == 0) throw new Error("Wallets length cannot be zero");

  for (let i = 0; i < wallets.length; i++) {
    try {
      new PublicKey(wallets[i]);
    } catch (err) {
      throw new Error(`${wallets[i]} is not a valid wallet pubkey`);
    }
    if (!Number.isInteger(amounts[i])) {
      throw new Error(`${amounts[i]} is not an integer`);
    }
  }
};

// Fill the list of wallets to the next power of 2 (2^N) length with dummy wallets
// (using the system default address with an amount of 0) so a complete binary tree can be built.
const fillWallets = (wallets: string[], amounts: number[]) => {
  const curLength = wallets.length;
  const lenWithPadding = Math.pow(2, Math.ceil(Math.log2(wallets.length)));

  for (let i = curLength; i < lenWithPadding; i++) {
    wallets.push(PublicKey.default.toString());
    amounts.push(0);
  }
};

export const constructMerkleTree = (wallets: string[], amounts: number[]) => {
  validateInputs(wallets, amounts);
  fillWallets(wallets, amounts);

  const encoder = new TextEncoder();

  // Represent merkle tree where each array represents nodes in the same level,
  // with its parent at index (i // 2) in the next array.
  let tree: Uint8Array[][] = [[]];
  let level = 0;

  // Create the initial level of tree nodes by hashing each wallet and its token amount,
  // separated by a comma.
  for (let i = 0; i < wallets.length; i++) {
    const data = encoder.encode(`${wallets[i]},${amounts[i]}`);
    const hash = sha256(data);
    tree[0].push(hash);
  }

  // Hash every sequential pair of nodes in each level to build the parent level.
  while (tree[level].length > 1) {
    tree.push([]);
    for (let i = 0; i < tree[level].length; i += 2) {
      const node1 = tree[level][i];
      const node2 = tree[level][i + 1];
      const combined = new Uint8Array(node1.length + node2.length);
      combined.set(node1);
      combined.set(node2, node1.length);
      const hash = sha256(combined);
      tree[level + 1].push(hash);
    }
    level += 1;
  }

  return tree;
};

// Generates a proof that can be verified through recursive hashing to match against the root node
// of a merkle tree. The proof contains all the sibling nodes of the leaf node or its subsequent parent
// node, for each level from leaf to root-1.
export const generateMerkleProof = (
  wallets: string[],
  amounts: number[],
  index: number,
  merkleTree?: Uint8Array[][]
) => {
  const tree = merkleTree ?? constructMerkleTree(wallets, amounts);

  // Get hash of leaf node for target wallet.
  const encoder = new TextEncoder();
  const data = encoder.encode(`${wallets[index]},${amounts[index]}`);
  const hash = sha256(data);

  // Verify that leaf node matches expected hash.
  if (!arraysEqual(tree[0][index], hash)) {
    throw new Error("Wallet does not match expected value in tree");
  }

  const proof: Uint8Array[] = [];
  let nodeIdx = index;
  let level = 0;

  // Iterate through each level starting from leaf nodes, till level below root.
  while (level < tree.length - 1) {
    // Push sibling node depending if current node is left (even) or right (odd).
    if (nodeIdx % 2 == 0) {
      proof.push(tree[level][nodeIdx + 1]);
    } else {
      proof.push(tree[level][nodeIdx - 1]);
    }

    // Parent node is at nodeIdx // 2 in next level.
    nodeIdx = Math.floor(nodeIdx / 2);
    level += 1;
  }

  return proof;
};

export const logTreeInHexString = (tree: Uint8Array[][]) => {
  console.log(
    tree.map((innerArray) =>
      innerArray.map((uint8) =>
        Array.from(uint8)
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")
      )
    )
  );
};

export const logProofInHexString = (proof: Uint8Array[]) => {
  console.log(
    proof.map((uint8) =>
      Array.from(uint8)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
    )
  );
};
