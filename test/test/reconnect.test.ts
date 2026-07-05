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
            resyncInterval: 10000
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


test("test", () => new Promise<void>((resolve, reject) => {
    const client = new YSyncClient(`ws://localhost:${PORT}`, {
        reconnectInterval: 3000
    });
    client.on('error', (error) => {
        console.error("Client encountered an error:", error);
    });
    client.on('reconnect', () => {
        console.log("Client reconnected to server");
        setTimeout(resolve, 2000);
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