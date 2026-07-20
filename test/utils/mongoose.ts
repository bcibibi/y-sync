import mongoose from 'mongoose';
import { YSyncMongoose } from "y-sync-mongoose/client";


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

export async function getMongooseDocument(id: string) {
    const client = new YSyncMongoose('ws://localhost:3000');
    await new Promise(resolve => client.once('connect', resolve));
    return client.getMongooseDocument<TestDocument>("Test", id);
}