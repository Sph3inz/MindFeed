import { useState } from 'react';
import { Link2, FileText, Image as ImageIcon, Mic, Import, Plus } from 'lucide-react';
import ImageImportModal from './ImageImportModal';

interface ImportWidgetProps {
  className?: string;
  isRightSidebarOpen?: boolean;
}

const ImportWidget = ({ className = '', isRightSidebarOpen = false }: ImportWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const options = [
    { id: 'link', icon: Link2, label: 'Link' },
    { id: 'doc', icon: FileText, label: 'Doc' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'recording', icon: Mic, label: 'Recording' },
  ];

  const handleImport = (type: string) => {
    // TODO: Implement import functionality based on type
    console.log('Importing:', type);
  };

  const handleImportImage = () => {
    setIsOpen(false);
    setIsImageModalOpen(true);
  };

  const handleImageSave = async (imageData: { file: File | null, description: string }) => {
    if (imageData.file) {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64data = event.target?.result as string;
        
        // TODO: Create a new note with the image and description
        console.log('Creating note with image:', {
          image: base64data,
          description: imageData.description
        });
      };
      reader.readAsDataURL(imageData.file);
    }
  };

  return (
    <div className={`fixed bottom-6 transition-all duration-300 ${isRightSidebarOpen ? 'right-[calc(450px+2rem)]' : 'right-6'} z-40 ${className}`}>
      <div className="relative">
        {/* Import options */}
        {isOpen && (
          <div 
            className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden py-2 min-w-[160px]"
          >
            <div className="flex flex-col">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => option.id === 'image' ? handleImportImage() : handleImport(option.id)}
                  className="w-full px-4 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-50 text-sm"
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-lg hover:bg-gray-800 transition-all ${
            isOpen ? 'rotate-45' : ''
          }`}
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Image Import Modal */}
        <ImageImportModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
          onSave={handleImageSave}
        />
      </div>
    </div>
  );
};

export default ImportWidget;
