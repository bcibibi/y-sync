import EventEmitter from "events";
import { YSyncRedisClient } from "./client.js";
import { YSyncRedisSync } from "./sync.js";
import { YSyncRedisMiddleware } from "./middleware.js";
import type { YSyncRedisMiddlewareFct, YSyncRedisMiddlewareAction } from "./types/middleware.js";
import type { YSyncRedisOptions } from "./types/options.js";
import * as Y from "yjs";
import type { YSyncRedisEvents } from "./types/redis.js";
import debug from "debug";

const log = debug("y-sync:redis");


export type {
    YSyncRedisMiddlewareFct,
    YSyncRedisMiddlewareAction,
    YSyncRedisOptions
}



export class YSyncRedis extends EventEmitter<YSyncRedisEvents> {

    private client: YSyncRedisClient;
    private sync: YSyncRedisSync;
    private middleware: YSyncRedisMiddleware;

    constructor(options: YSyncRedisOptions) {
        super();
        this.middleware = new YSyncRedisMiddleware();
        this.client = new YSyncRedisClient(options.pub, options.sub);
        this.client.on('error', this.handleError.bind(this));
        this.client.on('subscribed', this.handleConnected.bind(this));
        this.sync = new YSyncRedisSync(this.client, options.ttl || 3600, this.middleware);
    }

    private handleError(err: any) {
        console.error('YSyncRedis encountered an error:', err);
        this.emit('error', err);
    }

    private handleConnected() {
        log('YSyncRedis connected to Redis.');
        this.emit('connected');
    }

    use(cb: YSyncRedisMiddlewareFct, origin?: any) {
        this.middleware.use(cb, origin);
    }

    async getDocument(docId: string): Promise<Y.Doc> {
        const item = await this.sync.getDocument(docId);
        return item;
    }

    async withDocument<T>(docId: string, callback: (doc: Y.Doc) => T | Promise<T>): Promise<T> {
        const doc = await this.getDocument(docId);
        const result = await callback(doc);
        return result;
    }
}