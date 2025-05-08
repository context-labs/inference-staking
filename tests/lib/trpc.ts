/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import superjson from "superjson";

import { API_URL, LOGIN_EMAIL, LOGIN_PASSWORD } from "@tests/lib/const";

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
      params.input = JSON.stringify(input);
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

      if (result) {
        if (typeof result === "string") {
          try {
            return superjson.parse(result);
          } catch {
            return result as unknown as T;
          }
        }

        return result as T;
      }

      return response.data as T;
    }

    throw new Error(
      `Request failed with status ${response.status}: ${response.statusText}`
    );
  }

  public async login(): Promise<boolean> {
    try {
      const params = { email: LOGIN_EMAIL, password: LOGIN_PASSWORD };
      const response = await this.mutate("user.login", params);

      if (response.user && response.token) {
        this.token = response.token;
      }

      return true;
    } catch (error) {
      console.error(
        "Login error:",
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  public async executeEpochFinalization(): Promise<any> {
    try {
      const result = await this.mutate(
        "epochFinalizationTRPC.executeEpochFinalization"
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
        "epochFinalizationTRPC.getCurrentEpochFinalization"
      );
      return result;
    } catch (error) {
      console.error("Error getting current epoch finalization:", error);
      throw error;
    }
  }

  public async createRewardRecord(): Promise<any> {
    try {
      const result = await this.mutate(
        "epochFinalizationTRPC.createRewardRecord"
      );
      return result;
    } catch (error) {
      console.error("Error creating reward record:", error);
      throw error;
    }
  }

  public async checkRewardClaimEligibility(
    operatorPoolPda: string,
    epoch: bigint
  ): Promise<any> {
    try {
      const params = {
        operatorPoolPda,
        epoch,
      };

      const result = await this.mutate(
        "staking.checkRewardClaimEligibility",
        params
      );

      return result;
    } catch (error) {
      console.error("Error checking reward claim eligibility:", error);
      throw error;
    }
  }
}

const trpcHttp = new TrpcHttpClient();

export default trpcHttp;
