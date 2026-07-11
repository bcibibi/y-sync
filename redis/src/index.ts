import { YSyncRedisClient } from "./client";
import { YSyncRedisDocs } from "./docs";
import type { YSyncRedisOptions } from "./types/options";
import * as Y from "yjs";

export class YSyncRedis {

    private client: YSyncRedisClient;
    private docs: YSyncRedisDocs;

    constructor(options: YSyncRedisOptions) {
        this.client = new YSyncRedisClient(options.pub, options.sub);
        this.docs = new YSyncRedisDocs(this.client);
    }

    async getDocument(docId: string): Promise<Y.Doc> {
        const item = await this.docs.getDocument(docId);
        return item;
    }

    async withDocument<T>(docId: string, callback: (doc: Y.Doc) => T | Promise<T>): Promise<T> {
        const doc = await this.getDocument(docId);
        const result = await callback(doc);
        doc.destroy(); // Clean up the document after use
        return result;
    }
}