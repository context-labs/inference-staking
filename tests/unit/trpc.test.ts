import { assert } from "chai";

import { TrpcHttpClient } from "@tests/lib/trpc";

describe("TrpcHttpClient", () => {
  test("should login successfully", async () => {
    const trpc = new TrpcHttpClient();
    const result = await trpc.login();
    assert.isTrue(result);
  });
});
