import { useState, useCallback, useRef } from 'react';

interface HistoryState {
  content: string;
  cursorPosition: number;
}

export function useHistory(initialContent: string, maxHistorySize: number = 50) {
  const [history, setHistory] = useState<HistoryState[]>([{ content: initialContent, cursorPosition: 0 }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoRedoRef = useRef(false);

  const pushToHistory = useCallback((content: string, cursorPosition: number) => {
    if (isUndoRedoRef.current) {
      return;
    }

    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Don't add to history if content hasn't changed
      if (newHistory.length > 0 && newHistory[newHistory.length - 1].content === content) {
        return prev;
      }
      
      newHistory.push({ content, cursorPosition });
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        setCurrentIndex(newHistory.length - 1);
        return newHistory;
      }
      
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [currentIndex, maxHistorySize]);

  const undo = useCallback((): HistoryState | null => {
    if (currentIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
      
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback((): HistoryState | null => {
    if (currentIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      
      // Reset flag after state update
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 0);
      
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const clearHistory = useCallback(() => {
    setHistory([{ content: '', cursorPosition: 0 }]);
    setCurrentIndex(0);
  }, []);

  return {
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    isUndoRedo: isUndoRedoRef.current,
  };
}
