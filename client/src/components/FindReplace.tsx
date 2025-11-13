import React, { useState, useEffect, useRef } from 'react';

interface FindReplaceProps {
  content: string;
  onFind: (searchText: string, matchCase: boolean, wholeWord: boolean) => void;
  onFindNext: () => void;
  onFindPrevious: () => void;
  onReplace: (replaceText: string) => void;
  onReplaceAll: (searchText: string, replaceText: string, matchCase: boolean, wholeWord: boolean) => void;
  onClose: () => void;
  matchCount: number;
  currentMatch: number;
}

export function FindReplace({ 
  onFind, 
  onFindNext, 
  onFindPrevious, 
  onReplace, 
  onReplaceAll, 
  onClose,
  matchCount,
  currentMatch
}: FindReplaceProps) {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
  }, []);

  useEffect(() => {
    onFind(findText, matchCase, wholeWord);
  }, [findText, matchCase, wholeWord, onFind]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        onFindPrevious();
      } else {
        onFindNext();
      }
    }
  };

  const handleReplaceClick = () => {
    if (findText && replaceText !== undefined) {
      onReplace(replaceText);
    }
  };

  const handleReplaceAllClick = () => {
    if (findText && replaceText !== undefined) {
      onReplaceAll(findText, replaceText, matchCase, wholeWord);
    }
  };

  return (
    <div className="find-replace-panel">
      <div className="find-replace-header">
        <span className="find-replace-title">Find & Replace</span>
        <button className="find-replace-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="find-replace-content">
        <div className="find-replace-row">
          <input
            ref={findInputRef}
            type="text"
            className="find-replace-input"
            placeholder="Find"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="find-replace-controls">
            <button
              className="find-replace-button icon-button"
              onClick={() => setMatchCase(!matchCase)}
              title="Match Case"
              aria-label="Match Case"
              data-active={matchCase}
            >
              Aa
            </button>
            <button
              className="find-replace-button icon-button"
              onClick={() => setWholeWord(!wholeWord)}
              title="Match Whole Word"
              aria-label="Match Whole Word"
              data-active={wholeWord}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 5h2M12 5h2M4 11h8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="find-match-count">
              {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No results'}
            </span>
            <button
              className="find-replace-button icon-button"
              onClick={onFindPrevious}
              disabled={matchCount === 0}
              title="Previous Match (Shift+Enter)"
              aria-label="Previous Match"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 12L6 8l4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="find-replace-button icon-button"
              onClick={onFindNext}
              disabled={matchCount === 0}
              title="Next Match (Enter)"
              aria-label="Next Match"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="find-replace-row">
          <input
            type="text"
            className="find-replace-input"
            placeholder="Replace"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="find-replace-controls">
            <button
              className="find-replace-button"
              onClick={handleReplaceClick}
              disabled={matchCount === 0}
            >
              Replace
            </button>
            <button
              className="find-replace-button"
              onClick={handleReplaceAllClick}
              disabled={matchCount === 0}
            >
              Replace All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
