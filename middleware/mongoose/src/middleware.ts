import type { YSyncAction } from 'y-sync';
import * as Y from 'yjs';
import mongoose, { Document, Schema, type ToObjectOptions } from "mongoose";
import 'y-utils/override';
import pDebounce from 'p-debounce';
import debug from 'debug';

const log = debug('y-sync:middleware:mongoose');

export interface YSyncMongooseMiddlewareOptions {
    wait?: number;
    object?: ToObjectOptions
}

const updateDocument = async (model: mongoose.Model<any>, doc: Y.Doc) => {
    const id = doc.meta.id;
    if (!id) {
        console.error("ID is not defined in document meta");
        return;
    }
    const data = doc.getMap(id).toJSON();
    log(`Updating document with id ${id} in model ${model.modelName}:`, data);
    await model.updateOne({ _id: id }, data).exec();
}

const newDebouncedSync = (wait: number) => pDebounce(updateDocument, wait);

export function ySyncMongooseMiddleware(options: YSyncMongooseMiddlewareOptions = {}) {
    const objectOptions: ToObjectOptions = { 
        flattenObjectIds: true, 
        flattenUUIDs: true, 
        flattenMaps: true, 
        versionKey: false, 
        ...options.object 
    };
    const debouncedSync: Map<string, ReturnType<typeof newDebouncedSync>> = new Map();

    return async (doc: Y.Doc, action: YSyncAction, origin: any) => {
        const id = doc.meta.id;
        const modelName = doc.meta.model;

        if (!modelName) {
            console.error("Model name is not defined in document meta");
            return;
        }
        if (!id) {
            console.error("ID is not defined in document meta");
            return;
        }
        log(`Received action '${action}' for document with id ${id} and model ${modelName}`);

        const model = mongoose.model(modelName);
        log(`Model ${modelName} found:`, model ? 'Yes' : 'No');

        if (action === 'create') {
            const mdoc: Document<any> | null = await model.findById(id).exec();
            log(`Document with id ${id} found in database:`, mdoc ? 'Yes' : 'No');
            if (mdoc) {
                const data = mdoc.toObject(objectOptions);
                doc.getMap(data._id).setObject(data);
                log('Add debounced sync for document with id', id);
                debouncedSync.set(id, newDebouncedSync(options.wait || 3000));
            }
        } else if (action === 'update') {
            const debounced = debouncedSync.get(id);
            if (debounced) {
                debounced(model, doc)
                    .catch(console.error);
            } else {
                console.error(`No debounced function found for document with id ${id}`);
            }
        } else if (action === 'delete') {
            debouncedSync.delete(id);
        }

    }
}
