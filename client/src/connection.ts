import { Operation } from './types';

type MessageHandler = {
  onJoined: (clientId: string, seq: number, doc: string) => void;
  onOperation: (op: Operation) => void;
  onAck: (seq: number) => void;
  onCursor: (clientId: string, from: number, to: number) => void;
  onDisconnect: (clientId: string) => void;
};

export class CollabClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler;
  private reconnectTimer: number | null = null;

  constructor(private url: string, handlers: MessageHandler) {
    this.handlers = handlers;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected to server');
      this.send({ type: 'join' });
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  sendOperation(op: Operation): void {
    this.send({ type: 'op', op });
  }

  sendCursor(from: number, to: number): void {
    this.send({ type: 'cursor', from, to });
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'joined':
        this.handlers.onJoined(
          msg.clientId as string,
          msg.seq as number,
          msg.doc as string
        );
        break;
      case 'op':
        this.handlers.onOperation(msg.op as Operation);
        break;
      case 'ack':
        this.handlers.onAck(msg.seq as number);
        break;
      case 'cursor':
        this.handlers.onCursor(
          msg.clientId as string,
          msg.from as number,
          msg.to as number
        );
        break;
      case 'disconnect':
        this.handlers.onDisconnect(msg.clientId as string);
        break;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
    }, 3000);
  }
}
