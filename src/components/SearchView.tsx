import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sparkles, Clock, Calendar, ChevronRight, AlertCircle } from "lucide-react";
import { Meeting } from "../types";

// Extends meeting with relevance explanation returned by search API
interface SearchResult extends Meeting {
  relevanceExplanation?: string;
}

interface SearchViewProps {
  token: string;
  onSelectMeeting: (id: string) => void;
}

export default function SearchView({ token, onSelectMeeting }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setError(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process search query");
      }
      setResults(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Semantic search request failed.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div id="semantic_search_view" className="max-w-4xl mx-auto px-4 md:px-8 py-6 font-sans">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5 mb-8">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
          Smart Semantic Search
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Search meetings conceptually using natural language queries. Powered by Gemini AI parsing and relevance analysis.
        </p>
      </div>

      {/* Semantic Search Box */}
      <form onSubmit={handleSearch} className="space-y-4 mb-8">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-zinc-800 transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            id="semantic_query_input"
            type="text"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: 'Database schema indexes' or 'Bala's action items on Friday'..."
            className="block w-full pl-11 pr-32 py-3.5 border border-zinc-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-zinc-950 transition-all shadow-sm"
          />
          <div className="absolute right-2 top-1.5 bottom-1.5 flex items-center">
            <button
              id="semantic_search_submit_btn"
              type="submit"
              disabled={loading}
              className="bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-200 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Ask Gemini
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400 font-semibold pl-1">
          <span>Popular queries:</span>
          {["Database optimization", "Deployment schedules", "Frontend design layout", "Weekly action items"].map((suggest) => (
            <button
              key={suggest}
              type="button"
              onClick={() => {
                setQuery(suggest);
              }}
              className="hover:text-zinc-800 underline transition-colors cursor-pointer"
            >
              "{suggest}"
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2 mb-6">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Search results */}
      <div>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-20 text-center flex flex-col items-center justify-center"
            >
              <div className="relative mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="h-10 w-10 rounded-full border-4 border-zinc-100 border-t-zinc-950"
                />
                <Sparkles className="h-4 w-4 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-semibold text-zinc-800 font-display animate-pulse">
                Gemini scanning meeting memories...
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Evaluating transcripts and summaries semantically.
              </p>
            </motion.div>
          ) : searched ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider pl-1">
                Search Results ({results.length})
              </h3>

              {results.length > 0 ? (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => onSelectMeeting(result.id)}
                      className="group border border-zinc-200 hover:border-zinc-800 bg-white p-5 rounded-2xl cursor-pointer transition-all shadow-sm flex flex-col gap-3.5"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="bg-zinc-100 text-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
                            {result.category || "General"}
                          </span>
                          <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                            {result.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(result.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(result.duration)}
                          </span>
                        </div>
                      </div>

                      {/* AI Semantic Explanation Badge */}
                      {result.relevanceExplanation && (
                        <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-lg flex gap-2 items-start">
                          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-0.5">
                              AI Relevance Reason
                            </span>
                            <p className="text-xs text-zinc-600 leading-relaxed font-semibold">
                              {result.relevanceExplanation}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-400">
                        <span className="truncate max-w-lg font-medium">
                          {result.summary ? result.summary.substring(0, 120) + "..." : "Review meeting highlights."}
                        </span>
                        <span className="text-zinc-500 font-semibold group-hover:text-zinc-950 transition-colors flex items-center shrink-0">
                          Inspect Workspace
                          <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-600 group-hover:translate-x-0.5 transition-all" />
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center bg-white border border-dashed border-zinc-200 rounded-xl">
                  <AlertCircle className="h-10 w-10 text-zinc-200 mb-2 mx-auto" />
                  <p className="font-semibold text-zinc-600 text-sm">No conceptual matches found</p>
                  <p className="text-xs text-zinc-400 mt-1">Try phrasing your search query with different concepts or keywords.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="py-20 text-center text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-xl bg-white">
              <Sparkles className="h-8 w-8 text-zinc-200 mb-2 mx-auto animate-pulse" />
              <p className="font-semibold text-zinc-600">Semantic Engine Idle</p>
              <p className="text-xs text-zinc-400 mt-1">Enter a query above to concepts, topics, action owners, or key decisions across archives.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
