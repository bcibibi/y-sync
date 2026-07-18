
import { YSyncClientReact } from './app'
import { Client } from './Client'

export function App() {
    return (
        <YSyncClientReact url='http://localhost:3000'>
            <Client />
        </YSyncClientReact>
    )
}