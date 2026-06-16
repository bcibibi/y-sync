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

    ySync = new YSync(server);

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


test("test", async () => {
    const client = YSyncClient.connect(`ws://localhost:${PORT}`);
    await new Promise<void>((resolve) => setTimeout(resolve, 3000));
    client.close();
}, 10000);

afterAll(async () => {
    return new Promise<void>((resolve, reject) => {
        ySync.close(err => {
            if (err) {
                reject(err);
            } else {
                server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log("Server closed");
                        resolve();
                    }
                });
            }
        });
    });
}, 10000);