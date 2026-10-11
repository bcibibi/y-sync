import { afterAll, beforeAll, test } from "vitest";
import { createYSyncClient } from "../utils/client.js";
import { closeYSyncWebSocket, createYSyncWebSocket, type TestServer } from "../utils/server.js";

const PORT = 3000;

let s: TestServer;

const startServer = async () => {

    s = await createYSyncWebSocket(PORT);

}

beforeAll(startServer, 10000);

test("default", () => createYSyncClient(PORT).then(client => client.close()), 15000);

test("unauthorized", () => new Promise<void>(async (resolve, reject) => {
    s.ysync.auth((socket, next) => next(false));
    createYSyncClient(PORT, {
        onError: (err) => {
            console.error("Unauthorized error received:", err);
            resolve();
        }
    });
}), 15000);

test("error", () => new Promise<void>(async (resolve, reject) => {
    s.ysync.auth((socket, next) => next(new Error("Unauthorized")));
    createYSyncClient(PORT, {
        onError: (err) => {
            console.error("Unauthorized error received:", err);
            resolve();
        }
    });
}), 15000);

test("authorized", async () => {
    s.ysync.auth((socket, next) => {
        next(socket.request?.headers?.test === "test");
    });
    const client = await createYSyncClient(PORT);
    client.close();
}, 15000);

afterAll(async () => {
    return closeYSyncWebSocket(s);
}, 10000);