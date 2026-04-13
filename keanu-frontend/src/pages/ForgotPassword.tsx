import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { forgotPasswordRequest, forgotPasswordVerifyOtp, resetPassword } from "../services/authService";
import { toUserErrorMessage } from "../utils/errorMessage";

const otpBg = "/images/otp/Backgroud.png";

function useOtpCountdown(otpExpiresAt: string | null) {
    const [secondsLeft, setSecondsLeft] = useState<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCountdown = useCallback((expiresAt: string) => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        const tick = () => {
            const diff = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
            setSecondsLeft(diff);
            if (diff === 0 && intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
        tick();
        intervalRef.current = setInterval(tick, 1000);
    }, []);

    useEffect(() => {
        if (otpExpiresAt) startCountdown(otpExpiresAt);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [otpExpiresAt, startCountdown]);

    const resetCountdown = useCallback((newExpiresAt: string) => {
        startCountdown(newExpiresAt);
    }, [startCountdown]);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const formatted = `${minutes}:${String(seconds).padStart(2, "0")}`;
    const isExpired = secondsLeft === 0;

    return { secondsLeft, formatted, isExpired, resetCountdown };
}

export default function ForgotPassword() {
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1 State
    const [email, setEmail] = useState("");

    // Step 2 State — 6-box OTP
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);

    // Step 3 State
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{
        email?: string;
        otp?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({}); // Input-level errors
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Common State
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const navigate = useNavigate();

    const { formatted, isExpired, resetCountdown } = useOtpCountdown(otpExpiresAt);

    // ── OTP box handlers ──────────────────────────────────────────────────────
    const handleChange = (element: HTMLInputElement, index: number) => {
        if (isNaN(Number(element.value))) return;
        const newOtp = [...otp.map((d, idx) => (idx === index ? element.value : d))];
        setOtp(newOtp);
        if (element.value !== "" && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData("text").trim().slice(0, 6);

        // Check if it's all numbers
        if (!/^\d+$/.test(pasteData)) return;

        const newOtp = [...otp];
        const chars = pasteData.split("");

        chars.forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });

        setOtp(newOtp);

        // Focus the appropriate input
        const nextIndex = Math.min(chars.length, 5);
        inputs.current[nextIndex]?.focus();
    };

    // ── Step 1: Request OTP ───────────────────────────────────────────────────
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const response = await forgotPasswordRequest(email);
            if (response.otpExpiresAt) {
                setOtpExpiresAt(response.otpExpiresAt);
            }
            setStep(2);
            setSuccessMsg("A verification code has been sent to your email.");
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Failed to send verification code. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 2: Resend OTP ────────────────────────────────────────────────────
    const handleResendOtp = async () => {
        if (!email || isResending) return;
        setError("");
        setSuccessMsg("");
        setIsResending(true);
        try {
            const response = await forgotPasswordRequest(email);
            setSuccessMsg("A new code has been sent to your email.");
            if (response.otpExpiresAt) {
                setOtpExpiresAt(response.otpExpiresAt);
                resetCountdown(response.otpExpiresAt);
            }
            setOtp(["", "", "", "", "", ""]);
            inputs.current[0]?.focus();
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Failed to resend code."));
        } finally {
            setIsResending(false);
        }
    };

    // ── Step 2: Verify OTP ────────────────────────────────────────────────────
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const otpCode = otp.join("");
        if (otpCode.length < 6) {
            setError("Please enter all 6 digits.");
            return;
        }
        if (isExpired) {
            setError("Code has expired. Please request a new one.");
            return;
        }
        setIsLoading(true);
        try {
            const { resetToken: receivedToken } = await forgotPasswordVerifyOtp(email, otpCode);
            setResetToken(receivedToken);
            setSuccessMsg("Code verified. Please enter your new password.");
            setStep(3);
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Invalid code. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    // ── Step 3: Reset Password ────────────────────────────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        const newFieldErrors: typeof fieldErrors = {};

        if (!newPassword) {
            newFieldErrors.newPassword = "New password is required";
        } else if (newPassword.length < 6) {
            newFieldErrors.newPassword = "Password must be at least 6 characters long";
        }

        if (!confirmPassword) {
            newFieldErrors.confirmPassword = "Please confirm your password";
        } else if (newPassword !== confirmPassword) {
            newFieldErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }
        setIsLoading(true);
        try {
            const otpCode = otp.join("");
            await resetPassword(email, otpCode, newPassword, confirmPassword);
            setSuccessMsg("Password reset successful. Redirecting to sign in…");
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Failed to reset password. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    // ── Left-panel quote/title per step ──────────────────────────────────────
    const leftQuote =
        step === 1
            ? "\"Regain your space.\""
            : step === 2
                ? "\"Secure your passage.\""
                : "\"A fresh beginning.\"";

    // ── Right-panel heading/subtitle per step ────────────────────────────────
    const rightHeading =
        step === 1 ? (
            <>Recover Access</>
        ) : step === 2 ? (
            <>Verify <br /> Your Code</>
        ) : (
            <>New <br /> Password</>
        );

    const rightSubtitle =
        step === 1
            ? "Enter your registered email to receive a secure verification code."
            : step === 2
                ? `A 6-digit code was sent to ${email}. Enter it below.`
                : "Choose a strong new password for your account.";

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* ── Left Side: Image with Quote ──────────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1A1A1A]">
                <img
                    src={otpBg}
                    alt="Sunrise Beach"
                    className="absolute inset-0 w-full h-full object-cover object-[70%_center] opacity-90"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10" />

                {/* Logo top-left */}
                <div className="absolute top-10 left-10">
                    <Link to="/" className="inline-block">
                        <img
                            src="/images/logos/Submark/Keanu Submark Logo White.png"
                            alt="Keanu Logo"
                            className="w-14 h-auto object-contain"
                        />
                    </Link>
                </div>

                <div className="relative z-10 flex flex-col justify-end h-full p-16 pb-24 text-white">
                    <p className="font-serif text-3xl md:text-4xl italic mb-4 max-w-sm">
                        {leftQuote}
                    </p>
                    <p className="font-display text-[12px] tracking-[0.2em] uppercase opacity-70">
                        Keramas, Bali — Sunrise Coast Living
                    </p>
                </div>
            </div>

            {/* ── Right Side: Form ─────────────────────────────────────────── */}
            <div className="flex-1 bg-[#EBEAE5] flex flex-col justify-center items-center px-6 py-20 lg:py-0 relative">
                {/* Large Background 'K' */}
                <span className="absolute top-10 right-10 font-serif text-[18rem] text-[#D5D3CC] opacity-30 select-none pointer-events-none leading-none">
                    K
                </span>

                <div className="max-w-md w-full relative z-10 text-center">
                    {/* Header */}
                    <div className="mb-14">
                        <p className="font-display text-[12px] tracking-[0.3em] uppercase text-[#5A5A5A] mb-4 font-bold">
                            Keanu Residences
                        </p>
                        <h1 className="font-serif text-6xl md:text-7xl text-[#1A1A1A] leading-tight mb-2 tracking-wide">
                            {rightHeading}
                        </h1>
                        <div className="w-16 h-[1px] bg-[#A89B8C] mx-auto mt-6" />
                        <p className="font-display text-[12px] tracking-[0.15em] uppercase text-[#5A5A5A] mt-6 max-w-[400px] mx-auto leading-relaxed font-semibold">
                            {rightSubtitle}
                        </p>
                    </div>

                    {/* Error / Success messages */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-lato rounded-sm text-left">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-lato rounded-sm text-left">
                            {successMsg}
                        </div>
                    )}

                    {/* ── STEP 1: Email ───────────────────────────────────── */}
                    {step === 1 && (
                        <form className="space-y-12" onSubmit={handleRequestOtp}>
                            <div className="text-left">
                                <label className="font-display text-[11px] tracking-[0.2em] uppercase text-[#5A5A5A] block mb-3 font-bold">
                                    Registered Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="client@example.com"
                                    className="w-full bg-transparent border-b border-[#D5D3CC] py-3 text-base text-[#1A1A1A] focus:outline-none focus:border-[#A89B8C] placeholder:text-[#CCCAC4] placeholder:italic transition-colors"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !email}
                                className="w-full py-5 bg-[#5A5E4E] text-white font-display text-[13px] tracking-[0.3em] uppercase hover:bg-[#4A4E3E] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                            >
                                {isLoading ? "Sending…" : "Send Verification Code"}
                            </button>
                        </form>
                    )}

                    {/* ── STEP 2: Verify OTP ──────────────────────────────── */}
                    {step === 2 && (
                        <form className="space-y-12" onSubmit={handleVerifyOtp}>
                            {/* 6-box OTP input */}
                            <div className="text-left">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] font-semibold">
                                        Access Code
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isResending}
                                        className="font-display text-[11px] tracking-[0.1em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors disabled:opacity-50 font-medium"
                                    >
                                        {isResending ? "Sending…" : "Resend Code"}
                                    </button>
                                </div>

                                <div className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))_auto_repeat(3,minmax(0,1fr))] items-center gap-2 sm:gap-3">
                                    {otp.map((data, index) => (
                                        <React.Fragment key={index}>
                                            <input
                                                ref={(el) => (inputs.current[index] = el)}
                                                type="text"
                                                maxLength={1}
                                                value={data}
                                                onChange={(e) => handleChange(e.target, index)}
                                                onKeyDown={(e) => handleKeyDown(e, index)}
                                                onPaste={handlePaste}
                                                className="w-full min-w-0 h-14 sm:h-16 bg-white border border-[#EBEAE5] text-center text-2xl font-medium text-[#1A1A1A] focus:outline-none focus:border-[#A89B8C] transition-all"
                                                disabled={isLoading}
                                            />
                                            {index === 2 && (
                                                <span className="text-[#A89B8C] font-light">—</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>

                                {/* Countdown Timer */}
                                {otpExpiresAt && (
                                    <div className="mt-4 text-center">
                                        {isExpired ? (
                                            <p className="font-display text-[11px] tracking-[0.15em] uppercase text-red-500 font-medium">
                                                Code expired — request a new one above
                                            </p>
                                        ) : (
                                            <p className="font-display text-[11px] tracking-[0.15em] uppercase text-[#A89B8C] font-medium">
                                                Expires in{" "}
                                                <span className="text-[#1A1A1A] font-bold tabular-nums text-sm">
                                                    {formatted}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || isExpired}
                                className="w-full py-5 bg-[#5A5E4E] text-white font-display text-[13px] tracking-[0.3em] uppercase hover:bg-[#4A4E3E] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                            >
                                {isLoading ? "Verifying…" : "Confirm Code"}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtpExpiresAt(null); setOtp(["", "", "", "", "", ""]); setError(""); setSuccessMsg(""); }}
                                className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors block mx-auto underline-offset-4 underline italic font-medium"
                            >
                                Change Email Address
                            </button>
                        </form>
                    )}

                    {/* ── STEP 3: Reset Password ───────────────────────────── */}
                    {step === 3 && (
                        <form className="space-y-12" onSubmit={handleResetPassword} noValidate>
                            {/* New Password */}
                            <div className="text-left">
                                <label className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] block mb-3 font-semibold">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: undefined });
                                            if (error) setError("");
                                        }}
                                        placeholder="••••••••"
                                        className={`w-full bg-transparent border-b ${fieldErrors.newPassword ? 'border-red-400' : 'border-[#D5D3CC]'} py-3 pr-8 text-base text-[#1A1A1A] focus:outline-none focus:border-[#A89B8C] placeholder:text-[#CCCAC4] placeholder:italic transition-colors`}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center text-[#A89B8C] hover:text-[#1A1A1A] transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                {fieldErrors.newPassword && (
                                    <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.newPassword}</p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="text-left">
                                <label className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] block mb-3 font-semibold">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                                            if (error) setError("");
                                        }}
                                        placeholder="••••••••"
                                        className={`w-full bg-transparent border-b ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-[#D5D3CC]'} py-3 pr-8 text-base text-[#1A1A1A] focus:outline-none focus:border-[#A89B8C] placeholder:text-[#CCCAC4] placeholder:italic transition-colors`}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center text-[#A89B8C] hover:text-[#1A1A1A] transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                {fieldErrors.confirmPassword && (
                                    <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.confirmPassword}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 bg-[#5A5E4E] text-white font-display text-[13px] tracking-[0.3em] uppercase hover:bg-[#4A4E3E] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                            >
                                {isLoading ? "Resetting…" : "Reset Password"}
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="mt-24 space-y-4">
                        <p className="font-display text-[11px] tracking-[0.2em] uppercase text-[#5A5A5A] font-semibold">
                            By private invitation only.
                        </p>
                        <Link
                            to="/login"
                            className="font-cinzel text-[13px] text-[#A89B8C] hover:text-[#5C4A3A] transition-colors block mx-auto font-semibold underline underline-offset-2"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
