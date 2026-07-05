import { beforeAll, test, afterAll, expect } from "@jest/globals";
import { YSync } from "y-sync";
import { YSyncClient } from "y-sync-client";
import http from "http";

const PORT = 3000;
const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Hello world\n");
});

let ySync: YSync;

beforeAll(async () => {

    ySync = new YSync(server, {
        awareness: {
            resyncInterval: 2000
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
}, 10000);


test("test", async () => new Promise<void>(async (resolve, reject) => {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const client = new YSyncClient(`ws://localhost:${PORT}`);
    const client2 = new YSyncClient(`ws://localhost:${PORT}`);

    client.on('disconnect', () => {
        console.log("Client disconnected from server");
        resolve();
    });
    client.on('error', (error) => {
        console.error("Client encountered an error:", error);
        reject(error);
    });

    await new Promise<void>((resolve) => client.on('connect', resolve));
    await new Promise<void>((resolve) => client2.on('connect', resolve));
    const awareness = client.getAwareness();
    const awareness2 = client2.getAwareness();
    awareness.setLocalState({ user: { name: "Alice" } });
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    const state = awareness2.states.get(awareness.clientID);
    console.log("Client 2 received awareness state from Client 1:", state);
    client.close();
    client2.close();
}), 10000);

afterAll(async () => {
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