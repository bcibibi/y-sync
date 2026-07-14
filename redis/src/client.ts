import EventEmitter from "events"
import type { Redis } from "ioredis";
import debug from "debug";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as Y from "yjs";
import type { YSyncRedisClientEvents } from "./types/client.js";
import crypto from "crypto";
import { Redlock } from "@sesamecare-oss/redlock";

const log = debug("y-sync:redis:client");

export class YSyncRedisClient extends EventEmitter<YSyncRedisClientEvents> {

    private _id: string;
    private redlock: Redlock;

    get id(): string {
        return this._id;
    }

    constructor(private pub: Redis, private sub: Redis) {
        super();
        this._id = crypto.randomBytes(16).toString("hex");
        this.redlock = new Redlock([this.pub], {
            retryCount: 10,
            retryDelay: 200,
            retryJitter: 200
        });
        this.sub.psubscribe('yjs', (err, count) => {
            if (err) {
                console.error('Failed to subscribe to Redis keyspace notifications:', err);
                this.emit('error', err);
            } else {
                log(`Subscribed to ${count} Redis keyspace notifications.`);
                this.emit('subscribed');
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

    async lock<T>(docid: string, action: () => Promise<T>): Promise<T> {
        const lock = await this.redlock.acquire([`y-sync:${docid}:lock`], 1000);
        try {
            return await action();
        } finally {
            await lock.release();
        }
    }

}