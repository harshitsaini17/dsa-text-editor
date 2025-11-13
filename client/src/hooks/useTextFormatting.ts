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

export function useTextFormatting({ textareaRef, value, onChange }: UseTextFormattingProps) {
  
  const wrapSelectedText = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (start === end) {
      // No selection, insert markers at cursor
      const newValue = value.substring(0, start) + prefix + suffix + value.substring(end);
      onChange(newValue);
      
      // Move cursor between markers
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    } else {
      // Wrap selected text
      const newValue = 
        value.substring(0, start) + 
        prefix + selectedText + suffix + 
        value.substring(end);
      
      onChange(newValue);
      
      // Restore selection
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + prefix.length,
          end + prefix.length
        );
      }, 0);
    }
  }, [textareaRef, value, onChange]);

  const bold = useCallback(() => {
    wrapSelectedText('**');
  }, [wrapSelectedText]);

  const italic = useCallback(() => {
    wrapSelectedText('*');
  }, [wrapSelectedText]);

  const underline = useCallback(() => {
    wrapSelectedText('<u>', '</u>');
  }, [wrapSelectedText]);

  const strikethrough = useCallback(() => {
    wrapSelectedText('~~');
  }, [wrapSelectedText]);

  const code = useCallback(() => {
    wrapSelectedText('`');
  }, [wrapSelectedText]);

  const codeBlock = useCallback(() => {
    wrapSelectedText('```\n', '\n```');
  }, [wrapSelectedText]);

  const heading = useCallback((level: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Find the start of the current line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', end);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    const currentLine = value.substring(lineStart, actualLineEnd);
    const prefix = '#'.repeat(level) + ' ';
    
    // Check if line already has heading
    const headingMatch = currentLine.match(/^#+\s/);
    let newLine: string;
    
    if (headingMatch) {
      // Replace existing heading
      newLine = prefix + currentLine.substring(headingMatch[0].length);
    } else {
      // Add new heading
      newLine = prefix + currentLine;
    }
    
    const newValue = 
      value.substring(0, lineStart) + 
      newLine + 
      value.substring(actualLineEnd);
    
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length);
    }, 0);
  }, [textareaRef, value, onChange]);

  const link = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      // Wrap selected text as link
      const newValue = 
        value.substring(0, start) + 
        `[${selectedText}](url)` + 
        value.substring(end);
      
      onChange(newValue);
      
      // Select "url" text
      setTimeout(() => {
        textarea.focus();
        const urlStart = start + selectedText.length + 3;
        textarea.setSelectionRange(urlStart, urlStart + 3);
      }, 0);
    } else {
      // Insert link template
      const linkTemplate = '[text](url)';
      const newValue = 
        value.substring(0, start) + 
        linkTemplate + 
        value.substring(end);
      
      onChange(newValue);
      
      // Select "text"
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 5);
      }, 0);
    }
  }, [textareaRef, value, onChange]);

  const bulletList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    const currentLine = value.substring(lineStart, actualLineEnd);
    
    // Toggle bullet list
    let newLine: string;
    if (currentLine.startsWith('- ')) {
      newLine = currentLine.substring(2);
    } else {
      newLine = '- ' + currentLine;
    }
    
    const newValue = 
      value.substring(0, lineStart) + 
      newLine + 
      value.substring(actualLineEnd);
    
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + 2, lineStart + 2);
    }, 0);
  }, [textareaRef, value, onChange]);

  const numberedList = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = value.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
    
    const currentLine = value.substring(lineStart, actualLineEnd);
    
    // Toggle numbered list
    let newLine: string;
    const numMatch = currentLine.match(/^\d+\.\s/);
    if (numMatch) {
      newLine = currentLine.substring(numMatch[0].length);
    } else {
      newLine = '1. ' + currentLine;
    }
    
    const newValue = 
      value.substring(0, lineStart) + 
      newLine + 
      value.substring(actualLineEnd);
    
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart + 3, lineStart + 3);
    }, 0);
  }, [textareaRef, value, onChange]);

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
