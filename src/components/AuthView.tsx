import React, { useState } from "react";
import { motion } from "motion/react";
import { Mic, ArrowRight, Sparkles, User as UserIcon, Mail, Lock } from "lucide-react";

interface AuthViewProps {
  onSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

export default function AuthView({ onSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isLogin ? "/api/login" : "/api/register";
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth_container" className="min-h-screen flex items-center justify-center bg-zinc-50 p-6 font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-zinc-200/80 rounded-2xl p-8 meeting-card-shadow relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center text-white mb-3 shadow-md shadow-zinc-900/10">
            <Mic className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-zinc-900">
            AI Meeting Assistant
          </h1>
          <p className="text-zinc-500 text-sm mt-1 text-center">
            Record. Transcribe. Summarize. Organize. Act.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-100 mb-6 relative">
          <button
            id="login_tab_btn"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              isLogin ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Sign In
            {isLogin && (
              <motion.div
                layoutId="auth-tab-bar"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950"
              />
            )}
          </button>
          <button
            id="register_tab_btn"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              !isLogin ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            Create Account
            {!isLogin && (
              <motion.div
                layoutId="auth-tab-bar"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-950"
              />
            )}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5" htmlFor="auth_name">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  id="auth_name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                  placeholder="Enter your name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5" htmlFor="auth_email">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="auth_email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5" htmlFor="auth_password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="auth_password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg text-sm bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            id="auth_submit_btn"
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white font-medium py-2 px-4 rounded-lg text-sm shadow-md transition-colors flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              <>
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
          <p className="text-zinc-400 text-xs flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Powered by server-side Gemini 3.5 Flash
          </p>
        </div>
      </motion.div>
    </div>
  );
}
