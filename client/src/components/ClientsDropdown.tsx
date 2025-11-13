import { useState, useRef, useEffect } from 'react';

interface Client {
  id: string;
  name: string;
  color: string;
}

interface ClientsDropdownProps {
  clients: Client[];
  currentClientId: string;
}

export function ClientsDropdown({ clients, currentClientId }: ClientsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onlineCount = clients.length;

  return (
    <div className="clients-dropdown" ref={dropdownRef}>
      <button 
        className="clients-dropdown-toggle" 
        onClick={() => setIsOpen(!isOpen)}
        title="View connected users"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span className="online-count">{onlineCount} online</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <div className="clients-dropdown-menu">
          <div className="clients-dropdown-header">
            Connected Users ({onlineCount})
          </div>
          <div className="clients-list">
            {clients.map(client => (
              <div 
                key={client.id} 
                className={`client-item ${client.id === currentClientId ? 'current-user' : ''}`}
              >
                <div 
                  className="client-avatar" 
                  style={{ backgroundColor: client.color }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <span className="client-name">
                  {client.name}
                  {client.id === currentClientId && ' (You)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
