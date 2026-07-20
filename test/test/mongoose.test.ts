import { beforeAll, test, afterAll, expect } from "@jest/globals";
import { connectToDatabase, getMongooseDocument } from "../utils/mongoose.js";
import type { YSync } from "y-sync";
import { createYSyncWebSocket } from "../utils/server.js";
import { ySyncMongooseMiddleware } from "y-sync-mongoose/middleware";
import { timeout } from "../utils/timeout.js";

let id: string | undefined = undefined;
const PORT = 3000;
let ySync: YSync;

beforeAll(async () => {
    id = await connectToDatabase().then(doc => doc._id.toString());
    expect(id).toBeDefined();

    ySync = await createYSyncWebSocket(PORT);

    ySync.use(ySyncMongooseMiddleware({ wait: 1000 }));
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
    await ySync.close();
});