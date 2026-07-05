import * as http from 'http';
import { WebSocket } from 'ws';
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import EventEmitter from 'events';
import crypto from 'crypto';

interface YSyncSocketEvents {
    disconnect: [socket: YSyncSocket];
    error: [error: Error];
    [event: string]: any[];
}


export class YSyncSocket extends EventEmitter<YSyncSocketEvents> {

    private _id: string;

    get id() {
        return this._id;
    }

    constructor(private ws: WebSocket, private request: http.IncomingMessage) { 
        super();
        this._id = crypto.randomUUID();
        ws.on('message', this.handleMessage.bind(this));
        ws.on('error', this.handleError.bind(this));
        ws.on('close', this.handleClose.bind(this));
        ws.on('ping', this.handlePing.bind(this));
        ws.on('pong', this.handlePong.bind(this));
        ws.on('unexpected-response', this.handleUnexpectedResponse.bind(this));
    }

    private handleError(error: Error) {
        this.emit('error', error);
    }

    private handleClose() {
        this.emit('disconnect', this);
    }

    private handlePing() {
        console.log("WebSocket ping received");
    }

    private handlePong() {
        console.log("WebSocket pong received");
    }

    private handleUnexpectedResponse(request: http.IncomingMessage, response: http.ServerResponse) {
        console.error("WebSocket unexpected response:", response.statusCode, response.statusMessage);
    }

    private handleMessage(data: ArrayBuffer) {
        const decoder = decoding.createDecoder(new Uint8Array(data));
        const event = decoding.readVarString(decoder);
        const args = [];
        while (decoding.hasContent(decoder)) {
            args.push(decoding.readAny(decoder));
        }
        this.emit(event, ...args);
    }

    send(event: string, ...args: any[]) {
        if (this.ws.readyState !== WebSocket.OPEN) {
            return;
        }
        const encoder = encoding.createEncoder();
        encoding.writeVarString(encoder, event);
        for (const arg of args) {
            encoding.writeAny(encoder, arg);
        }
        const data = encoding.toUint8Array(encoder);
        this.ws.send(data.buffer, err => {
            if (err) {
                console.error("Failed to send message:", err);
            }
        });
    }

}