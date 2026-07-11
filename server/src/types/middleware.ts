import * as Y from 'yjs';

export type YSyncAction = 'create' | 'update';

export type YSyncMiddleware = (doc: Y.Doc, action: YSyncAction, origin?: any) => void;