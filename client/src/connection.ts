import { Operation } from './types';

type ClientInfo = {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
};

type MessageHandler = {
  onJoined: (clientId: string, seq: number, doc: string, clients: ClientInfo[]) => void;
  onJoin: (clientId: string, clientName: string, color: string) => void;
  onOperation: (op: Operation) => void;
  onAck: (seq: number) => void;
  onCursor: (clientId: string, x: number, y: number) => void;
  onDisconnect: (clientId: string) => void;
};

export class CollabClient {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler;
  private reconnectTimer: number | null = null;
  private clientId: string = '';
  private clientName: string;

  constructor(private url: string, clientName: string, handlers: MessageHandler) {
    this.handlers = handlers;
    this.clientName = clientName;
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected to server');
      // Send stable clientId from localStorage if available
      const stableClientId = localStorage.getItem('stableClientId');
      this.send({ 
        type: 'join', 
        clientName: this.clientName,
        clientId: stableClientId || undefined
      });
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
    console.log('Sending WS operation', op);
    this.send({ type: 'op', docId: 'default', operation: op });
  }

  sendCursor(x: number, y: number): void {
    this.send({ type: 'cursor', docId: 'default', clientId: this.clientId, x, y });
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'joined':
        this.clientId = msg.clientId as string;
        this.handlers.onJoined(
          msg.clientId as string,
          msg.seq as number,
          msg.doc as string,
          (msg.clients as ClientInfo[]) || []
        );
        break;
      case 'join':
        this.handlers.onJoin(
          msg.clientId as string,
          msg.clientName as string,
          msg.color as string
        );
        break;
      case 'op':
        this.handlers.onOperation(msg.operation as Operation);
        break;
      case 'ack':
        this.handlers.onAck(msg.clientSeq as number);
        break;
      case 'cursor':
        this.handlers.onCursor(
          msg.clientId as string,
          msg.x as number,
          msg.y as number
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
