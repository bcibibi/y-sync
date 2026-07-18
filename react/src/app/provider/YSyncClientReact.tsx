import React from "react";
import { YSyncClient, type YSyncClientOptions } from "y-sync-client";
import debug from "debug";

const log = debug("y-sync-react:YSyncClientReact");

const YSyncClientReactContext = React.createContext<YSyncClient | null>(null);

interface Props {
    url: string,
    options?: YSyncClientOptions,
    onError?: (error: any) => void,
}

export type YSyncClientReactProps = React.PropsWithChildren<Props>;

export function YSyncClientReact(props: YSyncClientReactProps) {
    const { children, url, options, onError } = props;
    const [client, setClient] = React.useState<YSyncClient | null>(null);

    React.useEffect(() => {
        log("YSyncClientReact: connecting to", url, "with options", options);
        let ysyncclient = new YSyncClient(url, options);
        ysyncclient.on('error', (error) => {
            onError?.(error);
        });
        ysyncclient.once('connect', () => {
            log("YSyncClientReact: connected to", url);
            setClient(ysyncclient);
        });
        return () => { 
            log(`YSyncClientReact: ${ysyncclient.id} disconnecting from`, url);
            ysyncclient.close();
        };
    }, []);


    return (
        <YSyncClientReactContext.Provider value={client}>
            {client && children}
        </YSyncClientReactContext.Provider>
    );
}

export function useYSyncClient() {
    const client = React.useContext(YSyncClientReactContext);
    if (!client) {
        throw new Error("useYSyncClient must be used within a YSyncClientReactProvider");
    }
    return client;
}

