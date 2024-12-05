import { useEffect, useRef } from 'react';
import { Hash, Plus, BrainCircuit, Trash2 } from 'lucide-react';

interface NoteContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete: () => void;
}

const NoteContextMenu = ({ x, y, onClose, onDelete }: NoteContextMenuProps) => {
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
      <div className="px-3 py-2 text-xs font-medium text-gray-500 flex items-center gap-2">
        <Hash className="w-3.5 h-3.5" />
        Add tags
      </div>
      <div className="px-3 py-2 text-xs font-medium text-gray-500 flex items-center gap-2">
        <Plus className="w-3.5 h-3.5" />
        Add to space
      </div>
      <div className="px-3 py-2 text-xs font-medium text-gray-500 flex items-center gap-2">
        <BrainCircuit className="w-3.5 h-3.5" />
        Top of Mind
      </div>
      <div className="h-px bg-gray-100 my-1" />
      <button
        onClick={onDelete}
        className="px-3 py-2 text-xs font-medium text-red-500 w-full text-left flex items-center gap-2 hover:bg-red-50"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete card
      </button>
    </div>
  );
};

export default NoteContextMenu;
