import { useState, useEffect, useRef } from 'react';
import { Editor } from './Editor';
import { CollabClient } from './connection';
import { Outbox } from './outbox';
import { rebaseOperation } from './rebase';
import { Operation } from './types';

/**
 * Main application component for the collaborative text editor
 */
function App() {
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [doc, setDoc] = useState<string>('');
  const clientRef = useRef<CollabClient | null>(null);
  const outboxRef = useRef<Outbox>(new Outbox());
  const serverSeqRef = useRef<number>(0);
  const ignoreNextChange = useRef<boolean>(false);

  useEffect(() => {
    const client = new CollabClient('ws://localhost:8080', {
      onJoined: (id, seq, initialDoc) => {
        setClientId(id);
        setDoc(initialDoc);
        serverSeqRef.current = seq;
        setConnected(true);
      },
      onOperation: (op) => {
        // Rebase pending operations
        const pending = outboxRef.current.getAll();
        const rebased = pending.map(p => rebaseOperation(p, [op]));
        outboxRef.current.clear();
        rebased.forEach(r => outboxRef.current.add(r));

        // Apply operation to local doc
        applyOperation(op);
      },
      onAck: (seq) => {
        outboxRef.current.removeUntil(seq);
      },
      onCursor: (_clientId, _from, _to) => {
        // TODO: Handle remote cursor updates
      },
      onDisconnect: (_clientId) => {
        // TODO: Handle client disconnect
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
          <Editor
            initialDoc={doc}
            onChange={handleChange}
            onCursorChange={handleCursorChange}
          />
        ) : (
          <div className="loading">Connecting to server...</div>
        )}
      </main>
    </div>
  );
}

export default App;
