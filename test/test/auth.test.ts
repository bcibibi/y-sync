import { beforeAll, test, afterAll } from "@jest/globals";
import { YSyncServer } from "@bcibibi/y-sync-server";
import { closeYSyncWebSocket, createYSyncWebSocket } from "../utils/server.js";
import { createYSyncClient } from "../utils/client.js";
import { timeout } from "../utils/timeout.js";

const PORT = 3000;

let ySync: YSyncServer;

const startServer = async () => {

    ySync = await createYSyncWebSocket(PORT);

}

beforeAll(startServer, 10000);

test("default", () => createYSyncClient(PORT).then(client => client.close()), 15000);

test("unauthorized", () => new Promise<void>(async (resolve, reject) => {
    ySync.auth((_req, _res, next) => next(false));
    createYSyncClient(PORT, { onError: () => resolve()});
}), 15000);

test("error", () => new Promise<void>(async (resolve, reject) => {
    ySync.auth((_req, _res, next) => next(new Error("Unauthorized")));
    createYSyncClient(PORT, { onError: () => resolve()});
}), 15000);

test("authorized", async () => {
    ySync.auth((_req, _res, next) => next(true));
    const client = await createYSyncClient(PORT);
    client.close();
}, 15000);

afterAll(async () => {
    return closeYSyncWebSocket(ySync);
}, 10000);