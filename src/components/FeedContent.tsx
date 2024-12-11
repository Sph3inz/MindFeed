import { Lightbulb, Network, Brain, BookOpen, RefreshCw, Bookmark, ChevronDown, ChevronUp, Maximize2, MessageSquare, ArrowRight } from 'lucide-react'
import { useState, useMemo, useCallback, memo, useRef, Suspense, lazy, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { generateFeedPosts } from '../services/feedService'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Placeholder loading component
const LoadingCard = () => (
  <div className="animate-pulse">
    <div className="h-32 bg-black/20 rounded-3xl mb-4"></div>
  </div>
)

interface FeedCard {
  id: string
  type: 'idea' | 'connection' | 'thought' | 'reflection'
  title: string
  content: string
  tags?: string[]
  timestamp?: string
  sources?: Array<{
    id: string
    title: string
    color: string
  }>
}

const getTypeIcon = (type: FeedCard['type']) => {
  switch (type) {
    case 'idea':
      return <Lightbulb className="w-5 h-5 text-amber-500" strokeWidth={2.5} />
    case 'connection':
      return <Network className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
    case 'thought':
      return <Brain className="w-5 h-5 text-violet-500" strokeWidth={2.5} />
    case 'reflection':
      return <BookOpen className="w-5 h-5 text-emerald-500" strokeWidth={2.5} />
  }
}

const getTypeColor = (type: FeedCard['type']) => {
  switch (type) {
    case 'idea':
      return 'bg-gradient-to-br from-amber-500/20 to-amber-200/20'
    case 'connection':
      return 'bg-gradient-to-br from-blue-500/20 to-blue-200/20'
    case 'thought':
      return 'bg-gradient-to-br from-violet-500/20 to-violet-200/20'
    case 'reflection':
      return 'bg-gradient-to-br from-emerald-500/20 to-emerald-200/20'
  }
}

const getTagColor = (tag: string) => {
  switch (tag.toLowerCase()) {
    case 'ai':
      return 'bg-violet-50 text-violet-600'
    case 'tech':
      return 'bg-sky-50 text-sky-600'
    case 'productivity':
      return 'bg-emerald-50 text-emerald-600'
    case 'learning':
      return 'bg-amber-50 text-amber-600'
    default:
      return 'bg-slate-50 text-slate-600'
  }
}

// Memoized markdown component with loading fallback
const MemoizedMarkdown = memo(({ content, components }: { content: string, components: any }) => (
  <Suspense fallback={<LoadingCard />}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  </Suspense>
));

// Memoized syntax highlighter with loading fallback
const MemoizedSyntaxHighlighter = memo(({ language, children }: { language: string, children: string }) => (
  <Suspense fallback={<div className="animate-pulse h-32 bg-black/20 rounded-xl"></div>}>
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      className="rounded-2xl !bg-black/30 !p-4 !my-4 backdrop-blur-sm border border-white/[0.08]"
    >
      {children}
    </SyntaxHighlighter>
  </Suspense>
));

// Implement pagination for feed items
const ITEMS_PER_PAGE = 5;

const FeedCard = memo(({ item, onUpdate, onChat }: { item: FeedCard; onUpdate: (updatedItem: FeedCard) => void; onChat: (content: string) => void }) => {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Use IntersectionObserver for lazy loading
  const cardRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Memoize content parsing
  const { markdownContent, shouldTruncate } = useMemo(() => {
    let parsedContent: any[]
    try {
      parsedContent = JSON.parse(item.content)
    } catch (e) {
      parsedContent = [{
        type: 'paragraph',
        children: [{ text: item.content }]
      }]
    }

    const markdown = parsedContent.map(block => {
      if (block.type === 'paragraph') {
        return block.children.map((child: { text: string }) => child.text).join('')
      }
      if (block.type === 'heading-one') {
        return '# ' + block.children.map((child: { text: string }) => child.text).join('')
      }
      if (block.type === 'heading-two') {
        return '## ' + block.children.map((child: { text: string }) => child.text).join('')
      }
      if (block.type === 'heading-three') {
        return '### ' + block.children.map((child: { text: string }) => child.text).join('')
      }
      if (block.type === 'list' && block.format === 'unordered') {
        return block.children.map((item: { children: Array<{ text: string }> }) => 
          '- ' + item.children.map(child => child.text).join('')
        ).join('\n')
      }
      if (block.type === 'list' && block.format === 'ordered') {
        return block.children.map((item: { children: Array<{ text: string }> }, index: number) => 
          `${index + 1}. ` + item.children.map(child => child.text).join('')
        ).join('\n')
      }
      if (block.type === 'blockquote') {
        return '> ' + block.children.map((child: { text: string }) => child.text).join('')
      }
      if (block.type === 'code') {
        return '```\n' + block.code + '\n```'
      }
      return block.children?.map((child: { text: string }) => child.text).join('') || ''
    }).join('\n\n')

    return {
      markdownContent: markdown,
      shouldTruncate: markdown.length > 700
    }
  }, [item.content])

  // Memoize markdown components
  const markdownComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <MemoizedSyntaxHighlighter language={match[1]}>
          {String(children).replace(/\n$/, '')}
        </MemoizedSyntaxHighlighter>
      ) : (
        <code {...props} className={`${className} bg-black/30 text-white/80 rounded-lg px-2 py-0.5 border border-white/[0.08]`}>
          {children}
        </code>
      )
    }
  }), [])

  // Memoize handlers
  const handleSaveContent = useCallback((newContent: string) => {
    onUpdate({ ...item, content: newContent })
  }, [item, onUpdate])

  const handleBookmarkToggle = useCallback(() => {
    setIsBookmarked(prev => !prev)
  }, [])

  const handleExpandToggle = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleModalToggle = useCallback(() => {
    setIsModalOpen(prev => !prev)
  }, [])

  const handleChat = useCallback(() => {
    onChat(item.content)
  }, [item.content, onChat])

  return (
    <div ref={cardRef} className="relative">
      {isVisible ? (
        <div className="bg-black/20 backdrop-blur-sm rounded-3xl p-6 border border-white/[0.08] transition-shadow hover:shadow-lg will-change-transform">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-black/30 border border-white/[0.08]">
                  {getTypeIcon(item.type)}
                </div>
                <h2 className="text-base font-medium text-white/90 line-clamp-1 tracking-tight">{item.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                {item.timestamp && (
                  <span className="text-xs text-white/40 tabular-nums font-medium">{item.timestamp}</span>
                )}
                <button
                  onClick={handleBookmarkToggle}
                  className="p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current text-violet-400' : 'text-white/40'}`} />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className={`prose prose-invert prose-sm max-w-none ${!isExpanded && shouldTruncate ? 'line-clamp-4' : ''} text-white/70`}>
              <MemoizedMarkdown content={markdownContent} components={markdownComponents} />
            </div>

            {/* Footer Section */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <div className="flex items-center gap-3">
                {/* Sources */}
                {item.sources && item.sources.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {item.sources.map((source) => (
                        <div
                          key={source.id}
                          className="px-2 py-1 rounded-full bg-black/30 border border-white/[0.08] flex items-center gap-1.5 group-hover:bg-black/40 transition-colors"
                        >
                          <div className={`w-2 h-2 rounded-full ${source.color}`} />
                          <span className="text-xs text-white/60">{source.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {shouldTruncate && (
                  <button
                    onClick={handleExpandToggle}
                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/60 transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        Show more
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleModalToggle}
                  className="p-1.5 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-white/40" />
                </button>
                <button
                  onClick={handleChat}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-black/30 text-white/90 rounded-full text-xs hover:bg-black/40 transition-colors border border-white/[0.08]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <LoadingCard />
      )}
    </div>
  );
})

// Category type definition
type Category = 'all' | 'ideas' | 'connections' | 'thoughts' | 'reflections';

const FeedContent = memo(({ onToggleRightSidebar, onSetChatContent }: { 
  onToggleRightSidebar: () => void;
  onSetChatContent: (content: string) => void;
}) => {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  // Load feed posts
  const loadFeedPosts = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const posts = await generateFeedPosts(user.uid);
      setFeedItems(posts);
    } catch (error) {
      console.error('Error loading feed posts:', error);
      setError('Failed to load feed posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load posts on mount and when user changes
  useEffect(() => {
    loadFeedPosts();
  }, [loadFeedPosts]);

  // Filter posts by category
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'all') return feedItems;
    return feedItems.filter(item => {
      const itemType = item.type === 'idea' ? 'ideas' :
                      item.type === 'connection' ? 'connections' :
                      item.type === 'thought' ? 'thoughts' :
                      'reflections';
      return itemType === activeCategory;
    });
  }, [feedItems, activeCategory]);

  // Memoized category buttons
  const categoryButtons = useMemo(() => [
    { id: 'all' as Category, label: 'All Posts' },
    { id: 'ideas' as Category, label: 'Ideas' },
    { id: 'connections' as Category, label: 'Connections' },
    { id: 'thoughts' as Category, label: 'Thoughts' },
    { id: 'reflections' as Category, label: 'Reflections' }
  ], []);

  // Memoized category click handler
  const handleCategoryClick = useCallback((category: Category) => {
    setActiveCategory(category);
  }, []);

  const handleUpdateItem = useCallback((updatedItem: FeedCard) => {
    setFeedItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="sticky top-4 z-10 mx-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-black/20 backdrop-blur-sm rounded-full border border-white/[0.08] shadow-sm">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-black/30 p-2 rounded-full border border-white/[0.08]">
                    <BookOpen className="w-4 h-4 text-white/90" />
                  </div>
                  <h1 className="text-lg font-medium text-white/90">Feed</h1>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={loadFeedPosts}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/30 hover:bg-black/40 rounded-full transition-colors border border-white/[0.08]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 mt-4">
        {/* Categories */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categoryButtons.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleCategoryClick(id)}
              className={`px-4 py-1.5 text-sm rounded-full border transition-all duration-200
                ${activeCategory === id 
                  ? 'bg-white/10 text-white border-white/20' 
                  : 'text-white/60 border-transparent hover:text-white/80 hover:bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        )}

        {/* Feed Items */}
        {!loading && filteredPosts.length > 0 ? (
          <div className="space-y-6">
            {filteredPosts.map((item) => (
              <Suspense key={item.id} fallback={<LoadingCard />}>
                <FeedCard
                  item={item}
                  onUpdate={handleUpdateItem}
                  onChat={onSetChatContent}
                />
              </Suspense>
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-16 bg-black/20 rounded-3xl border border-white/[0.08]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/30 flex items-center justify-center border border-white/[0.08]">
              <RefreshCw className="w-8 h-8 text-white/40" />
            </div>
            <h3 className="text-lg font-medium text-white/90 mb-2">No posts yet</h3>
            <p className="text-sm text-white/60">Start by creating notes and they'll appear here</p>
          </div>
        )}
      </div>
    </div>
  );
});

interface FeedContentProps {
  content: string
}

const FeedContentHTML = ({ content }: FeedContentProps) => {
  return (
    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
  )
}

export default FeedContent