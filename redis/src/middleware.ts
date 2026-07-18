import type { YSyncRedisMiddlewareFct } from "./types/middleware.js";
import * as Y from 'yjs';
import debug from "debug";

const log = debug("y-sync:redis:middleware");


export class YSyncRedisMiddleware {

    private items: { cb: YSyncRedisMiddlewareFct, origin?: any }[] = [];


    use(cb: YSyncRedisMiddlewareFct, origin?: any) {
        this.items.push({ cb, origin });
    }

    create(doc: Y.Doc) {
        return Promise.all(this.items.map(item => {
            return Y.transact(doc, () => {
                return item.cb(doc, 'create');
            }, this);
        }));
    }

    update(doc: Y.Doc, update: Uint8Array, origin?: any) {
        if (origin === this) {
            return Promise.resolve();
        }

        return Promise.all(this.items.map(item => {
            Y.transact(doc, () => {
                return item.cb(doc, 'update', update, origin);
            }, item.origin || this);
        }));
    }

    delete(doc: Y.Doc) {
        return Promise.all(this.items.map(item => item.cb(doc, 'delete')));
    }
}