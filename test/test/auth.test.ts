import { afterAll, beforeAll, test } from "@jest/globals";
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
    s.ysync.auth((_req, _res, next) => next(false));
    createYSyncClient(PORT, { onError: () => resolve()});
}), 15000);

test("error", () => new Promise<void>(async (resolve, reject) => {
    s.ysync.auth((_req, _res, next) => next(new Error("Unauthorized")));
    createYSyncClient(PORT, { onError: () => resolve()});
}), 15000);

test("authorized", async () => {
    s.ysync.auth((_req, _res, next) => next(true));
    const client = await createYSyncClient(PORT);
    client.close();
}, 15000);

afterAll(async () => {
    return closeYSyncWebSocket(s);
}, 10000);