import type { YSyncRedisDoc } from "./types/docs.js";
import * as Y from "yjs";

export class YSyncRedisDocs {

    private docs: Map<string, YSyncRedisDoc> = new Map();

    constructor(private ttl: number, private onCreate?: (doc: Y.Doc, origin?: any) => void | Promise<void>) { }

    async get<T extends boolean = false>(docId: string, create: T = false as T, origin?: any): Promise<T extends true ? Y.Doc : Y.Doc | null> {
        let value = this.docs.get(docId);
        if (!value) {
            if (!create) {
                return null as T extends true ? Y.Doc : Y.Doc | null;
            }
            value = await this.createDocument(docId, origin);
        } else {
            this.refreshTimer(docId);
        }
        return value.doc;
    }

    private async createDocument(docId: string, origin?: any) {
        const doc = new Y.Doc({ guid: docId });
        if (this.onCreate) {
            await this.onCreate(doc, origin);
        }
        const timer = this.getTimeout(docId);
        const item: YSyncRedisDoc = { doc, timer };
        this.docs.set(docId, item);
        return item;
    }


    private getTimeout(docId: string): NodeJS.Timeout {
        return setTimeout(() => {
            this.removeDocument(docId);
        }, this.ttl * 1000);
    }

    private removeDocument(docId: string) {
        const item = this.docs.get(docId);
        if (item) {
            clearTimeout(item.timer);
            item.doc.destroy();
            this.docs.delete(docId);
        }
    }

    private refreshTimer(docId: string) {
        const item = this.docs.get(docId);
        if (item) {
            clearTimeout(item.timer);
            item.timer = this.getTimeout(docId);
        }
    }

}