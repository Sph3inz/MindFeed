import { Lightbulb, Network, Brain, BookOpen, Youtube, FileText, Image as ImageIcon, RefreshCw, Bookmark, ChevronDown, ChevronUp, Maximize2, MessageSquare, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import Modal from './Modal'
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
      return <Lightbulb className="w-5 h-5 text-yellow-500" />
    case 'connection':
      return <Network className="w-5 h-5 text-blue-500" />
    case 'thought':
      return <Brain className="w-5 h-5 text-purple-500" />
    case 'reflection':
      return <BookOpen className="w-5 h-5 text-green-500" />
  }
}

const getTypeColor = (type: FeedCard['type']) => {
  switch (type) {
    case 'idea':
      return 'bg-yellow-50'
    case 'connection':
      return 'bg-blue-50'
    case 'thought':
      return 'bg-purple-50'
    case 'reflection':
      return 'bg-green-50'
  }
}

const getTagColor = (tag: string) => {
  switch (tag.toLowerCase()) {
    case 'ai':
      return 'bg-purple-100 text-purple-600'
    case 'tech':
      return 'bg-blue-100 text-blue-600'
    case 'productivity':
      return 'bg-green-100 text-green-600'
    case 'learning':
      return 'bg-yellow-100 text-yellow-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

const demoFeedItems: FeedCard[] = [
  {
    id: '1',
    type: 'thought',
    title: 'Late Night Coding Philosophy & Future of AI',
    content: `3:47 AM and I can't stop thinking about the intersection of consciousness and artificial intelligence. Just spent the last 4 hours diving deep into research papers about neural networks, and something fascinating struck me - we're approaching AI development all wrong. We're so focused on making AI think like a computer that we're forgetting how organic human thought actually is.

    Key insight that hit me while debugging that recursive algorithm earlier: our brains don't process information linearly, they work in these beautiful, chaotic patterns. What if instead of trying to make AI more logical, we should be making it more "human-messy"? Like how I jump between tasks, or how a random song triggers a childhood memory.

    Potential research directions to explore:
    - Neural plasticity in deep learning models
    - Emotional memory encoding in AI systems
    - Randomness as a feature, not a bug
    - The role of "sleep" in AI learning cycles

    Need to connect this with that paper I read last week about emergent behaviors in large language models. There's something there about how unpredictability might actually be key to true intelligence. Making a note to review my highlights from "On Intelligence" by Jeff Hawkins tomorrow - his thoughts on memory prediction framework might be relevant here.

    Random tangent: Could we create an AI that experiences something like ADHD? Not as a flaw, but as a feature that enables rapid context-switching and creative connections? This reminds me of how some of my best coding solutions come when I'm not actively thinking about the problem.

    TODO: Write a blog post about this. Draft some code examples. Maybe start a small research project? Need to check if anyone in my network is working on something similar. This could be huge for my thesis direction.

    Questions to ponder:
    1. How do we measure "human-like" thinking in AI?
    2. Is perfect recall actually detrimental to true intelligence?
    3. Could introducing controlled chaos improve AI creativity?
    4. What role does emotional context play in decision-making?

    Going to sleep on this, but first setting a reminder to review these thoughts tomorrow with fresh eyes. Might be sleep-deprived brilliance or sleep-deprived nonsense, but either way, there's something here worth exploring further.`,
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
    title: 'Connecting System Design Patterns with Biological Systems',
    content: `Just had a mind-blowing realization while working on that distributed systems project! There's an incredible parallel between how nature handles scale and how we design software systems. This could revolutionize how I approach system architecture.

    Core Observation:
    Ant colonies scale perfectly - each ant follows simple rules, yet the colony achieves complex goals. This maps DIRECTLY to microservices architecture! Each service should be dumb and simple, but the system as a whole becomes intelligent.

    Drawing parallels:
    1. Load Balancing
       - Ants: Dynamic trail reinforcement
       - Systems: Dynamic request routing
       - Implementation idea: Could we create a "pheromone-based" load balancer?

    2. Fault Tolerance
       - Nature: Species redundancy
       - Systems: Service replication
       - Key insight: Over-replication isn't wasteful, it's survival

    3. Communication Patterns
       - Biological: Hormone signaling
       - Technical: Event-driven architecture
       - Potential pattern: Gradient-based message priority

    This completely changes how I view my current project's architecture. Instead of fighting against system complexity, we should embrace organic growth patterns. Nature has already solved these problems through evolution - we're just reinventing the wheel!

    Practical Applications:
    - Redesign our service discovery to use "colony patterns"
    - Implement gradient-based load balancing
    - Create self-healing service clusters
    - Develop organic scaling algorithms

    Need to dive deeper into:
    - Swarm intelligence papers
    - Biological system scaling studies
    - Emergence theory in complex systems
    - Natural selection algorithms

    This could be a game-changer for how we approach distributed systems. Going to refactor some of our core services to test these patterns. Imagine if we could create truly organic, self-organizing systems!

    Critical questions to explore:
    - How do we maintain system predictability while allowing organic growth?
    - Can we quantify the efficiency of nature-inspired patterns?
    - What are the trade-offs between controlled and emergent architectures?

    Next steps:
    1. Document these patterns properly
    2. Create proof-of-concept implementations
    3. Measure performance metrics
    4. Share findings with the team

    This is why I love programming - these moments of clarity where different domains suddenly connect in meaningful ways. Need to schedule a whiteboarding session to flesh this out further.`,
    timestamp: '2:15 PM',
    tags: ['Tech', 'Productivity'],
    sources: [
      { id: '3', title: 'System Design Notes', color: 'bg-green-500' },
      { id: '4', title: 'Biology Research', color: 'bg-yellow-500' }
    ]
  },
  {
    id: '3',
    type: 'idea',
    title: 'Revolutionary Learning Platform Concept',
    content: `BREAKTHROUGH IDEA at 4 AM! Can't sleep because my mind is racing with this concept for a revolutionary learning platform. It's like Spotify meets Anki meets Mind Palace, but with a crucial twist - it adapts to your brain's natural learning patterns.

    Core Concept:
    A learning platform that doesn't just present information, but actively maps and adapts to your personal cognitive patterns. It's not about memorization; it's about building natural neural pathways.

    Key Features (brain dump):
    1. Neural Pattern Mapping
       - Track how you naturally connect ideas
       - Identify your peak learning times
       - Adapt to your attention patterns
       - Build personalized knowledge graphs

    2. Dynamic Content Adaptation
       - Content morphs based on your energy levels
       - Adjusts difficulty in real-time
       - Integrates with your existing knowledge
       - Uses your personal interests as anchors

    3. Biological Rhythm Integration
       - Syncs with your circadian rhythms
       - Matches content complexity to mental state
       - Suggests optimal learning windows
       - Tracks cognitive load patterns

    Why this is different:
    - Most platforms ignore individual cognitive styles
    - Traditional spaced repetition is too rigid
    - Current solutions don't account for mental state
    - Existing tools lack personal context

    Technical Requirements:
    - ML models for pattern recognition
    - Real-time adaptation algorithms
    - Cognitive load monitoring
    - Personal knowledge graph database
    - Biorhythm tracking integration

    Potential Challenges:
    - Privacy concerns with cognitive data
    - Complex personalization algorithms
    - User experience complexity
    - Data collection methodology

    Market Potential:
    - Students struggling with traditional methods
    - Professionals needing continuous learning
    - Researchers and academics
    - Anyone with non-traditional learning styles

    Next Steps:
    1. Prototype core algorithm
    2. Test with small user group
    3. Gather cognitive pattern data
    4. Refine adaptation mechanisms

    This could revolutionize how we approach personal learning. Need to patent this before someone else thinks of it. Setting up a project repository tomorrow and starting on the prototype.

    Random thoughts to explore later:
    - Integration with smart home devices for environment optimization
    - Social learning aspects while maintaining personalization
    - Gamification elements that adapt to motivation patterns
    - AR/VR possibilities for immersive learning

    This is exactly why I keep a notebook by my bed - these late-night inspirations are gold. Need to flesh this out more tomorrow, but the core idea is solid. This could be the next big thing in edtech.`,
    timestamp: '4:23 AM',
    tags: ['Learning', 'Tech', 'AI'],
    sources: [
      { id: '5', title: 'EdTech Research', color: 'bg-blue-500' },
      { id: '6', title: 'Learning Science Papers', color: 'bg-purple-500' }
    ]
  }
];

const FeedCard = ({ item, onUpdate, onChat }: { item: FeedCard; onUpdate: (updatedItem: FeedCard) => void; onChat: (content: string) => void }) => {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Try to parse content as JSON, if it fails, treat it as plain text
  let parsedContent: any[]
  try {
    parsedContent = JSON.parse(item.content)
  } catch (e) {
    parsedContent = [{
      type: 'paragraph',
      children: [{ text: item.content }]
    }]
  }

  // Convert Yoopta content to markdown
  const markdownContent = parsedContent.map(block => {
    if (block.type === 'paragraph') {
      return block.children.map(child => child.text).join('')
    }
    if (block.type === 'heading-one') {
      return '# ' + block.children.map(child => child.text).join('')
    }
    if (block.type === 'heading-two') {
      return '## ' + block.children.map(child => child.text).join('')
    }
    if (block.type === 'heading-three') {
      return '### ' + block.children.map(child => child.text).join('')
    }
    if (block.type === 'list' && block.format === 'unordered') {
      return block.children.map(item => 
        '- ' + item.children.map((child: any) => child.text).join('')
      ).join('\n')
    }
    if (block.type === 'list' && block.format === 'ordered') {
      return block.children.map((item, index) => 
        `${index + 1}. ` + item.children.map((child: any) => child.text).join('')
      ).join('\n')
    }
    if (block.type === 'blockquote') {
      return '> ' + block.children.map(child => child.text).join('')
    }
    if (block.type === 'code') {
      return '```\n' + block.code + '\n```'
    }
    return block.children?.map(child => child.text).join('') || ''
  }).join('\n\n')

  const shouldTruncate = markdownContent.length > 700

  const handleSaveContent = (newContent: string) => {
    onUpdate({ ...item, content: newContent })
  }

  return (
    <>
      <div 
        className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-white/50"
      >
        <div className="space-y-4">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${getTypeColor(item.type)}`}>
                {getTypeIcon(item.type)}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 capitalize">{item.type}</p>
                {item.timestamp && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-400">{item.timestamp}</span>
                  </>
                )}
                {/* Minimal Source Indicators */}
                {item.sources && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex -space-x-1.5">
                      {item.sources.map((source, index) => (
                        <div
                          key={index}
                          className={`w-5 h-5 rounded-full ${source.color} text-white flex items-center justify-center text-xs font-medium ring-2 ring-white`}
                          title={source.title}
                        >
                          {index + 1}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChat(item.content)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>

          {/* Content Section */}
          <div className="space-y-3">
            <div className="prose prose-sm max-w-none text-gray-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {shouldTruncate && !isExpanded
                  ? markdownContent.slice(0, 700) + '...'
                  : markdownContent}
              </ReactMarkdown>
            </div>
            {shouldTruncate && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <>
                    Show less
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {item.tags && (
            <div className="flex flex-wrap gap-2 mt-8">
              {item.tags.map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={item.title}
        content={item.content}
        onSave={handleSaveContent}
      />
    </>
  )
}

const FeedContent = ({ onToggleRightSidebar, onSetChatContent }: { 
  onToggleRightSidebar: () => void
  onSetChatContent: (content: string) => void 
}) => {
  const [items, setItems] = useState(demoFeedItems)

  const handleUpdateItem = (updatedItem: FeedCard) => {
    setItems(items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ))
  }

  const handleChat = (content: string) => {
    onSetChatContent(content)
    onToggleRightSidebar()
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <FeedCard 
          key={index} 
          item={item} 
          onUpdate={handleUpdateItem} 
          onChat={handleChat}
        />
      ))}
    </div>
  )
}

interface FeedContentProps {
  content: string
}

const FeedContentHTML = ({ content }: FeedContentProps) => {
  return (
    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
  )
}

export default FeedContent