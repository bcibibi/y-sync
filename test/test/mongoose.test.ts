import { ySyncMongooseMiddleware } from "@bcibibi/y-sync-middleware-mongoose/middleware";
import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { connectToDatabase, withMongooseDocument } from "../utils/mongoose.js";
import { closeYSyncWebSocket, createYSyncWebSocket, type TestServer } from "../utils/server.js";
import { timeout } from "../utils/timeout.js";
import * as Y from 'yjs';

let id: string | undefined = undefined;
const iderr: string = '68b16a9c2f7b7cfa4bcb6f51';
let updateerr: boolean = false;
let createerr: boolean = true;
const PORT = 3000;
let s: TestServer;

beforeAll(async () => {
    console.log("Connecting to database...");
    id = await connectToDatabase().then(doc => doc._id.toString());
    console.log("Connected to database with document ID:", id);
    expect(id).toBeDefined();

    s = await createYSyncWebSocket(PORT);

    s.ysync.use(ySyncMongooseMiddleware({
        wait: 1000, update: (model, doc, transaction) => {
            if (updateerr) throw new Error("Update error simulated");
            transaction(() => doc.set("value", ((doc as Y.Map<{ value: number }>).getValue("value") ?? 0) + 1))
        }, 
        create: (model, doc, transaction) => {
            if (createerr) throw new Error("Create error simulated");
        }
    }));

}, 10000);

test("mongoose", async () => {
    console.log("Document ID:", id);
    if (!id) {
        throw new Error("Document ID is not defined");
    }
    
    await expect(withMongooseDocument(id, async (document) => { })).rejects.toBeDefined();

    createerr = false;
    
    await withMongooseDocument(id, async (document) => {
        console.log("Document retrieved:", document?.toJSON());
        expect(document).toBeDefined();
        document?.set("value", 42);
        await timeout(3000); // Wait for the debounced sync to complete
        expect(document?.getValue("value")).toBe(43); // The value should have been incremented by the middleware
    });

    await expect(withMongooseDocument(iderr, async (document) => { })).rejects.toBeDefined();

    updateerr = true;
    const result = await new Promise<any>(resolve =>  withMongooseDocument(id ?? '', async (document) => { 
        document?.set("value", 42);
        await timeout(3000); // Wait for the debounced sync to complete
    }, (err) => resolve(err)));
    console.log("Result of update with error:", result);
    expect(result?.stack ?? '' ).toContain("Update error simulated");
    updateerr = false;
}, 15000)

afterAll(async () => {
    return closeYSyncWebSocket(s);
});