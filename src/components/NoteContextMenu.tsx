import { useEffect, useRef } from 'react';
import { ClipboardCopy, Plus, BrainCircuit, Trash2 } from 'lucide-react';

interface NoteContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onTopOfMind: (id: string) => void;
  onAddToSpace: (id: string) => void;
  noteId: string;
}

const NoteContextMenu = ({ 
  x, 
  y, 
  onClose, 
  onDelete, 
  onCopy,
  onTopOfMind,
  onAddToSpace,
  noteId 
}: NoteContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-100 py-1 w-48 z-50"
      style={{
        left: x,
        top: y,
      }}
    >
      <button
        onClick={() => onAddToSpace(noteId)}
        className="px-3 py-2 text-sm font-medium text-gray-600 w-full text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add to space
      </button>
      <button
        onClick={() => onCopy(noteId)}
        className="px-3 py-2 text-sm font-medium text-gray-600 w-full text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <ClipboardCopy className="w-4 h-4" />
        Copy to clipboard
      </button>
      <button
        onClick={() => onTopOfMind(noteId)}
        className="px-3 py-2 text-sm font-medium text-gray-600 w-full text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <BrainCircuit className="w-4 h-4" />
        Top of Mind
      </button>
      <div className="h-px bg-gray-100 my-1" />
      <button
        onClick={() => onDelete(noteId)}
        className="px-3 py-2 text-sm font-medium text-red-500 w-full text-left flex items-center gap-2 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete card
      </button>
    </div>
  );
};

export default NoteContextMenu;
