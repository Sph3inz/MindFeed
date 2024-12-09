import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import { X, Command } from 'lucide-react';

const lowlight = createLowlight(common);

interface FocusEditorProps {
  initialContent: string;
  onClose: () => void;
  onSave: (content: string) => void;
  title?: string;
}

const FocusEditor = ({ initialContent, onClose, onSave, title }: FocusEditorProps) => {
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
        class: 'prose prose-invert prose-sm focus:outline-none max-w-none',
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
      className="fixed inset-0 bg-[#0A0A0A] z-50 flex flex-col"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="border-b border-white/[0.08] px-6 py-4 flex justify-between items-center bg-black/20">
        <div className="text-white/40 text-sm flex items-center gap-2">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-medium">Esc</kbd> to exit
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {title && (
            <h1 className="text-2xl font-light text-white/90 mb-6">{title}</h1>
          )}
          <EditorContent 
            editor={editor}
            className="min-h-[calc(100vh-200px)]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.08] p-6 flex justify-between items-center bg-black/20">
        <button className="text-sm flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors">
          <Command className="w-4 h-4" />
          <span>SHORTCUTS</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white/60 hover:text-white/90 hover:bg-white/5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => editor && onSave(editor.getHTML())}
            className="bg-[#8B5CF6] text-white px-4 py-2 rounded-xl hover:bg-[#7C3AED] transition-colors flex items-center gap-2"
          >
            <span>Save</span>
            <span className="text-white/60 text-sm">(Ctrl+Enter)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusEditor;
