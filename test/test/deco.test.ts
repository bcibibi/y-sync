import { beforeAll, test, afterAll, expect } from "@jest/globals";
import { YSync } from "y-sync";
import { YSyncClient } from "y-sync-client";
import http from "http";
import * as Y from "yjs";

const PORT = 3000;

let ySync: YSync;

const startServer = async () => {

    const server = http.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("Hello world\n");
    });

    ySync = new YSync(server);

    ySync.use((doc, action) => {
        if (action === 'create') {
            console.log(`Document created with id: ${doc.guid}`);
            doc.getMap("testMap").set("testKey", "initialValue");
        } else if (action === 'update') {
            console.log(`Document updated with id: ${doc.guid}`);
            console.log(`Document content:`, doc.getMap("testMap").toJSON());
        }
    });

    await new Promise<void>((resolve, reject) => {
        server.listen(PORT, (err?: Error) => {
            if (err) {
                reject(err);
            } else {
                console.log(`Server running at http://localhost:${PORT}/`);
                resolve();
            }
        });
    });
}

beforeAll(startServer, 10000);

test("test", () => new Promise<void>(async (resolve, reject) => {
    let doc: Y.Doc | undefined;
    const client = new YSyncClient(`ws://localhost:${PORT}`);
    client.on('error', (error) => {
        console.error("Client encountered an error:", error);
    });
    client.on('reconnect', () => {
        console.log("Client reconnected to server");
        setTimeout(() => {
            console.log("doc value after reconnect:", doc?.getMap("testMap").get("testKey"));
            client.close();
            resolve();
        }, 3000);
    });

    console.log("Waiting for client to connect...");
    await new Promise<void>((resolve) => client.on('connect', resolve));
    doc = await client.getYDocument("test-doc");
    doc.getMap("testMap").set("testKey", "testValue");
    console.log("Client connected to server");
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));

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
    console.log("Closing server and YSync instance");
    return new Promise<void>((resolve, reject) => {
        ySync.close(err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}, 10000);