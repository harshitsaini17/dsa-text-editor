/**
 * Custom hook for text formatting operations
 * Handles bold, italic, underline, strikethrough, etc.
 */

import { useCallback } from 'react';

interface UseTextFormattingProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

export function useTextFormatting({ textareaRef, onChange }: UseTextFormattingProps) {
  
  const executeCommand = useCallback((command: string, value: string | undefined = undefined) => {
    if (!textareaRef.current) return;
    
    textareaRef.current.focus();
    document.execCommand(command, false, value);
    
    // Trigger onChange with updated HTML content
    const newValue = textareaRef.current.value;
    onChange(newValue);
  }, [textareaRef, onChange]);

  const bold = useCallback(() => {
    executeCommand('bold');
  }, [executeCommand]);

  const italic = useCallback(() => {
    executeCommand('italic');
  }, [executeCommand]);

  const underline = useCallback(() => {
    executeCommand('underline');
  }, [executeCommand]);

  const strikethrough = useCallback(() => {
    executeCommand('strikeThrough');
  }, [executeCommand]);

  const code = useCallback(() => {
    // Wrap in code tag
    const selection = window.getSelection();
    if (!selection || !textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const newValue = 
      textarea.value.substring(0, start) + 
      '`' + selectedText + '`' + 
      textarea.value.substring(end);
    
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 1, end + 1);
    }, 0);
  }, [textareaRef, onChange]);

  const codeBlock = useCallback(() => {
    executeCommand('formatBlock', 'pre');
  }, [executeCommand]);

  const heading = useCallback((level: number) => {
    executeCommand('formatBlock', `h${level}`);
  }, [executeCommand]);

  const link = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      executeCommand('createLink', url);
    }
  }, [executeCommand]);

  const bulletList = useCallback(() => {
    executeCommand('insertUnorderedList');
  }, [executeCommand]);

  const numberedList = useCallback(() => {
    executeCommand('insertOrderedList');
  }, [executeCommand]);

  return {
    bold,
    italic,
    underline,
    strikethrough,
    code,
    codeBlock,
    heading,
    link,
    bulletList,
    numberedList,
  };
}

export type FormattingActions = ReturnType<typeof useTextFormatting>;
