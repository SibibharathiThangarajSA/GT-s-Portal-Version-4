import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Key,
  CheckCircle2,
  AlertCircle,
  Check,
  RefreshCw,
  Timer,
  Phone,
  Smartphone
} from 'lucide-react';
import {
  loginApi,
  forgotPasswordApi,
  verifyOtpApi,
  resetPasswordApi,
  requestMobileOtpApi,
  verifyMobileOtpApi,
  requestMobileResetOtpApi,
  verifyMobileResetOtpApi,
  resetPasswordWithMobileOtpApi
} from '../services/api';
import { useToast } from '../context/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  initialRole?: 'GT' | 'Admin';
  onClose: () => void;
  onAuthSuccess: (role: 'GT' | 'Admin', userData?: { name: string; email: string; isGuest?: boolean }) => void;
}

type ModalView = 'login' | 'forgot-email' | 'verify-otp' | 'new-password' | 'mobile-login' | 'mobile-otp-verify';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+1', label: '+1 (US)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+61', label: '+61 (AU)' },
  { code: '+49', label: '+49 (DE)' },
  { code: '+81', label: '+81 (JP)' }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialRole = 'GT',
  onClose,
  onAuthSuccess,
}) => {
  const [view, setView] = useState<ModalView>('login');
  const [selectedRole, setSelectedRole] = useState<'GT' | 'Admin'>(initialRole);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  // Mobile OTP Login Fields
  const [mobileCountryCode, setMobileCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileOtpDigits, setMobileOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const mobileOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [mobileOtpTimerSeconds, setMobileOtpTimerSeconds] = useState(1200);
  const [canResendMobileOtp, setCanResendMobileOtp] = useState(false);
  const [lastGeneratedMobileOtp, setLastGeneratedMobileOtp] = useState<string>('');
  const [lastGeneratedEmailOtp, setLastGeneratedEmailOtp] = useState<string>('');
  const mobileTimerRef = useRef<NodeJS.Timeout | null>(null);

  // OTP & Reset Password Fields (Forgot Password Flow)
  const [recoveryType, setRecoveryType] = useState<'email' | 'phone'>('email');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryCountryCode, setRecoveryCountryCode] = useState('+91');
  const [targetAccountEmail, setTargetAccountEmail] = useState('');

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Expiry & Resend Timers
  const [otpTimerSeconds, setOtpTimerSeconds] = useState(1200); // 20 minutes
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { addToast } = useToast();

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setView('login');
      setSelectedRole(initialRole);
      setEmail('');
      setPassword('');
      setErrorMsg('');
      setSuccessMsg('');
      setIsLoading(false);
      setRecoveryType('email');
      setRecoveryEmail('');
      setRecoveryPhone('');
      setRecoveryCountryCode('+91');
      setTargetAccountEmail('');
      setOtpDigits(['', '', '', '', '', '']);
      setMobileOtpDigits(['', '', '', '', '', '']);
      setMobileNumber('');
      setResetToken('');
      setNewPassword('');
      setShowNewPassword(false);
      setConfirmPassword('');
      setShowConfirmPassword(false);
      setShowPassword(false);
    }
  }, [isOpen, initialRole]);

  // Handle Forgot Password OTP Timer Countdown (20 Minutes)
  useEffect(() => {
    if (view === 'verify-otp') {
      setOtpTimerSeconds(1200);
      setCanResend(false);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setOtpTimerSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCanResend(true);
            return 0;
          }
          if (prev === 1140) {
            setCanResend(true);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view]);

  // Handle Mobile OTP Timer Countdown (20 Minutes)
  useEffect(() => {
    if (view === 'mobile-otp-verify') {
      setMobileOtpTimerSeconds(1200);
      setCanResendMobileOtp(false);
      if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);

      mobileTimerRef.current = setInterval(() => {
        setMobileOtpTimerSeconds((prev) => {
          if (prev <= 1) {
            if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);
            setCanResendMobileOtp(true);
            return 0;
          }
          if (prev === 1140) {
            setCanResendMobileOtp(true);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);
    }

    return () => {
      if (mobileTimerRef.current) clearInterval(mobileTimerRef.current);
    };
  }, [view]);

  // Password Requirements Validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);

  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  const isConfirmFilled = confirmPassword.length > 0;
  const isPasswordMatch = isConfirmFilled && newPassword === confirmPassword;
  const isPasswordMismatch = isConfirmFilled && newPassword !== confirmPassword;

  // 6-digit combined OTP string for Forgot Password
  const fullOtp = otpDigits.join('');

  // Submit button disabled states
  const isLoginDisabled = isLoading || !email.trim() || !password.trim();
  const isSendOtpDisabled = isLoading || (
    recoveryType === 'email'
      ? (!recoveryEmail.trim() || !recoveryEmail.includes('@'))
      : (recoveryPhone.replace(/\D/g, '').length < 10)
  );
  const isVerifyOtpDisabled = isLoading || fullOtp.length !== 6;
  const isResetDisabled = isLoading || !isPasswordValid || !isPasswordMatch;

  const isMobileLoginDisabled = isLoading || mobileNumber.replace(/\D/g, '').length < 10;
  const isMobileVerifyDisabled = isLoading || mobileOtpDigits.join('').length !== 6;

  if (!isOpen) return null;

  // Format MM:SS for countdown timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Handlers: Standard Login ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginApi(email.trim(), password.trim(), selectedRole);
      setIsLoading(false);

      if (res.success && res.data) {
        // Strict Role Gate: Admin tab requires Admin role
        if (selectedRole === 'Admin' && res.data.role !== 'Admin') {
          const msg = `Access Denied: Account '${res.data.email}' has ${res.data.role} privileges. Please switch to the 'Associates' login tab, or change role to Admin in User Management.`;
          setErrorMsg(msg);
          addToast('error', msg);
          return;
        }

        // Strict Role Gate: Associate tab requires Associate/Employee role (Blocks Admin)
        if (selectedRole === 'GT' && res.data.role === 'Admin') {
          const msg = `Access Denied: Account '${res.data.email}' has L&D Admin privileges. Please switch to the 'Learning & Development' login tab.`;
          setErrorMsg(msg);
          addToast('error', msg);
          return;
        }

        sessionStorage.setItem('token', res.data.token);
        localStorage.removeItem('token');
        const fullName = `${res.data.firstName} ${res.data.lastName}`.trim();
        const targetRole: 'GT' | 'Admin' = res.data.role === 'Admin' ? 'Admin' : 'GT';

        onAuthSuccess(targetRole, {
          name: fullName || 'Enterprise User',
          email: res.data.email,
          isGuest: false
        });

        addToast('success', `Welcome back, ${res.data.firstName || 'User'}!`);
      } else {
        setErrorMsg('Incorrect email ID or password.');
        addToast('error', 'Incorrect email ID or password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Incorrect email ID or password.');
      addToast('error', 'Incorrect email ID or password.');
    }
  };

  // --- Handlers: Mobile OTP Flow ---
  const handleRequestMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanPhone = mobileNumber.replace(/\D/g, '').trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestMobileOtpApi(cleanPhone);
      setIsLoading(false);

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      setSuccessMsg(res.message || 'Verification OTP sent successfully.');
      if (res.otp) setLastGeneratedMobileOtp(res.otp);
      addToast('success', res.message || 'Verification code sent to your mobile number via Brevo SMS.');
      setView('mobile-otp-verify');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to request OTP.');
    }
  };

  const handleResendMobileOtp = async () => {
    if (!canResendMobileOtp || isResending) return;
    setIsResending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await requestMobileOtpApi(mobileNumber);
      setIsResending(false);

      if (res.success) {
        setSuccessMsg('A new OTP has been sent via Brevo SMS.');
        if (res.otp) setLastGeneratedMobileOtp(res.otp);
        setMobileOtpTimerSeconds(1200);
        setCanResendMobileOtp(false);
        addToast('success', 'A new verification code has been sent via Brevo SMS.');
      } else {
        setErrorMsg(res.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setIsResending(false);
      setErrorMsg(err.message || 'Error resending OTP.');
    }
  };

  const handleMobileOtpDigitChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...mobileOtpDigits];
    newDigits[index] = val;
    setMobileOtpDigits(newDigits);

    if (val && index < 5) {
      mobileOtpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMobileOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !mobileOtpDigits[index] && index > 0) {
      mobileOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleMobileOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...mobileOtpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setMobileOtpDigits(newDigits);
    const focusIndex = Math.min(pastedData.length, 5);
    mobileOtpInputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyMobileOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const fullMobileOtp = mobileOtpDigits.join('');
    if (fullMobileOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP code.');
      return;
    }

    if (mobileOtpTimerSeconds <= 0) {
      setErrorMsg('The verification code has expired. Please click Resend OTP.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await verifyMobileOtpApi(mobileNumber, fullMobileOtp);
      setIsLoading(false);

      if (res.success && res.data) {
        sessionStorage.setItem('token', res.data.token);
        localStorage.removeItem('token');
        const targetRole: 'GT' | 'Admin' = res.data.role === 'Admin' ? 'Admin' : 'GT';
        const fullName = `${res.data.firstName} ${res.data.lastName}`.trim();

        onAuthSuccess(targetRole, {
          name: fullName || 'Associate User',
          email: res.data.email,
          isGuest: false
        });

        addToast('success', `Welcome back, ${res.data.firstName || 'User'}! Logged in via Mobile OTP.`);
      } else {
        setErrorMsg('Incorrect OTP. Please try again.');
        addToast('error', 'Incorrect OTP. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Incorrect OTP. Please try again.');
      addToast('error', 'Incorrect OTP. Please try again.');
    }
  };

  // --- Handlers: Forgot Password Flow (Email Only) ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      addToast('error', 'Please enter a valid registered email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await forgotPasswordApi({
        recoveryType: 'email',
        email: recoveryEmail.trim()
      });
      setIsLoading(false);

      if (res.success) {
        setTargetAccountEmail(res.userEmail || recoveryEmail.trim());
        setSuccessMsg(res.message || 'OTP sent successfully!');
        if (res.otp) setLastGeneratedEmailOtp(res.otp);
        addToast('success', res.message || 'Verification OTP code sent to your registered email address via Brevo.');
        setOtpDigits(['', '', '', '', '', '']);
        setView('verify-otp');
      } else {
        setErrorMsg(res.message || 'Unable to send OTP.');
        addToast('error', res.message || 'Unable to send OTP.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Error requesting OTP.');
      addToast('error', err.message || 'Error requesting OTP.');
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await forgotPasswordApi({
        recoveryType: 'email',
        email: recoveryEmail.trim()
      });
      setIsResending(false);

      if (res.success) {
        setSuccessMsg('A new 6-digit OTP has been sent to your email.');
        if (res.otp) setLastGeneratedEmailOtp(res.otp);
        setOtpTimerSeconds(1200);
        setCanResend(false);
        addToast('success', 'A new verification OTP has been sent to your email address via Brevo.');
      } else {
        setErrorMsg(res.message || 'Failed to resend OTP.');
        addToast('error', res.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setIsResending(false);
      setErrorMsg(err.message || 'Error resending OTP.');
      addToast('error', err.message || 'Error resending OTP.');
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = val;
    setOtpDigits(newDigits);

    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);
    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP.');
      return;
    }

    if (otpTimerSeconds <= 0) {
      setErrorMsg('The verification code has expired. Please click Resend OTP.');
      addToast('error', 'The verification code has expired. Please click Resend OTP.');
      return;
    }

    setIsLoading(true);

    try {
      const inputVal = recoveryEmail.trim();
      const res = await verifyOtpApi(inputVal, fullOtp);
      setIsLoading(false);

      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setSuccessMsg('6-Digit OTP verified successfully!');
        addToast('success', 'Verification successful. Please create your new password.');
        setView('new-password');
      } else {
        setErrorMsg(res.message || 'Incorrect OTP. Please try again.');
        addToast('error', res.message || 'Incorrect OTP. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Incorrect OTP. Please try again.');
      addToast('error', err.message || 'Incorrect OTP. Please try again.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!resetToken) {
      setErrorMsg('Authorization token missing. Please restart the verification flow.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Please satisfy all password complexity requirements.');
      return;
    }

    if (!isPasswordMatch) {
      setErrorMsg('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setIsLoading(true);

    try {
      const accEmail = targetAccountEmail || recoveryEmail.trim();
      const res = await resetPasswordApi(accEmail, resetToken, newPassword);
      setIsLoading(false);

      if (res.success) {
        setSuccessMsg(res.message || 'Password has been reset successfully!');
        addToast('success', 'Password reset successfully! Old password has been overridden.');
        setTimeout(() => {
          setView('login');
          setEmail(accEmail);
          setPassword('');
          setErrorMsg('');
          setSuccessMsg('');
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Failed to reset password.');
        addToast('error', res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Error resetting password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-900 my-8 animate-fadeIn relative">

        {/* Top Close Button (Circular matching design) */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-xs"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Global Success Banner */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed font-medium">{successMsg}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: STANDARD EMAIL + PASSWORD LOGIN                  */}
        {/* ======================================================== */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">

            {/* Header Title & Subtitle Matching Screenshot */}
            <div className="text-center space-y-1 pt-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Welcome to GT Companion
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Enter your credentials to access your enterprise learning portal.
              </p>
            </div>

            {/* Role Switcher Pill Container Matching Screenshot */}
            <div className="grid grid-cols-2 p-1.5 bg-[#f0f4f9] rounded-2xl border border-slate-200/80 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (selectedRole !== 'GT') {
                    setSelectedRole('GT');
                    setEmail('');
                    setPassword('');
                    setErrorMsg('');
                  }
                }}
                className={`py-3 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${selectedRole === 'GT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Associates</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedRole !== 'Admin') {
                    setSelectedRole('Admin');
                    setEmail('');
                    setPassword('');
                    setErrorMsg('');
                  }
                }}
                className={`py-3 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${selectedRole === 'Admin'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-center text-[11px] sm:text-xs leading-tight">Learning & Development</span>
              </button>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Email Address *</label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3 w-4 h-4 ${errorMsg ? 'text-rose-400' : selectedRole === 'Admin' ? 'text-emerald-500' : 'text-blue-500'}`} />
                <input
                  type="email"
                  name="gt_user_email"
                  autoComplete="off"
                  maxLength={320}
                  placeholder="employee.name@valuemomentum.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.slice(0, 320));
                    if (errorMsg) setErrorMsg('');
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-sm transition-all ${errorMsg
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/10'
                    : selectedRole === 'Admin'
                      ? 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Password *</label>
              <div className="relative">
                <Lock className={`absolute left-3 top-3 w-4 h-4 ${errorMsg ? 'text-rose-400' : selectedRole === 'Admin' ? 'text-emerald-500' : 'text-blue-500'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="gt_user_password"
                  autoComplete="new-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-sm transition-all ${errorMsg
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/10'
                    : selectedRole === 'Admin'
                      ? 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Forgot Password Link directly below password input */}
              <div className="flex items-center justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(email || '');
                    setErrorMsg('');
                    setSuccessMsg('');
                    setView('forgot-email');
                  }}
                  className={`text-[11px] font-semibold hover:underline cursor-pointer ${selectedRole === 'Admin' ? 'text-emerald-600 hover:text-emerald-800' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Google-style inline error message directly under password */}
              {errorMsg && (
                <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold mt-1.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isLoginDisabled}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${isLoginDisabled
                ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed border border-slate-200'
                : selectedRole === 'Admin'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{selectedRole === 'Admin' ? 'Login as L&D Admin' : 'Login as Associate'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Mobile OTP Button (Only visible for Associates / GT role) */}
            {selectedRole === 'GT' && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setView('mobile-login');
                    setErrorMsg('');
                    setSuccessMsg('');
                    setMobileNumber('');
                    setMobileOtpDigits(['', '', '', '', '', '']);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>I don't have credentials / Login with Mobile OTP</span>
                </button>
              </div>
            )}

          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: MOBILE OTP LOGIN — STEP 1: ENTER PHONE NUMBER    */}
        {/* ======================================================== */}
        {view === 'mobile-login' && (
          <form onSubmit={handleRequestMobileOtp} className="space-y-4 animate-fadeIn">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Phone className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Mobile OTP Login</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your registered 10-digit mobile number to verify your identity.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Registered Mobile Number (10 Digits) *
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  {mobileNumber.length}/10
                </span>
              </div>
              <div className={`flex rounded-xl border bg-white overflow-hidden shadow-xs focus-within:ring-2 transition-all ${errorMsg
                ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/20'
                : 'border-slate-300 focus-within:border-blue-600 focus-within:ring-blue-500/20'
                }`}>
                <select
                  value={mobileCountryCode}
                  onChange={(e) => setMobileCountryCode(e.target.value)}
                  className="bg-slate-100/90 px-2.5 py-2.5 text-xs font-bold text-slate-800 border-r border-slate-300 focus:outline-none cursor-pointer"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  maxLength={10}
                  // placeholder="Enter Mobile Number"
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full px-3 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Inline Google-style error under mobile input */}
              {errorMsg && (
                <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold mt-1.5 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isMobileLoginDisabled}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer ${isMobileLoginDisabled
                ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
            >
              {isLoading ? (
                <span>Checking credentials...</span>
              ) : (
                <>
                  <span>Generate OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setView('login');
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Official Email Login</span>
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: MOBILE OTP LOGIN — STEP 2: VERIFY 6-DIGIT OTP    */}
        {/* ======================================================== */}
        {view === 'mobile-otp-verify' && (
          <form onSubmit={handleVerifyMobileOtp} className="space-y-4 animate-fadeIn">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Enter 6-Digit OTP</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Verification code sent to <strong className="font-mono text-slate-800">{mobileCountryCode} {mobileNumber}</strong>
              </p>
            </div>

            {/* 6-Box OTP Inputs */}
            <div>
              <div className="flex items-center justify-center gap-2" onPaste={handleMobileOtpPaste}>
                {mobileOtpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { mobileOtpInputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      handleMobileOtpDigitChange(idx, e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    onKeyDown={(e) => handleMobileOtpKeyDown(idx, e)}
                    className={`w-10 h-12 text-center text-lg font-extrabold font-mono bg-white border rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-all text-slate-900 ${errorMsg
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/10'
                      : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                  />
                ))}
              </div>

              {/* Inline error for OTP */}
              {errorMsg && (
                <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs font-semibold mt-2 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* OTP Expiry Countdown & Resend Option */}
            <div className="flex items-center justify-between text-xs px-1 pt-1">
              <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                <Timer className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Expires in:{' '}
                  <strong className={mobileOtpTimerSeconds < 60 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {formatTimer(mobileOtpTimerSeconds)}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleResendMobileOtp}
                disabled={!canResendMobileOtp || isResending}
                className={`font-semibold transition-colors flex items-center gap-1 cursor-pointer ${canResendMobileOtp && !isResending
                  ? 'text-blue-600 hover:text-blue-800 hover:underline'
                  : 'text-slate-400 cursor-not-allowed'
                  }`}
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Resending...' : 'Resend OTP'}</span>
              </button>
            </div>

            {/* Verify & Login Button */}
            <button
              type="submit"
              disabled={isMobileVerifyDisabled}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer ${isMobileVerifyDisabled
                ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
            >
              {isLoading ? (
                <span>Verifying Code...</span>
              ) : (
                <>
                  <span>Verify OTP & Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setView('mobile-login');
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Mobile Number</span>
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FORGOT PASSWORD — STEP 1: CHOOSE EMAIL OR PHONE */}
        {/* ======================================================== */}
        {view === 'forgot-email' && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-fadeIn">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <Key className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Forgot Password</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your preferred recovery method to verify your identity against User Management.
              </p>
            </div>

            {/* Input Field: Registered Email Address ONLY */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Registered Email Address *
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-3 w-4 h-4 ${errorMsg ? 'text-rose-400' : 'text-slate-400'}`} />
                <input
                  type="email"
                  placeholder="employee.name@valuemomentum.com"
                  value={recoveryEmail}
                  onChange={(e) => {
                    setRecoveryEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-sm transition-all ${errorMsg
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/10'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Inline error */}
            {errorMsg && (
              <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold mt-1.5 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendOtpDisabled}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer ${isSendOtpDisabled
                  ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed border border-slate-200'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
            >
              {isLoading ? (
                <span>Checking Roster & Generating OTP...</span>
              ) : (
                <>
                  <span>Send 6-Digit OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setView('login');
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 5: FORGOT PASSWORD — STEP 2: VERIFY 6-DIGIT OTP     */}
        {/* ======================================================== */}
        {view === 'verify-otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
            <div className="text-center pb-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900">Enter 6-Digit OTP</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Verification code sent to registered{' '}
                <strong className="font-mono text-slate-800">
                  {recoveryType === 'email' ? recoveryEmail : `${recoveryCountryCode} ${recoveryPhone}`}
                </strong>
              </p>
            </div>

            {/* 6-Box OTP Inputs */}
            <div>
              <div className="flex items-center justify-center gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      handleOtpDigitChange(idx, e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-10 h-12 text-center text-lg font-extrabold font-mono bg-white border rounded-xl focus:outline-none focus:ring-2 shadow-sm transition-all text-slate-900 ${errorMsg
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/10'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/20'
                      }`}
                  />
                ))}
              </div>

              {/* Inline error for 6-digit OTP */}
              {errorMsg && (
                <div className="flex items-center justify-center gap-1.5 text-rose-600 text-xs font-semibold mt-2 animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* OTP Expiry Countdown & Resend Option */}
            <div className="flex items-center justify-between text-xs px-1 pt-1">
              <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                <Timer className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Expires in:{' '}
                  <strong className={otpTimerSeconds < 60 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                    {formatTimer(otpTimerSeconds)}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend || isResending}
                className={`font-semibold transition-colors flex items-center gap-1 cursor-pointer ${canResend && !isResending
                    ? 'text-blue-600 hover:text-blue-800 hover:underline'
                    : 'text-slate-400 cursor-not-allowed'
                  }`}
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Resending...' : 'Resend OTP'}</span>
              </button>
            </div>

            {/* Verify & Next Button */}
            <button
              type="submit"
              disabled={isVerifyOtpDisabled}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer ${isVerifyOtpDisabled
                  ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
            >
              {isLoading ? (
                <span>Verifying 6-Digit OTP...</span>
              ) : (
                <>
                  <span>Verify OTP & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setView('forgot-email');
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Recovery Option</span>
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 6: FORGOT PASSWORD — STEP 3: CREATE NEW PASSWORD    */}
        {/* ======================================================== */}
        {view === 'new-password' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 font-mono uppercase tracking-wider">
                  Password Requirements
                </span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${isPasswordValid
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600'
                  }`}>
                  {[hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length}/5 Satisfied
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${hasMinLength ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {hasMinLength ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
                  </div>
                  <span>At least 8 characters</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${hasUpperCase ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {hasUpperCase ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
                  </div>
                  <span>One uppercase letter</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${hasLowerCase ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {hasLowerCase ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
                  </div>
                  <span>One lowercase letter</span>
                </div>

                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${hasNumber ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {hasNumber ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
                  </div>
                  <span>One number</span>
                </div>

                <div className={`flex items-center gap-1.5 col-span-1 sm:col-span-2 ${hasSpecialChar ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${hasSpecialChar ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                    {hasSpecialChar ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
                  </div>
                  <span>One special character (@, #, $, %, &, *, !)</span>
                </div>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 shadow-sm ${isPasswordMismatch
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : isPasswordMatch
                      ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {isConfirmFilled && (
                <div className={`text-[11px] font-medium flex items-center gap-1.5 mt-1.5 ${isPasswordMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPasswordMatch ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isResetDisabled}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer ${isResetDisabled
                ? 'bg-slate-300 text-slate-500 shadow-none cursor-not-allowed border border-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
            >
              {isLoading ? (
                <span>Resetting Password...</span>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setView('login');
              }}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Back to Login</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
