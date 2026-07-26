import { YSyncClient, type YSyncClientOptions } from '@bcibibi/y-sync-client';
import '@bcibibi/y-utils/override';

export class YSyncMongoose extends YSyncClient {

    constructor(url: string, options?: YSyncClientOptions) {
        super(url, options);
    }

    async getMongooseDocument<T extends Record<string, any>>(model: string, id: string) {
        const meta = { model, id };
        const ydoc = await this.getYDocument(id, meta);
        return ydoc.getMap<T>(id);
    }

}