import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, RotateCcw, Calendar } from "lucide-react";
import { Meeting } from "../types";

interface RecycleBinViewProps {
  token: string;
  onRefreshMeetings: () => void;
}

export default function RecycleBinView({ token, onRefreshMeetings }: RecycleBinViewProps) {
  const [trashedMeetings, setTrashedMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/meetings/bulk-restore", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore meetings");
      setTrashedMeetings((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to permanently delete the ${selectedIds.length} selected meetings? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch("/api/meetings/bulk-permanent-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete meetings permanently");
      setTrashedMeetings((prev) => prev.filter((m) => !selectedIds.includes(m.id)));
      setSelectedIds([]);
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchTrashedMeetings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meetings/trash", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load trashed meetings");
      setTrashedMeetings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashedMeetings();
  }, []);

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore meeting");
      setTrashedMeetings((prev) => prev.filter((m) => m.id !== id));
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this meeting? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/meetings/${id}/permanent`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete meeting permanently");
      setTrashedMeetings((prev) => prev.filter((m) => m.id !== id));
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm("Are you sure you want to empty the Recycle Bin? All meetings in the bin will be permanently deleted!")) {
      return;
    }
    try {
      const res = await fetch("/api/meetings/empty-trash", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to empty recycle bin");
      setTrashedMeetings([]);
      onRefreshMeetings();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div id="recycle_bin_view" className="max-w-6xl mx-auto px-4 md:px-8 py-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 pb-5 mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-zinc-900">
            Recycle Bin
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Recover deleted meetings, or permanently erase them from history.
          </p>
        </div>
        
        {trashedMeetings.length > 0 && (
          <button
            id="empty_trash_btn"
            onClick={handleEmptyTrash}
            className="border border-red-200 hover:border-red-600 bg-red-50/50 hover:bg-red-50 text-red-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Empty Recycle Bin
          </button>
        )}
      </div>

      {/* Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-3 rounded-lg mb-4 text-xs">
          <div className="flex items-center gap-2 font-semibold text-zinc-700">
            <input
              type="checkbox"
              checked={selectedIds.length === trashedMeetings.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(trashedMeetings.map(m => m.id));
                } else {
                  setSelectedIds([]);
                }
              }}
              className="h-3.5 w-3.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
            />
            <span>Selected {selectedIds.length} of {trashedMeetings.length} meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-zinc-500 hover:text-zinc-800 font-semibold px-2.5 py-1 transition-colors cursor-pointer"
            >
              Cancel Selection
            </button>
            <button
              onClick={handleBulkRestore}
              className="border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-700 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore Selected
            </button>
            <button
              onClick={handleBulkPermanentDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Permanently Selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-zinc-900 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-zinc-500 text-sm font-medium">Scanning recycle bin files...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl max-w-md mx-auto text-center">
          <p className="font-semibold text-sm">Failed to Load Trashed Items</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : trashedMeetings.length === 0 ? (
        <div className="text-center py-20 bg-white border border-zinc-200 rounded-2xl p-8 max-w-md mx-auto mt-8 meeting-card-shadow flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
            <Trash2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900">Your Recycle Bin is empty</h3>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-[280px]">
            Items you delete from the Archive Directory will appear here for recovery.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {trashedMeetings.map((meeting) => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex items-center h-10">
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                        {meeting.category}
                      </span>
                      <span className="text-zinc-400 text-[10px] flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3" />
                        {new Date(meeting.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 mt-2">{meeting.title}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Duration: {Math.round((meeting.duration || 0) / 60)} min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                  <button
                    onClick={() => handleRestore(meeting.id)}
                    className="border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(meeting.id)}
                    className="border border-red-100 hover:border-red-300 bg-red-50/20 hover:bg-red-50/50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
