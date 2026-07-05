import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Mic,
  Square,
  Play,
  FileAudio,
  Sparkles,
  Info,
  Layers,
  FileText,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface Preset {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: number;
}

const PRESETS: Preset[] = [
  {
    id: "standup",
    title: "Daily Standup - Project Alpha",
    category: "Engineering",
    description: "Daily synchronization of the engineering team regarding frontend layout components, backend database interfaces, and cloud scaling migrations.",
    duration: 185,
  },
  {
    id: "kickoff",
    title: "AI Meeting Assistant Kickoff",
    category: "Product Planning",
    description: "Scope definition session clarifying speech-to-text processing bounds, summary formats, action item details, and future calendar integrations.",
    duration: 320,
  },
  {
    id: "database",
    title: "Database Scaling & Optimization",
    category: "Infrastructure",
    description: "Comprehensive review of index structures, query caching policies, load balancing setups, and Neon serverless scaling metrics.",
    duration: 250,
  },
  {
    id: "marketing",
    title: "Launch & Go-To-Market Sync",
    category: "Marketing",
    description: "Marketing coordination covering pricing, launch scheduling, reward campaigns, and early tester feedback forums.",
    duration: 410,
  },
];

interface UploadViewProps {
  token: string;
  onSuccess: (meeting: any) => void;
  onNavigate: (tab: string) => void;
}

export default function UploadView({ token, onSuccess, onNavigate }: UploadViewProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "record" | "presets">("presets");
  
  // Custom Meeting States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("English");
  
  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  // Audio Web API & Canvas Animation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Common UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Processing Meeting Analysis...");

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("audio/")) {
        setUploadedFile(file);
        setError(null);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""));
        }
      } else {
        setError("Invalid file type. Please upload an audio file (MP3, WAV, M4A).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setError(null);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Recording Logic with Web Audio Canvas Waveform
  const startRecording = async () => {
    setError(null);
    setAudioChunks([]);
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Web Audio API
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Start media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        setAudioChunks(chunks);
        // Clean stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start Waveform Animation Loop
      drawWaveform();

      // Start Timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error("Recording error:", err);
      setError("Microphone permission denied or unsupported input interface.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      animationFrameIdRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw middle baseline
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const barWidth = (width / dataArray.length) * 1.5;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        // Compute volume multiplier
        const val = dataArray[i];
        const percent = val / 255;
        const barHeight = (percent * height * 0.8) + 2;

        ctx.fillStyle = "#18181b"; // Dark Slate
        // Mirror wave vertically
        ctx.fillRect(x, (height - barHeight) / 2, barWidth - 1, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  // Convert blob chunks or upload file to base64 for server transmission
  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read audio bytes"));
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Process and analyze
  const handleAnalyze = async (preset?: Preset) => {
    setError(null);
    setLoading(true);

    const messageSequence = [
      "Uploading and decoding meeting audio...",
      "Converting speech to text via transcription model...",
      "Gemini AI processing transcript dialogue...",
      "Generating structured meeting summary and executive highlights...",
      "Extracting assignee tasks and deadline action items...",
      "Drafting professional email follow-up templates...",
      "Saving meeting workspace records..."
    ];

    let msgIndex = 0;
    setLoadingMessage(messageSequence[0]);
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messageSequence.length;
      setLoadingMessage(messageSequence[msgIndex]);
    }, 4500);

    try {
      let payload: any = {};

      if (preset) {
        payload = {
          title: preset.title,
          category: preset.category,
          duration: preset.duration,
          presetId: preset.id,
        };
      } else if (activeTab === "record") {
        if (audioChunks.length === 0 && !isRecording) {
          throw new Error("No microphone audio recorded yet. Please record your session.");
        }
        
        let finalBlob = audioChunks.length > 0 
          ? new Blob(audioChunks, { type: "audio/webm" }) 
          : null;
          
        if (isRecording) {
          stopRecording();
          // Wait slightly for chunks to populate
          await new Promise((resolve) => setTimeout(resolve, 600));
          finalBlob = new Blob(audioChunks, { type: "audio/webm" });
        }

        if (!finalBlob || finalBlob.size === 0) {
          throw new Error("Recording data capture was empty. Please record again.");
        }

        const base64Audio = await convertBlobToBase64(finalBlob);
        payload = {
          title: title || "New Microphone Session",
          category: category,
          duration: recordingSeconds || 60,
          topic: topic || "Spontaneous microphone recording session.",
          audioData: base64Audio,
          language: language,
        };
      } else {
        // Upload Tab
        if (!uploadedFile) {
          throw new Error("Please drag or drop an audio file, or record a session.");
        }

        const base64Audio = await convertBlobToBase64(uploadedFile);
        payload = {
          title: title || uploadedFile.name.replace(/\.[^/.]+$/, ""),
          category: category,
          duration: 180, // Default simulated duration for uploaded files
          topic: topic || `Uploaded audio analysis: ${uploadedFile.name}`,
          audioData: base64Audio,
          language: language,
        };
      }

      // Fetch POST
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze and parse meeting.");
      }

      clearInterval(msgInterval);
      onSuccess(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during meeting transcription analysis.");
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      // Clean up timer and frame anims if unmounted
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  const formatSecs = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div id="upload_view_container" className="max-w-4xl mx-auto px-4 md:px-8 py-6 font-sans">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white border border-zinc-200 rounded-2xl meeting-card-shadow min-h-[460px]"
          >
            <div className="relative mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="h-16 w-16 rounded-full border-4 border-zinc-100 border-t-zinc-900"
              />
              <Sparkles className="h-6 w-6 text-zinc-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            
            <h3 className="text-lg font-semibold text-zinc-900 font-display">
              Synthesizing Meeting Insights
            </h3>
            
            <div className="max-w-md mt-2">
              <p className="text-zinc-500 text-sm font-medium animate-pulse">
                {loadingMessage}
              </p>
              <p className="text-zinc-400 text-xs mt-6 px-4 py-2 bg-zinc-50 rounded-lg inline-flex items-center gap-1.5">
                <Info className="h-3 w-3 text-zinc-400" />
                This is a fully-automated multi-stage Gemini 3.5 task sequence.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="border-b border-zinc-200 pb-5">
              <h1 className="text-3xl font-display font-semibold tracking-tight text-zinc-900">
                New Meeting Intelligence
              </h1>
              <p className="text-zinc-500 text-sm mt-1">
                Upload recordings, record directly from your microphone, or test using structured simulation templates.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Tab selection */}
            <div className="flex bg-zinc-100/80 p-1 rounded-lg w-full max-w-lg">
              <button
                id="preset_tab_btn"
                onClick={() => setActiveTab("presets")}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "presets"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Simulation Templates
              </button>
              <button
                id="record_tab_btn"
                onClick={() => setActiveTab("record")}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "record"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Record Audio
              </button>
              <button
                id="upload_tab_btn"
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === "upload"
                    ? "bg-white text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Upload File
              </button>
            </div>

            {/* TAB CONTENT: PRESETS (SIMULATION) */}
            {activeTab === "presets" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
                    Available Simulation Presets
                  </h3>
                  <p className="text-xs text-zinc-500 mb-4">
                    Instantly simulate detailed team meetings. Ideal for inspecting how Gemini analyzes diverse agendas.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PRESETS.map((preset) => (
                      <div
                        key={preset.id}
                        id={`preset_card_${preset.id}`}
                        onClick={() => handleAnalyze(preset)}
                        className="group border border-zinc-200/85 hover:border-zinc-800 p-5 rounded-xl bg-white hover:bg-zinc-50/20 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="bg-zinc-100 text-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase">
                              {preset.category}
                            </span>
                            <span className="text-zinc-400 font-mono text-[10px] font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {Math.round(preset.duration / 60)} min
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-zinc-900 mt-2.5 group-hover:text-zinc-950 transition-colors">
                            {preset.title}
                          </h4>
                          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                            {preset.description}
                          </p>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-1 text-xs text-zinc-600 font-semibold group-hover:text-zinc-950 transition-colors">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          Simulate & Analyze with Gemini
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: RECORD MICROPHONE */}
            {activeTab === "record" && (
              <div className="space-y-6 bg-white border border-zinc-200 rounded-xl p-6 meeting-card-shadow">
                <div className="flex flex-col items-center justify-center py-8">
                  {/* Visual Waveform Canvas */}
                  <div className="w-full max-w-md h-32 border border-zinc-100 rounded-xl overflow-hidden bg-white mb-6">
                    <canvas
                      ref={canvasRef}
                      width={448}
                      height={128}
                      className="w-full h-full block"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    {isRecording ? (
                      <button
                        id="record_stop_btn"
                        type="button"
                        onClick={stopRecording}
                        className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"
                      >
                        <Square className="h-6 w-6" />
                      </button>
                    ) : (
                      <button
                        id="record_start_btn"
                        type="button"
                        onClick={startRecording}
                        className="h-14 w-14 rounded-full bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"
                      >
                        <Mic className="h-6 w-6 animate-pulse" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-lg font-mono font-semibold text-zinc-900">
                      {formatSecs(recordingSeconds)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 font-medium">
                      {isRecording ? "Listening & Capturing Frequencies..." : "Click microphone to record details"}
                    </p>
                  </div>
                </div>

                {/* Manual form additions for recording */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 pt-6">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="rec_title">
                      Meeting Title
                    </label>
                    <input
                      id="rec_title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Engineering Progress Sync"
                      className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="rec_category">
                      Department Category
                    </label>
                    <select
                      id="rec_category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                    >
                      <option>Engineering</option>
                      <option>Product Planning</option>
                      <option>Infrastructure</option>
                      <option>Marketing</option>
                      <option>General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="rec_language">
                      Output Language
                    </label>
                    <select
                      id="rec_language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                    >
                      <option>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Hindi</option>
                      <option>Telugu</option>
                      <option>Tamil</option>
                      <option>Kannada</option>
                      <option>Japanese</option>
                      <option>Chinese</option>
                      <option>Portuguese</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="rec_topic">
                      Agenda Topics (Optional background for AI context)
                    </label>
                    <textarea
                      id="rec_topic"
                      rows={2}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="We will review frontend bug releases, index schema optimizations, and draft the cloud migration timelines."
                      className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="analyze_record_btn"
                    onClick={() => handleAnalyze()}
                    disabled={audioChunks.length === 0 && !isRecording}
                    className="w-full md:w-auto bg-zinc-950 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-400 text-white text-xs font-semibold px-5 py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Transcribe & Analyze recording
                  </button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: UPLOAD AUDIO FILE */}
            {activeTab === "upload" && (
              <div className="space-y-6">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive
                      ? "border-zinc-800 bg-zinc-50/60"
                      : "border-zinc-200 bg-white hover:border-zinc-400"
                  }`}
                >
                  <input
                    id="audio-file-input"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  
                  {uploadedFile ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-3.5 bg-zinc-100 rounded-xl text-zinc-800 mb-3 shadow-inner">
                        <FileAudio className="h-8 w-8 animate-bounce" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-900">{uploadedFile.name}</p>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Audio Format
                      </p>
                      <button
                        id="remove_file_btn"
                        onClick={() => setUploadedFile(null)}
                        className="mt-3 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="audio-file-input" className="cursor-pointer flex flex-col items-center justify-center h-full">
                      <div className="p-3.5 bg-zinc-100 rounded-xl text-zinc-500 mb-3 hover:scale-105 transition-transform">
                        <Upload className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-semibold text-zinc-800">
                        Drag & Drop Meeting Audio File
                      </p>
                      <p className="text-xs text-zinc-400 mt-1 font-medium">
                        Supports MP3, WAV, M4A, WebM • Max 40MB
                      </p>
                      <span className="mt-4 inline-block bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm">
                        Select Audio File
                      </span>
                    </label>
                  )}
                </div>

                {uploadedFile && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-zinc-200 rounded-xl p-5 meeting-card-shadow">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="up_title">
                        Meeting Title
                      </label>
                      <input
                        id="up_title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Project Alpha Brainstorm"
                        className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="up_category">
                        Department Category
                      </label>
                      <select
                        id="up_category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                      >
                        <option>Engineering</option>
                        <option>Product Planning</option>
                        <option>Infrastructure</option>
                        <option>Marketing</option>
                        <option>General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="up_language">
                        Output Language
                      </label>
                      <select
                        id="up_language"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                      >
                        <option>English</option>
                        <option>Spanish</option>
                        <option>French</option>
                        <option>German</option>
                        <option>Hindi</option>
                        <option>Telugu</option>
                        <option>Tamil</option>
                        <option>Kannada</option>
                        <option>Japanese</option>
                        <option>Chinese</option>
                        <option>Portuguese</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="up_topic">
                        Meeting Agenda (Helps guide speech-to-text accuracy)
                      </label>
                      <textarea
                        id="up_topic"
                        rows={2}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Agenda details, speaker names, and context keywords to resolve."
                        className="block w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors resize-none"
                      />
                    </div>
 
                    <div className="md:col-span-3 pt-2 flex justify-end">
                      <button
                        id="analyze_uploaded_file_btn"
                        onClick={() => handleAnalyze()}
                        className="w-full md:w-auto bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-5 py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        Analyze Uploaded File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
