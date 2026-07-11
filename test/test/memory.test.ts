import { beforeAll, test, afterAll, expect } from "@jest/globals";
import { YSync } from "y-sync";
import { YSyncClient } from "y-sync-client";
import http from "http";
import { closeYSyncWebSocket, createYSyncWebSocket } from "../utils/server.js";
import { createYSyncClient } from "../utils/client.js";
import { timeout } from "../utils/timeout.js";

const PORT = 3000;
let ySync: YSync;

beforeAll(async () => {

    ySync = await createYSyncWebSocket(PORT);

    ySync.use((doc, action) => {
        if (action === 'create') {
            console.log(`Document created with id: ${doc.guid}`);
            doc.getMap("testMap").set("testKey", "testValue");
        } else if (action === 'update') {
            console.log(`Document updated with id: ${doc.guid}`);
            console.log(`Document content:`, doc.getMap("testMap").toJSON());
        }
    });

}, 10000);


test("test", async () => new Promise<void>(async (resolve, reject) => {
    const client = await createYSyncClient(PORT, { onError: reject, onDisconnect: resolve });

    const doc = await client.getYDocument("test-doc");
    await timeout(2000);

    console.log("Document retrieved:", doc.guid);
    console.log("Document content:", doc.getMap("testMap").toJSON());

    expect(doc.getMap("testMap").get("testKey")).toBe("testValue");

    doc.getMap("testMap").set("testKey", "newValue");

    await timeout(2000);

    client.close();
}), 10000);

afterAll(async () => {
    return closeYSyncWebSocket(ySync);
}, 10000);