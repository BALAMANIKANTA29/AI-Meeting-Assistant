import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Calendar,
  Clock,
  Trash2,
  ChevronRight,
  Filter,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Meeting } from "../types";

interface MeetingHistoryViewProps {
  meetings: Meeting[];
  onSelectMeeting: (id: string) => void;
  onDeleteMeeting: (id: string) => void;
  onBulkDeleteMeetings?: (ids: string[]) => void;
}

export default function MeetingHistoryView({
  meetings,
  onSelectMeeting,
  onDeleteMeeting,
  onBulkDeleteMeetings,
}: MeetingHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Move ${selectedIds.length} selected meetings to the Recycle Bin?`)) {
      if (onBulkDeleteMeetings) {
        onBulkDeleteMeetings(selectedIds);
      }
      setSelectedIds([]);
    }
  };

  const categories = ["All", ...Array.from(new Set(meetings.map((m) => m.category || "General")))];

  // Filter meetings
  const filteredMeetings = meetings.filter((meeting) => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || (meeting.category || "General") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening meeting details when clicking delete
    if (confirm("Move this meeting to the Recycle Bin? You can restore it later if needed.")) {
      onDeleteMeeting(id);
    }
  };

  return (
    <div id="meeting_history_view" className="max-w-6xl mx-auto px-4 md:px-8 py-6 font-sans">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5 mb-6">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-zinc-900">
          Meeting Archives
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Review, analyze, and manage transcripts, AI-extracted summaries, and action deliverables for your history.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            id="history_search_input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search meeting titles..."
            className="block w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-xs bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              id={`history_cat_${cat.toLowerCase().replace(/\s+/g, "_")}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                  : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid or List of archived meetings */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-3 rounded-lg mb-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredMeetings.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(filteredMeetings.map(m => m.id));
                } else {
                  setSelectedIds([]);
                }
              }}
              className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
            />
            <span>Selected {selectedIds.length} of {filteredMeetings.length} meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-zinc-500 hover:text-zinc-800 font-semibold px-2.5 py-1 transition-colors cursor-pointer"
            >
              Cancel Selection
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Move Selected to Trash
            </button>
          </div>
        </div>
      )}

      {filteredMeetings.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredMeetings.map((meeting, index) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
                onClick={() => onSelectMeeting(meeting.id)}
                className="group border border-zinc-200/90 hover:border-zinc-400 bg-white hover:bg-zinc-50/30 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all cursor-pointer shadow-sm hover:shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center h-11" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(meeting.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, meeting.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== meeting.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                    />
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl group-hover:bg-zinc-100 transition-colors shadow-inner text-zinc-800">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                      {meeting.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-1 text-xs text-zinc-400 font-semibold">
                      <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase">
                        {meeting.category || "General"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(meeting.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(meeting.duration)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 self-end sm:self-center">
                  <button
                    id={`delete_meeting_btn_${meeting.id}`}
                    onClick={(e) => handleDelete(e, meeting.id)}
                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete meeting record"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                  <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-700 transition-colors flex items-center gap-1">
                    Details
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center bg-white border border-zinc-200 border-dashed rounded-xl">
          <AlertCircle className="h-10 w-10 text-zinc-200 mb-2" />
          <p className="font-semibold text-zinc-600 text-sm">No meetings found</p>
          <p className="text-xs text-zinc-400 mt-1">Try adjusting your search keywords or category filters.</p>
        </div>
      )}
    </div>
  );
}
