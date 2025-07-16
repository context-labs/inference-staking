import dotenv from "dotenv";

import { parseKeypairFromString } from "@sdk/src/utils";

dotenv.config();

export const OPERATOR_POOL_SIZE = process.env.OPERATOR_POOL_SIZE
  ? parseInt(process.env.OPERATOR_POOL_SIZE)
  : 3;

export const DELEGATOR_COUNT = process.env.DELEGATOR_COUNT
  ? parseInt(process.env.DELEGATOR_COUNT)
  : 3;

export const NUMBER_OF_EPOCHS = process.env.NUMBER_OF_EPOCHS
  ? parseInt(process.env.NUMBER_OF_EPOCHS)
  : 3;

export const EPOCH_CLAIM_FREQUENCY = process.env.EPOCH_CLAIM_FREQUENCY
  ? parseInt(process.env.EPOCH_CLAIM_FREQUENCY)
  : 1;

export const TEST_WITH_INFERENCE_BACKEND = process.env
  .TEST_WITH_INFERENCE_BACKEND
  ? process.env.TEST_WITH_INFERENCE_BACKEND === "true"
  : false;

export const PREVENT_UNSTAKE = process.env.PREVENT_UNSTAKE
  ? process.env.PREVENT_UNSTAKE === "true"
  : false;

export const PREVENT_CLOSE_ACCOUNTS = process.env.PREVENT_CLOSE_ACCOUNTS
  ? process.env.PREVENT_CLOSE_ACCOUNTS === "true"
  : false;

export const SHOULD_EXECUTE_MULTIPLE_EPOCH_FINALIZATIONS = process.env
  .SHOULD_EXECUTE_MULTIPLE_EPOCH_FINALIZATIONS
  ? process.env.SHOULD_EXECUTE_MULTIPLE_EPOCH_FINALIZATIONS === "true"
  : false;

export const API_URL = process.env.API_URL
  ? process.env.API_URL
  : "http://localhost:3001";

export const INFERENCE_LOGIN_EMAIL = process.env.INFERENCE_LOGIN_EMAIL ?? "";

export const INFERENCE_LOGIN_PASSWORD =
  process.env.INFERENCE_LOGIN_PASSWORD ?? "";

const PROGRAM_ADMIN_KEYPAIR_STRING = process.env.PROGRAM_ADMIN_KEYPAIR;

const REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR_STRING =
  process.env.REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR;

const HALTING_AUTHORITY_KEYPAIR_STRING = process.env.HALTING_AUTHORITY_KEYPAIR;

const SLASHING_AUTHORITY_KEYPAIR_STRING =
  process.env.SLASHING_AUTHORITY_KEYPAIR;

export const PROGRAM_ADMIN_KEYPAIR = parseKeypairFromString(
  PROGRAM_ADMIN_KEYPAIR_STRING
);

export const REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR = parseKeypairFromString(
  REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR_STRING
);

export const HALTING_AUTHORITY_KEYPAIR = parseKeypairFromString(
  HALTING_AUTHORITY_KEYPAIR_STRING
);

export const SLASHING_AUTHORITY_KEYPAIR = parseKeypairFromString(
  SLASHING_AUTHORITY_KEYPAIR_STRING
);

const PAYER_KEYPAIR_STRING = process.env.PAYER_KEYPAIR;

export const PAYER_KEYPAIR = parseKeypairFromString(PAYER_KEYPAIR_STRING);

const TOKEN_MINT_OWNER_KEYPAIR_STRING = process.env.TOKEN_MINT_OWNER_KEYPAIR;

export const TOKEN_MINT_OWNER_KEYPAIR = parseKeypairFromString(
  TOKEN_MINT_OWNER_KEYPAIR_STRING
);
