import dotenv from "dotenv";

import { parseKeypairFromString } from "@sdk/src/utils";

dotenv.config();

export const OPERATOR_POOL_SIZE = process.env.OPERATOR_POOL_SIZE
  ? parseInt(process.env.OPERATOR_POOL_SIZE)
  : 5;

export const DELEGATOR_COUNT = process.env.DELEGATOR_COUNT
  ? parseInt(process.env.DELEGATOR_COUNT)
  : 5;

export const NUMBER_OF_EPOCHS = process.env.NUMBER_OF_EPOCHS
  ? parseInt(process.env.NUMBER_OF_EPOCHS)
  : 5;

export const EPOCH_CLAIM_FREQUENCY = process.env.EPOCH_CLAIM_FREQUENCY
  ? parseInt(process.env.EPOCH_CLAIM_FREQUENCY)
  : 2;

export const TEST_WITH_RELAY = process.env.TEST_WITH_RELAY
  ? process.env.TEST_WITH_RELAY === "true"
  : false;

export const SHOULD_CLOSE_ACCOUNTS = process.env.SHOULD_CLOSE_ACCOUNTS
  ? process.env.SHOULD_CLOSE_ACCOUNTS === "true"
  : false;

export const API_URL = process.env.API_URL
  ? process.env.API_URL
  : "http://localhost:3001";

export const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? "";

export const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD ?? "";

const PROGRAM_ADMIN_KEYPAIR_STRING = process.env.PROGRAM_ADMIN_KEYPAIR;

const REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR_STRING =
  process.env.REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR;

export const PROGRAM_ADMIN_KEYPAIR = parseKeypairFromString(
  PROGRAM_ADMIN_KEYPAIR_STRING
);

export const REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR = parseKeypairFromString(
  REWARD_DISTRIBUTION_AUTHORITY_KEYPAIR_STRING
);

const PAYER_KEYPAIR_STRING = process.env.PAYER_KEYPAIR;

export const PAYER_KEYPAIR = parseKeypairFromString(PAYER_KEYPAIR_STRING);
