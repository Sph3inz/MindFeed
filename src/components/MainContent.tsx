import { useState } from 'react'
import { PanelRightOpen, PanelRightClose } from 'lucide-react'
import FeedContent from './FeedContent'
import NotesContent from './NotesContent'
import ImportWidget from './ImportWidget'

interface MainContentProps {
  isRightSidebarOpen: boolean
  onToggleRightSidebar: () => void
  onSetChatContent: (content: string) => void
}

const MainContent = ({ isRightSidebarOpen, onToggleRightSidebar, onSetChatContent }: MainContentProps) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'notes' | 'spaces'>('feed')

  return (
    <div className={`flex-1 overflow-auto relative px-4 py-6 h-full`}>
      {/* Floating Tab Navigation */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-white/60 backdrop-blur-sm rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('spaces')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'spaces'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Spaces
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="h-full">
        {activeTab === 'feed' && (
          <div className="max-w-3xl mx-auto">
            <FeedContent onSetChatContent={onSetChatContent} />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="w-full h-full">
            <NotesContent onSetChatContent={onSetChatContent} />
          </div>
        )}

        {activeTab === 'spaces' && (
          <div className="max-w-3xl mx-auto">
            <div>Spaces Content</div>
          </div>
        )}
      </div>

      {/* Import Widget */}
      <ImportWidget isRightSidebarOpen={isRightSidebarOpen} />

      {/* Persistent toggle button */}
      {!isRightSidebarOpen && (
        <button
          onClick={onToggleRightSidebar}
          className="fixed right-4 top-4 p-2.5 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-all duration-200 group"
          aria-label="Open sidebar"
        >
          <PanelRightOpen className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
        </button>
      )}
    </div>
  )
}

export default MainContent