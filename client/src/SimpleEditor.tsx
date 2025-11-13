import { useCallback, useEffect, useRef, useState } from 'react';
import { CursorInfo } from './cursorManager';

interface EditorProps {
  initialDoc: string;
  onChange: (pos: number, text: string, isDelete: boolean, length?: number) => void;
  onCursorChange: (from: number, to: number) => void;
  onApplyOperation?: (callback: (pos: number, text?: string, length?: number) => void) => void;
  remoteCursors?: CursorInfo[];
}

export function Editor({ initialDoc, onChange, onCursorChange, onApplyOperation, remoteCursors = [] }: EditorProps) {
  const [value, setValue] = useState(initialDoc);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastValueRef = useRef(initialDoc);
  const programmaticChangeDepth = useRef(0);

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

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const from = target.selectionStart;
    const to = target.selectionEnd;
    onCursorChange(from, to);
  };

  // Calculate cursor position in pixels
  const getCursorCoordinates = (position: number): { top: number; left: number } => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    
    const text = value.substring(0, position);
    const lines = text.split('\n');
    const currentLine = lines.length - 1;
    const currentColumn = lines[lines.length - 1].length;
    
    // Approximate line height and character width
    const lineHeight = 24; // matches CSS
    const charWidth = 8.4; // approximate for monospace font
    
    const top = currentLine * lineHeight + 12; // 12px padding
    const left = currentColumn * charWidth + 12; // 12px padding
    
    return { top, left };
  };

  return (
    <div className="editor-container">
      <textarea
        ref={textareaRef}
        className="editor"
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onClick={handleSelect}
        onKeyUp={handleSelect}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        placeholder="Start typing..."
      />
      <div className="cursors-overlay">
        {remoteCursors.map(cursor => {
          const pos = getCursorCoordinates(cursor.from);
          return (
            <div
              key={cursor.clientId}
              className="remote-cursor"
              style={{
                top: `${pos.top}px`,
                left: `${pos.left}px`,
                borderColor: cursor.color,
              }}
            >
              <div className="cursor-flag" style={{ backgroundColor: cursor.color }}>
                {cursor.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
