import React from "react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  Video,
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { AnalyticsSummary, Meeting } from "../types";

interface DashboardViewProps {
  stats: AnalyticsSummary;
  onSelectMeeting: (id: string) => void;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ stats, onSelectMeeting, onNavigate }: DashboardViewProps) {
  // Safe default formatting for duration
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

  const hasChartData = stats.meetingsByMonth && stats.meetingsByMonth.length > 0;

  // Static fallback placeholder chart data if new user
  const chartData = hasChartData
    ? stats.meetingsByMonth
    : [
        { month: "Jan", count: 0 },
        { month: "Feb", count: 0 },
        { month: "Mar", count: 0 },
      ];

  const durationData = hasChartData
    ? stats.durationByMonth
    : [
        { month: "Jan", duration: 0 },
        { month: "Feb", duration: 0 },
        { month: "Mar", duration: 0 },
      ];

  return (
    <div id="dashboard_view" className="space-y-8 font-sans max-w-7xl mx-auto px-4 md:px-8 py-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-3xl font-display font-semibold tracking-tight text-zinc-900">
            Workspace Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Real-time insights and automated intelligence for your team meetings.
          </p>
        </div>
        <button
          id="dash_new_meeting_btn"
          onClick={() => onNavigate("upload")}
          className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Video className="h-4 w-4" />
          New Meeting
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI: Total Meetings */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-zinc-200/80 rounded-xl p-5 meeting-card-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-800">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Meetings</p>
            <h3 className="text-2xl font-semibold text-zinc-900 mt-1 font-mono">{stats.totalMeetings}</h3>
          </div>
        </motion.div>

        {/* KPI: Total Duration */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-zinc-200/80 rounded-xl p-5 meeting-card-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-800">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Duration</p>
            <h3 className="text-2xl font-semibold text-zinc-900 mt-1 font-mono">{stats.totalDuration} min</h3>
          </div>
        </motion.div>

        {/* KPI: Pending Tasks */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-zinc-200/80 rounded-xl p-5 meeting-card-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-800">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-2xl font-semibold text-zinc-900 mt-1 font-mono">{stats.pendingTasks}</h3>
          </div>
        </motion.div>

        {/* KPI: Productivity Rate */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white border border-zinc-200/80 rounded-xl p-5 meeting-card-shadow flex items-center gap-4"
        >
          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-800">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Task Completion Rate</p>
            <h3 className="text-2xl font-semibold text-zinc-900 mt-1 font-mono">{stats.productivityRate}%</h3>
          </div>
        </motion.div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart: Meetings Frequency */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 meeting-card-shadow">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-zinc-950 font-display">Meetings Activity</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Distribution of meetings over the last 6 months.</p>
            </div>
            <TrendingUp className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="h-64">
            {stats.totalMeetings > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="#888888" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px" }}
                    cursor={{ fill: "#f4f4f5", opacity: 0.6 }}
                  />
                  <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                <Calendar className="h-8 w-8 text-zinc-300 mb-2" />
                No meeting data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Chart: Meeting Duration (Minutes) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-6 meeting-card-shadow">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-semibold text-zinc-950 font-display">Time Allocation</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Minutes dedicated to meetings on a monthly scale.</p>
            </div>
            <Clock className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="h-64">
            {stats.totalMeetings > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={durationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="month" fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="#888888" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="duration" stroke="#18181b" strokeWidth={2} dot={{ fill: "#18181b", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                <Clock className="h-8 w-8 text-zinc-300 mb-2" />
                No meeting duration data available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Meetings Feed */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 meeting-card-shadow">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-semibold text-zinc-950 font-display">Recent Meetings</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Quick access to transcripts, AI-extracted summaries, and action plans.</p>
          </div>
          <button
            id="dash_view_all_meetings"
            onClick={() => onNavigate("history")}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 flex items-center gap-1 transition-colors cursor-pointer"
          >
            View History <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {stats.recentMeetings && stats.recentMeetings.length > 0 ? (
          <div className="space-y-4">
            {stats.recentMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => onSelectMeeting(meeting.id)}
                className="group border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50/40 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-zinc-100 rounded-lg group-hover:bg-zinc-200/75 transition-colors">
                    <FileText className="h-4.5 w-4.5 text-zinc-800" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950 transition-colors">
                      {meeting.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-400 font-medium">
                      <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-mono font-medium text-[10px]">
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
                <div className="flex items-center gap-2 self-end md:self-center">
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-600 font-medium transition-colors">
                    Review Meeting
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-400 text-sm border border-dashed border-zinc-100 rounded-xl bg-zinc-50/20">
            <Video className="h-10 w-10 text-zinc-200 mb-2" />
            <p className="font-semibold text-zinc-600">No Meetings Recorded</p>
            <p className="text-xs text-zinc-400 mt-1">Upload an audio file or start recording to analyze meetings.</p>
          </div>
        )}
      </div>
    </div>
  );
}
