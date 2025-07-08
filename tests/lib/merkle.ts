import { createHash } from "crypto";

import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

/** ******************************************************************************
 * NOTE: For now these utils are duplicated in our monorepo since we use them
 * in multiple programs. We might try to consolidate them later. The utils in
 * the monorepo include unit tests.
 ******************************************************************************* */

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

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

function areRootsEqual(root1: Uint8Array, root2: Uint8Array): boolean {
  return arraysShallowEqual(root1, root2);
}

function sortAddressList<T extends ConstructMerkleTreeInput>(
  addresses: T[]
): T[] {
  return addresses.slice().sort((a, b) => a.address.localeCompare(b.address));
}

// Check that input addresses and amounts are of valid type and length.
function validateInputs(addresses: ConstructMerkleTreeInput[]) {
  if (addresses.length == 0) {
    throw new Error("Addresses length cannot be zero");
  }

  for (const { address, tokenAmount: tokenAmount, usdcAmount } of addresses) {
    if (!isValidPublicKey(address)) {
      throw new Error(`${address} is not a valid wallet pubkey`);
    }
    if (typeof tokenAmount !== "bigint") {
      throw new Error(
        `tokenAmount ${String(
          tokenAmount
        )} is not of type BigInt (all amount input values must be integers)`
      );
    }
    if (typeof usdcAmount !== "bigint") {
      throw new Error(
        `usdcAmount ${String(
          usdcAmount
        )} is not of type BigInt (all amount input values must be integers)`
      );
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
function fillAddresses(addresses: ConstructMerkleTreeInput[]): void {
  const curLength = addresses.length;
  const lenWithPadding = Math.pow(2, Math.ceil(Math.log2(addresses.length)));

  for (let i = curLength; i < lenWithPadding; i++) {
    addresses.push({
      address: PublicKey.default.toString(),
      tokenAmount: BigInt(0),
      usdcAmount: BigInt(0),
    });
  }
}

function formatLeaf(input: ConstructMerkleTreeInput): string {
  const { address, tokenAmount: tokenAmount, usdcAmount } = input;
  return `${address},${tokenAmount},${usdcAmount}`;
}

// Token and USDC amounts are included here for simplicity even though they are
// not used in our airdrop program, because these utils are shared with our
// staking program. Requiring both is less error-prone. The USDC amount should
// be defaulted to zero in the airdrop program.
export type ConstructMerkleTreeInput = {
  address: string;
  tokenAmount: bigint;
  usdcAmount: bigint;
};

function constructMerkleTree(
  initialInput: ConstructMerkleTreeInput[]
): Uint8Array[][] {
  const input = initialInput.slice();
  validateInputs(input);
  fillAddresses(input);

  // Represent merkle tree where each array represents nodes in the same level,
  // with its parent at index (i // 2) in the next array.
  const tree: Uint8Array[][] = [[]];
  let level = 0;

  // Create the initial level of tree nodes by hashing each wallet and its token amount,
  // separated by a comma.
  for (const val of input) {
    const hash = hashLeafNode(val);
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

      const combinedHashes = new Uint8Array(node1.length + node2.length);
      combinedHashes.set(node1);
      combinedHashes.set(node2, node1.length);

      // Prepend the node prefix before hashing.
      const dataToHash = new Uint8Array(
        NODE_PREFIX.length + combinedHashes.length
      );
      dataToHash.set(NODE_PREFIX);
      dataToHash.set(combinedHashes, NODE_PREFIX.length);

      const hash = sha256(dataToHash);
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

function hashLeafNode(leaf: ConstructMerkleTreeInput): Uint8Array {
  const encoder = new TextEncoder();
  const leafData = encoder.encode(formatLeaf(leaf));
  const dataToHash = new Uint8Array(LEAF_PREFIX.length + leafData.length);
  dataToHash.set(LEAF_PREFIX);
  dataToHash.set(leafData, LEAF_PREFIX.length);
  return sha256(dataToHash);
}

export type GenerateMerkleProofInput = {
  address: string;
  tokenAmount: bigint;
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
  tokenAmount,
  usdcAmount,
  index,
  merkleTree,
  // This allows us to construct deliberately invalid proofs for testing purposes.
  skipChecksForTests = false,
}: GenerateMerkleProofInput): GenerateMerkleProofOutput {
  if (index < 0) {
    throw new Error(`Index is negative, received: ${index}`);
  }

  const hash = hashLeafNode({ address, tokenAmount, usdcAmount });

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
    let combinedHashes: Uint8Array;

    if (proofPath[i]) {
      combinedHashes = new Uint8Array(sibling.length + currentHash.length);
      combinedHashes.set(sibling);
      combinedHashes.set(currentHash, sibling.length);
    } else {
      combinedHashes = new Uint8Array(currentHash.length + sibling.length);
      combinedHashes.set(currentHash);
      combinedHashes.set(sibling, currentHash.length);
    }

    // Prepend the node prefix before hashing.
    const dataToHash = new Uint8Array(
      NODE_PREFIX.length + combinedHashes.length
    );
    dataToHash.set(NODE_PREFIX);
    dataToHash.set(combinedHashes, NODE_PREFIX.length);

    currentHash = sha256(dataToHash);
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
  generateMerkleProof,
  getTreeRoot,
  hashLeafNode,
  logProofInBase58,
  logTreeInBase58,
  sha256,
  sortAddressList,
  verifyProof,
};
