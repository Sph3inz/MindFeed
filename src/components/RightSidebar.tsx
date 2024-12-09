import { Plus, Sparkles, Share2, History, X, MessageSquare, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useAuth } from '../contexts/AuthContext'
import { queryNotes } from '../services/chatService'

const lowlight = createLowlight(common)

type Message = {
  content: string
  isUser: boolean
  isLoading?: boolean
  relevantNotes?: string[]
}

const AIMessage = ({ content, relevantNotes }: { content: string; relevantNotes?: string[] }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content,
    editable: false,
  })

  return (
    <div className="space-y-4">
      <div className="prose prose-invert prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
      {relevantNotes && relevantNotes.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-white/40 mb-2">RELEVANT NOTES</div>
          <div className="flex flex-wrap gap-2">
            {relevantNotes.map((note, index) => (
              <span key={index} className="px-2 py-1 bg-black/30 text-white/80 text-sm rounded-lg border border-white/[0.08]">
                {note}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type RightSidebarProps = {
  onToggleRightSidebar: () => void
  chatContent: string
}

const SuggestedPrompt = ({ title, description, onClick }: { title: string; description: string; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full max-w-sm text-left bg-black/30 backdrop-blur-sm rounded-2xl p-4 hover:bg-black/40 transition-all shadow-sm hover:shadow-md border border-white/[0.08]"
  >
    <div className="font-medium text-white/90 mb-1">{title}</div>
    <div className="text-sm text-white/70">{description}</div>
  </button>
)

const RightSidebar = ({ onToggleRightSidebar, chatContent }: RightSidebarProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (chatContent) {
      setMessages([{ content: chatContent, isUser: false }])
    }
  }, [chatContent])

  const handleQuery = async (question: string) => {
    if (!user) {
      setMessages(prev => [...prev, 
        { content: "Please sign in to use the chat feature.", isUser: false }
      ]);
      return;
    }
    
    setIsLoading(true);
    setMessages(prev => [...prev, { content: question, isUser: true }])
    setMessages(prev => [...prev, { content: '', isUser: false, isLoading: true }])
    
    try {
      const result = await queryNotes(user.uid, question)
      
      // Remove loading message and add AI response
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          content: result.longAnswer, 
          isUser: false,
          relevantNotes: result.relevantNotes
        }
      ])
    } catch (error) {
      console.error('Error querying notes:', error)
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          content: 'I apologize, but I encountered an error while processing your request. Please try again.', 
          isUser: false 
        }
      ])
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    handleQuery(inputValue.trim())
    setInputValue('')
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-white/[0.08] bg-black/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black/30 p-2 rounded-full shadow-sm border border-white/[0.08]">
              <MessageSquare className="w-4 h-4 text-white/90" />
            </div>
            <h2 className="text-lg font-medium text-white/90">AI Assistant</h2>
          </div>
          <button
            onClick={onToggleRightSidebar}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white/40 hover:text-white/60" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto backdrop-blur-[2px]">
        <div className="p-4">
          {!user ? (
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="w-full max-w-sm text-center space-y-4 bg-black/20 p-6 rounded-2xl border border-white/[0.08]">
                <h3 className="text-lg font-medium text-white/90">Sign In Required</h3>
                <p className="text-white/70">Please sign in to use the AI assistant and interact with your notes.</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6">
              <div className="w-full max-w-sm text-center space-y-8 -mt-20">
                <h3 className="text-2xl font-bold text-white/90 mb-8">Ask Me.</h3>
                <div className="space-y-4">
                  <SuggestedPrompt 
                    title="Find" 
                    description="my latest notes."
                    onClick={() => handleQuery("What are my latest notes about?")}
                  />
                  <SuggestedPrompt 
                    title="Inspire" 
                    description="me on recent notes."
                    onClick={() => handleQuery("Can you inspire me based on my recent notes?")}
                  />
                  <SuggestedPrompt 
                    title="Create" 
                    description="a tweet combining my recent notes."
                    onClick={() => handleQuery("Create a tweet that combines insights from my recent notes.")}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 backdrop-blur-sm ${
                      message.isUser
                        ? 'bg-violet-500/10 text-white/90 border border-white/[0.08]'
                        : 'bg-black/20 border border-white/[0.08]'
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2 text-white/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Thinking...
                      </div>
                    ) : message.isUser ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        {message.content}
                      </div>
                    ) : (
                      <AIMessage content={message.content} relevantNotes={message.relevantNotes} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-white/[0.08] bg-black/20 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={user ? "Ask me anything about your notes..." : "Please sign in to chat"}
            disabled={!user || isLoading}
            className="flex-1 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-xl border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-white/90 placeholder-white/40"
          />
          <button
            type="submit"
            disabled={!user || isLoading}
            className={`px-4 py-2 bg-black/30 text-white/90 rounded-xl hover:bg-black/40 transition-all border border-white/[0.08] ${
              (!user || isLoading) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MessageSquare className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RightSidebar