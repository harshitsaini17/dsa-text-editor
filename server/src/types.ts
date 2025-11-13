/**
 * Shared types for the collaborative text editor
 */

/**
 * Operation type - either insert or delete
 */
export type OperationType = 'insert' | 'delete';

/**
 * Base operation structure
 */
export interface Operation {
  type: OperationType;
  pos: number;
  clientId: string;
  clientSeq: number;
  text?: string;  // For insert operations
  len?: number;   // For delete operations
}

/**
 * Insert operation
 */
export interface InsertOperation extends Operation {
  type: 'insert';
  text: string;
}

/**
 * Delete operation
 */
export interface DeleteOperation extends Operation {
  type: 'delete';
  len: number;
}

/**
 * Server operation with server sequence number
 */
export interface ServerOperation extends Operation {
  serverSeq: number;
}

/**
 * Client information
 */
export interface ClientInfo {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
}

/**
 * Message types for WebSocket communication
 */
export type MessageType = 'join' | 'op' | 'ack' | 'cursor' | 'disconnect';

/**
 * Base message structure
 */
export interface Message {
  type: MessageType;
  docId: string;
  clientId: string;
}

/**
 * Join message - sent when client connects
 */
export interface JoinMessage extends Message {
  type: 'join';
  clientName: string;
}

/**
 * Operation message - sent when client performs an operation
 */
export interface OpMessage extends Message {
  type: 'op';
  operation: Operation;
}

/**
 * Acknowledgment message - sent by server after processing operation
 */
export interface AckMessage extends Message {
  type: 'ack';
  serverSeq: number;
  clientSeq: number;
}

/**
 * Cursor update message
 */
export interface CursorMessage extends Message {
  type: 'cursor';
  x: number;
  y: number;
}

/**
 * Disconnect message
 */
export interface DisconnectMessage extends Message {
  type: 'disconnect';
}
