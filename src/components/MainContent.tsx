import { useState, lazy, Suspense } from 'react'
import { PanelRightOpen } from 'lucide-react'

// Lazy load components
const FeedContent = lazy(() => import('./FeedContent'))
const NotesContent = lazy(() => import('./NotesContent'))
const ImportWidget = lazy(() => import('./ImportWidget'))

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white/20"></div>
  </div>
)

interface MainContentProps {
  isRightSidebarOpen: boolean
  onToggleRightSidebar: () => void
  onSetChatContent: (content: string) => void
}

const MainContent = ({ isRightSidebarOpen, onToggleRightSidebar, onSetChatContent }: MainContentProps) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'notes' | 'spaces'>('feed')

  return (
    <div className="flex-1 overflow-auto relative px-4 py-6 h-full bg-[#0A0A0A]">
      {/* Simplified background with reduced animations */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(120,100,255,0.15),transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Floating Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-black/20 border border-white/[0.08] rounded-full p-1">
            {[
              { id: 'feed', label: 'Feed' },
              { id: 'notes', label: 'Notes' },
              { id: 'spaces', label: 'Spaces' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-2 rounded-full text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-[#8B5CF6] text-white'
                    : 'text-white/60 hover:text-white/90'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content with Suspense */}
        <div className="h-full">
          <Suspense fallback={<LoadingFallback />}>
            {activeTab === 'feed' && (
              <div className="max-w-3xl mx-auto">
                <FeedContent 
                  onSetChatContent={onSetChatContent} 
                  onToggleRightSidebar={onToggleRightSidebar} 
                />
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
          </Suspense>
        </div>

        {/* Import Widget with Suspense */}
        <Suspense fallback={null}>
          <ImportWidget isRightSidebarOpen={isRightSidebarOpen} />
        </Suspense>

        {/* Simplified toggle button */}
        {!isRightSidebarOpen && (
          <button
            onClick={onToggleRightSidebar}
            className="fixed right-4 top-4 p-2.5 bg-black/40 rounded-lg hover:bg-black/60"
          >
            <PanelRightOpen className="w-5 h-5 text-white/80" />
          </button>
        )}
      </div>
    </div>
  )
}

export default MainContent