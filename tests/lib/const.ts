import dotenv from "dotenv";

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

export const API_URL = process.env.API_URL
  ? process.env.API_URL
  : "http://localhost:3001";

export const LOGIN_EMAIL = process.env.LOGIN_EMAIL ?? "";

export const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD ?? "";
