import { TrpcHttpClient } from "@tests/lib/trpc";

describe.skip("TrpcHttpClient", () => {
  test("should login successfully", async () => {
    const trpc = new TrpcHttpClient();
    await trpc.login();
  });
});
