import { useState, useEffect, useRef } from 'react';
import { Editor } from './SimpleEditor';
import { CollabClient } from './connection';
import { Outbox } from './outbox';
import { rebaseOperation } from './rebase';
import { CursorManager } from './cursorManager';
import { Presence } from './Presence';
import { Operation } from './types';

/**
 * Main application component for the collaborative text editor
 */
function App() {
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const clientIdRef = useRef<string>('');
  const [doc, setDoc] = useState<string>('');
  const [cursors, setCursors] = useState<ReturnType<CursorManager['getAllCursors']>>([]);
  const clientRef = useRef<CollabClient | null>(null);
  const outboxRef = useRef<Outbox>(new Outbox());
  const cursorManagerRef = useRef<CursorManager>(new CursorManager());
  const serverSeqRef = useRef<number>(0);
  const applyOperationRef = useRef<((pos: number, text?: string, length?: number) => void) | null>(null);
  const pendingOpsQueue = useRef<Operation[]>([]);
  const isWaitingForAck = useRef(false);

  useEffect(() => {
    const client = new CollabClient('ws://localhost:8080', {
      onJoined: (id, seq, initialDoc, clients) => {
        clientIdRef.current = id;
        setClientId(id);
        setDoc(initialDoc);
        serverSeqRef.current = seq;
        setConnected(true);
        
        // Initialize cursors for existing clients
        clients.forEach(c => {
          if (c.id !== id) {
            cursorManagerRef.current.updateCursor(c.id, c.cursorPos, c.cursorPos);
          }
        });
        setCursors(cursorManagerRef.current.getAllCursors());
      },
      onJoin: (cId, _name, _color) => {
        // New client joined, they'll send their cursor position
        console.log('Client joined:', cId);
      },
      onOperation: (op) => {
        console.log(`Received operation from server: ${op.type} at ${op.pos}, clientId: ${op.clientId}, myId: ${clientIdRef.current}, text: "${op.text || ''}", len: ${op.len || 0}`);
        
        // Skip our own operations - we already have them locally
        if (op.clientId === clientIdRef.current) {
          console.log('Skipping own operation');
          return;
        }
        
        // Rebase pending operations
        const pending = outboxRef.current.getAll();
        const rebased = pending.map(p => rebaseOperation(p, [op]));
        outboxRef.current.clear();
        rebased.forEach(r => outboxRef.current.add(r));

        // Apply operation to editor directly (only for other clients)
        if (applyOperationRef.current) {
          if (op.type === 'insert' && op.text) {
            console.log(`Applying insert to editor at ${op.pos}: "${op.text}"`);
            applyOperationRef.current(op.pos, op.text);
          } else if (op.type === 'delete' && op.len) {
            console.log(`Applying delete to editor at ${op.pos}, length ${op.len}`);
            applyOperationRef.current(op.pos, undefined, op.len);
          }
        }

        // Shift cursors if needed
        if (op.type === 'insert' && op.text) {
          cursorManagerRef.current.shiftCursors(op.pos, op.text.length);
        } else if (op.type === 'delete' && op.len) {
          cursorManagerRef.current.shiftCursors(op.pos, -op.len);
        }
      },
      onAck: (seq) => {
        console.log(`Received ACK for clientSeq: ${seq}, outbox size before: ${outboxRef.current.size()}, queue length: ${pendingOpsQueue.current.length}`);
        outboxRef.current.removeUntil(seq);
        
        // Remove the acknowledged operation from queue
        if (pendingOpsQueue.current.length > 0 && pendingOpsQueue.current[0].clientSeq === seq) {
          pendingOpsQueue.current.shift();
        }
        
        console.log(`Outbox size after: ${outboxRef.current.size()}, queue length: ${pendingOpsQueue.current.length}`);
        
        // Send next operation in queue
        isWaitingForAck.current = false;
        sendNextOperation();
      },
      onCursor: (cId, from, to) => {
        cursorManagerRef.current.updateCursor(cId, from, to);
        setCursors(cursorManagerRef.current.getAllCursors());
      },
      onDisconnect: (cId) => {
        cursorManagerRef.current.removeCursor(cId);
        setCursors(cursorManagerRef.current.getAllCursors());
      },
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, []);

  const handleChange = (pos: number, text: string, isDelete: boolean, length?: number) => {
    const op: Operation = {
      type: isDelete ? 'delete' : 'insert',
      pos,
      clientId: clientIdRef.current,
      clientSeq: outboxRef.current.getNextSeq(),
      ...(isDelete ? { len: length } : { text }),
    };

    console.log(`Queueing operation: ${op.type} at ${pos}, text: "${text}", clientSeq: ${op.clientSeq}, waiting: ${isWaitingForAck.current}`);

    pendingOpsQueue.current.push(op);
    
    // Try to send if not already waiting
    if (!isWaitingForAck.current) {
      sendNextOperation();
    }
  };

  const sendNextOperation = () => {
    if (pendingOpsQueue.current.length === 0) {
      isWaitingForAck.current = false;
      return;
    }

    const op = pendingOpsQueue.current[0];
    console.log(`Sending operation: ${op.type} at ${op.pos}, text: "${op.text || ''}", clientSeq: ${op.clientSeq}`);
    
    outboxRef.current.add(op);
    clientRef.current?.sendOperation(op);
    isWaitingForAck.current = true;
  };

  const handleCursorChange = (from: number, to: number) => {
    if (connected) {
      clientRef.current?.sendCursor(from, to);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Collaborative Text Editor</h1>
        <div className="connection-status">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>
      <main className="app-main">
        {connected ? (
          <>
            <Editor
              initialDoc={doc}
              onChange={handleChange}
              onCursorChange={handleCursorChange}
              onApplyOperation={(callback) => {
                applyOperationRef.current = callback;
              }}
            />
            <Presence cursors={cursors} currentClientId={clientId} />
          </>
        ) : (
          <div className="loading">Connecting to server...</div>
        )}
      </main>
    </div>
  );
}

export default App;
