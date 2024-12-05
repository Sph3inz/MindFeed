import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import { ArrowDownLeft } from 'lucide-react';
import Modal from './Modal';
import LoadingOverlay from './LoadingOverlay';
import FocusEditor from './FocusEditor';
import Masonry from 'react-masonry-css';
import NoteContextMenu from './NoteContextMenu';

const lowlight = createLowlight(common);

interface Note {
  id: number;
  title: string;
  content: string;
  metadata: {
    date: string;
    tag: string;
  };
}

const NotesContent = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedNote, setFocusedNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isNewNoteHovered, setIsNewNoteHovered] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusContent, setFocusContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: number;
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none min-h-[120px] p-4',
      },
    },
  });

  useEffect(() => {
    // Load notes from localStorage on component mount
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  const saveToLocalStorage = (updatedNotes: Note[]) => {
    localStorage.setItem('notes', JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const handleSaveNote = async (content: string) => {
    if (!content.trim()) return; // Don't save empty notes
    
    const newNote: Note = {
      id: Date.now(),
      title: `Note ${notes.length + 1}`,
      content: content,
      metadata: {
        date: new Date().toLocaleDateString(),
        tag: 'General'
      }
    };

    // Get existing notes from localStorage
    const existingNotes = localStorage.getItem('notes');
    const parsedNotes = existingNotes ? JSON.parse(existingNotes) : [];
    
    // Add new note to the beginning of the array
    const updatedNotes = [newNote, ...parsedNotes];
    saveToLocalStorage(updatedNotes);

    if (editor) {
      editor.commands.setContent('');
    }
  };

  const handleImageSave = async (imageData: { file: File | null, description?: string }) => {
    if (imageData.file) {
      setIsLoading(true);
      try {
        // Convert image to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          
          // Create content with image and description
          let content = `${imageData.description || ''}\n`;
          content += `<img src="${base64String}" alt="${imageData.description || ''}" />`;

          // Create new note with image
          const newNote: Note = {
            id: Date.now(),
            title: imageData.description || `Image Note ${notes.length + 1}`,
            content: content,
            metadata: {
              date: new Date().toLocaleDateString(),
              tag: 'Image'
            }
          };

          console.log('Saving note with image:', newNote); // Debug log

          // Get existing notes and add new note
          const existingNotes = localStorage.getItem('notes');
          const parsedNotes = existingNotes ? JSON.parse(existingNotes) : [];
          const updatedNotes = [newNote, ...parsedNotes];
          
          // Save to localStorage
          saveToLocalStorage(updatedNotes);
          setIsLoading(false);
        };
        reader.readAsDataURL(imageData.file);
      } catch (error) {
        console.error('Error saving image:', error);
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          e.preventDefault();
          setIsLoading(true);

          const file = item.getAsFile();
          if (!file) continue;

          try {
            // Convert image to base64
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64data = event.target?.result as string;
              
              // Create note content with image
              const content = `
                <div>
                  <img src="${base64data}" alt="Pasted image" style="max-width: 100%; border-radius: 0.5rem; margin: 1rem 0;" />
                </div>
              `.trim();
              
              const newNote: Note = {
                id: Date.now(),
                title: `Image Note ${notes.length + 1}`,
                content: content,
                metadata: {
                  date: new Date().toLocaleDateString(),
                  tag: 'Image'
                }
              };

              // Get existing notes from localStorage
              const existingNotes = localStorage.getItem('notes');
              const parsedNotes = existingNotes ? JSON.parse(existingNotes) : [];
              
              // Add new note to the beginning of the array
              const updatedNotes = [newNote, ...parsedNotes];
              saveToLocalStorage(updatedNotes);
              
              setIsLoading(false);
            };
            reader.readAsDataURL(file);
          } catch (error) {
            console.error('Error handling pasted image:', error);
            setIsLoading(false);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [editor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && editor && editor.isFocused) {
        e.preventDefault();
        handleSaveNote(editor.getHTML());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  const handleFocusClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation(); // Prevent card click event
    setFocusContent(note.content);
    setIsFocusMode(true);
  };

  const handleFocusSave = (content: string) => {
    if (!content.trim()) return; // Don't save empty notes
    
    const newNote: Note = {
      id: Date.now(),
      title: `Note ${notes.length + 1}`,
      content: content,
      metadata: {
        date: new Date().toLocaleDateString(),
        tag: 'General'
      }
    };

    // Get existing notes from localStorage
    const existingNotes = localStorage.getItem('notes');
    const parsedNotes = existingNotes ? JSON.parse(existingNotes) : [];
    
    // Add new note to the beginning of the array
    const updatedNotes = [newNote, ...parsedNotes];
    saveToLocalStorage(updatedNotes);
  };

  const handleDeleteNote = (noteId: number) => {
    const existingNotes = localStorage.getItem('notes');
    const parsedNotes = existingNotes ? JSON.parse(existingNotes) : [];
    const updatedNotes = parsedNotes.filter((note: Note) => note.id !== noteId);
    saveToLocalStorage(updatedNotes);
    setContextMenu(null);
  };

  return (
    <div className="h-full flex flex-col w-full relative">
      {isLoading && <LoadingOverlay />}
      {isFocusMode && (
        <FocusEditor
          initialContent={focusContent}
          onClose={() => setIsFocusMode(false)}
          onSave={handleFocusSave}
        />
      )}
      
      {/* Search Header */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search my mind..."
          className="w-full bg-transparent text-3xl text-gray-300 font-light px-4 py-6 focus:outline-none focus:text-gray-700 transition-colors"
        />
      </div>

      {/* Notes Grid - Including New Note Card and Existing Notes */}
      <div className="flex-1 px-4 py-3">
        <Masonry
          breakpointCols={{
            default: 4,
            1536: 4,
            1280: 3,
            1024: 2,
            768: 2,
            640: 1
          }}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {/* New Note Card */}
          <div 
            className="mb-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-fit relative"
            onMouseEnter={() => setIsNewNoteHovered(true)}
            onMouseLeave={() => setIsNewNoteHovered(false)}
          >
            <div className="text-orange-500 uppercase text-xs font-medium tracking-wider p-4 pb-2">
              ADD A NEW NOTE
            </div>
            <EditorContent 
              editor={editor} 
              className="min-h-[120px]"
            />
            {isNewNoteHovered && (
              <div className="absolute bottom-0 left-0 right-0 bg-gray-50 text-gray-500 text-xs py-2 px-4 border-t border-gray-100 rounded-b-xl">
                Press <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-medium">Ctrl</kbd> + <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-medium">Enter</kbd> to save
              </div>
            )}
          </div>

          {/* Existing Notes */}
          {notes.map((note) => (
            <div 
              key={note.id} 
              className="mb-4 group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-fit relative cursor-pointer"
              onClick={() => {
                setFocusedNote(note);
                setIsModalOpen(true);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  noteId: note.id
                });
              }}
            >
              <div 
                onClick={(e) => handleFocusClick(e, note)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center hover:scale-110 transform duration-200"
              >
                <ArrowDownLeft className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">{note.title}</h3>
              <div 
                className="text-gray-600 text-sm"
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-400">{note.metadata.date}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span className="text-xs text-gray-400">{note.metadata.tag}</span>
              </div>
            </div>
          ))}
        </Masonry>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <NoteContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={() => handleDeleteNote(contextMenu.noteId)}
        />
      )}

      {/* Modal for viewing/editing notes */}
      {focusedNote && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setFocusedNote(null);
          }}
          title={focusedNote.title}
          content={focusedNote.content}
          onSave={handleSaveNote}
        />
      )}
    </div>
  );
};

export default NotesContent;
