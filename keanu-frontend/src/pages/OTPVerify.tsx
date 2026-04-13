import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { verifyOtp, resendOtp } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
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

export default function OTPVerify() {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [email, setEmail] = useState("");
    const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [redirectTo, setRedirectTo] = useState<string>("/");
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const navigate = useNavigate();
    const location = useLocation();
    const { setAuth } = useAuth();

    const { formatted, isExpired, resetCountdown } = useOtpCountdown(otpExpiresAt);

    // Pre-fill email + otpExpiresAt from navigation state (set by Register or Login)
    useEffect(() => {
        const state = location.state as { email?: string; otpExpiresAt?: string; redirectTo?: string } | null;
        if (state?.email) setEmail(state.email);
        if (state?.otpExpiresAt) setOtpExpiresAt(state.otpExpiresAt);
        if (state?.redirectTo) setRedirectTo(state.redirectTo);
    }, [location.state]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const otpCode = otp.join("");
        if (otpCode.length < 6) {
            setError("Please enter all 6 digits.");
            return;
        }
        if (!email) {
            setError("Email is required.");
            return;
        }
        if (isExpired) {
            setError("OTP has expired. Please request a new one.");
            return;
        }
        setIsLoading(true);
        try {
            const { accessToken, user } = await verifyOtp(email, otpCode);
            setAuth(accessToken, user);
            navigate(redirectTo, { replace: true });
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "OTP verification failed."));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setError("Please enter your email first.");
            return;
        }
        setError("");
        setSuccessMsg("");
        setIsResending(true);
        try {
            const res = await resendOtp(email);
            setSuccessMsg(res.message || "OTP sent! Please check your email.");
            // Reset countdown with the new expiry time from the server
            if (res.otpExpiresAt) {
                setOtpExpiresAt(res.otpExpiresAt);
                resetCountdown(res.otpExpiresAt);
            }
            // Clear OTP inputs so user can enter the new code
            setOtp(["", "", "", "", "", ""]);
            inputs.current[0]?.focus();
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Failed to resend OTP."));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Left Side: Image with Quote */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1A1A1A]">
                <img
                    src={otpBg}
                    alt="Sunrise Beach"
                    className="absolute inset-0 w-full h-full object-cover object-[70%_center] opacity-90"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/10" />

                {/* Logo top-left overlay */}
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
                        "At the heart of it all."
                    </p>
                    <p className="font-display text-[12px] tracking-[0.2em] uppercase opacity-70">
                        Keramas, Bali — Sunrise Coast Living
                    </p>
                </div>
            </div>

            {/* Right Side: OTP Form */}
            <div className="flex-1 bg-[#EBEAE5] flex flex-col justify-center items-center px-6 py-20 lg:py-0 relative">
                {/* Large Background 'K' */}
                <span className="absolute top-10 right-10 font-serif text-[18rem] text-[#D5D3CC] opacity-30 select-none pointer-events-none leading-none">
                    K
                </span>

                <div className="max-w-md w-full relative z-10 text-center">
                    <div className="mb-14">
                        <p className="font-display text-[12px] tracking-[0.3em] uppercase text-[#A89B8C] mb-4 font-semibold">
                            Keanu Residences
                        </p>
                        <h1 className="font-serif text-6xl md:text-7xl text-[#1A1A1A] leading-tight mb-2 tracking-wide">
                            Private <br />
                            Introduction
                        </h1>
                        <div className="w-16 h-[1px] bg-[#A89B8C] mx-auto mt-6"></div>
                    </div>

                    <form className="space-y-12" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-lato rounded-sm text-left">
                                {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-lato rounded-sm text-left">
                                {successMsg}
                            </div>
                        )}

                        {/* Email Input */}
                        <div className="text-left">
                            <label className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] block mb-3 font-semibold">
                                Registered Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                placeholder="client@example.com"
                                className="w-full bg-transparent border-b border-[#D5D3CC] py-3 text-base text-[#1A1A1A] focus:outline-none focus:border-[#A89B8C] placeholder:text-[#CCCAC4] placeholder:italic transition-colors"
                                required
                                readOnly
                            />
                        </div>

                        {/* OTP Input Boxes */}
                        <div className="text-left">
                            <div className="flex justify-between items-center mb-4">
                                <label className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] font-semibold">
                                    Access Code
                                </label>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={isResending}
                                    className="font-display text-[11px] tracking-[0.1em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors disabled:opacity-50 font-medium"
                                >
                                    {isResending ? "Sending..." : "Request OTP"}
                                </button>
                            </div>

                            <div className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))_auto_repeat(3,minmax(0,1fr))] items-center gap-2 sm:gap-3">
                                {otp.map((data, index) => (
                                    <React.Fragment key={index}>
                                        <input
                                            ref={(el) => {
                                                inputs.current[index] = el;
                                            }}
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
                                            OTP expired — request a new one above
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading || isExpired}
                            className="w-full py-5 bg-[#5A5E4E] text-white font-display text-[13px] tracking-[0.3em] uppercase hover:bg-[#4A4E3E] transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                        >
                            {isLoading ? "Verifying..." : "Enter Code"}
                        </button>
                    </form>

                    <div className="mt-24 space-y-4">
                        <p className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] font-medium">
                            By private invitation only.
                        </p>
                        <Link
                            to="/login"
                            className="font-display text-[12px] tracking-[0.2em] uppercase text-[#1A1A1A] hover:text-[#A89B8C] transition-colors block mx-auto underline italic underline-offset-4 font-semibold"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
