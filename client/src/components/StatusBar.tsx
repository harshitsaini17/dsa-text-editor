import React, { useMemo, memo } from 'react';

interface StatusBarProps {
  content: string;
  cursorPosition?: { line: number; column: number };
}

export const StatusBar = memo(function StatusBar({ content, cursorPosition }: StatusBarProps) {
  const stats = useMemo(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characters = content.length;
    const lines = content.split('\n').length;
    
    // Calculate reading time (average 200 words per minute)
    const readingTime = Math.ceil(words / 200);
    
    return {
      words,
      characters,
      lines,
      readingTime: readingTime || 1,
    };
  }, [content]);

  return (
    <div className="status-bar">
      <div className="status-bar-section">
        <span className="status-item">
          <span className="status-label">Lines:</span>
          <span className="status-value">{stats.lines}</span>
        </span>
        <span className="status-item">
          <span className="status-label">Words:</span>
          <span className="status-value">{stats.words}</span>
        </span>
        <span className="status-item">
          <span className="status-label">Characters:</span>
          <span className="status-value">{stats.characters}</span>
        </span>
      </div>
      
      <div className="status-bar-section">
        <span className="status-item">
          <span className="status-label">Reading time:</span>
          <span className="status-value">{stats.readingTime} min</span>
        </span>
        {cursorPosition && (
          <span className="status-item">
            <span className="status-label">Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
          </span>
        )}
      </div>
    </div>
  );
});
