import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { X, Network } from 'lucide-react';

const lowlight = createLowlight(common);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  onSave: (content: string) => void;
}

const Modal = ({ isOpen, onClose, title, content, onSave }: ModalProps) => {
  const [imageData, setImageData] = useState<{ src: string; alt: string } | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [tags, setTags] = useState<string[]>(['Note']);

  // Check if content contains an image
  useEffect(() => {
    if (content) {
      // Create temporary div to parse HTML
      const temp = document.createElement('div');
      temp.innerHTML = content;
      
      // Find image
      const img = temp.querySelector('img');
      if (img) {
        setImageData({
          src: img.src,
          alt: img.alt || '',
        });
      } else {
        setImageData(null);
      }
    }
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none min-h-[200px] p-4',
      },
    },
  });

  useEffect(() => {
    if (isOpen && editor && content && !imageData) {
      editor.commands.setContent(content);
    }
  }, [isOpen, editor, content, imageData]);

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setIsAddingTag(false);
      setNewTag('');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      {imageData ? (
        // Image view - simple modal
        <div className="bg-white rounded-xl shadow-xl max-w-4xl">
          <div className="flex justify-between items-center p-4 border-b border-gray-100">
            <input
              type="text"
              defaultValue={title}
              className="text-lg font-medium bg-transparent focus:outline-none"
              placeholder="Note Title"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 flex justify-center">
            <div className="relative group">
              <img
                src={imageData.src}
                alt={imageData.alt}
                className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-lg transition-transform hover:scale-[1.02]"
                style={{
                  minWidth: '300px',
                }}
              />
              {imageData.alt && (
                <div className="mt-4 text-center text-gray-600 text-sm">
                  {imageData.alt}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center p-4 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Press <kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-medium">Esc</kbd> to close
            </div>
            <button
              onClick={onClose}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        // Text note view - full editor with sidebar
        <div className="bg-white rounded-xl w-[80vw] max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Shortcuts:</span>
                <div className="flex gap-2">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl + B</kbd>
                  <span>bold</span>
                </div>
                <div className="flex gap-2">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl + I</kbd>
                  <span>italic</span>
                </div>
                <div className="flex gap-2">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">#</kbd>
                  <span>heading</span>
                </div>
                <div className="flex gap-2">
                  <kbd className="px-2 py-1 bg-gray-100 rounded">-</kbd>
                  <span>list</span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex gap-4 bg-gray-50">
            <div className="flex-1 bg-white rounded-lg shadow-sm">
              <div className="w-full min-h-[calc(100vh-300px)] p-4">
                <EditorContent editor={editor} className="min-h-full prose prose-sm max-w-none" />
              </div>
            </div>

            <div className="w-[300px] flex flex-col gap-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-gray-700 font-medium">MIND TAGS</h3>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type tag name..."
                        className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button 
                        onClick={handleAddTag}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => {
                          setIsAddingTag(false);
                          setNewTag('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingTag(true)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition-colors"
                    >
                      + Add tag
                    </button>
                  )}
                  {tags.map((tag, index) => (
                    <div key={index} className="flex items-center gap-1">
                      <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm">
                        {tag}
                      </span>
                      <button 
                        onClick={() => setTags(tags.filter((_, i) => i !== index))}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-gray-700 font-medium">MIND NOTES</h3>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                        <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                        <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <input 
                    type="text" 
                    placeholder="Type here to add a note..."
                    className="w-full bg-transparent text-gray-700 text-sm placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-auto flex justify-between items-center">
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                    <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    if (editor) {
                      onSave(editor.getHTML());
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  Save as note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Modal;