import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { login } from "../services/authService";
import { useAuth } from "../contexts/AuthContext";
import { toUserErrorMessage } from "../utils/errorMessage";

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState(""); // Form-level error (API)
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({}); // Input-level errors
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { setAuth } = useAuth();

    // Check for remembered email on mount
    React.useEffect(() => {
        const rememberedEmail = localStorage.getItem("rememberedEmail");
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const validate = () => {
        const errors: { email?: string; password?: string } = {};
        if (!email) {
            errors.email = "Please enter your email address";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = "Please enter a valid email address";
        }
        
        if (!password) {
            errors.password = "Please enter your password";
        } else if (password.length < 6) {
            errors.password = "Password must be at least 6 characters";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (!validate()) return;

        setIsLoading(true);

        try {
            const result = await login(email, password);

            // If account is not verified, redirect to OTP verification page
            if ('requiresOtpVerification' in result && result.requiresOtpVerification) {
                navigate("/otp-verify", {
                    state: {
                        email: result.email,
                        otpExpiresAt: result.otpExpiresAt,
                        redirectTo: "/",
                    },
                });
                return;
            }

            // Verified user — normal login flow
            const { accessToken, user } = result as import("../services/authService").AuthResponse;

            if (rememberMe) {
                localStorage.setItem("rememberedEmail", email);
            } else {
                localStorage.removeItem("rememberedEmail");
            }

            setAuth(accessToken, user);

            // Always go to home — onboarding is only shown after first OTP verification
            navigate("/");
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Login failed. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#F5F2EBE5]">
            {/* Left Side: Visual/Branding (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1A1A1A]">
                <img
                    src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&h=1600&fit=crop"
                    alt="Luxury Villa"
                    className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay scale-110 hover:scale-100 transition-transform duration-[10s] ease-out"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-transparent" />
                <div className="relative z-10 flex flex-col justify-between h-full p-16">
                    <div>
                        <Link to="/" className="inline-block">
                            <img
                                src="/images/logos/Submark/Keanu Submark Logo White.png"
                                alt="Keanu Logo"
                                className="w-14 h-auto mb-6 object-contain"
                            />
                        </Link>
                        <h2 className="font-cinzel text-5xl text-white leading-tight uppercase tracking-wide max-w-md">
                            Welcome To <br />
                            Keanu Residences
                        </h2>
                    </div>
                    <div className="max-w-sm">
                        <p className="font-cinzel text-xs tracking-[0.2em] uppercase text-white/80 mb-4">
                            Exclusivity. Privacy. Serenity.
                        </p>
                        <p className="font-lato text-white/70 text-sm font-light leading-relaxed">
                            Access your private portfolio of residences, reservation activity, and direct advisor updates
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 py-20 lg:py-0">
                <div className="max-w-md w-full mx-auto">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-12 flex justify-center">
                        <Link to="/" className="inline-block">
                            <img
                                src="/images/logos/Submark/Keanu Submark Logo White.png"
                                alt="Keanu Logo"
                                className="w-14 h-auto object-contain bg-[#1A1A1A] p-2 rounded-sm"
                            />
                        </Link>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="font-cinzel text-3xl md:text-4xl text-[#1A1A1A] mb-3 uppercase tracking-wide">
                            Sign In
                        </h1>
                        <p className="font-lato text-[#5A5A5A] text-sm font-light">
                            Enter your credentials to access your private account.
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
                        
                        {/* Email Field */}
                        <div>
                            <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block mb-2 font-medium">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A89B8C] group-focus-within:text-[#5C4A3A] transition-colors">
                                    <Mail size={16} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="username"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (fieldErrors.email) {
                                            setFieldErrors({ ...fieldErrors, email: "" });
                                        }
                                        if (error) setError("");
                                    }}
                                    placeholder="your@email.com"
                                    className={`font-lato w-full pl-12 pr-4 py-4 bg-white border ${fieldErrors.email ? 'border-red-300' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-base md:text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="mt-1 text-[10px] text-red-500 uppercase tracking-wider font-light">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block font-medium">
                                    Password
                                </label>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A89B8C] group-focus-within:text-[#5C4A3A] transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (fieldErrors.password) {
                                            setFieldErrors({ ...fieldErrors, password: "" });
                                        }
                                        if (error) setError("");
                                    }}
                                    placeholder="••••••••"
                                    className={`font-lato w-full pl-12 pr-12 py-4 bg-white border ${fieldErrors.password ? 'border-red-300' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-base md:text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A89B8C] hover:text-[#5C4A3A] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="mt-1 text-[10px] text-red-500 uppercase tracking-wider font-light">{fieldErrors.password}</p>
                            )}
                            <div className="mt-2 text-right">
                                <Link to="/forgot-password" className="font-cinzel text-[10px] tracking-[0.1em] uppercase text-[#A89B8C] hover:text-[#5C4A3A] transition-colors underline">
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-lato rounded-sm">
                                {error}
                            </div>
                        )}
                        {/* Remember Me */}
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 border-[#EBEAE5] rounded-sm accent-[#5C4A3A] focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor="remember-me" className="font-lato ml-2 text-xs text-[#5A5A5A] font-light cursor-pointer select-none">
                                Remember me
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-[#5C4A3A] text-white font-cinzel text-xs tracking-[0.2em] uppercase hover:bg-[#4A3E31] transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                            {!isLoading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-5 mb-12 lg:mb-0 pt-2 border-t border-[#EBEAE5] text-center">
                        <p className="font-lato text-[#5A5A5A] text-[13px] font-light">
                            New to Keanu?{" "}
                            <Link to="/register" className="font-cinzel text-[#A89B8C] hover:text-[#5C4A3A] transition-colors ml-1 font-semibold underline underline-offset-2">
                                Sign Up
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8 text-center lg:text-left flex flex-wrap justify-center lg:justify-start gap-6 font-cinzel">
                        <a href="#" className="text-[10px] tracking-[0.1em] uppercase text-[#A89B8C] hover:text-[#5C4A3A] transition-colors">
                            Terms
                        </a>
                        <a href="#" className="text-[10px] tracking-[0.1em] uppercase text-[#A89B8C] hover:text-[#5C4A3A] transition-colors">
                            Privacy
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
