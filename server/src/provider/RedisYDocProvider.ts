import type { YSyncSocket } from "../websocket/socket.js";
import { YDocProvider } from "./YDocProvider.js";
import type { Redis } from "ioredis";
import * as Y from 'yjs';
import { Redlock } from "@sesamecare-oss/redlock";
import type { YSyncRedisMessage, YSyncRedisProviderOptions } from "../types/redis.js";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import debug from 'debug';

const log = debug('y-sync:server:redis-provider');

export class RedisYDocProvider extends YDocProvider {
    private pub: Redis;
    private sub: Redis;
    private redlock: Redlock;
    private sockets: Map<string, YSyncSocket[]> = new Map();
    private docs: Map<string, { doc: Y.Doc, timer: NodeJS.Timeout }> = new Map();

    constructor(private options: YSyncRedisProviderOptions) {
        super();
        this.pub = options.pub;
        this.sub = options.sub;
        this.redlock = new Redlock([this.pub], {
            retryCount: 10,
            retryDelay: 200,
            retryJitter: 200
        });
        this.sub.psubscribe('yjs:*', (err, count) => {
            if (err) {
                console.error('Failed to subscribe to Redis keyspace notifications:', err);
            } else {
                log(`Subscribed to ${count} Redis keyspace notifications.`);
            }
        });
        this.sub.on('pmessageBuffer', async (pattern, channel, message) => {
            const channelName = channel.toString("utf8");
            log(`Received Redis message on channel ${channelName}`);
            const data = this.readMessage(new Uint8Array(message));
            this.handleRedisUpdate(data);
        });
    }

    disconnect(socket: YSyncSocket): void {
        this.removeSocket(socket);
    }

    async applyUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Promise<void> {
        const doc = await this.getYDocument(docid, 'socket', socket.id);
        Y.applyUpdate(doc, update, socket);
    }

    async stateVector(docid: string, socket: YSyncSocket): Promise<Uint8Array> {
        const doc = await this.getYDocument(docid, 'socket', socket.id);
        this.addSocket(docid, socket);
        return Y.encodeStateVector(doc);
    }

    async stateAsUpdate(docid: string, update: Uint8Array, socket: YSyncSocket): Promise<Uint8Array> {
        const doc = await this.getYDocument(docid, 'socket', socket.id);
        return Y.encodeStateAsUpdate(doc, update);
    }

    // redis

    private getKey(docid: string): string {
        return `yjs:${docid}`;
    }

    private getLastKey(docid: string): string {
        return `yjs:${docid}:last`;
    }

    private getLockKey(docid: string): string {
        return `yjs:${docid}:lock`;
    }

    private async lock<T>(docid: string, action: () => Promise<T>): Promise<T> {
        const lock = await this.redlock.acquire([this.getLockKey(docid)], 1000);
        try {
            return await action();
        } finally {
            await lock.release();
        }
    }

    private async getUpdates(docid: string): Promise<YSyncRedisMessage | null> {
        const key = this.getLastKey(docid);
        const data = await this.pub.getBuffer(key);
        return data ? this.readMessage(new Uint8Array(data)) : null;
    }


    private async handleRedisUpdate(message: YSyncRedisMessage) {
        const { docId, update, origin, originId } = message;
        const doc = await this.getYDocument(docId, 'redis', '');
        const updateToApply = Y.encodeStateAsUpdate(doc, Y.encodeStateVectorFromUpdate(update));
        log(`Applying update from Redis for document ${docId}, length: ${updateToApply.length}`);
        Y.applyUpdate(doc, updateToApply, 'redis');
        const lastKey = this.getLastKey(docId);
        log(`Storing last update for document ${docId} in Redis with key ${lastKey}`);
        await this.pub.set(lastKey, Buffer.from(this.buildMessage(doc, origin, originId)), "EX", this.options.redisTTL || 3600);
    }


    // documents


    private async getYDocument(docid: string, origin: string, originId: string): Promise<Y.Doc> {
        return this.lock(docid, async () => {
            let docEntry = this.docs.get(docid);
            const doc = docEntry?.doc || new Y.Doc({ guid: docid });

            if (docEntry) {
                clearTimeout(docEntry.timer);
            } else {
                const updates = await this.getUpdates(docid);

                if (updates) {
                    log(`Applying updates from Redis for document ${docid}`);
                    Y.applyUpdate(doc, updates.update);
                } else {
                    await this.emitCreate(doc);
                    await this.writeMessage(doc, origin, originId);
                }

                doc.on('update', this.handleDocUpdate.bind(this));
            }

            this.docs.set(docid, { doc, timer: setTimeout(() => this.handleRemoveDoc(docid), this.options.memoryTTL ? this.options.memoryTTL * 1000 : 60000) });

            return doc;
        });
    }

    private handleDocUpdate(update: Uint8Array, transactionOrigin: any, doc: Y.Doc, transaction: Y.Transaction) {
        const sockets = this.sockets.get(doc.guid) || [];
        const filteredSockets = sockets.filter(s => s !== transactionOrigin);
        this.emit('update', doc, update, filteredSockets, transactionOrigin);

        if (transactionOrigin !== 'redis') {
            let origin = '';
            if (sockets.includes(transactionOrigin)) {
                origin = 'socket';
            }

            this.lock(doc.guid, async () => {
                await this.writeMessage(doc, origin, '');
            }).catch(err => {
                console.error(`Failed to write update for document ${doc.guid} to Redis:`, err);
            });
        }
    };

    private handleRemoveDoc(docid: string) {
        const entry = this.docs.get(docid);
        if (entry) {
            log(`Removing document ${docid} from memory after TTL`);
            clearTimeout(entry.timer);
            entry.doc.destroy();
            this.docs.delete(docid);
        }
    }

    // messages

    private buildMessage(doc: Y.Doc, origin: string, originId?: string): Uint8Array {
        const encoder = encoding.createEncoder();
        const update = Y.encodeStateAsUpdate(doc);
        encoding.writeVarString(encoder, doc.guid);
        encoding.writeVarString(encoder, origin);
        encoding.writeVarString(encoder, originId || '');
        encoding.writeVarUint8Array(encoder, update);
        return encoding.toUint8Array(encoder);
    }

    private async writeMessage(doc: Y.Doc, origin: string, originId?: string) {
        log(`Writing update for document ${doc.guid} to Redis`);
        const key = this.getKey(doc.guid);
        const message = this.buildMessage(doc, origin, originId);
        await this.pub.publish(key, Buffer.from(message));
    }

    private readMessage(data: Uint8Array): YSyncRedisMessage {
        const decoder = decoding.createDecoder(data);
        const docId = decoding.readVarString(decoder);
        const origin = decoding.readVarString(decoder);
        const originId = decoding.readVarString(decoder);
        const update = decoding.readVarUint8Array(decoder);
        return { docId, origin, originId, update };
    }

    // sockets

    private addSocket(docid: string, socket: YSyncSocket) {
        let sockets = this.sockets.get(docid) || [];
        if (!sockets.includes(socket)) {
            sockets.push(socket);
            this.sockets.set(docid, sockets);
        }
    }

    private removeSocket(socket: YSyncSocket) {
        for (const [docid, sockets] of this.sockets.entries()) {
            const index = sockets.indexOf(socket);
            if (index !== -1) {
                sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.sockets.delete(docid);
                } else {
                    this.sockets.set(docid, sockets);
                }
            }
        }
    }

}