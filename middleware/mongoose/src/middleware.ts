import type { YSyncAction } from '@bcibibi/y-sync-server';
import * as Y from 'yjs';
import mongoose, { Document, type ToObjectOptions } from "mongoose";
import '@bcibibi/y-utils/override';
import pDebounce from 'p-debounce';
import debug from 'debug';
import type { YSyncTransaction } from '@bcibibi/y-sync-server';

const log = debug('y-sync:middleware:mongoose');

export interface YSyncMongooseMiddlewareOptions {
    wait?: number;
    object?: ToObjectOptions;
    create?: (model: mongoose.Model<any>, doc: Y.Map<any>, transaction: YSyncTransaction) => Promise<void> | void;
    update?: (model: mongoose.Model<any>, doc: Y.Map<any>, transaction: YSyncTransaction) => Promise<void> | void;
}

const updateDocument = async (model: mongoose.Model<any>, doc: Y.Doc, error?: (err?: any) => void) => {
    try {
        const id = doc.meta.id;
        if (!id) {
            console.error("ID is not defined in document meta");
            return;
        }
        const data = doc.getMap(id).toJSON();
        log(`Updating document with id ${id} in model ${model.modelName}:`, data);
        await model.updateOne({ _id: id }, data).exec();
    } catch (err) {
        if (error) error(err);
    }
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

    return async (doc: Y.Doc, action: YSyncAction, transaction: YSyncTransaction, origin?: any, error?: (err?: any) => void) => {
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
                transaction(() => {
                    doc.getMap(data._id).setObject(data);
                });
                await options.create?.(model, doc.getMap(id), transaction);
                log('Add debounced sync for document with id', id);
                debouncedSync.set(id, newDebouncedSync(options.wait || 3000));
            } else {
                throw new Error(`Document with id ${id} not found in model ${modelName}`);
            }
        } else if (action === 'update') {
            await options.update?.(model, doc.getMap(id), transaction);
            const debounced = debouncedSync.get(id);
            if (debounced) {
                debounced(model, doc, error)
                    .catch(err => {
                        console.error(err);
                    });
            } else {
                throw new Error(`No debounced function found for document with id ${id}`);
            }
        } else if (action === 'delete') {
            debouncedSync.delete(id);
        }

    }
}
