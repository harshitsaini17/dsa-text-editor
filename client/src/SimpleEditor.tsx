import { useCallback, useEffect, useRef, useState } from 'react';
import { CursorInfo } from './cursorManager';
import { Toolbar } from './components/Toolbar';
import { useTextFormatting } from './hooks/useTextFormatting';

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

  const formatting = useTextFormatting({
    textareaRef,
    value,
    onChange: (newValue) => {
      setValue(newValue);
      lastValueRef.current = newValue;
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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        default:
          break;
      }
    }
  };

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
        <div className="editor-content-with-toolbar">
          <textarea
            ref={textareaRef}
            className="editor"
            value={value}
            onChange={handleChange}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            placeholder="Start typing..."
          />
        </div>
      </div>
      <div className="cursors-overlay">
        {remoteCursors.map(cursor => {
          return (
            <div
              key={cursor.clientId}
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
        })}
      </div>
    </div>
  );
}
