import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import DnaBackground from "./DnaBackground";

interface AuthViewProps {
  onSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

type AuthPageMode = "landing" | "login" | "register";

export default function AuthView({ onSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<AuthPageMode>("landing");
  const [loaderDone, setLoaderDone] = useState(false);
  const [appVisible, setAppVisible] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Form Status
  const [loading, setLoading] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Errors & Focus States
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: "success" | "error" }>({
    show: false,
    msg: "",
    type: "success",
  });

  // Latest Meeting state for Live Preview Card
  const [latestMeeting, setLatestMeeting] = useState<{
    title: string;
    duration: number;
    date: string;
    category: string;
    summary: string;
    actionItems?: { task: string; assignedTo: string; deadline?: string }[];
  } | null>(null);

  useEffect(() => {
    const fetchLatestMeeting = async () => {
      try {
        const res = await fetch("/api/public/latest-meeting");
        if (res.ok) {
          const data = await res.json();
          if (data && data.title) {
            setLatestMeeting(data);
          }
        }
      } catch (e) {
        console.log("Using default preview meeting");
      }
    };
    fetchLatestMeeting();
  }, []);

  // Cursor state
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });
  const [cursorExpanded, setCursorExpanded] = useState(false);

  // Ripples
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

  // 3D Card Tilt Ref
  const cardOuterRef = useRef<HTMLDivElement | null>(null);
  const cardInnerRef = useRef<HTMLDivElement | null>(null);

  // Toast trigger function
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  // Password validation constraints
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const allPasswordConstraintsMet = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  // Initialize Glitch Loader & App Reveal
  useEffect(() => {
    const timer1 = setTimeout(() => setLoaderDone(true), 2200);
    const timer2 = setTimeout(() => setAppVisible(true), 2400);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Custom Cursor RAF loop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      // Check hover for expandable cursor
      const target = e.target as HTMLElement;
      if (target && target.closest("a, button, input, label, .ckl, .sbtn-s")) {
        setCursorExpanded(true);
      } else {
        setCursorExpanded(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    let animationId: number;
    let rx = ringPos.x;
    let ry = ringPos.y;

    const loop = () => {
      animationId = requestAnimationFrame(loop);
      rx += (cursorPos.x - rx) * 0.18;
      ry += (cursorPos.y - ry) * 0.18;
      setRingPos({ x: rx, y: ry });
    };
    loop();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, [cursorPos.x, cursorPos.y]);

  // Click Ripple Handler
  const handleGlobalClick = (e: React.MouseEvent) => {
    const newRipple = { id: Date.now(), x: e.clientX - 90, y: e.clientY - 90 };
    setRipples((prev) => [...prev.slice(-10), newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 750);
  };

  // Card 3D Tilt
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardInnerRef.current || !cardOuterRef.current) return;
    const r = cardInnerRef.current.getBoundingClientRect();
    const tx = ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 6;
    const ty = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -6;
    cardOuterRef.current.style.transform = `rotateX(${ty}deg) rotateY(${tx}deg)`;
  };

  const handleCardMouseLeave = () => {
    if (cardOuterRef.current) {
      cardOuterRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    }
  };

  // Switch mode handler & error reset
  const switchMode = (newMode: AuthPageMode) => {
    setMode(newMode);
    setEmailError(false);
    setPasswordError(false);
    setNameError(false);
  };

  // Submit Handler for Login & Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(false);
    setPasswordError(false);
    setNameError(false);

    let valid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (mode === "register" && !name.trim()) {
      setNameError(true);
      valid = false;
    }

    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError(true);
      valid = false;
    }

    if (!password || password.length < 6) {
      setPasswordError(true);
      valid = false;
    }

    if (!valid) {
      showToast("Please fill out all required fields correctly.", "error");
      return;
    }

    setLoading(true);
    setSubmitProgress(10);

    const pInterval = setInterval(() => {
      setSubmitProgress((prev) => (prev >= 90 ? 90 : prev + Math.random() * 20 + 5));
    }, 200);

    const endpoint = mode === "login" ? "/api/login" : "/api/register";
    const body = mode === "login" ? { email: email.trim(), password } : { name: name.trim(), email: email.trim(), password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      if (!response.ok) {
        if (mode === "login") {
          try {
            const localAccounts = JSON.parse(localStorage.getItem("meeting_local_accounts") || "[]");
            const cleanE = email.trim().toLowerCase();
            const matchedLocal = localAccounts.find(
              (acc: any) => acc.email.toLowerCase() === cleanE && acc.password === password
            );
            if (matchedLocal) {
              const regRes = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: matchedLocal.name, email: matchedLocal.email, password: matchedLocal.password }),
              });
              if (regRes.ok) {
                const regData = await regRes.json();
                clearInterval(pInterval);
                setSubmitProgress(100);
                setTimeout(() => {
                  setLoading(false);
                  setSubmitSuccess(true);
                  showToast("Authenticated successfully! Redirecting...", "success");
                  setTimeout(() => {
                    onSuccess(regData.token, regData.user);
                  }, 1200);
                }, 400);
                return;
              }
            }
          } catch (e) {
            console.error("Local account sync error:", e);
          }
        }
        throw new Error(data.error || "Authentication failed");
      }

      if (mode === "register") {
        try {
          const localAccounts = JSON.parse(localStorage.getItem("meeting_local_accounts") || "[]");
          const cleanE = email.trim().toLowerCase();
          const existingIdx = localAccounts.findIndex((acc: any) => acc.email.toLowerCase() === cleanE);
          const newAcc = { name: name.trim(), email: cleanE, password };
          if (existingIdx >= 0) {
            localAccounts[existingIdx] = newAcc;
          } else {
            localAccounts.push(newAcc);
          }
          localStorage.setItem("meeting_local_accounts", JSON.stringify(localAccounts));
        } catch (e) {
          console.error("Failed to save local account backup:", e);
        }
      }

      clearInterval(pInterval);
      setSubmitProgress(100);

      setTimeout(() => {
        setLoading(false);
        setSubmitSuccess(true);
        showToast(mode === "login" ? "Authenticated successfully! Redirecting..." : "Account created successfully! Logging in...", "success");

        setTimeout(() => {
          onSuccess(data.token, data.user);
        }, 1200);
      }, 400);
    } catch (err: any) {
      clearInterval(pInterval);
      setLoading(false);
      setSubmitProgress(0);
      showToast(err.message || "Authentication error occurred", "error");
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast(`Password reset link sent to ${email.trim()}`, "success");
    } else {
      showToast("Enter your registered email address first", "error");
      setEmailError(true);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030303] text-[#e8e8e8] selection:bg-white selection:text-black overflow-x-hidden" onClick={handleGlobalClick}>
      {/* 1. Glitch Loader */}
      <div id="loader" className={loaderDone ? "done" : ""}>
        <div className="w-20 h-20 bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.35)] animate-pulse">
          <img src="/logo.png" alt="Zero Trust Logo" className="w-full h-full object-contain" />
        </div>
        <div className="ld-brand text-center" data-text="AI Meeting Assistant">AI Meeting Assistant</div>
        <div className="ld-track">
          <div className="ld-fill"></div>
        </div>
      </div>

      {/* 2. Custom Glowing Cursor */}
      <div
        className="cur-dot"
        style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }}
      />
      <div
        className={`cur-ring ${cursorExpanded ? "exp" : ""}`}
        style={{ left: `${ringPos.x}px`, top: `${ringPos.y}px` }}
      />

      {/* 3. Click Ripples */}
      <div id="ripples">
        {ripples.map((r) => (
          <div key={r.id} className="rpl" style={{ left: `${r.x}px`, top: `${r.y}px` }} />
        ))}
      </div>

      {/* 4. Background Scan Lines & Vignette */}
      <div className="scan-line" />
      <div className="scan-line" />
      <div className="vignette" />

      {/* 5. Three.js 3D DNA Helix Background */}
      <DnaBackground />

      {/* 6. Navigation Header */}
      <header className={`relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between transition-opacity duration-700 ${appVisible ? "opacity-100" : "opacity-0"}`}>
        <div
          onClick={() => setMode("landing")}
          className="c-logo cursor-pointer group mb-0"
        >
          <div className="c-logo-icon group-hover:scale-105 transition-transform bg-white overflow-hidden p-1">
            <img src="/logo.png" alt="Zero Trust Logo" className="w-full h-full object-contain" />
          </div>
          <span className="c-logo-txt tracking-tight">AI Meeting Assistant</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          <button onClick={() => setMode("landing")} className={`hover:text-white transition-colors cursor-pointer ${mode === "landing" ? "text-white" : ""}`}>
            Overview
          </button>
          <a href="#features" className="hover:text-white transition-colors cursor-pointer">
            Capabilities
          </a>
          <a href="#preview" className="hover:text-white transition-colors cursor-pointer">
            Live Preview
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {mode !== "login" && (
            <button
              onClick={() => setMode("login")}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white border border-white/10 hover:border-white/30 rounded-xl transition-all backdrop-blur-md bg-white/5 cursor-pointer"
            >
              Sign In
            </button>
          )}
          {mode !== "register" && (
            <button
              onClick={() => setMode("register")}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-zinc-200 rounded-xl transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
            >
              Create Account
            </button>
          )}
        </div>
      </header>

      {/* 7. Main Application Canvas */}
      <main id="app" className={`relative z-10 w-full min-h-[calc(100vh-88px)] flex items-center justify-center p-4 md:p-8 transition-opacity duration-1000 ${appVisible ? "vis" : ""}`}>
        <AnimatePresence mode="wait">
          {/* ════ LANDING PAGE VIEW ════ */}
          {mode === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-6xl mx-auto py-8 space-y-24"
            >
              {/* Hero Section */}
              <div className="text-center max-w-4xl mx-auto space-y-6 pt-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-xl text-xs font-medium tracking-wide text-zinc-200 shadow-inner">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <i className="fa-solid fa-sparkles text-amber-300 text-[10px]" />
                  <span>AI-POWERED MEETING ASSISTANT WORKSPACE</span>
                </div>

                <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
                  Turn Everyday Meetings into{" "}
                  <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                    Actionable Intelligence
                  </span>
                </h1>

                <p className="text-zinc-400 text-base md:text-xl font-normal max-w-2xl mx-auto leading-relaxed">
                  Record, transcribe, summarize, organize, and semantically search all your meetings with instant AI breakdown.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => setMode("register")}
                    className="w-full sm:w-auto px-8 py-4 bg-white text-black font-display font-bold text-base rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.25)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Get Started Free</span>
                    <i className="fa-solid fa-arrow-right text-xs" />
                  </button>

                  <button
                    onClick={() => setMode("login")}
                    className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/15 hover:border-white/40 text-white font-display font-semibold text-base rounded-2xl backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-right-to-bracket text-zinc-400 text-xs" />
                    <span>Sign In to Workspace</span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-amber-400" />
                    Instant Summarization
                  </span>
                  <span className="flex items-center gap-2">
                    <i className="fa-solid fa-brain text-purple-400" />
                    Vector Semantic Search
                  </span>
                </div>
              </div>

              {/* Feature Showcase Grid */}
              <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl hover:border-white/25 transition-all group space-y-4 hover:translate-y-[-4px]">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-microphone-lines" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">Smart Transcription</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Convert raw speech from microphone or uploaded media into structured speaker-diarized transcriptions instantly.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl hover:border-white/25 transition-all group space-y-4 hover:translate-y-[-4px]">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-wand-magic-sparkles" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">AI Action Extraction</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Automatically extract key decisions, action items, assignees, sentiment indices, and executive executive summaries.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl hover:border-white/25 transition-all group space-y-4 hover:translate-y-[-4px]">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-magnifying-glass-chart" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">Semantic Search</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Ask natural questions across all past meeting transcripts and find exact timestamps and answers in seconds.
                  </p>
                </div>
              </div>

              {/* Live Interactive Preview Card */}
              <div id="preview" className="rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.02] p-1 border border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="bg-[#0a0a0a] rounded-[22px] p-6 md:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500/80 animate-pulse" />
                      <div>
                        <h4 className="font-display font-bold text-lg text-white">
                          {latestMeeting ? latestMeeting.title : "Sprint Alignment & Architecture Review"}
                        </h4>
                        <p className="text-xs text-zinc-500">
                          {latestMeeting ? `${latestMeeting.category || 'Meeting'} • ${Math.round(latestMeeting.duration / 60) || 15} mins • Recorded Recently` : "4 participants • 42 mins • Recorded Today"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Sentiment: +88% Positive
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <i className="fa-solid fa-list-check text-amber-400" />
                        AI Action Items Extracted
                      </h5>
                      <div className="space-y-2 text-xs">
                        {latestMeeting?.actionItems && latestMeeting.actionItems.length > 0 ? (
                          latestMeeting.actionItems.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                              <i className="fa-solid fa-circle-check text-emerald-400 mt-0.5" />
                              <div>
                                <span className="font-bold text-white block">{item.task}</span>
                                <span className="text-zinc-400">Assigned to {item.assignedTo || "Team"} • {item.deadline || "High Priority"}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                              <i className="fa-solid fa-circle-check text-emerald-400 mt-0.5" />
                              <div>
                                <span className="font-bold text-white block">Implement Token Auth</span>
                                <span className="text-zinc-400">Assigned to Sarah M. • Due Tomorrow</span>
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                              <i className="fa-solid fa-circle-check text-emerald-400 mt-0.5" />
                              <div>
                                <span className="font-bold text-white block">Optimize Vector Search Embeddings</span>
                                <span className="text-zinc-400">Assigned to David K. • High Priority</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <i className="fa-solid fa-file-lines text-blue-400" />
                        Executive Summary
                      </h5>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                        {latestMeeting ? latestMeeting.summary : "The team finalized the Q3 architecture specifications. All backend API endpoints now enforce strict JWT token validation. Database indexes for meeting transcript search were upgraded for real-time vector queries."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ SIGN IN & CREATE ACCOUNT VIEW CARDS ════ */}
          {(mode === "login" || mode === "register") && (
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
              className="card-p my-6"
            >
              <div
                className="card-o"
                ref={cardOuterRef}
              >
                <div className="card-bs" />
                <div
                  className="card-i"
                  ref={cardInnerRef}
                  onMouseMove={handleCardMouseMove}
                  onMouseLeave={handleCardMouseLeave}
                >
                  {/* Top Switch / Back button */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => switchMode("landing")}
                      className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-left text-[10px]" />
                      <span>Back to Landing</span>
                    </button>

                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500 border border-white/10 px-2 py-0.5 rounded-md">
                      {mode === "login" ? "Sign In" : "Register"}
                    </span>
                  </div>

                  {/* Logo */}
                  <div className="c-logo cursor-pointer" onClick={() => switchMode("landing")}>
                    <div className="c-logo-icon bg-white overflow-hidden p-1">
                      <img src="/logo.png" alt="Zero Trust Logo" className="w-full h-full object-contain" />
                    </div>
                    <span className="c-logo-txt font-bold text-lg">AI Meeting Assistant</span>
                  </div>

                  {/* Header */}
                  <div className="c-hdr">
                    <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
                    <p className="on">
                      {mode === "login"
                        ? "Sign in to your AI-powered workspace"
                        : "Join AI Meeting Assistant and elevate your team meetings"}
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} noValidate>
                    {/* Full Name Input (Register mode only) */}
                    {mode === "register" && (
                      <div className={`iw ${focusedInput === "name" ? "foc" : ""} ${nameError ? "err" : ""}`}>
                        <div className="iw-ico">
                          <i className="fa-regular fa-user" />
                        </div>
                        <input
                          type="text"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocusedInput("name")}
                          onBlur={() => setFocusedInput(null)}
                          placeholder=" "
                          required
                          aria-label="Full Name"
                        />
                        <label className="fl" htmlFor="name">
                          Full Name
                        </label>
                        <div className="iw-ul" />
                        <div className="iw-beam" />
                        <div className={`iw-er ${nameError ? "vis" : ""}`}>
                          Please enter your full name
                        </div>
                      </div>
                    )}

                    {/* Email Input */}
                    <div className={`iw ${focusedInput === "email" ? "foc" : ""} ${emailError ? "err" : ""}`}>
                      <div className="iw-ico">
                        <i className="fa-regular fa-envelope" />
                      </div>
                      <input
                        type="email"
                        id="eml"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput("email")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder=" "
                        autoComplete="email"
                        required
                        aria-label="Email address"
                      />
                      <label className="fl" htmlFor="eml">
                        Email address
                      </label>
                      <div className="iw-ul" />
                      <div className="iw-beam" />
                      <div className={`iw-er ${emailError ? "vis" : ""}`}>
                        Enter a valid email address
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className={`iw ${focusedInput === "password" ? "foc" : ""} ${passwordError ? "err" : ""}`}>
                      <div className="iw-ico" style={{ fontSize: ".8rem" }}>
                        <i className="fa-solid fa-lock" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="psw"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput("password")}
                        onBlur={() => setFocusedInput(null)}
                        placeholder=" "
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        required
                        aria-label="Password"
                      />
                      <label className="fl" htmlFor="psw">
                        Password
                      </label>
                      <button
                        type="button"
                        className="pwt"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password visibility"
                      >
                        <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`} />
                      </button>
                      <div className="iw-ul" />
                      <div className="iw-beam" />
                      <div className={`iw-er ${passwordError ? "vis" : ""}`}>
                        {mode === "login"
                          ? "Minimum 6 characters required"
                          : "Please satisfy password security criteria below"}
                      </div>
                    </div>

                    {/* Live Password Requirements Checklist for Register Mode */}
                    {mode === "register" && (
                      <div className="mb-4 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] space-y-1.5 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">
                            Password Requirements:
                          </span>
                          {allPasswordConstraintsMet && (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <i className="fa-solid fa-check-circle" /> Strong Password
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          <span className={`flex items-center gap-1.5 font-medium transition-colors ${hasMinLength ? "text-emerald-400" : "text-zinc-400"}`}>
                            <i className={`fa-solid ${hasMinLength ? "fa-circle-check text-emerald-400" : "fa-circle-dot text-zinc-600"} text-[10px]`} />
                            6+ Characters
                          </span>
                          <span className={`flex items-center gap-1.5 font-medium transition-colors ${hasUppercase ? "text-emerald-400" : "text-zinc-400"}`}>
                            <i className={`fa-solid ${hasUppercase ? "fa-circle-check text-emerald-400" : "fa-circle-dot text-zinc-600"} text-[10px]`} />
                            1 Uppercase (A-Z)
                          </span>
                          <span className={`flex items-center gap-1.5 font-medium transition-colors ${hasLowercase ? "text-emerald-400" : "text-zinc-400"}`}>
                            <i className={`fa-solid ${hasLowercase ? "fa-circle-check text-emerald-400" : "fa-circle-dot text-zinc-600"} text-[10px]`} />
                            1 Lowercase (a-z)
                          </span>
                          <span className={`flex items-center gap-1.5 font-medium transition-colors ${hasNumber ? "text-emerald-400" : "text-zinc-400"}`}>
                            <i className={`fa-solid ${hasNumber ? "fa-circle-check text-emerald-400" : "fa-circle-dot text-zinc-600"} text-[10px]`} />
                            1 Number (0-9)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Form Controls Row */}
                    {mode === "login" ? (
                      <div className="frow">
                        <label className="ckl">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <span className="ckb">
                            <i className="fa-solid fa-check" />
                          </span>
                          Remember me
                        </label>
                        <a href="#" onClick={handleForgotPassword} className="fgt">
                          Forgot password?
                        </a>
                      </div>
                    ) : (
                      <div className="frow">
                        <label className="ckl">
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                          />
                          <span className="ckb">
                            <i className="fa-solid fa-check" />
                          </span>
                          Agree to Terms & Privacy
                        </label>
                      </div>
                    )}

                    {/* Magnetic Submit Button */}
                    <button
                      type="submit"
                      disabled={loading || submitSuccess}
                      className={`sbtn ${loading ? "ld" : ""} ${submitSuccess ? "ok" : ""}`}
                    >
                      <span className="sb-lbl">
                        {mode === "login" ? "Sign In" : "Create Account"}
                      </span>
                      <div className="sb-prg">
                        <div className="sb-prg-f" style={{ width: `${submitProgress}%` }} />
                      </div>
                      <span className="sb-ok">
                        <i className="fa-solid fa-check" />
                      </span>
                    </button>
                  </form>

                  {/* Mode Switch Footer */}
                  <p className="sgn mt-6">
                    {mode === "login" ? (
                      <>
                        New to MeetAI?{" "}
                        <button type="button" onClick={() => switchMode("register")}>
                          Create an account
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button type="button" onClick={() => switchMode("login")}>
                          Sign In
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 8. Floating Toast Notification */}
      <div
        id="toast"
        className={`${toast.show ? "show" : ""} ${toast.type === "error" ? "terr" : "tok"}`}
        role="alert"
        aria-live="polite"
      >
        <i className={`fa-solid ${toast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`} />
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}
