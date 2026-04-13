import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { register } from "../services/authService";
import { toUserErrorMessage } from "../utils/errorMessage";

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState(""); // Form-level error (API)
    const [fieldErrors, setFieldErrors] = useState<{
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
        password?: string;
        confirmPassword?: string;
    }>({}); // Input-level errors
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Clear errors when typing
        if (fieldErrors[name as keyof typeof fieldErrors]) {
            setFieldErrors({ ...fieldErrors, [name]: undefined });
        }
        if (error) setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const newFieldErrors: typeof fieldErrors = {};

        // Client-side Validations
        if (!formData.firstName.trim()) newFieldErrors.firstName = "First name is required";
        if (!formData.lastName.trim()) newFieldErrors.lastName = "Last name is required";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newFieldErrors.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            newFieldErrors.email = "Please enter a valid email address";
        }

        if (!formData.phoneNumber) {
            newFieldErrors.phoneNumber = "Phone number is required";
        } else if (!isValidPhoneNumber(formData.phoneNumber)) {
            newFieldErrors.phoneNumber = "Invalid phone number for selected country";
        }

        if (!formData.password) {
            newFieldErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newFieldErrors.password = "Password must be at least 6 characters";
        }

        if (!formData.confirmPassword) {
            newFieldErrors.confirmPassword = "Please confirm your password";
        } else if (formData.password !== formData.confirmPassword) {
            newFieldErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            // Scroll to the first error
            const firstErrorField = Object.keys(newFieldErrors)[0];
            const element = document.getElementsByName(firstErrorField)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
            return;
        }

        setIsLoading(true);
        try {
            const res = await register(formData);
            if (res.requiresOtpVerification) {
                navigate("/otp-verify", {
                    state: {
                        email: res.email,
                        otpExpiresAt: res.otpExpiresAt,
                        redirectTo: "/onboarding",
                    },
                });
            }
        } catch (err: unknown) {
            setError(toUserErrorMessage(err, "Registration failed. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#F5F2EBE5]">
            {/* Left Side: Visual/Branding (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#5C4A3A]">
                <img
                    src="/images/villa-2.jpg"
                    alt="Luxury Estate"
                    className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105 hover:scale-100 transition-transform duration-[15s] ease-out"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&h=1600&fit=crop";
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/40 to-transparent" />
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
                            Your private access to Keanu
                        </h2>
                    </div>
                    <div className="max-w-sm">
                        <p className="font-cinzel text-xs tracking-[0.2em] uppercase text-white/80 mb-4">
                            Invest in Timelessness.
                        </p>
                        <p className="font-lato text-white/70 text-sm font-light leading-relaxed">
                            Create your private account to save residences, request private viewings, and receive selection updates
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Register Form */}
            <div className="flex-1 flex flex-col justify-center lg:justify-start px-6 md:px-12 lg:px-24 py-16 lg:py-0 lg:pt-16 lg:pb-16 overflow-y-auto">
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
                            Sign Up
                        </h1>
                        <p className="font-lato text-[#5A5A5A] text-sm font-light">
                            Join our exclusive community of homeowners and investors.
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                        

                        {/* First Name + Last Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block mb-2 font-medium">
                                    First Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A89B8C] group-focus-within:text-[#5C4A3A] transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="Alexander"
                                        className={`font-lato w-full pl-12 pr-4 py-4 bg-white border ${fieldErrors.firstName ? 'border-red-400' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
                                        disabled={isLoading}
                                    />
                                </div>
                                {fieldErrors.firstName && (
                                    <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.firstName}</p>
                                )}
                            </div>
                            <div>
                                <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block mb-2 font-medium">
                                    Last Name
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A89B8C] group-focus-within:text-[#5C4A3A] transition-colors">
                                        <User size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Keanu"
                                        className={`font-lato w-full pl-12 pr-4 py-4 bg-white border ${fieldErrors.lastName ? 'border-red-400' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
                                        disabled={isLoading}
                                    />
                                </div>
                                {fieldErrors.lastName && (
                                    <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.lastName}</p>
                                )}
                            </div>
                        </div>

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
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="your@email.com"
                                    className={`font-lato w-full pl-12 pr-4 py-4 bg-white border ${fieldErrors.email ? 'border-red-400' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
                                    disabled={isLoading}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Phone Number Field */}
                        <div>
                            <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block mb-2 font-medium">
                                Phone Number
                            </label>
                            <PhoneInput
                                international
                                defaultCountry="ID"
                                countryCallingCodeEditable={false}
                                value={formData.phoneNumber || undefined}
                                onChange={(value) => {
                                    setFormData({ ...formData, phoneNumber: value || "" });
                                    if (fieldErrors.phoneNumber) {
                                        setFieldErrors({ ...fieldErrors, phoneNumber: undefined });
                                    }
                                    if (error) setError("");
                                }}
                                className={`font-lato flex items-center gap-2 w-full bg-white border ${fieldErrors.phoneNumber ? 'border-red-400' : 'border-[#EBEAE5]'} px-3 py-3 text-sm focus-within:border-[#5C4A3A] transition-all`}
                                numberInputProps={{
                                    id: "phoneNumber",
                                    name: "phoneNumber",
                                    className: "font-lato w-full bg-transparent text-[#1A1A1A] text-sm focus:outline-none placeholder:text-[#CCCAC4]",
                                    placeholder: "Enter phone number",
                                    disabled: isLoading,
                                }}
                                countrySelectProps={{
                                    disabled: isLoading,
                                    className: "bg-transparent text-[#1A1A1A] text-sm focus:outline-none",
                                }}
                            />
                            {fieldErrors.phoneNumber && (
                                <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.phoneNumber}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block mb-2 font-medium">
                                Create Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A89B8C] group-focus-within:text-[#5C4A3A] transition-colors">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Min 6 characters"
                                    className={`font-lato w-full pl-12 pr-12 py-4 bg-white border ${fieldErrors.password ? 'border-red-400' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
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
                                <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="font-cinzel text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] block mb-2 font-medium">
                                Confirm Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A89B8C] group-focus-within:text-[#5C4A3A] transition-colors">
                                    <ShieldCheck size={16} />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className={`font-lato w-full pl-12 pr-12 py-4 bg-white border ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-[#EBEAE5]'} text-[#1A1A1A] text-sm focus:outline-none focus:border-[#5C4A3A] transition-all placeholder:text-[#CCCAC4]`}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#A89B8C] hover:text-[#5C4A3A] transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="mt-1 text-[10px] text-red-500 font-lato italic">{fieldErrors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Form-level Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-lato rounded-sm">
                                {error}
                            </div>
                        )}

                        {/* Terms checkbox */}
                        <div className="flex items-start">
                            <input
                                id="terms"
                                type="checkbox"
                                className="mt-1 w-4 h-4 border-[#EBEAE5] rounded-sm accent-[#5C4A3A] focus:ring-0"
                                required
                            />
                            <label htmlFor="terms" className="font-lato ml-2 text-[11px] text-[#5A5A5A] font-light leading-relaxed">
                                I agree to the Terms of Service and Privacy Policy, and consent to receiving updates about Keanu Residences.
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-[#5C4A3A] text-white font-cinzel text-xs tracking-[0.2em] uppercase hover:bg-[#4A3E31] transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Creating Account..." : "Create Account"}
                            {!isLoading && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>

                    <div className="mt-5 mb-12 lg:mb-0 pt-2 border-t border-[#EBEAE5] text-center">
                        <p className="font-lato text-[#5A5A5A] text-[13px] font-light">
                            Already have an account?{" "}
                            <Link to="/login" className="font-cinzel text-[#A89B8C] hover:text-[#5C4A3A] transition-colors ml-1 font-semibold underline underline-offset-2">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
