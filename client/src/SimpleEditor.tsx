import { useCallback, useEffect, useRef, useState, useMemo, memo } from 'react';
import { CursorInfo } from './cursorManager';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { FindReplace } from './components/FindReplace';
import { useTextFormatting } from './hooks/useTextFormatting';
import { useHistory } from './hooks/useHistory';

// Memoized cursor component to prevent unnecessary re-renders
const RemoteCursor = memo(({ cursor }: { cursor: CursorInfo }) => {
  return (
    <div
      className="remote-cursor-pointer"
      style={{
        left: `${cursor.x}px`,
        top: `${cursor.y}px`,
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill={cursor.color}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <path d="M5 3L19 12L12 13L9 20L5 3Z" />
      </svg>
      <div className="cursor-label" style={{ backgroundColor: cursor.color }}>
        {cursor.name}
      </div>
    </div>
  );
});

RemoteCursor.displayName = 'RemoteCursor';

interface EditorProps {
  initialDoc: string;
  onChange: (pos: number, text: string, isDelete: boolean, length?: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onApplyOperation?: (callback: (pos: number, text?: string, length?: number) => void) => void;
  remoteCursors?: CursorInfo[];
}

export function Editor({ initialDoc, onChange, onMouseMove, onApplyOperation, remoteCursors = [] }: EditorProps) {
  const [value, setValue] = useState(initialDoc);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(initialDoc);
  const programmaticChangeDepth = useRef(0);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });
  const [showFind, setShowFind] = useState(false);
  const [findMatches, setFindMatches] = useState<{ start: number; end: number }[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  // History management
  const history = useHistory(initialDoc);
  const historyTimeoutRef = useRef<number | null>(null);

  const formatting = useTextFormatting({
    textareaRef,
    value,
    onChange: (newValue) => {
      const oldValue = lastValueRef.current;
      
      // Find what changed
      let i = 0;
      while (i < oldValue.length && i < newValue.length && oldValue[i] === newValue[i]) {
        i++;
      }
      
      let oldEnd = oldValue.length;
      let newEnd = newValue.length;
      while (oldEnd > i && newEnd > i && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
        oldEnd--;
        newEnd--;
      }
      
      const deletedCount = oldEnd - i;
      const insertedText = newValue.slice(i, newEnd);
      
      // Update state and ref
      setValue(newValue);
      lastValueRef.current = newValue;
      
      // Send changes to server
      if (deletedCount > 0 && insertedText.length > 0) {
        // Replace: delete then insert
        onChange(i, '', true, deletedCount);
        onChange(i, insertedText, false);
      } else if (deletedCount > 0) {
        // Pure delete
        onChange(i, '', true, deletedCount);
      } else if (insertedText.length > 0) {
        // Pure insert
        onChange(i, insertedText, false);
      }
    },
  });

  const markProgrammaticChange = useCallback(() => {
    // programmaticChangeDepth.current += 1;
    // Promise.resolve().then(() => {
    //   programmaticChangeDepth.current = Math.max(0, programmaticChangeDepth.current - 1);
    // });
  }, []);

  // Keep editor in sync when the initial document changes (e.g., on reconnect)
  useEffect(() => {
    if (lastValueRef.current !== initialDoc) {
      // markProgrammaticChange();
      lastValueRef.current = initialDoc;
      setValue(initialDoc);
    }
  }, [initialDoc, markProgrammaticChange]);

  useEffect(() => {
    // Expose method to apply remote operations
    if (onApplyOperation) {
      onApplyOperation((pos: number, text?: string, length?: number) => {
        // Flag this update so change handlers ignore the resulting synthetic event
        // markProgrammaticChange();

        setValue(prev => {
          const newVal = text !== undefined
            ? prev.slice(0, pos) + text + prev.slice(pos + (length || 0))
            : prev.slice(0, pos);
          
          // console.log(`Applied remote op: pos=${pos}, text="${text || ''}", len=${length || 0}, newLength=${newVal.length}`);
          
          // Update ref to track the new value
          lastValueRef.current = newVal;
          
          return newVal;
        });
      });
    }
  }, [onApplyOperation, markProgrammaticChange]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!textareaRef.current) return;
    
    const newValue = e.target.value;
    if (programmaticChangeDepth.current > 0) {
      console.log('Ignoring programmatic change event');
      lastValueRef.current = newValue;
      return;
    }

    const oldValue = lastValueRef.current;
    
    // If no actual change, skip (prevent loop from setValue updates)
    if (oldValue === newValue) {
      console.log('No actual change detected, skipping');
      return;
    }
    
    // Find what changed
    let i = 0;
    while (i < oldValue.length && i < newValue.length && oldValue[i] === newValue[i]) {
      i++;
    }
    
    let oldEnd = oldValue.length;
    let newEnd = newValue.length;
    while (oldEnd > i && newEnd > i && oldValue[oldEnd - 1] === newValue[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    
    const deletedCount = oldEnd - i;
    const insertedText = newValue.slice(i, newEnd);
    
    console.log(`Local change: pos=${i}, deleted=${deletedCount}, inserted="${insertedText}", oldLen=${oldValue.length}, newLen=${newValue.length}`);
    
    // Update ref first to prevent detecting this as another change
    lastValueRef.current = newValue;
    
    if (deletedCount > 0 && insertedText.length > 0) {
      // Replace: delete then insert
      onChange(i, '', true, deletedCount);
      onChange(i, insertedText, false);
    } else if (deletedCount > 0) {
      // Pure delete
      onChange(i, '', true, deletedCount);
    } else if (insertedText.length > 0) {
      // Pure insert
      onChange(i, insertedText, false);
    }
    
    setValue(newValue);
    
    // Debounced history push - save to history after 500ms of inactivity
    if (historyTimeoutRef.current !== null) {
      window.clearTimeout(historyTimeoutRef.current);
    }
    historyTimeoutRef.current = window.setTimeout(() => {
      const cursorPosition = textareaRef.current?.selectionStart || 0;
      history.pushToHistory(newValue, cursorPosition);
    }, 500);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorContainerRef.current) {
      const rect = editorContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onMouseMove(x, y);
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    // Keep selection handling for textarea, but don't send as cursor position
    const target = e.target as HTMLTextAreaElement;
    const from = target.selectionStart;
    const to = target.selectionEnd;
    
    // Calculate line and column position
    const textBeforeCursor = value.substring(0, from);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    setCursorPos({ line, column });
    
    // Could be used for other purposes if needed
    from; to; // Suppress unused warnings
  };

  const handleFormat = (format: string) => {
    switch (format) {
      case 'bold':
        formatting.bold();
        break;
      case 'italic':
        formatting.italic();
        break;
      case 'underline':
        formatting.underline();
        break;
      case 'strikethrough':
        formatting.strikethrough();
        break;
      case 'code':
        formatting.codeBlock();
        break;
      case 'link':
        formatting.link();
        break;
      case 'bulletList':
        formatting.bulletList();
        break;
      case 'numberedList':
        formatting.numberedList();
        break;
      case 'h1':
        formatting.heading(1);
        break;
      case 'h2':
        formatting.heading(2);
        break;
      case 'h3':
        formatting.heading(3);
        break;
      case 'alignLeft':
      case 'alignCenter':
      case 'alignRight':
        // Alignment will be handled in future phase
        console.log('Alignment:', format);
        break;
      default:
        console.log('Format not implemented:', format);
    }
  };

  // Keyboard shortcuts handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    if (modKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            // Redo: Ctrl+Shift+Z or Cmd+Shift+Z
            handleRedo();
          } else {
            // Undo: Ctrl+Z or Cmd+Z
            handleUndo();
          }
          break;
        case 'y':
          // Redo: Ctrl+Y (Windows/Linux)
          if (!isMac) {
            e.preventDefault();
            handleRedo();
          }
          break;
        case 'b':
          e.preventDefault();
          formatting.bold();
          break;
        case 'i':
          e.preventDefault();
          formatting.italic();
          break;
        case 'u':
          e.preventDefault();
          formatting.underline();
          break;
        case 'k':
          e.preventDefault();
          formatting.link();
          break;
        case 'f':
          e.preventDefault();
          setShowFind(true);
          break;
        case 'h':
          e.preventDefault();
          setShowFind(true);
          break;
        default:
          break;
      }
    }
  };

  const handleUndo = useCallback(() => {
    const previousState = history.undo();
    if (previousState && textareaRef.current) {
      lastValueRef.current = previousState.content;
      setValue(previousState.content);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            previousState.cursorPosition,
            previousState.cursorPosition
          );
          textareaRef.current.focus();
        }
      }, 0);
      
      // Notify server of the change
      onChange(0, '', true, value.length);
      onChange(0, previousState.content, false);
    }
  }, [history, onChange, value.length]);

  const handleRedo = useCallback(() => {
    const nextState = history.redo();
    if (nextState && textareaRef.current) {
      lastValueRef.current = nextState.content;
      setValue(nextState.content);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(
            nextState.cursorPosition,
            nextState.cursorPosition
          );
          textareaRef.current.focus();
        }
      }, 0);
      
      // Notify server of the change
      onChange(0, '', true, value.length);
      onChange(0, nextState.content, false);
    }
  }, [history, onChange, value.length]);

  // Find & Replace handlers
  const handleFind = useCallback((searchText: string, matchCase: boolean, wholeWord: boolean) => {
    if (!searchText || !textareaRef.current) {
      setFindMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const content = textareaRef.current.value;
    const matches: { start: number; end: number }[] = [];
    
    let pattern = searchText;
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    setFindMatches(matches);
    setCurrentMatchIndex(0);
    
    if (matches.length > 0) {
      textareaRef.current.setSelectionRange(matches[0].start, matches[0].end);
      textareaRef.current.focus();
    }
  }, []);

  const handleFindNext = useCallback(() => {
    if (findMatches.length === 0 || !textareaRef.current) return;
    
    const nextIndex = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIndex);
    
    const match = findMatches[nextIndex];
    textareaRef.current.setSelectionRange(match.start, match.end);
    textareaRef.current.focus();
  }, [findMatches, currentMatchIndex]);

  const handleFindPrevious = useCallback(() => {
    if (findMatches.length === 0 || !textareaRef.current) return;
    
    const prevIndex = currentMatchIndex === 0 ? findMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    
    const match = findMatches[prevIndex];
    textareaRef.current.setSelectionRange(match.start, match.end);
    textareaRef.current.focus();
  }, [findMatches, currentMatchIndex]);

  const handleReplace = useCallback((replaceText: string) => {
    if (findMatches.length === 0 || !textareaRef.current) return;
    
    const match = findMatches[currentMatchIndex];
    const newValue = 
      value.substring(0, match.start) + 
      replaceText + 
      value.substring(match.end);
    
    // Update state and trigger onChange events
    lastValueRef.current = newValue;
    setValue(newValue);
    
    // Notify parent of change
    const deletedCount = match.end - match.start;
    if (deletedCount > 0 && replaceText.length > 0) {
      onChange(match.start, '', true, deletedCount);
      onChange(match.start, replaceText, false);
    } else if (deletedCount > 0) {
      onChange(match.start, '', true, deletedCount);
    } else if (replaceText.length > 0) {
      onChange(match.start, replaceText, false);
    }
    
    // Adjust selection to the replaced text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(
          match.start,
          match.start + replaceText.length
        );
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, findMatches, currentMatchIndex, onChange]);

  const handleReplaceAll = useCallback((searchText: string, replaceText: string, matchCase: boolean, wholeWord: boolean) => {
    if (!searchText || !textareaRef.current) return;
    
    let pattern = searchText;
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    
    const oldValue = value;
    const newValue = value.replace(regex, replaceText);
    
    if (oldValue !== newValue) {
      lastValueRef.current = newValue;
      setValue(newValue);
      
      // Send a full replacement to server
      onChange(0, '', true, oldValue.length);
      onChange(0, newValue, false);
    }
    
    setFindMatches([]);
    setCurrentMatchIndex(0);
  }, [value, onChange]);

  // Memoize remote cursors to prevent unnecessary re-renders
  const memoizedRemoteCursors = useMemo(() => remoteCursors, [remoteCursors]);

  return (
    <div 
      ref={editorContainerRef}
      className="editor-container" 
      onMouseMove={handleMouseMove}
    >
      <div className="editor-with-toolbar">
        <div className="editor-toolbar-container">
          <Toolbar onFormat={handleFormat} />
        </div>
        {showFind && (
          <FindReplace
            content={value}
            onFind={handleFind}
            onFindNext={handleFindNext}
            onFindPrevious={handleFindPrevious}
            onReplace={handleReplace}
            onReplaceAll={handleReplaceAll}
            onClose={() => setShowFind(false)}
            matchCount={findMatches.length}
            currentMatch={findMatches.length > 0 ? currentMatchIndex + 1 : 0}
          />
        )}
        <div className="editor-content-with-toolbar">
          <textarea
            ref={textareaRef}
            className="editor"
            value={value}
            onChange={handleInput}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            placeholder="Start typing..."
          />
        </div>
      </div>
      <StatusBar content={value} cursorPosition={cursorPos} />
      <div className="cursors-overlay">
        {memoizedRemoteCursors.map(cursor => (
          <RemoteCursor key={cursor.clientId} cursor={cursor} />
        ))}
      </div>
    </div>
  );
}
