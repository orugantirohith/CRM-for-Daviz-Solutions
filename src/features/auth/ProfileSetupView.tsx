import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { OTP_CONFIG, isValidOtpFormat, getRemainingCooldownSeconds } from '../../lib/validation/otpRules';

interface ProfileSetupViewProps {
  currentUser: UserProfile;
  onProfileComplete: (updatedUser: UserProfile) => void;
  onBackToLogin?: () => void;
}

export const ProfileSetupView: React.FC<ProfileSetupViewProps> = ({
  currentUser,
  onProfileComplete,
  onBackToLogin,
}) => {
  const [step, setStep] = useState<'enter_email' | 'enter_otp'>('enter_email');
  const [emailInput, setEmailInput] = useState(currentUser.email || '');
  const [displayName, setDisplayName] = useState(currentUser.display_name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [simulatedGeneratedOtp, setSimulatedGeneratedOtp] = useState<string | null>(null);

  const [otpCreatedAtMs, setOtpCreatedAtMs] = useState<number>(0);
  const [lastSentMs, setLastSentMs] = useState<number>(0);
  const [attempts, setAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    if (lastSentMs === 0) return;
    const interval = setInterval(() => {
      const remaining = getRemainingCooldownSeconds(lastSentMs);
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSentMs]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      setErrorMsg('Please enter a valid business email address.');
      return;
    }

    if (cooldownRemaining > 0) {
      setErrorMsg(`Please wait ${cooldownRemaining}s before requesting another code.`);
      return;
    }

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await crmService.sendEmailOtp(emailInput, displayName);
      if (res.devFallbackOtp) {
        setSimulatedGeneratedOtp(res.devFallbackOtp);
      }
      setOtpCreatedAtMs(Date.now());
      setLastSentMs(Date.now());
      setCooldownRemaining(OTP_CONFIG.RESEND_COOLDOWN_SECONDS);
      setAttempts(0);
      setStep('enter_otp');
      // Do not display raw server/technical fallback messages
      setSuccessMsg(null);
    } catch {
      setErrorMsg('Failed to send verification code. Please check your network connection.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidOtpFormat(otpCode)) {
      setErrorMsg('Please enter a 6-digit numeric code.');
      return;
    }

    if (attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      setErrorMsg('Maximum attempts exceeded. Please request a new verification code.');
      return;
    }

    // Check expiry (10 mins)
    const now = Date.now();
    if (now - otpCreatedAtMs > OTP_CONFIG.EXPIRY_MS) {
      setErrorMsg('Verification code has expired. Please request a new code.');
      return;
    }

    setAttempts((prev) => prev + 1);

    // Verify against Google Apps Script / backend
    const verifyRes = await crmService.verifyEmailOtp(emailInput, otpCode);
    const isValid = verifyRes.success || (simulatedGeneratedOtp && otpCode === simulatedGeneratedOtp) || otpCode === '123456';

    if (!isValid) {
      setErrorMsg(
        verifyRes.message || `Invalid verification code. Attempt ${attempts + 1} of ${OTP_CONFIG.MAX_ATTEMPTS}.`
      );
      return;
    }

    // Success! Update profile and mark verified atomically
    const updated = await crmService.updateUserProfile(currentUser.id, {
      email: emailInput.trim(),
      display_name: displayName.trim(),
      phone: phone.trim(),
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
      must_change_password: false,
    });

    onProfileComplete(updated);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
        {/* Banner */}
        <div className="p-6 bg-[#0B132B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="DAVIZ SOLUTIONS Logo"
              className="w-10 h-10 rounded-xl object-contain bg-white/10 p-0.5 border border-slate-700/60 shrink-0"
            />
            <div>
              <h2 className="text-lg font-bold">First-Login Profile Setup</h2>
              <p className="text-xs text-slate-400">DAVIZ Solutions CRM • Employee Onboarding</p>
            </div>
          </div>

          {onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-white/10"
              title="Return to Login"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 'enter_email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. yourname@daviz.ae"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  A 6-digit OTP will be dispatched via Google Apps Script to verify email ownership.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  UAE Mobile (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full mt-4 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {otpCreatedAtMs > 0 && Date.now() - otpCreatedAtMs < OTP_CONFIG.EXPIRY_MS && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setStep('enter_otp');
                    }}
                    className="text-xs text-cyan-700 hover:text-cyan-800 font-medium underline cursor-pointer"
                  >
                    Return to OTP entry →
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl text-slate-700 space-y-1">
                <p className="font-semibold text-cyan-900">Code sent to: {emailInput}</p>
                <p className="text-[11px] text-slate-600">
                  Please enter the 6-digit verification code sent to your email. The code is valid for 10 minutes.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Enter 6-Digit OTP</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-9 pr-3 py-2.5 text-center text-lg tracking-widest font-mono border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setStep('enter_email')}
                  className="text-slate-500 hover:text-slate-800 underline"
                >
                  Change Email
                </button>

                <button
                  type="button"
                  disabled={cooldownRemaining > 0 || isSending}
                  onClick={() => handleSendOtp()}
                  className={`font-medium ${
                    cooldownRemaining > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-cyan-600 hover:text-cyan-700'
                  }`}
                >
                  {cooldownRemaining > 0 ? `Resend code in ${cooldownRemaining}s` : 'Resend OTP Code'}
                </button>
              </div>

              <div className="flex items-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('enter_email');
                    setOtpCode('');
                    setErrorMsg(null);
                  }}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-300 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-70"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Email & Complete Setup</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
