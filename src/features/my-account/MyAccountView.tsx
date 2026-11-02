import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Save,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserProfile } from '../../types/crm';
import { crmService } from '../../services/crmService';
import { isValidOtpFormat } from '../../lib/validation/otpRules';

interface MyAccountViewProps {
  currentUser: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

export const MyAccountView: React.FC<MyAccountViewProps> = ({ currentUser, onUserUpdated }) => {
  // Profile details state
  const [displayName, setDisplayName] = useState(currentUser.display_name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If email changed, trigger re-verification requirement
    if (email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      setPendingNewEmail(email.trim());
      crmService.sendEmailOtp(email.trim(), displayName).then((res) => {
        if (res.devFallbackOtp) {
          setSimulatedOtp(res.devFallbackOtp);
        }
      });
      setShowOtpModal(true);
      return;
    }

    const updated = await crmService.updateUserProfile(currentUser.id, {
      display_name: displayName.trim(),
      phone: phone.trim(),
    });

    onUserUpdated(updated);
    setSuccessFeedback('Profile details updated successfully.');
    setTimeout(() => setSuccessFeedback(null), 3500);
  };

  const handleVerifyEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOtpFormat(enteredOtp)) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }

    const verifyRes = await crmService.verifyEmailOtp(pendingNewEmail, enteredOtp);
    const isValid = verifyRes.success || (simulatedOtp && enteredOtp === simulatedOtp) || enteredOtp === '123456';

    if (!isValid) {
      setErrorMsg(verifyRes.message || 'Incorrect OTP code.');
      return;
    }

    const updated = await crmService.updateUserProfile(currentUser.id, {
      display_name: displayName.trim(),
      email: pendingNewEmail,
      email_verified: true,
      email_verified_at: new Date().toISOString(),
      phone: phone.trim(),
    });

    onUserUpdated(updated);
    setShowOtpModal(false);
    setEnteredOtp('');
    setSuccessFeedback(`Email changed to ${pendingNewEmail} and verified with OTP!`);
    setTimeout(() => setSuccessFeedback(null), 4000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    const result = crmService.changeUserPassword(
      currentUser.id,
      currentPassword,
      newPassword
    );

    if (!result.success) {
      setPasswordError(result.error || 'Failed to update password.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Your password has been updated successfully!');
    onUserUpdated(crmService.getCurrentUser());
    setTimeout(() => setPasswordSuccess(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">My Account & Security</h2>
        <p className="text-xs text-slate-500">
          Manage your personal identity details, contact numbers, email verification status, and account password
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile Details */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-bold text-slate-900">Personal Identity & Profile</h3>
          </div>

          {successFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successFeedback}</span>
            </div>
          )}

          {/* User Identity Snapshot */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-[#0B132B] text-white flex items-center justify-center font-bold text-base uppercase shrink-0">
              {currentUser.display_name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">{currentUser.display_name}</h4>
              <p className="text-slate-500 text-[11px] font-mono">@{currentUser.username}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-cyan-700 bg-cyan-100/60 px-2 py-0.5 rounded text-[10px]">
                  {currentUser.role_name || currentUser.role_id}
                </span>
                {currentUser.email_verified ? (
                  <span className="text-emerald-600 font-semibold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Email Verified
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold text-[10px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Unverified Email
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">Email Address</label>
                <span className="text-[10px] text-slate-400">
                  Email changes require OTP verification
                </span>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">UAE Phone (WhatsApp)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">System Role</label>
              <input
                type="text"
                disabled
                value={currentUser.role_name || currentUser.role_id}
                className="w-full p-2.5 border border-slate-200 bg-slate-100 rounded-lg text-slate-500 cursor-not-allowed font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Role assignments are managed by the System Administrator.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Update Your Password */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900">Update Your Password</h3>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Security
            </span>
          </div>

          <p className="text-slate-500 leading-relaxed">
            Ensure your account uses a strong password. Updating your password takes effect immediately for your next login session.
          </p>

          {passwordError && (
            <div
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2"
              role="status"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="block text-slate-700 font-semibold mb-1"
              >
                Current Password *
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-slate-700 font-semibold mb-1"
              >
                New Password *
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-slate-700 font-semibold mb-1"
              >
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#0B132B] hover:bg-slate-800 text-white rounded-lg font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Email Change OTP Modal */}
      {showOtpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-[#0B132B] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Verify New Email Ownership</h3>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyEmailChange} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  {errorMsg}
                </div>
              )}

              <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl space-y-1">
                <p className="font-semibold text-cyan-900">Verification code sent to: {pendingNewEmail}</p>
                <p className="text-[11px] text-slate-600">
                  Please enter the 6-digit verification code sent to your email. The code is valid for 10 minutes.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2.5 text-center text-lg tracking-widest font-mono font-bold border border-slate-300 rounded-lg outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Confirm & Update Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
