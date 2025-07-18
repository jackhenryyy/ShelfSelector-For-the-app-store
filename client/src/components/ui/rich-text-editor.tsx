import { useState, useRef, useEffect } from "react";
import { Bold, Italic, Link, Type } from "lucide-react";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Convert HTML to display format and vice versa
  const htmlToDisplay = (html: string) => {
    return html
      .replace(/<strong>/g, '**')
      .replace(/<\/strong>/g, '**')
      .replace(/<em>/g, '*')
      .replace(/<\/em>/g, '*')
      .replace(/<a href="([^"]*)"[^>]*>/g, '[')
      .replace(/<\/a>/g, ']($1)');
  };

  const displayToHtml = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  };

  const [displayValue, setDisplayValue] = useState(htmlToDisplay(value));

  useEffect(() => {
    setDisplayValue(htmlToDisplay(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDisplayValue = e.target.value;
    setDisplayValue(newDisplayValue);
    onChange(displayToHtml(newDisplayValue));
  };

  const applyFormat = (format: 'bold' | 'italic') => {
    const textarea = document.querySelector(`textarea[data-editor-id="${editorRef.current?.id}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = displayValue.substring(start, end);
    
    if (selectedText) {
      let formattedText = '';
      if (format === 'bold') {
        formattedText = `**${selectedText}**`;
      } else if (format === 'italic') {
        formattedText = `*${selectedText}*`;
      }
      
      const newValue = displayValue.substring(0, start) + formattedText + displayValue.substring(end);
      setDisplayValue(newValue);
      onChange(displayToHtml(newValue));
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
      }, 0);
    }
  };

  const addLink = () => {
    const textarea = document.querySelector(`textarea[data-editor-id="${editorRef.current?.id}"]`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = displayValue.substring(start, end);
    
    setLinkText(selectedText);
    setLinkUrl("");
    setShowLinkDialog(true);
  };

  const insertLink = () => {
    const textarea = document.querySelector(`textarea[data-editor-id="${editorRef.current?.id}"]`) as HTMLTextAreaElement;
    if (!textarea || !linkText || !linkUrl) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const linkMarkdown = `[${linkText}](${linkUrl})`;
    const newValue = displayValue.substring(0, start) + linkMarkdown + displayValue.substring(end);
    
    setDisplayValue(newValue);
    onChange(displayToHtml(newValue));
    setShowLinkDialog(false);
    setLinkText("");
    setLinkUrl("");
    
    // Restore focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + linkMarkdown.length, start + linkMarkdown.length);
    }, 0);
  };

  const editorId = `editor-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`relative ${className}`} ref={editorRef} id={editorId}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2 p-2 border border-gray-200 bg-gray-50 rounded-t">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Bold (wrap selection with **)"
          disabled={disabled}
        >
          <Bold className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title="Italic (wrap selection with *)"
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

        <div className="mx-2 w-px h-4 bg-gray-300"></div>
        
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          title={isExpanded ? "Collapse" : "Expand"}
          disabled={disabled}
        >
          <Type className="w-4 h-4" />
        </button>
      </div>

      {/* Text Area */}
      <textarea
        data-editor-id={editorId}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-200 border-t-0 rounded-b font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/20"
        rows={isExpanded ? rows * 2 : rows}
        disabled={disabled}
      />

      {/* Preview */}
      {displayValue && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded">
          <div className="text-xs font-mono text-gray-500 mb-2">Preview:</div>
          <div 
            className="prose prose-sm max-w-none font-mono text-sm"
            dangerouslySetInnerHTML={{ __html: displayToHtml(displayValue) }}
          />
        </div>
      )}

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
    </div>
  );
}

// Simple rich text display component for read-only display
interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className = "" }: RichTextDisplayProps) {
  const displayToHtml = (text: string) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
  };

  return (
    <div 
      className={`prose prose-sm max-w-none font-mono text-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: displayToHtml(content) }}
    />
  );
}