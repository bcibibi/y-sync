import { beforeAll, test, afterAll, expect } from "@jest/globals";
import { YSync, RedisYDocProvider } from "y-sync";
import { YSyncClient } from "y-sync-client";
import http from "http";
import { closeYSyncWebSocket, createYSyncWebSocket } from "../utils/server.js";
import { createYSyncClient } from "../utils/client.js";
import { timeout } from "../utils/timeout.js";
import {Redis} from "ioredis";
import { YSyncRedis } from "y-sync-redis";
import { createRedisClient } from "../utils/redis.js";

const PORT = 3000;
let ySync: YSync;
let clientRedis: YSyncRedis;
let client1: YSyncClient;
let client2: YSyncClient;
beforeAll(async () => {
    clientRedis = await createRedisClient('client');

    const pub = new Redis("redis://redis:6379");
    
    const keys = await pub.keys("yjs:*");

    if (keys.length > 0) {
        await pub.del(...keys);
    }

    const sub = pub.duplicate();
    ySync = await createYSyncWebSocket(PORT, {
        provider: new RedisYDocProvider({
            pub, 
            sub,
            memoryTTL: 5
        })
    });

    ySync.use((doc, action, origin) => {
        if (action === 'create') {
            console.log(`Document created with id: ${doc.guid}`);
            doc.getMap("testMap").set("testKey", "testValue");
        } else if (action === 'update') {
            console.log(`Document updated with id: ${doc.guid}`);
            console.log(`Document content:`, doc.getMap("testMap").toJSON());
            doc.getMap("testMap").set("lastUpdate", new Date().toISOString());
        }
    });

    clientRedis.use((doc, action, update, origin) => {
        if (action === 'create') {
            console.log(`clientRedis : Document created with id: ${doc.guid}`);
        } else if (action === 'update') {
            console.log(`clientRedis : Document updated with id: ${doc.guid}`);
            console.log(`clientRedis : Document content:`, doc.getMap("testMap").toJSON());
            //doc.getMap("testMap").set("lastUpdate", new Date().toISOString());
        }
    });

}, 10000);


test("test", async () => new Promise<void>(async (resolve, reject) => {
    client1 = await createYSyncClient(PORT, { onError: reject, onDisconnect: resolve });

    const doc = await client1.getYDocument("test-doc");
    await timeout(2000);

    console.log("Document retrieved:", doc.guid);
    console.log("Document content:", doc.getMap("testMap").toJSON());

    expect(doc.getMap("testMap").get("testKey")).toBe("testValue");

    doc.getMap("testMap").set("testKey", "newValue");

    await timeout(2000);

    console.log("Last update:", doc.getMap("testMap").get('lastUpdate'));
    expect(doc.getMap("testMap").get("lastUpdate")).toBeDefined();

    await timeout(4000);

    client2 = await createYSyncClient(PORT, { onError: reject, onDisconnect: resolve });
    const doc2 = await client2.getYDocument("test-doc");

    expect(doc2.getMap("testMap").get("testKey")).toBe("newValue");

    doc2.getMap("testMap").set("testKey", "finalValue");

    await timeout(2000);

    expect(doc.getMap("testMap").get("testKey")).toBe("finalValue");

    client1.close();
    client2.close();
}), 15000);

afterAll(async () => {
    client1.close();
    // client2.close();
    return closeYSyncWebSocket(ySync);
}, 10000);