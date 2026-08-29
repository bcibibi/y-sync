import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { createYSyncClient } from "../utils/client.js";
import { closeYSyncWebSocket, createYSyncWebSocket, type TestServer } from "../utils/server.js";
import { timeout } from "../utils/timeout.js";

const PORT = 3000;

let s: TestServer;

beforeAll(async () => {
    s = await createYSyncWebSocket(PORT, {
        awareness: {
            resyncInterval: 2000
        }
    });
}, 10000);

test("test", async () => new Promise<void>(async (resolve, reject) => {
    const client = await createYSyncClient(PORT, { onError: reject });
    const client2 = await createYSyncClient(PORT, { onError: reject });

    const awareness = client.getAwareness();
    const awareness2 = client2.getAwareness();

    const value = { user: { name: "Alice" } };

    awareness.setLocalState(value);

    await timeout(3000);

    const state = awareness2.states.get(awareness.clientID);
    console.log("Client 2 received awareness state from Client 1:", state);
    expect(state).toEqual(value);

    client.close();
    client2.close();
    resolve();
}), 10000);

afterAll(async () => {
    return closeYSyncWebSocket(s);
}, 10000);
