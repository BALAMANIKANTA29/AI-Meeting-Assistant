import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  FileText,
  CheckCircle,
  Mail,
  Copy,
  Check,
  Download,
  Share2,
  Bookmark,
  User as UserIcon,
} from "lucide-react";
import { Meeting, SpeakerTurn, ActionItem, Email } from "../types";

interface MeetingDetailViewProps {
  meetingId: string;
  token: string;
  onBack: () => void;
  onUpdateStats: () => void;
}

export default function MeetingDetailView({
  meetingId,
  token,
  onBack,
  onUpdateStats,
}: MeetingDetailViewProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [email, setEmail] = useState<Email | null>(null);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary" | "actions" | "email">("summary");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [translating, setTranslating] = useState(false);

  // Parse speaker turns safely
  const getSpeakerTurns = (): SpeakerTurn[] => {
    if (!meeting?.transcript) return [];
    try {
      return JSON.parse(meeting.transcript);
    } catch (e) {
      // Fallback if raw text
      return [{ speaker: "Speaker 1", text: meeting.transcript, timestamp: "00:00" }];
    }
  };

  const fetchMeetingDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch meeting details");
      }
      setMeeting(data);
      setActionItems(data.actionItems || []);
      setEmail(data.email || null);
      if (data.language) {
        setSelectedLanguage(data.language);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingDetails();
  }, [meetingId]);

  // Synchronized Toggle of Action Items
  const handleToggleAction = async (itemId: string) => {
    try {
      const res = await fetch(`/api/action-items/${itemId}/toggle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      const updatedItem = await res.json();
      if (!res.ok) {
        throw new Error(updatedItem.error || "Failed to toggle action item status");
      }

      // Update local state
      setActionItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: updatedItem.status } : item))
      );
      onUpdateStats(); // trigger stats reload in parent
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update action item status.");
    }
  };

  // Speaker color map
  const getSpeakerColorClass = (speaker: string) => {
    const speakers = Array.from(new Set(getSpeakerTurns().map((t) => t.speaker)));
    const colors = [
      "bg-amber-100 text-amber-800 border-amber-200",
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-sky-100 text-sky-800 border-sky-200",
      "bg-violet-100 text-violet-800 border-violet-200",
      "bg-rose-100 text-rose-800 border-rose-200",
    ];
    const index = speakers.indexOf(speaker) % colors.length;
    return colors[index] || "bg-zinc-100 text-zinc-800 border-zinc-200";
  };

  const copyEmailToClipboard = () => {
    if (!email) return;
    const fullText = `Subject: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranslate = async (lang: string) => {
    setSelectedLanguage(lang);
    setTranslating(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ language: lang }),
      });

      const responseText = await res.text();
      let responseData: any = {};
      
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          throw new Error("Server returned an invalid JSON response.");
        }
      }

      if (!res.ok) {
        throw new Error(responseData.error || `Translation failed with status code ${res.status}`);
      }

      setMeeting(responseData);
      setActionItems(responseData.actionItems || []);
      setEmail(responseData.email || null);
    } catch (err: any) {
      console.error("Translation error:", err);
      let alertMsg = err.message || "Failed to translate meeting.";
      if (alertMsg.includes("quota") || alertMsg.includes("RESOURCE_EXHAUSTED") || alertMsg.includes("429")) {
        const match = alertMsg.match(/Please retry in ([0-9.]+[a-zA-Z]+)/i);
        const retryTime = match ? ` in ${match[1]}` : " in a few seconds";
        alertMsg = `Gemini API Rate Limit Exceeded: You have exceeded the daily request limit. Please wait${retryTime} and try again!`;
      }
      alert(alertMsg);
    } finally {
      setTranslating(false);
    }
  };

  const parseMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return "";
    let html = markdown;

    // Convert code blocks
    html = html.replace(/```([\s\S]*?)```/g, "<pre style='background: #f4f4f5; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; white-space: pre-wrap;'>$1</pre>");

    // Convert headers (e.g. ### Header)
    html = html.replace(/###\s+(.*)/g, "<h4 style='font-size: 13px; font-weight: 700; color: #18181b; margin-top: 14px; margin-bottom: 6px;'>$1</h4>");
    html = html.replace(/##\s+(.*)/g, "<h3 style='font-size: 15px; font-weight: 700; color: #18181b; margin-top: 18px; margin-bottom: 8px;'>$1</h3>");
    html = html.replace(/#\s+(.*)/g, "<h2 style='font-size: 17px; font-weight: 800; color: #18181b; margin-top: 22px; margin-bottom: 10px;'>$1</h2>");

    // Convert bold text (**bold**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong style='font-weight: 600; color: #09090b;'>$1</strong>");

    // Convert bullet points (- item or * item)
    const lines = html.split("\n");
    let inList = false;
    const formattedLines = lines.map(line => {
      const bulletMatch = line.match(/^[\s]*[-*]\s+(.*)/);
      if (bulletMatch) {
        let prefix = "";
        if (!inList) {
          inList = true;
          prefix = "<ul style='margin-left: 20px; margin-bottom: 10px; list-style-type: disc; padding-left: 5px;'>";
        }
        return prefix + `<li style='margin-bottom: 4px; font-size: 12.5px; color: #27272a;'>${bulletMatch[1]}</li>`;
      } else {
        let suffix = "";
        if (inList) {
          inList = false;
          suffix = "</ul>";
        }
        return suffix + line;
      }
    });
    html = formattedLines.join("\n");

    // Convert single newlines to <br/> outside lists
    html = html.replace(/\n/g, "<br/>");
    return html;
  };

  const handleExportPdf = () => {
    if (!meeting) return;
    const turns = getSpeakerTurns();
    const transcriptHtml = turns.map((t) => `
      <div style="margin-bottom: 12px; page-break-inside: avoid;">
        <strong style="color: #18181b; font-size: 13px;">${t.speaker}</strong>
        <span style="color: #71717a; font-size: 11px; margin-left: 6px;">${t.timestamp}</span>
        <div style="color: #3f3f46; font-size: 13px; margin-top: 4px; line-height: 1.5;">${t.text.replace(/\n/g, '<br/>')}</div>
      </div>
    `).join("");

    const actionItemsHtml = actionItems.map((a) => `
      <tr style="border-bottom: 1px solid #e4e4e7;">
        <td style="padding: 10px 0; font-size: 12px; color: #18181b;">
          <span style="display: inline-block; width: 12px; height: 12px; border: 1px solid #a1a1aa; border-radius: 3px; margin-right: 8px; vertical-align: middle; background-color: ${a.status === 'completed' ? '#18181b' : 'transparent'}; font-size: 8px; color: white; text-align: center; line-height: 10px; font-weight: bold;">${a.status === 'completed' ? '✓' : ''}</span>
          ${a.task}
        </td>
        <td style="padding: 10px 0; font-size: 12px; color: #3f3f46; text-align: center;">${a.assignedTo}</td>
        <td style="padding: 10px 0; font-size: 12px; color: #71717a; text-align: right;">${a.deadline}</td>
      </tr>
    `).join("");

    const emailHtml = email ? `
      <div style="margin-top: 16px; border: 1px solid #e4e4e7; padding: 20px; border-radius: 12px; background-color: #fafafa; page-break-inside: avoid;">
        <h3 style="margin-top: 0; color: #18181b; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f4f4f5; padding-bottom: 8px; margin-bottom: 12px;">Subject: ${email.subject}</h3>
        <p style="color: #3f3f46; font-size: 12.5px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 0;">${email.body}</p>
      </div>
    ` : "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${meeting.title} - Meeting Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #18181b;
              line-height: 1.6;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; color: #09090b; letter-spacing: -0.5px; }
            .meta { font-size: 11px; color: #71717a; margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
            h2 { font-size: 15px; font-weight: 700; margin-top: 32px; margin-bottom: 12px; color: #18181b; border-bottom: 2px solid #18181b; padding-bottom: 4px; letter-spacing: -0.2px; }
            .summary { font-size: 13px; color: #27272a; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { text-align: left; padding-bottom: 8px; border-bottom: 2px solid #e4e4e7; font-size: 11px; text-transform: uppercase; color: #71717a; letter-spacing: 0.5px; }
            @media print {
              body { padding: 10px; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <h1>${meeting.title}</h1>
          <div class="meta">
            Date: ${new Date(meeting.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | Category: ${meeting.category} | Duration: ${Math.round(meeting.duration / 60)} minutes
          </div>

          <h2>AI MEETING SUMMARY</h2>
          <div class="summary">${parseMarkdownToHtml(meeting.summary)}</div>

          ${actionItems.length > 0 ? `
            <h2>ACTION ITEMS</h2>
            <table>
              <thead>
                <tr>
                  <th style="text-align: left; padding-bottom: 8px;">Task</th>
                  <th style="text-align: center; width: 120px; padding-bottom: 8px;">Assigned To</th>
                  <th style="text-align: right; width: 100px; padding-bottom: 8px;">Deadline</th>
                </tr>
              </thead>
              <tbody>
                ${actionItemsHtml}
              </tbody>
            </table>
          ` : ""}

          ${emailHtml ? `
            <h2>FOLLOW-UP EMAIL</h2>
            ${emailHtml}
          ` : ""}

          ${turns.length > 0 ? `
            <h2 style="page-break-before: always;">MEETING TRANSCRIPT</h2>
            <div style="margin-top: 16px;">
              ${transcriptHtml}
            </div>
          ` : ""}

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Custom parser to format markdown/plain-text summaries into clean, styled blocks
  const renderSummaryContent = (text: string) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div className="space-y-4">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("###")) {
            return (
              <h4 key={idx} className="text-sm font-semibold text-zinc-950 mt-5 border-b border-zinc-100 pb-1.5 uppercase tracking-wider font-display">
                {trimmed.replace("###", "").trim()}
              </h4>
            );
          } else if (trimmed.startsWith("##")) {
            return (
              <h3 key={idx} className="text-base font-bold text-zinc-950 mt-6 font-display border-b border-zinc-200 pb-2">
                {trimmed.replace("##", "").trim()}
              </h3>
            );
          } else if (trimmed.startsWith("#")) {
            return (
              <h2 key={idx} className="text-lg font-bold text-zinc-950 font-display mt-6">
                {trimmed.replace("#", "").trim()}
              </h2>
            );
          } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
            return (
              <ul key={idx} className="list-disc pl-5 text-xs text-zinc-600 leading-relaxed space-y-1 my-1">
                <li>{trimmed.substring(1).trim()}</li>
              </ul>
            );
          } else if (trimmed === "") {
            return <div key={idx} className="h-2" />;
          } else {
            return (
              <p key={idx} className="text-xs text-zinc-600 leading-relaxed">
                {trimmed}
              </p>
            );
          }
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center flex flex-col items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-zinc-900 mb-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-zinc-500 text-sm font-medium">Assembling intelligence parameters...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl max-w-md mx-auto">
          <p className="font-semibold text-sm">Error Loading Meeting Details</p>
          <p className="text-xs mt-1">{error || "The selected meeting was not found."}</p>
        </div>
        <button
          onClick={onBack}
          className="mt-6 text-zinc-500 hover:text-zinc-950 font-semibold text-sm inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  return (
    <div id="meeting_detail_view" className="max-w-6xl mx-auto px-4 md:px-8 py-6 font-sans">
      {/* Back navigation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <button
          id="detail_back_btn"
          onClick={onBack}
          className="text-zinc-600 hover:text-zinc-950 font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to list
        </button>

        <div className="flex items-center gap-2.5">
          <select
            id="detail_language_select"
            value={selectedLanguage}
            disabled={translating}
            onChange={(e) => handleTranslate(e.target.value)}
            className="border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Hindi">Hindi</option>
            <option value="Telugu">Telugu</option>
            <option value="Tamil">Tamil</option>
            <option value="Kannada">Kannada</option>
            <option value="Japanese">Japanese</option>
            <option value="Chinese">Chinese</option>
            <option value="Portuguese">Portuguese</option>
          </select>

          <button
            id="detail_download_pdf_btn"
            onClick={handleExportPdf}
            className="border border-zinc-200 hover:border-zinc-400 bg-white text-zinc-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Meta Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 meeting-card-shadow mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-24 w-24 bg-zinc-50 rounded-bl-full pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <div className="mt-1 flex items-center gap-1.5">
            <span className="bg-zinc-900 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
              {meeting.category || "General"}
            </span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-display font-semibold text-zinc-950 tracking-tight mt-3">
          {meeting.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs font-semibold text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-zinc-400" />
            {formatDate(meeting.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-zinc-400" />
            {formatDuration(meeting.duration)}
          </span>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex border-b border-zinc-200 mb-6">
        <button
          id="tab_summary_btn"
          onClick={() => setActiveTab("summary")}
          className={`pb-3.5 text-xs font-bold transition-all relative px-2 cursor-pointer ${
            activeTab === "summary" ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-zinc-800" />
            AI Summary
          </span>
          {activeTab === "summary" && (
            <motion.div layoutId="detail-tabs-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />
          )}
        </button>

        <button
          id="tab_transcript_btn"
          onClick={() => setActiveTab("transcript")}
          className={`pb-3.5 text-xs font-bold transition-all relative px-2 ml-6 cursor-pointer ${
            activeTab === "transcript" ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <FileText className="h-4.5 w-4.5" />
            Dialogue Transcript
          </span>
          {activeTab === "transcript" && (
            <motion.div layoutId="detail-tabs-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />
          )}
        </button>

        <button
          id="tab_actions_btn"
          onClick={() => setActiveTab("actions")}
          className={`pb-3.5 text-xs font-bold transition-all relative px-2 ml-6 cursor-pointer ${
            activeTab === "actions" ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4.5 w-4.5" />
            Action Items ({actionItems.filter((a) => a.status === "pending").length})
          </span>
          {activeTab === "actions" && (
            <motion.div layoutId="detail-tabs-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />
          )}
        </button>

        <button
          id="tab_email_btn"
          onClick={() => setActiveTab("email")}
          className={`pb-3.5 text-xs font-bold transition-all relative px-2 ml-6 cursor-pointer ${
            activeTab === "email" ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Mail className="h-4.5 w-4.5" />
            Follow-up Email
          </span>
          {activeTab === "email" && (
            <motion.div layoutId="detail-tabs-bar" className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[300px] relative">
        {translating && (
          <div className="absolute inset-0 bg-white/75 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
            <svg className="animate-spin h-8 w-8 text-zinc-900 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-zinc-800 text-xs font-bold animate-pulse">Translating entire meeting archive into {selectedLanguage}...</p>
          </div>
        )}
        {/* PANEL A: AI SUMMARY */}
        {activeTab === "summary" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 meeting-card-shadow"
          >
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-100 pb-3">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold text-zinc-950 font-display">Executive Intel Summaries</h3>
            </div>
            <div className="prose prose-zinc max-w-none">
              {renderSummaryContent(meeting.summary || "Summary parameters currently loading or absent.")}
            </div>
          </motion.div>
        )}

        {/* PANEL B: DIALOGUE TRANSCRIPT */}
        {activeTab === "transcript" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {getSpeakerTurns().map((turn, index) => (
              <div
                key={index}
                className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-4 meeting-card-shadow hover:border-zinc-300 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={`h-9 w-9 rounded-full border flex items-center justify-center font-bold text-xs shadow-inner uppercase ${getSpeakerColorClass(
                      turn.speaker
                    )}`}
                  >
                    {turn.speaker.substring(0, 2)}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-zinc-400 mt-1.5">
                    {turn.timestamp}
                  </span>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-zinc-900 mb-0.5">
                    {turn.speaker}
                  </h4>
                  <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
                    {turn.text}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* PANEL C: ACTION ITEMS */}
        {activeTab === "actions" && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 meeting-card-shadow"
          >
            <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-3">
              <h3 className="text-base font-semibold text-zinc-950 font-display flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-zinc-800" />
                Assigned Deliverables
              </h3>
              <span className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full font-bold">
                {actionItems.filter((a) => a.status === "completed").length} / {actionItems.length} Done
              </span>
            </div>

            {actionItems.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 flex items-start gap-3.5 first:pt-0 last:pb-0 group"
                  >
                    <button
                      id={`toggle_action_btn_${item.id}`}
                      onClick={() => handleToggleAction(item.id)}
                      className={`h-5 w-5 rounded border flex items-center justify-center mt-0.5 transition-all cursor-pointer ${
                        item.status === "completed"
                          ? "bg-zinc-950 border-zinc-950 text-white"
                          : "border-zinc-300 hover:border-zinc-500 bg-white"
                      }`}
                    >
                      {item.status === "completed" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-semibold text-zinc-900 leading-relaxed ${
                          item.status === "completed" ? "line-through text-zinc-400 font-medium" : ""
                        }`}
                      >
                        {item.task}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                        <span className="flex items-center gap-1 font-bold text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded text-[10px]">
                          <UserIcon className="h-3 w-3" />
                          {item.assignedTo}
                        </span>
                        {item.deadline && (
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                            Due: {item.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-400 text-xs">
                No active action items extracted for this meeting.
              </div>
            )}
          </motion.div>
        )}

        {/* PANEL D: FOLLOW-UP EMAIL */}
        {activeTab === "email" && email && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Subject card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 meeting-card-shadow flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-4">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Subject Line
                </span>
                <p className="text-xs font-bold text-zinc-900 truncate">
                  {email.subject}
                </p>
              </div>
              <button
                id="copy_subject_btn"
                onClick={() => {
                  navigator.clipboard.writeText(email.subject);
                  setCopiedSubject(true);
                  setTimeout(() => setCopiedSubject(false), 2000);
                }}
                className="text-zinc-400 hover:text-zinc-900 p-2 border border-zinc-100 hover:border-zinc-200 rounded-lg bg-zinc-50/50 hover:bg-zinc-50 cursor-pointer transition-all flex items-center justify-center"
              >
                {copiedSubject ? <Check className="h-4.5 w-4.5 text-zinc-900" /> : <Copy className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Body Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 meeting-card-shadow">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Email Content Body
                </span>
                <button
                  id="copy_full_email_btn"
                  onClick={copyEmailToClipboard}
                  className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1.5 border border-zinc-200 bg-white px-3 py-1.5 rounded-lg shadow-sm hover:border-zinc-400 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-zinc-900" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Full Email
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-zinc-600 leading-relaxed font-mono bg-zinc-50/50 p-5 border border-zinc-100 rounded-xl whitespace-pre-wrap">
                {email.body}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
