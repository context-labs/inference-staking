/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import superjson from "superjson";

import { API_URL, LOGIN_EMAIL, LOGIN_PASSWORD } from "@tests/lib/const";

type ServiceResponse = {
  status:
    | "200"
    | "400"
    | "401"
    | "402"
    | "403"
    | "404"
    | "422"
    | "429"
    | "500"
    | "504";
};

export type OperatorPoolRewardClaimApiResponse = {
  operatorPoolPda: string;
  operatorPoolId: bigint;
  epoch: bigint;
  merkleRewardAmount: bigint | null;
  merkleUsdcAmount: bigint | null;
  proof: string[] | null;
  proofPath: boolean[] | null;
  merkleTreeIndex: number | null;
  claimedAt: Date | null;
  txSignature: string | null;
};

type RewardEmissionApiResponse = {
  epoch: bigint;
  uptimeRewards: bigint;
  tokenRewards: bigint;
  totalRewards: bigint;
};

type CheckRewardClaimEligibilityResponse = ServiceResponse & {
  claim: OperatorPoolRewardClaimApiResponse;
};

type GetRewardClaimsForEpochResponse = ServiceResponse & {
  rewardClaims: OperatorPoolRewardClaimApiResponse[];
};

type GetRewardEmissionsForEpochResponse = ServiceResponse & {
  rewardEmissions: RewardEmissionApiResponse;
};

type RunProgramAccountStateValidationResponse = ServiceResponse & {
  isStateValid: boolean;
};

export class TrpcHttpClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = `${API_URL}/api/trpc/`) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      return headers;
    }

    return headers;
  }

  private async query<TInput = any, TOutput = any>(
    path: string,
    input?: TInput,
    config?: AxiosRequestConfig
  ): Promise<TOutput> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}${path}`;

    const params: Record<string, string> = {};

    if (input) {
      params.input = superjson.stringify(input);
    }

    const response = await axios.get(url, {
      ...config,
      headers,
      params,
    });

    return this.handleResponse<TOutput>(response);
  }

  private async mutate<TInput = any, TOutput = any>(
    path: string,
    input?: TInput,
    config?: AxiosRequestConfig
  ): Promise<TOutput> {
    const headers = this.getHeaders();
    const url = `${this.baseUrl}${path}`;

    const data = input ? superjson.stringify(input) : undefined;

    const response = await axios.post(url, data, {
      ...config,
      headers,
    });

    return this.handleResponse<TOutput>(response);
  }

  private handleResponse<T>(response: AxiosResponse): T {
    if (response.status >= 200 && response.status < 300) {
      const result = response.data?.result;
      return result.data.json as T;
    }

    throw new Error(
      `Request failed with status ${response.status}: ${response.statusText}`
    );
  }

  public async login(): Promise<void> {
    try {
      const params = { email: LOGIN_EMAIL, password: LOGIN_PASSWORD };
      const response = await this.mutate("user.login", params);
      if (response.user && response.token) {
        this.token = response.token;
      } else {
        throw new Error("Login failed");
      }
    } catch (error) {
      console.error(
        "Login error:",
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  public async executeEpochFinalization(): Promise<any> {
    try {
      const result = await this.mutate(
        "epochFinalization.executeEpochFinalization"
      );
      return result;
    } catch (error) {
      console.error("Error executing epoch finalization:", error);
      throw error;
    }
  }

  public async getCurrentEpochFinalization(): Promise<any> {
    try {
      const result = await this.query(
        "epochFinalization.getCurrentEpochFinalization"
      );
      return result;
    } catch (error) {
      console.error("Error getting current epoch finalization:", error);
      throw error;
    }
  }

  public async createRewardRecord(): Promise<any> {
    try {
      const result = await this.mutate("epochFinalization.createRewardRecord");
      return result;
    } catch (error) {
      console.error("Error creating reward record:", error);
      throw error;
    }
  }

  public async checkRewardClaimEligibility(
    operatorPoolPda: string,
    epoch: bigint
  ): Promise<CheckRewardClaimEligibilityResponse> {
    try {
      const params = {
        operatorPoolPda,
        epoch,
      };

      const result = await this.mutate(
        "staking.checkRewardClaimEligibility",
        params
      );

      return result as CheckRewardClaimEligibilityResponse;
    } catch (error) {
      console.error("Error checking reward claim eligibility:", error);
      throw error;
    }
  }

  public async getRewardClaimsForEpoch(
    epoch: bigint
  ): Promise<GetRewardClaimsForEpochResponse> {
    try {
      const result = await this.query("staking.getRewardClaimsForEpoch", {
        epoch,
      });
      return result as GetRewardClaimsForEpochResponse;
    } catch (error) {
      console.error("Error getting reward claims for epoch:", error);
      throw error;
    }
  }

  public async insertAndProcessTransactionBySignature(signature: string) {
    try {
      const result = await this.mutate(
        "solanaTransactions.insertAndProcessTransactionBySignature",
        {
          signature,
        }
      );
      return result;
    } catch (error) {
      console.error(
        "Error inserting and processing transaction by signature:",
        error
      );
      throw error;
    }
  }

  public async getRewardEmissionsForEpoch(
    epoch: bigint
  ): Promise<GetRewardEmissionsForEpochResponse> {
    try {
      const result = await this.query("staking.getRewardEmissionsForEpoch", {
        epoch,
      });
      return result as GetRewardEmissionsForEpochResponse;
    } catch (error) {
      console.error("Error getting reward emissions for epoch:", error);
      throw error;
    }
  }

  public async runProgramAccountStateValidation(): Promise<RunProgramAccountStateValidationResponse> {
    try {
      const result = await this.mutate(
        "stakingProgramService.runProgramAccountStateValidation"
      );
      return result as RunProgramAccountStateValidationResponse;
    } catch (error) {
      console.error("Error running program account state validation:", error);
      throw error;
    }
  }
}

const trpcHttp = new TrpcHttpClient();

export default trpcHttp;
