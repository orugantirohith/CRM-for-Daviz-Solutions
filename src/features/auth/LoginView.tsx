import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  Send,
  Building2,
} from 'lucide-react';
import { UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedInput = usernameOrEmail.trim();

    if (!trimmedInput) {
      setErrorMsg('Please enter your email or username.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await crmService.authenticate(trimmedInput, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMsg(res.error || 'Invalid credentials. Please verify and try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetEmail.trim()) {
      setResetSubmitted(true);
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setResetSubmitted(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#050B17] flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Subtle radial ambient background to match reference */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0A1A38] rounded-full blur-[140px] pointer-events-none opacity-60" />

      {/* Main Centered Login Card */}
      <div className="w-full max-w-[390px] bg-[#0A1832]/90 backdrop-blur-xl rounded-[32px] border border-blue-500/15 shadow-2xl shadow-blue-950/80 p-7 sm:p-9 relative z-10 animate-crm-view">
        {/* Circular DAVIZ Solutions Logo Badge */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-[#102344] border-2 border-blue-400/25 p-1 flex items-center justify-center shadow-lg shadow-blue-600/15 overflow-hidden transition-transform duration-300 hover:scale-105">
            <img
              src="/logo.jpeg"
              alt="DAVIZ SOLUTIONS Logo"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-white tracking-tight text-center mt-5 mb-6">
          Login
        </h1>

        {/* Error Alert */}
        {errorMsg && (
          <div
            className="mb-5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email / Username Field */}
          <div>
            <label
              htmlFor="login-identity"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Email or Username
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-identity"
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="jane.doe@example.com"
                className="w-full pl-11 pr-4 py-3.5 bg-[#0E2140] border border-blue-900/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400/60 shadow-inner"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-11 pr-11 py-3.5 bg-[#0E2140] border border-blue-900/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-white rounded-xl text-sm outline-none transition-all placeholder:text-slate-400/60 shadow-inner tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-[#1864E0] hover:bg-[#1557c5] active:bg-[#1147a3] text-white font-semibold rounded-xl text-sm sm:text-base shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Logging in...</span>
              </div>
            ) : (
              <span>Log in</span>
            )}
          </button>
        </form>

        {/* Quick Select Credentials Bar */}
        <div className="mt-5 pt-4 border-t border-blue-900/40">
          <p className="text-[11px] font-medium text-slate-400 text-center mb-2.5">
            Quick Select Account (Click to Autofill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setUsernameOrEmail('nikita');
                setPassword('Admin@123');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/60 border border-blue-800/50 text-blue-200 text-left transition-colors flex items-center justify-between group cursor-pointer"
            >
              <span className="font-medium">Nikita</span>
              <span className="text-[10px] text-blue-400 group-hover:text-blue-300">Agent</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsernameOrEmail('sonam');
                setPassword('Admin@123');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/60 border border-blue-800/50 text-blue-200 text-left transition-colors flex items-center justify-between group cursor-pointer"
            >
              <span className="font-medium">Sonam</span>
              <span className="text-[10px] text-blue-400 group-hover:text-blue-300">Agent</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsernameOrEmail('ranga');
                setPassword('Admin@123');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/60 border border-blue-800/50 text-blue-200 text-left transition-colors flex items-center justify-between group cursor-pointer"
            >
              <span className="font-medium">Ranga</span>
              <span className="text-[10px] text-emerald-400 group-hover:text-emerald-300">Manager</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsernameOrEmail('admin');
                setPassword('Admin@123');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/60 border border-blue-800/50 text-blue-200 text-left transition-colors flex items-center justify-between group cursor-pointer"
            >
              <span className="font-medium">Admin</span>
              <span className="text-[10px] text-purple-400 group-hover:text-purple-300">Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Brand Footer */}
      <footer className="mt-6 text-center text-xs text-slate-500 relative z-10">
        DAVIZ SOLUTIONS • Enterprise CRM
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0A1832] border border-blue-500/20 rounded-2xl shadow-2xl p-6 text-slate-100 relative">
            <button
              type="button"
              onClick={closeForgotModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Password Assistance</h3>
                <p className="text-xs text-slate-400">DAVIZ Corporate Access Support</p>
              </div>
            </div>

            {resetSubmitted ? (
              <div className="space-y-4 py-2">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Reset Request Dispatched</p>
                    <p className="text-[11px] text-emerald-200/80 mt-1">
                      Instructions and a secure recovery token have been dispatched to your corporate email <strong className="text-white">{resetEmail}</strong>.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered corporate email address to receive password reset instructions:
                </p>

                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Corporate Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your.name@daviz.ae"
                    className="w-full px-3.5 py-2.5 bg-[#0E2140] border border-blue-900/40 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl text-xs outline-none transition-all placeholder:text-slate-500"
                  />
                </div>

                <div className="p-3 bg-[#081326] rounded-xl border border-blue-950 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <Building2 className="w-3.5 h-3.5" /> IT Helpdesk
                  </div>
                  <p>
                    For immediate assistance, contact IT support at: <span className="text-slate-200 font-mono">support@daviz.ae</span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
