import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Video,
  Database,
  Search,
  LogOut,
  User as UserIcon,
  Mic,
  Sparkles,
  Info,
  Trash2,
} from "lucide-react";

import { Meeting, AnalyticsSummary } from "./types";
import AuthView from "./components/AuthView";
import DashboardView from "./components/DashboardView";
import UploadView from "./components/UploadView";
import MeetingHistoryView from "./components/MeetingHistoryView";
import MeetingDetailView from "./components/MeetingDetailView";
import SearchView from "./components/SearchView";
import RecycleBinView from "./components/RecycleBinView";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("meeting_auth_token"));
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(
    JSON.parse(localStorage.getItem("meeting_auth_user") || "null")
  );

  const [activeTab, setActiveTab] = useState<"dashboard" | "upload" | "history" | "search" | "trash">("dashboard");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Authenticate & Load
  const handleAuthSuccess = (newToken: string, newUser: { id: string; name: string; email: string }) => {
    localStorage.setItem("meeting_auth_token", newToken);
    localStorage.setItem("meeting_auth_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setActiveTab("dashboard");
    setSelectedMeetingId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("meeting_auth_token");
    localStorage.removeItem("meeting_auth_user");
    setToken(null);
    setUser(null);
    setMeetings([]);
    setAnalytics(null);
  };

  // Fetch archives and statistics
  const fetchAllData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      // Fetch meetings list
      const meetingsRes = await fetch("/api/meetings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meetingsData = await meetingsRes.json();
      if (meetingsRes.ok) {
        setMeetings(meetingsData);
      }

      // Fetch analytics stats
      const statsRes = await fetch("/api/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setAnalytics(statsData);
      }
    } catch (e) {
      console.error("Data fetching error:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  // When a new meeting is recorded or simulation finishes
  const handleMeetingProcessed = (newMeeting: any) => {
    // Refresh all analytics and meeting catalogs
    fetchAllData();
    // Directly focus on the newly analyzed details!
    setSelectedMeetingId(newMeeting.id);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
        fetchAllData();
        if (selectedMeetingId === meetingId) {
          setSelectedMeetingId(null);
        }
      }
    } catch (err) {
      console.error("Deletion error:", err);
    }
  };

  const handleBulkDeleteMeetings = async (meetingIds: string[]) => {
    if (!token) return;
    try {
      const res = await fetch("/api/meetings/bulk-delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: meetingIds }),
      });
      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => !meetingIds.includes(m.id)));
        fetchAllData();
        if (selectedMeetingId && meetingIds.includes(selectedMeetingId)) {
          setSelectedMeetingId(null);
        }
      }
    } catch (err) {
      console.error("Bulk deletion error:", err);
    }
  };

  // Render main tab contents
  const renderTabContent = () => {
    if (!analytics) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <svg className="animate-spin h-6 w-6 text-zinc-900 mb-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-zinc-500 text-xs">Calibrating analytics dashboard parameters...</span>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardView
            stats={analytics}
            onSelectMeeting={(id) => setSelectedMeetingId(id)}
            onNavigate={(tab) => {
              setActiveTab(tab as any);
              setSelectedMeetingId(null);
            }}
          />
        );
      case "upload":
        return (
          <UploadView
            token={token!}
            onSuccess={handleMeetingProcessed}
            onNavigate={(tab) => {
              setActiveTab(tab as any);
              setSelectedMeetingId(null);
            }}
          />
        );
      case "history":
        return (
          <MeetingHistoryView
            meetings={meetings}
            onSelectMeeting={(id) => setSelectedMeetingId(id)}
            onDeleteMeeting={handleDeleteMeeting}
            onBulkDeleteMeetings={handleBulkDeleteMeetings}
          />
        );
      case "search":
        return (
          <SearchView
            token={token!}
            onSelectMeeting={(id) => setSelectedMeetingId(id)}
          />
        );
      case "trash":
        return (
          <RecycleBinView
            token={token!}
            onRefreshMeetings={fetchAllData}
          />
        );
      default:
        return null;
    }
  };

  // If unauthorized, render Auth Form View
  if (!token || !user) {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  return (
    <div id="workspace_layout" className="min-h-screen bg-zinc-50/50 flex flex-col md:flex-row text-zinc-900 font-sans">
      {/* 1. Left Sidebar - Desktop */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200/80 bg-white flex flex-col justify-between shrink-0">
        <div>
          {/* Logo heading */}
          <div className="p-6 flex items-center gap-2.5 border-b border-zinc-100">
            <img
              src="/logo.jpg"
              alt="Zero Trust Logo"
              className="h-9 w-9 rounded-lg object-contain shadow-sm border border-zinc-100 bg-white"
            />
            <div>
              <span className="text-sm font-semibold tracking-tight text-zinc-950 font-display block">
                Meeting Assistant
              </span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-0.5 mt-0.5">
                <Sparkles className="h-3 w-3 animate-pulse" /> powered by Zero Trust
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              id="nav_dashboard"
              onClick={() => {
                setActiveTab("dashboard");
                setSelectedMeetingId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "dashboard" && !selectedMeetingId
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50"
              }`}
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              Dashboard
            </button>

            <button
              id="nav_upload"
              onClick={() => {
                setActiveTab("upload");
                setSelectedMeetingId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "upload" && !selectedMeetingId
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50"
              }`}
            >
              <Video className="h-4.5 w-4.5" />
              Record / Upload
            </button>

            <button
              id="nav_history"
              onClick={() => {
                setActiveTab("history");
                setSelectedMeetingId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "history" && !selectedMeetingId
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50"
              }`}
            >
              <Database className="h-4.5 w-4.5" />
              Archive Directory
            </button>

            <button
              id="nav_search"
              onClick={() => {
                setActiveTab("search");
                setSelectedMeetingId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "search" && !selectedMeetingId
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50"
              }`}
            >
              <Search className="h-4.5 w-4.5" />
              Semantic Search
            </button>

            <button
              id="nav_trash"
              onClick={() => {
                setActiveTab("trash");
                setSelectedMeetingId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === "trash" && !selectedMeetingId
                  ? "bg-zinc-100 text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50"
              }`}
            >
              <Trash2 className="h-4.5 w-4.5" />
              Recycle Bin
            </button>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-zinc-100 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-zinc-50/50">
            <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 uppercase font-bold text-xs shadow-inner">
              {user.name.substring(0, 2)}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-zinc-900 block truncate leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] text-zinc-400 block truncate leading-none mt-0.5">
                {user.email}
              </span>
            </div>
          </div>

          <button
            id="nav_logout"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50/50 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* 2. Main Content Canvas */}
      <main id="main_content_canvas" className="flex-1 overflow-y-auto h-screen relative bg-zinc-50/30">
        <div className="min-h-full pb-16">
          <AnimatePresence mode="wait">
            {selectedMeetingId ? (
              <motion.div
                key={`detail-${selectedMeetingId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <MeetingDetailView
                  meetingId={selectedMeetingId}
                  token={token}
                  onBack={() => setSelectedMeetingId(null)}
                  onUpdateStats={fetchAllData}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {renderTabContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
