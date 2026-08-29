import * as Y from 'yjs';

export type YSyncAction = 'create' | 'update' | 'delete';

export type YSyncTransaction = <R>(cb: () => R) => R;

export type YSyncMiddleware = (doc: Y.Doc, action: YSyncAction, transaction: YSyncTransaction, origin?: any, error?: (err: any) => void) => void | Promise<void>;