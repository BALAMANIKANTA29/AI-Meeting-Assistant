export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  date: string;
  duration: number; // in seconds
  audioUrl?: string;
  transcript: string; // complete text or JSON string of speaker turns
  summary?: string;
  category?: string;
}

export interface SpeakerTurn {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  task: string;
  assignedTo: string;
  deadline?: string;
  status: 'pending' | 'completed';
}

export interface Email {
  id: string;
  meetingId: string;
  subject: string;
  body: string;
}

export interface AnalyticsSummary {
  totalMeetings: number;
  totalDuration: number; // in minutes
  pendingTasks: number;
  completedTasks: number;
  recentMeetings: Meeting[];
  meetingsByMonth: { month: string; count: number }[];
  durationByMonth: { month: string; duration: number }[];
  productivityRate: number; // percentage
}
