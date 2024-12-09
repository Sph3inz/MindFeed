import { BrowserRouter } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import RightSidebar from './components/RightSidebar'
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('isRightSidebarOpen')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [chatContent, setChatContent] = useState<string>()

  useEffect(() => {
    localStorage.setItem('isRightSidebarOpen', JSON.stringify(isRightSidebarOpen))
  }, [isRightSidebarOpen])

  const toggleRightSidebar = () => setIsRightSidebarOpen(!isRightSidebarOpen)

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex h-screen w-full overflow-hidden bg-[#0A0A0A]">
          <div className="flex flex-1">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex flex-1 overflow-hidden">
                <div className={`flex-1 transition-all duration-300 ease-in-out overflow-auto ${isRightSidebarOpen ? 'mr-[450px]' : ''}`}>
                  <MainContent 
                    isRightSidebarOpen={isRightSidebarOpen}
                    onToggleRightSidebar={toggleRightSidebar}
                    onSetChatContent={setChatContent}
                  />
                </div>
                <div className={`fixed right-0 top-0 h-screen w-[450px] transition-transform duration-300 ease-in-out bg-transparent ${isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                  <RightSidebar 
                    onToggleRightSidebar={toggleRightSidebar} 
                    chatContent={chatContent || ''}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App