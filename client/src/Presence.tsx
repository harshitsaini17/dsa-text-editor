import { CursorInfo } from './cursorManager';

interface ClientInfo {
  id: string;
  name: string;
  color: string;
}

interface PresenceProps {
  cursors: CursorInfo[];
  currentClientId: string;
  clients: ClientInfo[];
}

export function Presence({ cursors, currentClientId, clients }: PresenceProps) {
  // Combine client info from both sources (clients list and cursor info)
  const clientMap = new Map<string, { name: string; color: string }>();
  
  // Add from clients list (authoritative source)
  clients.forEach(c => {
    clientMap.set(c.id, { name: c.name, color: c.color });
  });
  
  // Merge with cursor info (may have updated names/colors)
  cursors.forEach(c => {
    if (!clientMap.has(c.clientId)) {
      clientMap.set(c.clientId, { name: c.name, color: c.color });
    }
  });
  
  // Get all clients except current user
  const otherClients = Array.from(clientMap.entries())
    .filter(([id]) => id !== currentClientId)
    .map(([id, info]) => ({ id, ...info }));

  return (
    <div className="presence">
      <div className="presence-header">
        <span className="presence-count">{clients.length} online</span>
      </div>
      <div className="presence-list">
        {otherClients.map(client => (
          <div key={client.id} className="presence-item">
            <div 
              className="presence-avatar" 
              style={{ backgroundColor: client.color }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
            <span className="presence-name">{client.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
