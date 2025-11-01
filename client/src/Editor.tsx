import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Text } from '@codemirror/state';
import { ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

interface EditorProps {
  initialDoc: string;
  onChange: (pos: number, text: string, isDelete: boolean, length?: number) => void;
  onCursorChange: (from: number, to: number) => void;
}

export function Editor({ initialDoc, onChange, onCursorChange }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: initialDoc,
      extensions: [
        basicSetup,
        javascript(),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
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

    return () => {
      viewRef.current?.destroy();
    };
  }, []);

  return <div ref={editorRef} className="editor-container" />;
}
