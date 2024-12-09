import { Lightbulb, Network, Brain, BookOpen, RefreshCw, Bookmark, ChevronDown, ChevronUp, Maximize2, MessageSquare, ArrowRight } from 'lucide-react'
import { useState, useMemo, useCallback, memo, useRef, Suspense, lazy, useEffect } from 'react'
import Modal from './Modal'
import React from 'react'
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

const demoFeedItems: FeedCard[] = [
  {
    id: '1',
    type: 'thought',
    title: 'Late Night Thoughts on AI and Consciousness',
    content: `Just had a fascinating late-night reflection on AI and consciousness. The way we're approaching AI development might need a paradigm shift - instead of forcing rigid, computer-like thinking, what if we embraced the beautiful chaos of human cognition?

Key insights:
- Our brains work in non-linear, organic patterns
- Creativity often emerges from "messy" thinking
- Perfect logic might be limiting true intelligence
- Emotional context matters in decision making

Research directions to explore:
- Neural plasticity in AI systems
- Emotional memory encoding
- Controlled randomness as a feature
- AI sleep cycles and learning

Questions to ponder:
1. How do we measure "human-like" thinking?
2. Is perfect recall actually beneficial?
3. Can controlled chaos improve creativity?
4. What role do emotions play in intelligence?

Need to flesh this out more tomorrow, but there might be something revolutionary here.`,
    timestamp: '3:47 AM',
    tags: ['AI', 'Tech', 'Learning'],
    sources: [
      { id: '1', title: 'Late Night Research Notes', color: 'bg-purple-500' },
      { id: '2', title: 'AI Development Journal', color: 'bg-blue-500' }
    ]
  },
  {
    id: '2',
    type: 'connection',
    title: 'Nature-Inspired System Design',
    content: `Made an interesting connection between biological systems and software architecture. Nature might have already solved our scaling problems!

Key Parallels:
1. Load Balancing
   - Ant colonies use dynamic trail systems
   - Could inspire better request routing
   - Natural load distribution patterns

2. Fault Tolerance
   - Natural redundancy in species
   - Self-healing mechanisms
   - Adaptive recovery systems

3. Communication
   - Hormone signaling systems
   - Event-driven patterns
   - Priority-based messaging

Next Steps:
- Research swarm intelligence
- Study biological scaling
- Prototype nature-inspired algorithms
- Test in small-scale systems

This could revolutionize how we design distributed systems. Nature's been perfecting these patterns for millions of years!`,
    timestamp: '2:15 PM',
    tags: ['Tech', 'Learning'],
    sources: [
      { id: '3', title: 'System Design Notes', color: 'bg-blue-500' },
      { id: '4', title: 'Biology Research', color: 'bg-green-500' }
    ]
  }
];

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
                    <div className="flex -space-x-2">
                      {item.sources.map((source) => (
                        <div
                          key={source.id}
                          className={`w-6 h-6 rounded-xl ${source.color} flex items-center justify-center text-white text-xs font-medium ring-1 ring-black/20`}
                        >
                          {source.title[0]}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-white/40">
                      {item.sources.length} source{item.sources.length > 1 ? 's' : ''}
                    </span>
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
  onToggleRightSidebar: () => void
  onSetChatContent: (content: string) => void 
}) => {
  const [feedItems, setFeedItems] = useState(demoFeedItems)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const loaderRef = useRef<HTMLDivElement>(null)

  // Implement infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const first = entries[0]
        if (first.isIntersecting && !loading) {
          setPage(p => p + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (loaderRef.current) {
      observer.observe(loaderRef.current)
    }

    return () => observer.disconnect()
  }, [loading])

  // Calculate visible items based on current page
  const visibleItems = useMemo(() => {
    return feedItems.slice(0, page * ITEMS_PER_PAGE)
  }, [feedItems, page])

  const handleUpdateItem = useCallback((updatedItem: FeedCard) => {
    setFeedItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i))
  }, [])

  // Memoized category buttons to prevent re-renders
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
    setPage(1); // Reset pagination when changing category
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
                  <div className="flex items-center gap-2 text-sm text-white/60 bg-black/30 rounded-full px-3 py-1 border border-white/[0.08]">
                    <span className="text-xs">Sort by:</span>
                    <select className="bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-white/90">
                      <option>Latest</option>
                      <option>Most Discussed</option>
                      <option>Popular</option>
                    </select>
                  </div>
                  <button className="px-4 py-1.5 text-xs font-medium text-white/90 hover:text-white bg-black/30 hover:bg-black/40 rounded-full transition-colors border border-white/[0.08]">
                    Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 mt-4">
        {/* Optimized Categories */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categoryButtons.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleCategoryClick(id)}
              className={`category-tab ${activeCategory === id ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feed Items */}
        {visibleItems.length > 0 ? (
          <div className="space-y-6">
            {visibleItems.map((item) => (
              <Suspense key={item.id} fallback={<LoadingCard />}>
                <FeedCard
                  item={item}
                  onUpdate={handleUpdateItem}
                  onChat={onSetChatContent}
                />
              </Suspense>
            ))}
            {visibleItems.length < feedItems.length && (
              <div ref={loaderRef} className="h-20 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white/20"></div>
              </div>
            )}
          </div>
        ) : (
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
  )
})

interface FeedContentProps {
  content: string
}

const FeedContentHTML = ({ content }: FeedContentProps) => {
  return (
    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
  )
}

export default FeedContent