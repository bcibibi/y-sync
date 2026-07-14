import debug from 'debug';
import type { YSyncRedisMiddlewareAction } from "y-sync-redis";
import { YSyncRedis } from "y-sync-redis";
import * as Y from 'yjs';
import type { YSyncRedisProviderOptions } from "../types/redis.js";
import type { YSyncSocket } from "../websocket/socket.js";
import { YDocProvider } from "./YDocProvider.js";

const log = debug('y-sync:server:redis-provider');

export class RedisYDocProvider extends YDocProvider {
    private client: YSyncRedis;
    private connected: boolean = false;
    private sockets: Map<string, YSyncSocket[]> = new Map();

    constructor(options: YSyncRedisProviderOptions) {
        super();
        this.client = new YSyncRedis({ pub: options.pub, sub: options.sub });
        this.client.on('error', (err: any) => {
            console.error('RedisYDocProvider encountered an error:', err);
        });
        this.client.on('connected', () => {
            log('RedisYDocProvider connected to Redis.');
            this.connected = true;
        });
        this.client.use(this.middleware.bind(this));
    }

    disconnect(socket: YSyncSocket): void {
        this.removeSocket(socket);
    }

    async applyUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Promise<void> {
        await this.waitForConnection();
        const doc = await this.client.getDocument(docid);
        Y.applyUpdate(doc, update, socket);
    }

    async stateVector(docid: string, socket: YSyncSocket): Promise<Uint8Array> {
        await this.waitForConnection();
        const doc = await this.client.getDocument(docid);
        this.addSocket(docid, socket);
        return Y.encodeStateVector(doc);
    }

    async stateAsUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Promise<Uint8Array> {
        await this.waitForConnection();
        const doc = await this.client.getDocument(docid);
        return Y.encodeStateAsUpdate(doc, update);
    }

    private async waitForConnection(): Promise<void> {
        if (this.connected) {
            return;
        }
        return new Promise((resolve, reject) => {
            const checkConnection = () => {
                if (this.connected) {
                    resolve();
                } else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    }

    private async middleware(doc: Y.Doc, action: YSyncRedisMiddlewareAction, update?: Uint8Array, origin?: any) {
        if (action === "create") {
            await this.emitCreate(doc);
        } else if (action === "update" && update) {
            log(`Emitting update for document ${doc.guid}`);
            log(`Origin of update: ${origin ? origin.constructor?.name : 'unknown'}`);
            let sockets = this.sockets.get(doc.guid) || [];
            sockets = sockets.filter(s => s !== origin);
            log(`Sockets to notify for document ${doc.guid}: ${sockets.length}`);
            this.emit('update', doc, update, sockets, origin);
        }
    }

    private addSocket(docid: string, socket: YSyncSocket) {
        if (!this.sockets.has(docid)) {
            this.sockets.set(docid, []);
        }
        const sockets = this.sockets.get(docid);
        if (sockets && !sockets.includes(socket)) {
            sockets.push(socket);
            log(`Added socket to document ${docid}`);
        }
    }

    private removeSocket(socket: YSyncSocket) {
        for (const [docid, sockets] of this.sockets.entries()) {
            const index = sockets.indexOf(socket);
            if (index !== -1) {
                sockets.splice(index, 1);
                log(`Removed socket from document ${docid}`);
            }
            if (sockets.length === 0) {
                this.sockets.delete(docid);
                log(`No more sockets for document ${docid}, removed from tracking`);
            }
        }
    }

}