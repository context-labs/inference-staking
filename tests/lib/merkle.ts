import { createHash } from "crypto";

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

/** ******************************************************************************
 * NOTE: For now these utils are duplicated in our monorepo since we use them
 * in multiple programs. We might try to consolidate them later. The utils in
 * the monorepo include unit tests.
 ******************************************************************************* */

function isValidPublicKey(address: string | undefined | null): boolean {
  try {
    if (address == null) {
      return false;
    }
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function sha256(message: Uint8Array): Uint8Array<ArrayBuffer> {
  const hash = createHash("sha256").update(message).digest();
  return new Uint8Array(hash);
}

function arraysShallowEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((val, i) => val === b[i]);
}

function serializeMerkleTreeNode(node: Uint8Array): string[] {
  return [bs58.encode(node)];
}

function deserializeMerkleTreeNode(node: string[]): Uint8Array {
  const data = node[0];
  if (data == null) {
    throw new Error("Invalid merkle root data");
  }
  return bs58.decode(data);
}

function serializeMerkleProof(proof: Uint8Array[]): string[] {
  return proof.map((node) => serializeMerkleTreeNode(node)).flat();
}

function deserializeMerkleProof(proof: string[]): Uint8Array[] {
  return proof.map((node) => bs58.decode(node));
}

function areRootsEqual(root1: Uint8Array, root2: Uint8Array): boolean {
  return arraysShallowEqual(root1, root2);
}

function sortAddressList(
  addresses: MerkleTreeAddressInput[]
): MerkleTreeAddressInput[] {
  return addresses.slice().sort((a, b) => a.address.localeCompare(b.address));
}

// Check that input addresses and amounts are of valid type and length.
function validateInputs(addresses: MerkleTreeAddressInput[]) {
  if (addresses.length == 0) {
    throw new Error("Addresses length cannot be zero");
  }

  for (const { address, amount } of addresses) {
    if (!isValidPublicKey(address)) {
      throw new Error(`${address} is not a valid wallet pubkey`);
    }
    if (typeof amount !== "bigint") {
      throw new Error(`${String(amount)} is not a BigInt`);
    }
  }

  // Validate all addresses are unique
  const uniqueAddresses = new Set(addresses.map(({ address }) => address));
  if (uniqueAddresses.size !== addresses.length) {
    throw new Error("Addresses must be unique");
  }

  // Validate list is sorted by address
  const sortedAddresses = sortAddressList(addresses);
  for (let i = 0; i < addresses.length; i++) {
    if (addresses[i]?.address !== sortedAddresses[i]?.address) {
      throw new Error("Addresses must be sorted alphabetically");
    }
  }
}

// Fill the list of addresses to the next power of 2 (2^N) length with dummy addresses
// (using the system default address with an amount of 0) so a complete binary tree can be built.
function fillAddresses(addresses: MerkleTreeAddressInput[]): void {
  const curLength = addresses.length;
  const lenWithPadding = Math.pow(2, Math.ceil(Math.log2(addresses.length)));

  for (let i = curLength; i < lenWithPadding; i++) {
    addresses.push({
      address: PublicKey.default.toString(),
      amount: BigInt(0),
      usdcAmount: BigInt(0),
    });
  }
}

export type MerkleTreeAddressInput = {
  address: string;
  amount: bigint;
  usdcAmount: bigint;
};

function constructMerkleTree(
  initialInput: MerkleTreeAddressInput[]
): Uint8Array[][] {
  const input = initialInput.slice();
  validateInputs(input);
  fillAddresses(input);

  const encoder = new TextEncoder();

  // Represent merkle tree where each array represents nodes in the same level,
  // with its parent at index (i // 2) in the next array.
  const tree: Uint8Array[][] = [[]];
  let level = 0;

  // Create the initial level of tree nodes by hashing each wallet and its token amount,
  // separated by a comma.
  for (const { address, amount, usdcAmount } of input) {
    const data = encoder.encode(`${address},${amount},${usdcAmount}`);
    const hash = sha256(data);
    tree[0]?.push(hash);
  }

  // Hash every sequential pair of nodes in each level to build the parent level.
  while ((tree[level]?.length ?? 0) > 1) {
    tree.push([]);
    for (let i = 0; i < (tree[level]?.length ?? 0); i += 2) {
      const treeLevel = tree[level];
      if (!treeLevel) {
        throw new Error("Level is undefined");
      }
      const node1 = treeLevel[i];
      const node2 = treeLevel[i + 1];
      if (!node1 || !node2) {
        throw new Error("Node is undefined");
      }
      const combined = new Uint8Array(node1.length + node2.length);
      combined.set(node1);
      combined.set(node2, node1.length);
      const hash = sha256(combined);
      tree[level + 1]?.push(hash);
    }
    level += 1;
  }

  return tree;
}

function getTreeRoot(tree: Uint8Array[][]): Uint8Array {
  const root = tree[tree.length - 1]?.[0];
  if (root == null) {
    throw new Error("Root is undefined");
  }
  return root;
}

export type GenerateMerkleProofInput = {
  address: string;
  amount: bigint;
  usdcAmount: bigint;
  index: number;
  merkleTree: Uint8Array[][];
  skipChecksForTests?: boolean;
};

type GenerateMerkleProofOutput = {
  proof: Uint8Array[];
  proofPath: boolean[];
};

// Generates a proof that can be verified through recursive hashing to match against the root node
// of a merkle tree. The proof contains all the sibling nodes of the leaf node or its subsequent parent
// node, for each level from leaf to root-1.
function generateMerkleProof({
  address,
  amount,
  usdcAmount,
  index,
  merkleTree,
  // This allows us to construct deliberately invalid proofs for testing purposes.
  skipChecksForTests = false,
}: GenerateMerkleProofInput): GenerateMerkleProofOutput {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${address},${amount},${usdcAmount}`);
  const hash = sha256(data);

  // Verify that leaf node matches expected hash.
  const leaf = merkleTree[0]?.[index];
  if (!leaf) {
    throw new Error("Leaf level is undefined");
  }
  if (!skipChecksForTests && !arraysShallowEqual(leaf, hash)) {
    throw new Error("Leaf hash does not match expected value in tree");
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
  while (level < merkleTree.length - 1) {
    // Push sibling node depending if current node is left (even) or right (odd).
    if (nodeIdx % 2 == 0) {
      const sibling = merkleTree[level]?.[nodeIdx + 1];
      if (!sibling) {
        throw new Error("Sibling is undefined");
      }
      proof.push(sibling);
      proofPath.push(false);
    } else {
      const sibling = merkleTree[level]?.[nodeIdx - 1];
      if (!sibling) {
        throw new Error("Sibling is undefined");
      }
      proof.push(sibling);
      proofPath.push(true);
    }

    // Parent node is at nodeIdx // 2 in next level.
    nodeIdx = Math.floor(nodeIdx / 2);
    level += 1;
  }

  const root = getTreeRoot(merkleTree);
  const isProofValid = verifyProof(hash, proof, proofPath, root);
  if (!skipChecksForTests && !isProofValid) {
    throw new Error("Generated proof is invalid");
  }

  return { proof, proofPath };
}

function verifyProof(
  leafHash: Uint8Array,
  proof: Uint8Array[],
  proofPath: boolean[],
  root: Uint8Array
): boolean {
  if (proof.length !== proofPath.length) {
    throw new Error("Proof length and proofPath length mismatch");
  }

  let currentHash = leafHash;
  for (let i = 0; i < proof.length; i++) {
    const sibling = proof[i];
    if (!sibling) {
      throw new Error("Sibling is undefined");
    }

    // If proofPath[i] is true, sibling is on the left
    // So combine = sibling + currentHash
    // Otherwise, combine = currentHash + sibling
    let combined: Uint8Array;

    if (proofPath[i]) {
      combined = new Uint8Array(sibling.length + currentHash.length);
      combined.set(sibling);
      combined.set(currentHash, sibling.length);
    } else {
      combined = new Uint8Array(currentHash.length + sibling.length);
      combined.set(currentHash);
      combined.set(sibling, currentHash.length);
    }

    currentHash = sha256(combined);
  }

  return arraysShallowEqual(currentHash, root);
}

function logTreeInBase58(tree: Uint8Array[][]): void {
  console.log(
    tree.map((innerArray) => innerArray.map((uint8) => bs58.encode(uint8)))
  );
}

function logProofInBase58(proof: Uint8Array[]): void {
  console.log(proof.map((uint8) => bs58.encode(uint8)));
}

export const MerkleUtils = {
  areRootsEqual,
  constructMerkleTree,
  deserializeMerkleProof,
  deserializeMerkleTreeNode,
  generateMerkleProof,
  getTreeRoot,
  logProofInBase58,
  logTreeInBase58,
  serializeMerkleProof,
  serializeMerkleTreeNode,
  sha256,
  sortAddressList,
  verifyProof,
};
