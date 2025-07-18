import { useState, useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Link } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Enter text...", 
  className = "",
  rows = 4,
  disabled = false
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [currentRange, setCurrentRange] = useState<Range | null>(null);

  // Convert HTML to display format (remove HTML tags for editing)
  const htmlToPlainText = (html: string) => {
    return html
      .replace(/<strong>/g, '')
      .replace(/<\/strong>/g, '')
      .replace(/<em>/g, '')
      .replace(/<\/em>/g, '')
      .replace(/<a href="[^"]*"[^>]*>/g, '')
      .replace(/<\/a>/g, '');
  };

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value) {
      // Only set if different to avoid cursor jumping
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        applyFormat('bold');
      } else if (e.key === 'i') {
        e.preventDefault();
        applyFormat('italic');
      }
    }
  };

  const applyFormat = (format: 'bold' | 'italic') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    // Check if we're inside the formatted element already
    let parentElement = range.commonAncestorContainer;
    if (parentElement.nodeType === Node.TEXT_NODE) {
      parentElement = parentElement.parentNode!;
    }

    const tagName = format === 'bold' ? 'STRONG' : 'EM';
    const formattedParent = (parentElement as Element).closest(tagName.toLowerCase());

    if (formattedParent) {
      // Remove formatting
      const textContent = formattedParent.textContent || '';
      const textNode = document.createTextNode(textContent);
      formattedParent.parentNode?.replaceChild(textNode, formattedParent);
    } else {
      // Apply formatting
      if (!range.collapsed) {
        const selectedContent = range.extractContents();
        const formattedElement = document.createElement(tagName.toLowerCase());
        formattedElement.appendChild(selectedContent);
        range.insertNode(formattedElement);
        
        // Restore selection
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(formattedElement);
        selection.addRange(newRange);
      }
    }

    handleInput();
  };

  const addLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    setCurrentRange(range.cloneRange());
    setLinkText(range.toString());
    setLinkUrl("");
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    if (!currentRange || !linkText || !linkUrl) return;

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(currentRange);

      const link = document.createElement('a');
      link.href = linkUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'text-blue-600 hover:text-blue-800 underline';
      link.textContent = linkText;

      try {
        currentRange.deleteContents();
        currentRange.insertNode(link);
      } catch (e) {
        // Fallback if range is no longer valid
        editorRef.current?.appendChild(link);
      }
    }

    setShowLinkDialog(false);
    setLinkText("");
    setLinkUrl("");
    setCurrentRange(null);
    handleInput();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2 p-2 border border-black bg-gray-50">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Bold (Ctrl+B)"
          disabled={disabled}
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Italic (Ctrl+I)"
          disabled={disabled}
        >
          <Italic className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={addLink}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Add Link"
          disabled={disabled}
        >
          <Link className="w-4 h-4" />
        </button>
      </div>

      {/* Rich Text Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="w-full p-3 border border-black border-t-0 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/20 min-h-[120px] max-h-[300px] overflow-y-auto"
        style={{ 
          minHeight: `${rows * 1.5}em`,
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded border border-black max-w-md w-full mx-4">
            <h3 className="font-mono text-sm font-medium mb-4">Add Link</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs mb-1">Link Text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                  placeholder="Enter link text"
                />
              </div>
              
              <div>
                <label className="block font-mono text-xs mb-1">URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded font-mono text-sm"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-3 py-2 border border-black bg-white text-black font-mono text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={insertLink}
                className="px-3 py-2 border border-black bg-black text-white font-mono text-sm hover:bg-gray-800"
                disabled={!linkText || !linkUrl}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for placeholder */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          font-style: italic;
          pointer-events: none;
        }
        [contenteditable]:focus:empty:before {
          color: #d1d5db;
        }
      `}</style>
    </div>
  );
}

// Simple rich text display component for read-only display
interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className = "" }: RichTextDisplayProps) {
  return (
    <div 
      className={`prose prose-sm max-w-none font-mono text-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}