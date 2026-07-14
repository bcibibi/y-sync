
import * as Y from 'yjs';

export type YSyncRedisMiddlewareAction = 'create' | 'update' | 'delete';

export type YSyncRedisMiddlewareFct = (doc: Y.Doc, action: YSyncRedisMiddlewareAction, update?: Uint8Array, origin?: any) => void | Promise<void>;