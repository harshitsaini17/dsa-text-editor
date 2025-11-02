import { CursorInfo } from './cursorManager';

interface PresenceProps {
  cursors: CursorInfo[];
  currentClientId: string;
}

export function Presence({ cursors, currentClientId }: PresenceProps) {
  const remoteCursors = cursors.filter(c => c.clientId !== currentClientId);

  return (
    <div className="presence">
      <div className="presence-header">
        <span className="presence-count">{remoteCursors.length + 1} online</span>
      </div>
      <div className="presence-list">
        {remoteCursors.map(cursor => (
          <div key={cursor.clientId} className="presence-item">
            <div 
              className="presence-avatar" 
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name.charAt(0).toUpperCase()}
            </div>
            <span className="presence-name">{cursor.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
