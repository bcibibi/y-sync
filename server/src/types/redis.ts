import { Redis } from "ioredis";

export interface YSyncRedisMessage {
    origin: string;
    originId: string;
    docId: string;
    update: Uint8Array;
}

export interface YSyncRedisProviderOptions {
    pub: Redis;
    sub: Redis;
    memoryTTL?: number; // in seconds
    redisTTL?: number; // in seconds
}