import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { queryNotes } from '../services/notesService';
import { MessageSquare, Send, AlertCircle, ChevronDown, Plus } from 'lucide-react';

interface QueryResponse {
  answer: string;
  relevant_documents: Array<{
    title: string;
    similarity: number;
  }>;
}

export default function RightSidebar() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;

    setLoading(true);
    setError(null);
    try {
      const result = await queryNotes(user.uid, query);
      setResponse(result);
    } catch (error: any) {
      console.error('Error querying notes:', error);
      if (error.message?.includes('No documents retrieved')) {
        setError('No notes found. Try adding some notes first!');
      } else {
        setError('Failed to query your notes. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const presetQueries = [
    { label: 'Find', description: 'my latest notes.' },
    { label: 'Inspire', description: 'me on recent notes.' },
    { label: 'Create', description: 'a tweet combining my recent notes.' },
  ];

  return (
    <div className="fixed right-0 top-0 w-96 h-screen border-l border-white/[0.08] bg-black/40 backdrop-blur-2xl flex flex-col shadow-2xl">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white/60" />
          </div>
          <span className="text-white/90 font-medium">AI Assistant</span>
        </div>
        <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
          <ChevronDown className="w-4 h-4 text-white/60" />
        </button>
      </div>

      {/* Main content area - takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {error && (
          <div className="p-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-center text-red-500">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}

        {!response && !error && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <Plus className="w-8 h-8 text-purple-500/80" />
            </div>
            <h2 className="text-2xl font-light text-white/90 mb-8">Ask Me.</h2>
            <div className="w-full max-w-sm space-y-3">
              {presetQueries.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(`${preset.label} ${preset.description}`)}
                  className="w-full p-4 bg-gradient-to-r from-white/[0.03] to-white/[0.02] hover:from-white/[0.05] hover:to-white/[0.04] rounded-2xl text-left transition-all duration-200 group border border-white/[0.05]"
                >
                  <div className="text-white/90 font-medium mb-1">{preset.label}</div>
                  <div className="text-white/40 text-sm group-hover:text-white/60 transition-colors">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
              <div className="prose prose-invert prose-sm">
                <div className="text-white/80 whitespace-pre-wrap">
                  {response.answer}
                </div>
              </div>
            </div>
            
            {response.relevant_documents.length > 0 && (
              <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
                <h3 className="text-white/60 text-sm font-medium mb-3">Source Notes</h3>
                <ul className="space-y-2.5">
                  {response.relevant_documents.map((doc, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="text-white/90">{doc.title}</span>
                      <span className="text-white/40 bg-white/5 px-2 py-0.5 rounded-full text-xs">
                        {Math.round(doc.similarity)}% match
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area - fixed at bottom */}
      <div className="shrink-0 p-4 border-t border-white/[0.08] bg-black/20">
        <form onSubmit={handleQuerySubmit}>
          <div className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Talk to me..."
              className="w-full bg-black/40 text-white/90 rounded-2xl px-5 py-3.5 pr-12 
                focus:outline-none focus:ring-1 focus:ring-purple-500/30 
                placeholder:text-white/30 border border-white/[0.08]
                transition-all duration-200
                group-hover:border-white/[0.12] group-hover:bg-black/50"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5
                bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] 
                text-white rounded-xl
                hover:from-[#7C3AED] hover:to-[#6D28D9] 
                transition-all duration-200 
                disabled:opacity-50 disabled:hover:from-[#8B5CF6] disabled:hover:to-[#7C3AED]
                shadow-lg shadow-purple-500/20
                hover:shadow-purple-500/30 hover:scale-[1.02]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}