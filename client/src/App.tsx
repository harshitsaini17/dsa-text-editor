import React, { useState } from 'react';

/**
 * Main application component for the collaborative text editor
 */
function App() {
  const [connected, setConnected] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Collaborative Text Editor</h1>
        <div className="connection-status">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </header>
      <main className="app-main">
        <div className="editor-container">
          <p>Editor will be implemented here...</p>
        </div>
      </main>
    </div>
  );
}

export default App;
