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

    ySync.use((doc, action) => {
        if (action === 'create') {
            console.log(`Document created with id: ${doc.guid}`);
            doc.getMap("testMap").set("testKey", "testValue");
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
}, 10000);


test("test", async () => new Promise<void>((resolve, reject) => {
    const client = new YSyncClient(`ws://localhost:${PORT}`);
    client.on('connect', async () => {
        console.log("Client connected to server");
        const doc = await client.getYDocument("test-doc");
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        console.log("Document retrieved:", doc.guid);
        console.log("Document content:", doc.getMap("testMap").toJSON());
        expect(doc.getMap("testMap").get("testKey")).toBe("testValue");
        doc.getMap("testMap").set("testKey", "newValue");
        await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        client.close();
    });
    client.on('disconnect', () => {
        console.log("Client disconnected from server");
        resolve();
    });
    client.on('error', (error) => {
        console.error("Client encountered an error:", error);
        reject(error);
    });
}), 10000);

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