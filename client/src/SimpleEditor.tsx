import { useCallback, useEffect, useRef, useState } from 'react';

interface EditorProps {
  initialDoc: string;
  onChange: (pos: number, text: string, isDelete: boolean, length?: number) => void;
  onCursorChange: (from: number, to: number) => void;
  onApplyOperation?: (callback: (pos: number, text?: string, length?: number) => void) => void;
}

export function Editor({ initialDoc, onChange, onCursorChange, onApplyOperation }: EditorProps) {
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
            ? prev.slice(0, pos) + text 
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

  return (
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
  );
}
