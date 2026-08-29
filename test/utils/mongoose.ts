import mongoose from 'mongoose';
import { YSyncMongoose } from "@bcibibi/y-sync-middleware-mongoose/client";
import * as Y from 'yjs';


interface TestDocument {
    name: string;
    value: number;
}

const testSchema = new mongoose.Schema({
    name: { type: String, required: true },
    value: { type: Number, required: true }
});

export async function connectToDatabase() {
    await mongoose.connect('mongodb://admin:admin@mongodb:27017', {
        dbName: 'test'
    });
    const TestModel = mongoose.model('Test', testSchema);

    const existingDoc = await TestModel.findOne({ name: 'test' }).exec();
    if (existingDoc) {
        await existingDoc.updateOne({ value: 0 }).exec();
        return existingDoc;
    }

    const newDoc = new TestModel({ name: 'test', value: 0 });
    await newDoc.save();
    return newDoc;
}

export async function withMongooseDocument(id: string, callback: (doc: Y.Map<any>) => Promise<void> | void, errcb?: (error: any) => void) {
    const client = new YSyncMongoose('ws://localhost:3000');
    try {
        client.on('error', (err) => {
            console.error('YSyncMongoose client error:', err);
            errcb?.(err);
        });
        await new Promise<void>(resolve => client.once('connect', resolve));
        const doc = await client.getMongooseDocument<TestDocument>("Test", id);
        await callback(doc);
    } catch(err) {
        console.error('Error in withMongooseDocument:', err);
        throw err;
    } finally {
        client.close();
    }
}