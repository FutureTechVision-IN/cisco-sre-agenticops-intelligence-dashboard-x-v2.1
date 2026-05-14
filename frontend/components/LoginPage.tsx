import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface LoginPageProps {
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error, isLoading }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    await onLogin({ username, password });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Theme toggle in corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle size="md" />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-cyan-400 mb-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              SRE AgenticOps
            </h1>
            <p className="text-slate-400 text-sm">
              Intelligence Dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded text-white placeholder-slate-500 
                         focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 
                         transition-all"
                placeholder="sre-admin"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600/50 rounded text-white placeholder-slate-500 
                         focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 
                         transition-all"
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
