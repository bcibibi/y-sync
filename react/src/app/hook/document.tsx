import React from "react";
import { useYSyncClient } from "../provider/YSyncClientReact";
import * as Y from "yjs";
import debug from "debug";

const log = debug("y-sync-react:useYDocument");

export function useYDocument(docId: string) {
    const client = useYSyncClient();
    const [doc, setDoc] = React.useState<Y.Doc | null>(null);

    React.useEffect(() => {
        log("useYDocument: subscribing to document", docId);
        client.getYDocument(docId)
            .then(setDoc)
            .catch(console.error);
            
        return () => {
            log("useYDocument: unsubscribing from document", doc?.guid);
            doc?.destroy();
        };
    }, [client, docId]);

    return doc;
}