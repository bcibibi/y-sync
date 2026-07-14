import * as Y from "yjs";

export interface YSyncRedisDoc {
    doc: Y.Doc;
    timer: NodeJS.Timeout;
}