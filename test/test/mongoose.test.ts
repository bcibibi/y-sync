import { ySyncMongooseMiddleware } from "@bcibibi/y-sync-middleware-mongoose/middleware";
import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { connectToDatabase, getMongooseDocument } from "../utils/mongoose.js";
import { closeYSyncWebSocket, createYSyncWebSocket, type TestServer } from "../utils/server.js";
import { timeout } from "../utils/timeout.js";

let id: string | undefined = undefined;
const PORT = 3000;
let s: TestServer;

beforeAll(async () => {
    id = await connectToDatabase().then(doc => doc._id.toString());
    expect(id).toBeDefined();

    s = await createYSyncWebSocket(PORT);

    s.ysync.use(ySyncMongooseMiddleware({ wait: 1000 }));
}, 10000);

test("mongoose", async () => {
    console.log("Document ID:", id);
    if (!id) {
        throw new Error("Document ID is not defined");
    }

    const document = await getMongooseDocument(id);
    console.log("Document retrieved:", document?.toJSON());
    expect(document).toBeDefined();
    document?.set("value", 42);
    await timeout(3000); // Wait for the debounced sync to complete
})

afterAll(async () => {
    return closeYSyncWebSocket(s);
});