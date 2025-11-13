import { useEffect, useRef, useState } from 'react';
import { CursorInfo } from './cursorManager';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';

interface RichEditorProps {
  initialDoc: string;
  onChange: (pos: number, text: string, isDelete: boolean, length?: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onApplyOperation?: (callback: (pos: number, text?: string, length?: number) => void) => void;
  remoteCursors?: CursorInfo[];
}

export function RichEditor({ initialDoc, onChange, onMouseMove, onApplyOperation, remoteCursors = [] }: RichEditorProps) {
  const [value, setValue] = useState(initialDoc);
  const editableRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef(initialDoc);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, column: 1 });

  // Set initial content on mount
  useEffect(() => {
    if (editableRef.current && !editableRef.current.innerHTML) {
      editableRef.current.innerHTML = initialDoc;
    }
  }, [initialDoc]);

  // Keep editor in sync when the initial document changes
  useEffect(() => {
    if (lastValueRef.current !== initialDoc) {
      lastValueRef.current = initialDoc;
      setValue(initialDoc);
      if (editableRef.current) {
        editableRef.current.innerHTML = initialDoc;
      }
    }
  }, [initialDoc]);

  useEffect(() => {
    // Expose method to apply remote operations
    if (onApplyOperation) {
      onApplyOperation((pos: number, text?: string, length?: number) => {
        if (!editableRef.current) return;
        
        const currentHTML = editableRef.current.innerHTML;
        let newHTML: string;
        
        if (length !== undefined && length > 0) {
          // Delete operation
          newHTML = currentHTML.slice(0, pos) + currentHTML.slice(pos + length);
        } else if (text) {
          // Insert operation
          newHTML = currentHTML.slice(0, pos) + text + currentHTML.slice(pos);
        } else {
          return;
        }
        
        setValue(newHTML);
        editableRef.current.innerHTML = newHTML;
        lastValueRef.current = newHTML;
      });
    }
  }, [onApplyOperation]);

  const handleInput = () => {
    if (!editableRef.current) return;
    
    const newValue = editableRef.current.innerHTML;
    const oldValue = lastValueRef.current;
    
    if (oldValue === newValue) {
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
    
    lastValueRef.current = newValue;
    setValue(newValue);
    
    if (deletedCount > 0 && insertedText.length > 0) {
      onChange(i, '', true, deletedCount);
      onChange(i, insertedText, false);
    } else if (deletedCount > 0) {
      onChange(i, '', true, deletedCount);
    } else if (insertedText.length > 0) {
      onChange(i, insertedText, false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorContainerRef.current) {
      const rect = editorContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onMouseMove(x, y);
    }
  };

  const handleSelect = () => {
    if (!editableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    // Use innerText for line/column calculation but innerHTML for content sync
    const textBeforeCursor = editableRef.current.innerText.substring(0, range.startOffset);
    const lines = textBeforeCursor.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    setCursorPos({ line, column });
  };

  const handleFormat = (format: string) => {
    if (!editableRef.current) return;
    
    editableRef.current.focus();
    
    switch (format) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false);
        break;
      case 'code':
        document.execCommand('formatBlock', false, 'pre');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
      case 'bulletList':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'numberedList':
        document.execCommand('insertOrderedList', false);
        break;
      case 'h1':
        document.execCommand('formatBlock', false, 'h1');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, 'h2');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, 'h3');
        break;
      case 'alignLeft':
        document.execCommand('justifyLeft', false);
        break;
      case 'alignCenter':
        document.execCommand('justifyCenter', false);
        break;
      case 'alignRight':
        document.execCommand('justifyRight', false);
        break;
      default:
        break;
    }
    
    // Trigger input event to sync changes
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          handleFormat('underline');
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
          <div
            ref={editableRef}
            className="editor rich-editor"
            contentEditable
            onInput={handleInput}
            onSelect={handleSelect}
            onClick={handleSelect}
            onKeyUp={handleSelect}
            onKeyDown={handleKeyDown}
            suppressContentEditableWarning
            spellCheck={false}
            data-placeholder="Start typing..."
          />
        </div>
      </div>
      <StatusBar content={value} cursorPosition={cursorPos} />
      <div className="cursors-overlay">
        {remoteCursors.map(cursor => (
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
        ))}
      </div>
    </div>
  );
}
