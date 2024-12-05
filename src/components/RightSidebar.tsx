import { Plus, Sparkles, Share2, History, X, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

const lowlight = createLowlight(common)

type Message = {
  content: string
  isUser: boolean
}

const AIMessage = ({ content }: { content: string }) => {
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
    <div className="prose prose-sm max-w-none">
      <EditorContent editor={editor} />
    </div>
  )
}

type RightSidebarProps = {
  onToggleRightSidebar: () => void
  chatContent: string
}

const SuggestedPrompt = ({ title, description }: { title: string; description: string }) => (
  <button className="w-full max-w-sm text-left bg-white/60 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/70 transition-all shadow-sm hover:shadow-md border border-black/5">
    <div className="font-semibold text-gray-800 mb-1">{title}</div>
    <div className="text-sm text-gray-600">{description}</div>
  </button>
)

const RightSidebar = ({ onToggleRightSidebar, chatContent }: RightSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (chatContent) {
      setMessages([{ content: chatContent, isUser: false }])
    }
  }, [chatContent])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    setMessages([...messages, { content: inputValue, isUser: true }])
    setInputValue('')
  }

  return (
    <div className="h-full flex flex-col bg-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-black/5">
        <h2 className="text-xl font-semibold text-gray-800">AI Assistant</h2>
        <button
          onClick={onToggleRightSidebar}
          className="p-1 hover:bg-black/5 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm text-center space-y-8 -mt-20">
              <h3 className="text-2xl font-bold text-gray-800 mb-8">Ask Me.</h3>
              <div className="space-y-4">
                <SuggestedPrompt 
                  title="Find" 
                  description="my latest notes."
                />
                <SuggestedPrompt 
                  title="Inspire" 
                  description="me on recent notes."
                />
                <SuggestedPrompt 
                  title="Create" 
                  description="a tweet combining my recent notes."
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${
                  message.isUser ? 'bg-gray-100 text-gray-800 ml-8' : 'bg-white/60 text-gray-800 mr-8'
                } p-3 rounded-lg shadow-sm`}
              >
                {message.isUser ? (
                  message.content
                ) : (
                  <AIMessage content={message.content} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-black/5">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about your notes..."
            className="w-full px-4 py-2.5 pr-10 bg-white/60 rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-black/10 text-gray-700 placeholder:text-gray-400"
          />
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-black/5 rounded-lg transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default RightSidebar