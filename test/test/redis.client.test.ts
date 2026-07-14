import { YSyncRedis } from "y-sync-redis";
import { beforeAll, test, afterAll, expect } from "@jest/globals";
import {Redis} from "ioredis";
import { timeout } from "../utils/timeout.js";
import { createRedisClient } from "../utils/redis.js";

test("YSyncRedis class should be defined", async () => {
    const server1 = await createRedisClient();
    const server2 = await createRedisClient();

    server1.use((doc, action) => {
        if (action === 'create') {
            console.log(`server : Document created with id: ${doc.guid}`);
            doc.getMap("testMap").set("testKey", "initialValue");
        } else if (action === 'update') {
            console.log(`server : Document updated with id: ${doc.guid}`);
            console.log(`server : Document content:`, doc.getMap("testMap").toJSON());
        }
    });

    server2.use((doc, action) => {
        if (action === 'create') {
            console.log(`client : Document created with id: ${doc.guid}`);
        } else if (action === 'update') {
            console.log(`client : Document updated with id: ${doc.guid}`);
            console.log(`client : Document content:`, doc.getMap("testMap").toJSON());
            doc.getMap("testMap").set("lastUpdate", new Date().toISOString());
        }
    });

    await server1.withDocument("test-doc", async (doc) => {
        expect(doc.getMap("testMap").get("testKey")).toBe("initialValue");
    });

    await server2.withDocument("test-doc", async (doc) => {
        expect(doc.getMap("testMap").get("testKey")).toBe("initialValue");
        doc.getMap("testMap").set("testKey", "testValue");
        await timeout(2000);
    });

});