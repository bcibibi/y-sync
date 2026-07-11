import type Redis from "ioredis";

export interface YSyncRedisOptions {
    pub: Redis;
    sub: Redis;
    memoryTTL?: number; // in seconds
    redisTTL?: number; // in seconds
}