import { PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";
import bs58 from "bs58";

const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
};

function sha256(message: Uint8Array) {
  const hash = createHash("sha256").update(message).digest();
  return new Uint8Array(hash);
}

// Check that input addresses and amounts are of valid type and length.
const validateInputs = (addresses: string[], amounts: number[]) => {
  if (addresses.length != amounts.length)
    throw new Error("Addresses and amounts length mismatch");
  if (addresses.length == 0) throw new Error("Addresses length cannot be zero");

  for (let i = 0; i < addresses.length; i++) {
    try {
      new PublicKey(addresses[i]);
    } catch (err) {
      throw new Error(`${addresses[i]} is not a valid wallet pubkey`);
    }
    if (!Number.isInteger(amounts[i])) {
      throw new Error(`${amounts[i]} is not an integer`);
    }
  }
};

// Fill the list of addresses to the next power of 2 (2^N) length with dummy addresses
// (using the system default address with an amount of 0) so a complete binary tree can be built.
const fillAddresses = (addresses: string[], amounts: number[]) => {
  const curLength = addresses.length;
  const lenWithPadding = Math.pow(2, Math.ceil(Math.log2(addresses.length)));

  for (let i = curLength; i < lenWithPadding; i++) {
    addresses.push(PublicKey.default.toString());
    amounts.push(0);
  }
};

export const constructMerkleTree = (addresses: string[], amounts: number[]) => {
  validateInputs(addresses, amounts);
  fillAddresses(addresses, amounts);

  const encoder = new TextEncoder();

  // Represent merkle tree where each array represents nodes in the same level,
  // with its parent at index (i // 2) in the next array.
  let tree: Uint8Array[][] = [[]];
  let level = 0;

  // Create the initial level of tree nodes by hashing each wallet and its token amount,
  // separated by a comma.
  for (let i = 0; i < addresses.length; i++) {
    const data = encoder.encode(`${addresses[i]},${amounts[i]}`);
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
  addresses: string[],
  amounts: number[],
  index: number,
  merkleTree?: Uint8Array[][]
) => {
  const tree = merkleTree ?? constructMerkleTree(addresses, amounts);

  // Get hash of leaf node for target address.
  const encoder = new TextEncoder();
  const data = encoder.encode(`${addresses[index]},${amounts[index]}`);
  const hash = sha256(data);

  // Verify that leaf node matches expected hash.
  if (!arraysEqual(tree[0][index], hash)) {
    throw new Error("Wallet does not match expected value in tree");
  }

  // Contains sibling nodes of traversal path required to recompute root starting
  // from target leaf node.
  const proof: Uint8Array[] = [];

  // Contains a flag for each sibling node to indicate if they are on the
  // left of the leaf/computed node.
  const proofPath: boolean[] = [];
  let nodeIdx = index;
  let level = 0;

  // Iterate through each level starting from leaf nodes, till level below root.
  while (level < tree.length - 1) {
    // Push sibling node depending if current node is left (even) or right (odd).
    if (nodeIdx % 2 == 0) {
      proof.push(tree[level][nodeIdx + 1]);
      proofPath.push(false);
    } else {
      proof.push(tree[level][nodeIdx - 1]);
      proofPath.push(true);
    }

    // Parent node is at nodeIdx // 2 in next level.
    nodeIdx = Math.floor(nodeIdx / 2);
    level += 1;
  }

  return { proof, proofPath };
};

export const logTreeInBase58 = (tree: Uint8Array[][]) => {
  console.log(
    tree.map((innerArray) => innerArray.map((uint8) => bs58.encode(uint8)))
  );
};

export const logProofInBase58 = (proof: Uint8Array[]) => {
  console.log(proof.map((uint8) => bs58.encode(uint8)));
};
