import type { YSyncRedisMiddlewareFct } from "./types/middleware.js";
import * as Y from 'yjs';


export class YSyncRedisMiddleware {

    private items: YSyncRedisMiddlewareFct[] = [];


    use(cb: YSyncRedisMiddlewareFct) {
        this.items.push(cb);
    }

    create(doc: Y.Doc) {
        return Y.transact(doc, () => {
            return Promise.all(this.items.map(cb => cb(doc, 'create')));
        }, this);
    }

    update(doc: Y.Doc, update: Uint8Array, origin?: any) {
        if (origin === this) {
            return Promise.resolve();
        }
        return Y.transact(doc, () => {
            return Promise.all(this.items.map(cb => cb(doc, 'update', update, origin)));
        }, this);
    }

    delete(doc: Y.Doc) {
        return Promise.all(this.items.map(cb => cb(doc, 'delete')));
    }

}