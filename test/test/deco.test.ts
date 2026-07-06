import { beforeAll, test, afterAll } from "@jest/globals";
import { YSync } from "y-sync";
import { closeYSyncWebSocket, createYSyncWebSocket } from "../utils/server.js";
import { createYSyncClient } from "../utils/client.js";
import { timeout } from "../utils/timeout.js";

const PORT = 3000;

let ySync: YSync;

const startServer = async () => {

    ySync = await createYSyncWebSocket(PORT);

    ySync.use((doc, action) => {
        if (action === 'create') {
            console.log(`Document created with id: ${doc.guid}`);
            doc.getMap("testMap").set("testKey", "initialValue");
        } else if (action === 'update') {
            console.log(`Document updated with id: ${doc.guid}`);
            console.log(`Document content:`, doc.getMap("testMap").toJSON());
        }
    });

}

beforeAll(startServer, 10000);

test("test", () => new Promise<void>(async (resolve, reject) => {
    const client = await createYSyncClient(PORT, {}, { reconnectInterval: 2000 });
    
    client.on('reconnect', () => {
        console.log("Client reconnected to server");
        setTimeout(() => {
            console.log("doc value after reconnect:", doc?.getMap("testMap").get("testKey"));
            client.close();
            resolve();
        }, 3000);
    });

    console.log("Client connected to server, creating document and setting initial value");
    const doc = await client.getYDocument("test-doc");
    doc.getMap("testMap").set("testKey", "testValue");

    await timeout(2000);

    console.log("Closing server to simulate disconnection");

    ySync.close(err => {
        if (err) {
            console.error("Error closing YSync instance:", err);
        } else {
            doc.getMap("testMap").set("testKey", "newValue");
            console.log("Server closed, waiting for client to reconnect...");
            setTimeout(startServer, 2000);
        }
    });
}), 15000);

afterAll(async () => {
    return closeYSyncWebSocket(ySync);
}, 10000);