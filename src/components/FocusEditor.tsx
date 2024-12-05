import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import { X } from 'lucide-react';

const lowlight = createLowlight(common);

interface FocusEditorProps {
  initialContent: string;
  onClose: () => void;
  onSave: (content: string) => void;
}

const FocusEditor = ({ initialContent, onClose, onSave }: FocusEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none',
      },
    },
    autofocus: 'end',
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter' && editor) {
      e.preventDefault();
      onSave(editor.getHTML());
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-white z-50 flex flex-col"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-2 flex justify-between items-center">
        <div className="text-gray-400 text-sm">
          Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">Esc</kbd> to exit
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <input
            type="text"
            placeholder="Type your headline here..."
            className="w-full text-3xl font-light text-gray-700 mb-4 bg-transparent focus:outline-none"
          />
          <EditorContent 
            editor={editor}
            className="min-h-[calc(100vh-200px)]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4 flex justify-between items-center">
        <button className="text-sm flex items-center gap-1 text-gray-500 hover:text-gray-700">
          <span className="font-mono">⌘</span> SHORTCUTS
        </button>
        <button
          onClick={() => editor && onSave(editor.getHTML())}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          SAVE (CTRL+ENTER)
        </button>
      </div>
    </div>
  );
};

export default FocusEditor;
