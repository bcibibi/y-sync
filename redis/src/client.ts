import EventEmitter from "events"
import type { Redis } from "ioredis";
import debug from "debug";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as Y from "yjs";
import type { YSyncRedisClientEvents } from "./types/client";

const log = debug("y-sync:redis:client");

export class YSyncRedisClient extends EventEmitter<YSyncRedisClientEvents> {

    constructor(private pub: Redis, private sub: Redis) {
        super();
        this.sub.psubscribe('yjs', (err, count) => {
            if (err) {
                console.error('Failed to subscribe to Redis keyspace notifications:', err);
            } else {
                log(`Subscribed to ${count} Redis keyspace notifications.`);
            }
        });
        this.sub.on('pmessageBuffer', this.handleMessage.bind(this));
    }

    private handleMessage(_pattern: string, channel: Buffer, message: Buffer) {
        const channelName = channel.toString("utf8");
        log(`Received Redis message on channel ${channelName}`);
        const decoder = decoding.createDecoder(new Uint8Array(message));
        const event = decoding.readVarString(decoder);
        const args: any[] = [];
        while (decoding.hasContent(decoder)) {
            args.push(decoding.readAny(decoder));
        }
        log(`Emitting event ${event} with args:`, args);
        this.emit(event, ...args);
    }

    send(event: string, ...args: any[]) {
        const encoder = encoding.createEncoder();
        encoding.writeVarString(encoder, event);
        args.forEach(arg => {
            encoding.writeAny(encoder, arg);
        });
        const message = encoding.toUint8Array(encoder);
        log(`Publishing event ${event} with args:`, args);
        this.pub.publish('yjs', Buffer.from(message));
    }

    save(doc: Y.Doc) {
        return this.pub.set(`yjs:${doc.guid}`, Buffer.from(Y.encodeStateAsUpdate(doc)), "EX", 3600);
    }

    async read(docId: string): Promise<Y.Doc | null> {
        const data = await this.pub.getBuffer(`yjs:${docId}`);
        if (data) {
            const doc = new Y.Doc({ guid: docId });
            Y.applyUpdate(doc, new Uint8Array(data));
            return doc;
        }
        return null;
    }

}