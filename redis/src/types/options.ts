import type { Redis } from "ioredis";

export interface YSyncRedisOptions {
    pub: Redis;
    sub: Redis;
    ttl?: number; // Time to live for documents in Redis (in seconds)
}