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
  const [clients, setClients] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [clientName, setClientName] = useState<string>('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState<string>('');
  const clientRef = useRef<CollabClient | null>(null);
  const outboxRef = useRef<Outbox>(new Outbox());
  const cursorManagerRef = useRef<CursorManager>(new CursorManager());
  const serverSeqRef = useRef<number>(0);
  const applyOperationRef = useRef<((pos: number, text?: string, length?: number) => void) | null>(null);
  const pendingOpsQueue = useRef<Operation[]>([]);
  const isWaitingForAck = useRef(false);
  const lastMouseMoveTime = useRef<number>(0);

  // Check for saved name in localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('clientName');
    if (savedName) {
      setClientName(savedName);
      setNameInput(savedName);
    } else {
      setShowNameDialog(true);
    }
  }, []);

  const handleNameSubmit = () => {
    const trimmedName = nameInput.trim();
    if (trimmedName) {
      setClientName(trimmedName);
      localStorage.setItem('clientName', trimmedName);
      
      // Generate a stable clientId based on name or retrieve existing one
      let clientIdToUse = localStorage.getItem('stableClientId');
      if (!clientIdToUse) {
        clientIdToUse = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('stableClientId', clientIdToUse);
      }
      
      setShowNameDialog(false);
    }
  };

  useEffect(() => {
    // Only connect after we have a client name
    if (!clientName) return;
    const client = new CollabClient('ws://localhost:8080', clientName, {
      onJoined: (id, seq, initialDoc, clientsInfo) => {
        clientIdRef.current = id;
        setClientId(id);
        setDoc(initialDoc);
        serverSeqRef.current = seq;
        setConnected(true);
        
        console.log(`Joined as ${id}, received ${clientsInfo.length} clients:`, clientsInfo.map(c => c.name));
        
        // Store all connected clients
        setClients(clientsInfo.map(c => ({ id: c.id, name: c.name, color: c.color })));
        
        // Initialize cursors for existing clients at origin
        clientsInfo.forEach(c => {
          if (c.id !== id) {
            cursorManagerRef.current.updateCursor(c.id, c.cursorX || 0, c.cursorY || 0, c.name);
          }
        });
        setCursors(cursorManagerRef.current.getAllCursors());
      },
      onJoin: (cId, name, color) => {
        // New client joined
        console.log('Client joined:', cId, name);
        setClients(prev => {
          // Check if client already exists
          if (prev.some(c => c.id === cId)) {
            return prev;
          }
          return [...prev, { id: cId, name, color }];
        });
        // Initialize their cursor at position 0
        cursorManagerRef.current.updateCursor(cId, 0, 0, name);
        setCursors(cursorManagerRef.current.getAllCursors());
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

        // Mouse cursors don't need position shifting for text operations
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
      onCursor: (cId, x, y) => {
        // Get existing cursor to preserve the name
        const existingCursor = cursorManagerRef.current.getCursor(cId);
        // Use callback to get latest clients state
        setClients(currentClients => {
          const clientInfo = currentClients.find(c => c.id === cId);
          const name = existingCursor?.name || clientInfo?.name || cId.slice(0, 8);
          cursorManagerRef.current.updateCursor(cId, x, y, name);
          setCursors(cursorManagerRef.current.getAllCursors());
          return currentClients; // Don't modify clients state
        });
      },
      onDisconnect: (cId) => {
        setClients(prev => prev.filter(c => c.id !== cId));
        cursorManagerRef.current.removeCursor(cId);
        setCursors(cursorManagerRef.current.getAllCursors());
      },
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [clientName]);

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

  const handleMouseMove = (x: number, y: number) => {
    if (connected) {
      // Throttle to max 60fps (approximately 16ms between updates)
      const now = Date.now();
      if (now - lastMouseMoveTime.current < 16) {
        return;
      }
      lastMouseMoveTime.current = now;
      clientRef.current?.sendCursor(x, y);
    }
  };

  return (
    <div className="app">
      {showNameDialog && (
        <div className="name-dialog-overlay">
          <div className="name-dialog">
            <h2>Welcome to Collaborative Editor</h2>
            <p>Please enter your name to continue:</p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
              placeholder="Enter your name"
              autoFocus
            />
            <button onClick={handleNameSubmit} disabled={!nameInput.trim()}>
              Join Editor
            </button>
          </div>
        </div>
      )}
      <header className="app-header">
        <h1>Collaborative Text Editor</h1>
        <div className="connection-status">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
          {clientName && (
            <>
              <span className="client-name"> • {clientName}</span>
              <button 
                className="change-name-btn" 
                onClick={() => {
                  localStorage.removeItem('clientName');
                  localStorage.removeItem('stableClientId');
                  window.location.reload();
                }}
                title="Change name"
              >
                ✏️
              </button>
            </>
          )}
        </div>
      </header>
      <main className="app-main">
        {!clientName ? (
          <div className="loading">Please enter your name to start...</div>
        ) : connected ? (
          <>
            <Editor
              initialDoc={doc}
              onChange={handleChange}
              onMouseMove={handleMouseMove}
              onApplyOperation={(callback) => {
                applyOperationRef.current = callback;
              }}
              remoteCursors={cursors.filter(c => c.clientId !== clientId)}
            />
            <Presence cursors={cursors} currentClientId={clientId} clients={clients} />
          </>
        ) : (
          <div className="loading">Connecting to server...</div>
        )}
      </main>
    </div>
  );
}

export default App;
