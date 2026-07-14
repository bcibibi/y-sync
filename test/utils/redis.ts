
import {Redis} from "ioredis";
import { YSyncRedis } from "y-sync-redis";

export const createRedisClient = async () => {
    const pub = new Redis("redis://redis:6379");
    const sub = pub.duplicate();
    const client = new YSyncRedis({ pub, sub });
    client.on('error', (err) => {
        console.error('YSyncRedis client error:', err);
    });
    await new Promise<void>(resolve => client.once('connected', resolve));
    return client;
}