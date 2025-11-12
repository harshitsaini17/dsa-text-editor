import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Text } from '@codemirror/state';
import { ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

interface EditorProps {
  initialDoc: string;
  onChange: (pos: number, text: string, isDelete: boolean, length?: number) => void;
  onCursorChange: (from: number, to: number) => void;
  onApplyOperation?: (callback: (pos: number, text?: string, length?: number) => void) => void;
}

export function Editor({ initialDoc, onChange, onCursorChange, onApplyOperation }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const ignoreNextChange = useRef<boolean>(false);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: initialDoc,
      extensions: [
        basicSetup,
        javascript(),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            if (ignoreNextChange.current) {
              ignoreNextChange.current = false;
              console.log('Ignoring change from remote operation');
            } else {
              update.changes.iterChanges((fromA: number, toA: number, fromB: number, toB: number, inserted: Text) => {
                if (fromA === toA) {
                  // Insert
                  onChange(fromB, inserted.toString(), false);
                } else if (fromB === toB) {
                  // Delete
                  onChange(fromA, '', true, toA - fromA);
                } else {
                  // Replace (delete then insert)
                  onChange(fromA, '', true, toA - fromA);
                  onChange(fromA, inserted.toString(), false);
                }
              });
            }
          }

          if (update.selectionSet) {
            const sel = update.state.selection.main;
            onCursorChange(sel.from, sel.to);
          }
        }),
      ],
    });

    viewRef.current = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    // Expose method to apply remote operations
    if (onApplyOperation) {
      onApplyOperation((pos: number, text?: string, length?: number) => {
        if (!viewRef.current) return;
        
        ignoreNextChange.current = true;
        
        const view = viewRef.current;
        if (text !== undefined) {
          // Insert operation
          view.dispatch({
            changes: { from: pos, insert: text }
          });
        } else if (length !== undefined) {
          // Delete operation
          view.dispatch({
            changes: { from: pos, to: pos + length }
          });
        }
      });
    }

    return () => {
      viewRef.current?.destroy();
    };
  }, []);

  return <div ref={editorRef} className="editor-container" />;
}
