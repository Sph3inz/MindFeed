import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import Masonry from 'react-masonry-css';
import NoteContextMenu from './NoteContextMenu';
import { addNote, getNotes, deleteNote, Note as ServiceNote } from '../services/notesService';
import { useAuth } from '../contexts/AuthContext';
import LoadingOverlay from './LoadingOverlay';
import FocusEditor from './FocusEditor';
import { ArrowDownLeft, FileText, MessageSquare } from 'lucide-react';
import { db } from '../config/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const lowlight = createLowlight(common);

interface Note extends ServiceNote {
  metadata: {
    date: string;
    tag: string;
  };
}

interface NoteContextMenuProps {
  x: number;
  y: number;
  noteId: string;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onTopOfMind: (id: string) => void;
  onAddToSpace: (id: string) => void;
}

export default function NotesContent({ onSetChatContent }: { onSetChatContent: (content: string) => void }) {
  const { user, loading: authLoading } = useAuth();
  
  // State declarations
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedNote, setFocusedNote] = useState<Note | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusContent, setFocusContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    noteId: string;
  } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Image.configure({
        allowBase64: true,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none max-w-none min-h-[120px] p-4',
      },
    },
  });

  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mainContainer = mainContainerRef.current;
    if (!mainContainer || !user) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          // Convert image to base64
          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64Image = event.target?.result as string;
            const imageNote = {
              title: 'Image Note',
              content: `<img src="${base64Image}" alt="Pasted image" />`,
              metadata: {
                date: new Date().toISOString(),
                tag: 'Image',
              },
              userId: user.uid,
            };
            
            try {
              const newNote = await addNote(imageNote, user.uid);
              setNotes(prev => [newNote, ...prev]);
            } catch (error) {
              console.error('Error saving image note:', error);
            }
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    };

    mainContainer.addEventListener('paste', handlePaste);
    return () => mainContainer.removeEventListener('paste', handlePaste);
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && editor) {
        e.preventDefault();
        const content = editor.getHTML();
        if (content.trim()) {
          handleSaveNote(content);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, user]);

  // Load notes effect
  useEffect(() => {
    const loadNotes = async () => {
      if (!user) return;
      
      try {
        const fetchedNotes = await getNotes(user.uid);
        setNotes(fetchedNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    };

    if (!authLoading) {
      loadNotes();
    }
  }, [user, authLoading]);

  const handleAddNote = async () => {
    if (!user) return;
    
    try {
      const newNote = await addNote({
        title: 'New Note',
        content: '',
      }, user.uid);
      setNotes(prev => [newNote, ...prev]);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;

    try {
      const note = notes.find(n => n.id === noteId);
      if (!note || note.userId !== user.uid) {
        console.error('Cannot delete note: Permission denied');
        return;
      }

      // Delete from Firebase
      const noteRef = doc(db, 'notes', noteId);
      await deleteDoc(noteRef);
      
      // Update local state
      setNotes(prev => prev.filter(note => note.id !== noteId));
      setContextMenu(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleSaveNote = async (content: string) => {
    if (!content.trim()) return;
    
    try {
      const newNote = await addNote({
        title: 'New Note',
        content: content,
      }, user!.uid);
      setNotes(prev => [newNote, ...prev]);

      if (editor) {
        editor.commands.setContent('');
      }
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleFocusSave = async (content: string) => {
    try {
      const newNote = await addNote({
        title: 'Focused Note',
        content: content,
      }, user!.uid);
      setNotes(prev => [newNote, ...prev]);
    } catch (error) {
      console.error('Error saving focused note:', error);
    }
  };

  const handleFocusClick = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    setFocusContent(note.content);
    setIsFocusMode(true);
  };

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      noteId,
    });
  };

  const handleCopyToClipboard = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      await navigator.clipboard.writeText(note.content);
      setContextMenu(null);
    }
  };

  const handleTopOfMind = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setNotes(prev => [note, ...prev.filter(n => n.id !== noteId)]);
      setContextMenu(null);
    }
  };

  const handleAddToSpace = (noteId: string) => {
    // TODO: Implement space functionality
    setContextMenu(null);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div>Unable to authenticate. Please try refreshing the page.</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col w-full relative" ref={mainContainerRef}>
      {/* Search Header */}
      <div className="relative mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search my mind..."
          className="w-full bg-transparent text-2xl text-white/90 font-light px-4 py-6 focus:outline-none placeholder:text-white/40 transition-colors"
        />
      </div>

      {/* Notes Grid */}
      <div className="flex-1 px-4 py-3">
        <Masonry
          breakpointCols={{
            default: 3,
            1536: 3,
            1280: 2,
            1024: 2,
            768: 1,
            640: 1
          }}
          className="flex -ml-4 w-auto"
          columnClassName="pl-4 bg-clip-padding"
        >
          {/* New Note Card */}
          <div className="mb-4 relative group">
            <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 border border-white/[0.08] transition-shadow hover:shadow-lg">
              <EditorContent 
                editor={editor} 
                className="min-h-[120px] prose prose-invert prose-sm max-w-none"
              />
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div className="text-white/40 text-xs">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-medium">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-medium">Enter</kbd> to save
                </div>
              </div>
            </div>
          </div>

          {/* Existing Notes */}
          {notes
            .filter(note => 
              note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              note.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((note) => {
              const temp = document.createElement('div');
              temp.innerHTML = note.content;
              const hasImage = temp.querySelector('img') !== null;

              return (
                <div 
                  key={note.id} 
                  className="mb-4 relative group"
                  onClick={() => {
                    setFocusedNote(note);
                    setFocusContent(note.content);
                    setIsFocusMode(true);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, note.id)}
                >
                  <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 border border-white/[0.08] transition-shadow hover:shadow-lg cursor-pointer">
                    {/* Header with Focus Button */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-black/30 border border-white/[0.08]">
                          <FileText className="w-5 h-5 text-white/90" />
                        </div>
                        <h2 className="text-base font-medium text-white/90 line-clamp-1 tracking-tight">
                          {note.title}
                        </h2>
                      </div>
                      <button
                        onClick={(e) => handleFocusClick(e, note)}
                        className="p-2 rounded-xl bg-black/30 hover:bg-black/40 border border-white/[0.08] transition-colors"
                      >
                        <ArrowDownLeft className="w-4 h-4 text-white/60" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="prose prose-invert prose-sm max-w-none">
                      {hasImage ? (
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/30">
                          <img 
                            src={temp.querySelector('img')?.src} 
                            alt={temp.querySelector('img')?.alt || ''}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div 
                          className="line-clamp-4"
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/[0.08]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 tabular-nums font-medium">
                          {new Date(note.metadata?.date).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/30 text-xs text-white/60 font-medium border border-white/[0.08]">
                          {note.metadata?.tag}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetChatContent(note.content);
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-black/30 text-white/90 rounded-full text-xs hover:bg-black/40 transition-colors border border-white/[0.08]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </Masonry>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <NoteContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          noteId={contextMenu.noteId}
          onClose={() => setContextMenu(null)}
          onDelete={handleDeleteNote}
          onCopy={handleCopyToClipboard}
          onTopOfMind={handleTopOfMind}
          onAddToSpace={handleAddToSpace}
        />
      )}

      {/* Focus Editor */}
      {isFocusMode && (
        <FocusEditor
          initialContent={focusContent}
          onClose={() => setIsFocusMode(false)}
          onSave={handleFocusSave}
          title={focusedNote?.title}
        />
      )}
    </div>
  );
}
