import { WebSocketServer, WebSocket } from 'ws';
import { Rope } from './rope';
import { Operation, Message, OpMessage, JoinMessage, ClientInfo } from './types';

/**
 * Document state for a collaborative session
 */
interface DocState {
  rope: Rope;
  ops: Operation[];
  serverSeq: number;
  clients: Map<string, { ws: WebSocket; info: ClientInfo }>;
}

/**
 * Collaborative Text Editor Server
 */
export class CollabServer {
  private wss: WebSocketServer;
  private docs: Map<string, DocState>;

  constructor(port: number) {
    this.wss = new WebSocketServer({ port });
    this.docs = new Map();

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    console.log(`Collaborative server started on port ${port}`);
  }

  /**
   * Handles new WebSocket connections
   */
  private handleConnection(ws: WebSocket): void {
    console.log('New client connected');

    ws.on('message', (data: Buffer) => {
      try {
        const message: Message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      this.handleDisconnect(ws);
      console.log('Client disconnected');
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Handles incoming messages from clients
   */
  private handleMessage(ws: WebSocket, message: Message): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(ws, message as JoinMessage);
        break;
      case 'op':
        this.handleOperation(ws, message as OpMessage);
        break;
      case 'cursor':
        this.handleCursor(ws, message);
        break;
      case 'disconnect':
        this.handleDisconnect(ws);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Handles client join requests
   */
  private handleJoin(ws: WebSocket, message: JoinMessage): void {
    const docId = message.docId || 'default';
    const clientId = message.clientId || this.generateClientId();
    const clientName = message.clientName || `User ${clientId.slice(0, 6)}`;

    // Initialize document if it doesn't exist
    if (!this.docs.has(docId)) {
      this.docs.set(docId, {
        rope: new Rope(''),
        ops: [],
        serverSeq: 0,
        clients: new Map(),
      });
    }

    const doc = this.docs.get(docId)!;

    // Add client to document
    const color = this.generateColor(clientId);
    doc.clients.set(clientId, {
      ws,
      info: {
        id: clientId,
        name: clientName,
        color,
        cursorPos: 0,
      },
    });

    // Send current state to the joining client
    ws.send(JSON.stringify({
      type: 'joined',
      clientId,
      seq: doc.serverSeq,
      doc: doc.rope.toString(),
      clients: Array.from(doc.clients.values()).map(c => c.info),
    }));

    // Broadcast to other clients that a new client joined
    this.broadcast(docId, {
      type: 'join',
      clientId,
      clientName,
      color,
    }, clientId);

    console.log(`Client ${clientName} (${clientId}) joined document ${docId}`);
  }

  /**
   * Handles operation from a client
   */
  private handleOperation(ws: WebSocket, message: OpMessage): void {
    const { docId, operation } = message;
    const doc = this.docs.get(docId);

    if (!doc) {
      ws.send(JSON.stringify({ type: 'error', message: 'Document not found' }));
      return;
    }

  console.log(`Received operation from ${operation.clientId}: ${operation.type} at ${operation.pos}, doc length: ${doc.rope.length()}, text: "${operation.text || ''}"`);

    try {
      // Apply operation to Rope
      if (operation.type === 'insert' && operation.text) {
        doc.rope.insert(operation.pos, operation.text);
      } else if (operation.type === 'delete' && operation.len) {
        doc.rope.delete(operation.pos, operation.len);
      }

      // Increment server sequence
      doc.serverSeq++;

      // Store operation
      doc.ops.push(operation);

      // Send acknowledgment to the sender
      ws.send(JSON.stringify({
        type: 'ack',
        clientSeq: operation.clientSeq,
        serverSeq: doc.serverSeq,
      }));

      // Broadcast operation to all clients (including sender for consistency)
      this.broadcast(docId, {
        type: 'op',
        operation,
        serverSeq: doc.serverSeq,
      });

      console.log(`Operation applied: ${operation.type} at ${operation.pos}, new doc length: ${doc.rope.length()}`);
    } catch (error) {
      console.error('Error applying operation:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to apply operation' }));
    }
  }

  /**
   * Handles cursor updates
   */
  private handleCursor(_ws: WebSocket, message: Message): void {
    const { docId, clientId } = message;
    
    // Broadcast cursor position to other clients
    this.broadcast(docId, message, clientId);
  }

  /**
   * Handles client disconnection
   */
  private handleDisconnect(ws: WebSocket): void {
    // Find and remove client from all documents
    for (const [docId, doc] of this.docs.entries()) {
      for (const [clientId, client] of doc.clients.entries()) {
        if (client.ws === ws) {
          doc.clients.delete(clientId);
          
          // Broadcast disconnect to other clients
          this.broadcast(docId, {
            type: 'disconnect',
            clientId,
          });

          console.log(`Client ${clientId} left document ${docId}`);
          
          // Clean up empty documents
          if (doc.clients.size === 0) {
            this.docs.delete(docId);
            console.log(`Document ${docId} removed (no active clients)`);
          }
          
          return;
        }
      }
    }
  }

  /**
   * Broadcasts a message to all clients in a document except the sender
   */
  private broadcast(docId: string, message: any, excludeClientId?: string): void {
    const doc = this.docs.get(docId);
    if (!doc) return;

    const messageStr = JSON.stringify(message);

    for (const [clientId, client] of doc.clients.entries()) {
      if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    }
  }

  /**
   * Generates a color for a client based on their ID
   */
  private generateColor(clientId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    ];
    
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Generates a unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets server statistics
   */
  getStats(): { docs: number; clients: number } {
    let totalClients = 0;
    for (const doc of this.docs.values()) {
      totalClients += doc.clients.size;
    }
    
    return {
      docs: this.docs.size,
      clients: totalClients,
    };
  }
}
