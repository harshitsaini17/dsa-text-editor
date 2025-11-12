import { useState, useEffect, useRef } from 'react';
import { Editor } from './Editor';
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
  const [doc, setDoc] = useState<string>('');
  const [cursors, setCursors] = useState<ReturnType<CursorManager['getAllCursors']>>([]);
  const clientRef = useRef<CollabClient | null>(null);
  const outboxRef = useRef<Outbox>(new Outbox());
  const cursorManagerRef = useRef<CursorManager>(new CursorManager());
  const serverSeqRef = useRef<number>(0);
  const ignoreNextChange = useRef<boolean>(false);

  useEffect(() => {
    const client = new CollabClient('ws://localhost:8080', {
      onJoined: (id, seq, initialDoc, clients) => {
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
        // Rebase pending operations
        const pending = outboxRef.current.getAll();
        const rebased = pending.map(p => rebaseOperation(p, [op]));
        outboxRef.current.clear();
        rebased.forEach(r => outboxRef.current.add(r));

        // Apply operation to local doc
        applyOperation(op);

        // Shift cursors if needed
        if (op.type === 'insert' && op.text) {
          cursorManagerRef.current.shiftCursors(op.pos, op.text.length);
        } else if (op.type === 'delete' && op.len) {
          cursorManagerRef.current.shiftCursors(op.pos, -op.len);
        }
      },
      onAck: (seq) => {
        outboxRef.current.removeUntil(seq);
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

  const applyOperation = (op: Operation) => {
    ignoreNextChange.current = true;
    setDoc(prevDoc => {
      if (op.type === 'insert') {
        return prevDoc.slice(0, op.pos) + (op.text || '') + prevDoc.slice(op.pos);
      } else {
        return prevDoc.slice(0, op.pos) + prevDoc.slice(op.pos + (op.len || 0));
      }
    });
  };

  const handleChange = (pos: number, text: string, isDelete: boolean, length?: number) => {
    if (ignoreNextChange.current) {
      ignoreNextChange.current = false;
      return;
    }

    const op: Operation = {
      type: isDelete ? 'delete' : 'insert',
      pos,
      clientId,
      clientSeq: outboxRef.current.getNextSeq(),
      ...(isDelete ? { len: length } : { text }),
    };

    outboxRef.current.add(op);
    clientRef.current?.sendOperation(op);

    // Update local cursors
    if (!isDelete && text) {
      cursorManagerRef.current.shiftCursors(pos, text.length);
    } else if (isDelete && length) {
      cursorManagerRef.current.shiftCursors(pos, -length);
    }
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
