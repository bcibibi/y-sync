import { YSyncRedis } from "y-sync-redis";
import { beforeAll, test, afterAll, expect } from "@jest/globals";

test("YSyncRedis class should be defined", () => {
    expect(YSyncRedis).toBeDefined();
});