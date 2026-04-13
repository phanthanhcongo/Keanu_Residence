import React, { useEffect, useState } from "react";
import { User as UserIcon, Mail, Phone, Globe, Shield, CreditCard, Heart, ArrowRight, Loader2, X, Lock, Eye, EyeOff, CheckCircle, Edit2 } from "lucide-react";
import { Link } from "react-router-dom";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useAuth } from "../contexts/AuthContext";
import { getProfile, User, updatePassword, updateProfile, uploadAvatar } from "../services/authService";
import { useRef } from "react";
import { toUserErrorMessage } from "../utils/errorMessage";

const FIXED_PROFILE_AVATAR = "/images/logos/Submark/Keanu Submark Logo Brown.png";

export default function Profile() {
    const { user: authUser, updateUser } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const data = await getProfile();
                setProfile(data);
            } catch (err) {
                console.error("Failed to fetch profile:", err);
                setError(toUserErrorMessage(err, "Failed to load profile"));
                // Fallback to authUser if profile fetch fails
                if (authUser) {
                    setProfile(authUser as User);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [authUser]);

    const formatName = (u: any) => {
        if (!u) return "User";
        if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`;
        if (u.firstName) return u.firstName;
        if (u.lastName) return u.lastName;
        return u.email || "User";
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploadingAvatar(true);
            setError(null);
            const updatedUser = await uploadAvatar(file);
            setProfile(updatedUser);
            updateUser(updatedUser);
        } catch (err) {
            console.error("Failed to upload avatar:", err);
            setError(toUserErrorMessage(err, "Failed to upload avatar"));
        } finally {
            setIsUploadingAvatar(false);
            // Clear the input so the same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const getAvatarSrc = () => {
        if (profile?.avatarUrl) return profile.avatarUrl;
        if (authUser?.avatarUrl) return authUser.avatarUrl;
        return FIXED_PROFILE_AVATAR;
    };


    const userToDisplay = {
        name: formatName(profile || authUser),
        email: profile?.email || authUser?.email || "N/A",
        phone: profile?.phoneNumber || authUser?.phoneNumber || "N/A",
        nationality: profile?.country || "N/A",
        avatar: getAvatarSrc(),
        joinDate: profile?.createdAt
            ? `Member since ${new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
            : "Member",
    };

    if (isLoading && !profile) {
        return (
            <div className="min-h-screen bg-[#F5F2EBE5] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#A89B8C] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F2EBE5] selection:bg-[#A89B8C] selection:text-white">

            <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-20">
                {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 lg:gap-20">

                    {/* Sidebar / Profile Summary */}
                    <aside className="flex flex-col items-center lg:items-start text-center lg:text-left">
                        <div className="relative mb-8 group">
                            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-xl relative ${isUploadingAvatar ? "opacity-50" : ""}`}>
                                <img
                                    src={userToDisplay.avatar}
                                    alt={userToDisplay.name}
                                    className="w-full h-full object-cover"
                                />
                                {isUploadingAvatar && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleAvatarClick}
                                disabled={isUploadingAvatar}
                                className="absolute bottom-2 right-2 w-10 h-10 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-[#333] transition-colors shadow-lg disabled:opacity-50"
                            >
                                <ArrowRight size={16} className="-rotate-45" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] mb-2">
                            {userToDisplay.name}
                        </h1>
                        <p className="font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] mb-8 font-medium">
                            {userToDisplay.joinDate}
                        </p>

                        <nav className="w-full space-y-1">
                            {[
                                { label: "Personal Info", icon: UserIcon, active: true },
                                { label: "Payment History", icon: CreditCard, to: "/payment-history" },
                                { label: "My Shortlist", icon: Heart, to: "/shortlist" }
                            ].map((item) => (
                                <Link
                                    key={item.label}
                                    to={item.to || "#"}
                                    className={`flex items-center gap-4 px-5 py-4 w-full font-display text-[11px] tracking-[0.1em] uppercase transition-all ${item.active
                                        ? "bg-white border border-[#EBEAE5] text-[#1A1A1A] shadow-sm"
                                        : "text-[#5A5A5A] hover:text-[#1A1A1A] hover:bg-white/50"
                                        }`}
                                >
                                    <item.icon size={16} className={item.active ? "text-[#A89B8C]" : ""} />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <div className="space-y-12">
                        {/* Personal Details Section */}
                        <section className="bg-white border border-[#EBEAE5] p-8 md:p-12 shadow-sm">
                            <div className="flex items-center justify-between mb-10 border-b border-[#F5F2EBE5] pb-6">
                                <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] italic">
                                    Personal Details
                                </h2>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="flex items-center gap-2 font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors underline underline-offset-4 font-medium"
                                >
                                    <Edit2 size={12} />
                                    Edit Profile
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                <InfoField label="Full Name" value={userToDisplay.name} icon={UserIcon} />
                                <InfoField label="Email Address" value={userToDisplay.email} icon={Mail} />
                                <InfoField label="Phone Number" value={userToDisplay.phone} icon={Phone} />
                                <InfoField label="Nationality" value={userToDisplay.nationality} icon={Globe} />
                            </div>
                        </section>

                        {/* Account Settings Section */}
                        <section className="bg-white border border-[#EBEAE5] p-8 md:p-12 shadow-sm">
                            <div className="flex items-center justify-between mb-8 border-b border-[#F5F2EBE5] pb-6">
                                <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] italic">
                                    Account Security
                                </h2>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-[#FAFAF8] border border-[#EBEAE5]">
                                    <div>
                                        <h3 className="font-display text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider mb-1">
                                            Password
                                        </h3>
                                        <p className="text-xs text-[#5A5A5A] font-light">
                                            Manage your account password
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className="px-6 py-2.5 border border-[#1A1A1A] text-[#1A1A1A] font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors"
                                    >
                                        Update Password
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            <UpdatePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                onSaved={(updated) => {
                    setProfile(updated);
                    updateUser(updated);
                }}
            />
        </div>
    );
}

function UpdatePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null); // Form-level error
    const [fieldErrors, setFieldErrors] = useState<{
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({}); // Field-level errors
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const newFieldErrors: typeof fieldErrors = {};

        if (!currentPassword) {
            newFieldErrors.currentPassword = "Current password is required";
        }

        if (!newPassword) {
            newFieldErrors.newPassword = "New password is required";
        } else if (newPassword.length < 6) {
            newFieldErrors.newPassword = "Password must be at least 6 characters long";
        }

        if (!confirmPassword) {
            newFieldErrors.confirmPassword = "Please confirm your new password";
        } else if (newPassword !== confirmPassword) {
            newFieldErrors.confirmPassword = "Passwords do not match";
        }

        if (Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            return;
        }

        try {
            setIsSubmitting(true);
            await updatePassword({
                currentPassword,
                newPassword,
                confirmPassword
            });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }, 2000);
        } catch (err) {
            setError(toUserErrorMessage(err, "Failed to update password"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md shadow-2xl border border-[#EBEAE5] animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-[#F5F2EBE5]">
                    <h2 className="font-serif text-2xl text-[#1A1A1A] italic">Update Password</h2>
                    <button onClick={onClose} className="text-[#A89B8C] hover:text-[#1A1A1A] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] uppercase tracking-wider font-medium">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle size={32} />
                            </div>
                            <p className="font-display text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest">
                                Password Updated Successfully
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <PasswordField
                                    label="Current Password"
                                    value={currentPassword}
                                    onChange={(val) => {
                                        setCurrentPassword(val);
                                        if (fieldErrors.currentPassword) setFieldErrors({ ...fieldErrors, currentPassword: undefined });
                                        if (error) setError(null);
                                    }}
                                    show={showCurrent}
                                    onToggleShow={() => setShowCurrent(!showCurrent)}
                                    error={fieldErrors.currentPassword}
                                />
                                <PasswordField
                                    label="New Password"
                                    value={newPassword}
                                    onChange={(val) => {
                                        setNewPassword(val);
                                        if (fieldErrors.newPassword) setFieldErrors({ ...fieldErrors, newPassword: undefined });
                                        if (error) setError(null);
                                    }}
                                    show={showNew}
                                    onToggleShow={() => setShowNew(!showNew)}
                                    error={fieldErrors.newPassword}
                                />
                                <PasswordField
                                    label="Confirm New Password"
                                    value={confirmPassword}
                                    onChange={(val) => {
                                        setConfirmPassword(val);
                                        if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                                        if (error) setError(null);
                                    }}
                                    show={showConfirm}
                                    onToggleShow={() => setShowConfirm(!showConfirm)}
                                    error={fieldErrors.confirmPassword}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 border border-[#EBEAE5] text-[#5A5A5A] font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#F9F9F7] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-[#1A1A1A] text-white font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}

function PasswordField({ label, value, onChange, show, onToggleShow, error }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    show: boolean;
    onToggleShow: () => void;
    error?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] font-medium ml-1">
                {label}
            </label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89B8C]">
                    <Lock size={14} />
                </div>
                <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full pl-11 pr-12 py-3 bg-[#F9F9F7] border ${error ? 'border-red-400' : 'border-[#EBEAE5]'} text-xs transition-all focus:bg-white focus:border-[#A89B8C] outline-none`}
                    placeholder={`Enter ${label.toLowerCase()}`}
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A89B8C] hover:text-[#1A1A1A] transition-colors"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && (
                <p className="mt-1 text-[10px] text-red-500 font-lato italic ml-1">{error}</p>
            )}
        </div>
    );
}

function InfoField({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#A89B8C] mb-1">
                <Icon size={14} />
                <span className="font-display text-[10px] tracking-[0.15em] uppercase font-medium">
                    {label}
                </span>
            </div>
            <p className="font-display text-[15px] text-[#1A1A1A] border-b border-[#F5F2EBE5] pb-2">
                {value}
            </p>
        </div>
    );
}

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: User | null;
    onSaved: (updated: User) => void;
}

function EditProfileModal({ isOpen, onClose, profile, onSaved }: EditProfileModalProps) {
    const formatProfilePhone = (value?: string | null) => {
        if (!value) return "";
        return value.startsWith("+") ? value : "";
    };

    const [form, setForm] = useState({
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        email: profile?.email || "",
        phoneNumber: formatProfilePhone(profile?.phoneNumber),
        country: profile?.country || "",
        city: profile?.city || "",
        address: profile?.address || "",
        dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
        gender: profile?.gender || "",
    });
    const [error, setError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync form with profile when modal opens
    React.useEffect(() => {
        if (isOpen && profile) {
            setForm({
                firstName: profile.firstName || "",
                lastName: profile.lastName || "",
                email: profile.email || "",
                phoneNumber: formatProfilePhone(profile.phoneNumber),
                country: profile.country || "",
                city: profile.city || "",
                address: profile.address || "",
                dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.split("T")[0] : "",
                gender: profile.gender || "",
            });
            setError(null);
            setPhoneError(null);
            setSuccess(false);
        }
    }, [isOpen, profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setPhoneError(null);

        if (form.phoneNumber && !isValidPhoneNumber(form.phoneNumber)) {
            setPhoneError("Invalid phone number for selected country");
            return;
        }

        try {
            setIsSubmitting(true);
            const updated = await updateProfile(form);
            setSuccess(true);
            onSaved(updated);
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 1500);
        } catch (err) {
            setError(toUserErrorMessage(err, "Failed to update profile"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-3 bg-[#F9F9F7] border border-[#EBEAE5] text-xs text-[#1A1A1A] transition-all focus:bg-white focus:border-[#A89B8C] outline-none placeholder-[#C4B8AE]";
    const labelClass = "block font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] font-medium mb-1.5";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl shadow-2xl border border-[#EBEAE5] animate-in slide-in-from-bottom-4 duration-300 my-4">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-[#F5F2EBE5]">
                    <h2 className="font-serif text-2xl text-[#1A1A1A] italic">Edit Profile</h2>
                    <button onClick={onClose} className="text-[#A89B8C] hover:text-[#1A1A1A] transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[11px] uppercase tracking-wider font-medium">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle size={32} />
                            </div>
                            <p className="font-display text-xs font-semibold text-[#1A1A1A] uppercase tracking-widest">
                                Profile Updated Successfully
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Name Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>First Name</label>
                                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First name" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Last Name</label>
                                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last name" className={inputClass} />
                                </div>
                            </div>

                            {/* Email + Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Email Address</label>
                                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email address" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone Number</label>
                                    <PhoneInput
                                        international
                                        defaultCountry="ID"
                                        countryCallingCodeEditable={false}
                                        value={form.phoneNumber || undefined}
                                        onChange={(value) => {
                                            setForm(prev => ({ ...prev, phoneNumber: value || "" }));
                                            if (phoneError) setPhoneError(null);
                                            if (error) setError(null);
                                        }}
                                        className={`font-lato flex items-center gap-2 w-full bg-[#F9F9F7] border ${phoneError ? 'border-red-400' : 'border-[#EBEAE5]'} px-3 py-3 text-sm focus-within:bg-white focus-within:border-[#A89B8C] transition-all`}
                                        numberInputProps={{
                                            id: "phoneNumber",
                                            name: "phoneNumber",
                                            className: "font-lato w-full bg-transparent text-[#1A1A1A] text-sm focus:outline-none placeholder:text-[#C4B8AE]",
                                            placeholder: "Enter phone number",
                                            disabled: isSubmitting,
                                        }}
                                        countrySelectProps={{
                                            disabled: isSubmitting,
                                            className: "bg-transparent text-[#1A1A1A] text-sm focus:outline-none",
                                        }}
                                    />
                                    {phoneError && (
                                        <p className="mt-1 text-[10px] text-red-500 font-lato italic">{phoneError}</p>
                                    )}
                                </div>
                            </div>

                            {/* DOB + Gender */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Date of Birth</label>
                                    <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Gender</label>
                                    <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
                                        <option value="">Select gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            {/* Country + City */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Country / Nationality</label>
                                    <select name="country" value={form.country} onChange={handleChange} className={inputClass}>
                                        <option value="">Select country</option>
                                        <option value="Afghanistan">Afghanistan</option>
                                        <option value="Albania">Albania</option>
                                        <option value="Algeria">Algeria</option>
                                        <option value="Andorra">Andorra</option>
                                        <option value="Angola">Angola</option>
                                        <option value="Argentina">Argentina</option>
                                        <option value="Armenia">Armenia</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Austria">Austria</option>
                                        <option value="Azerbaijan">Azerbaijan</option>
                                        <option value="Bahamas">Bahamas</option>
                                        <option value="Bahrain">Bahrain</option>
                                        <option value="Bangladesh">Bangladesh</option>
                                        <option value="Belarus">Belarus</option>
                                        <option value="Belgium">Belgium</option>
                                        <option value="Belize">Belize</option>
                                        <option value="Benin">Benin</option>
                                        <option value="Bolivia">Bolivia</option>
                                        <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                                        <option value="Brazil">Brazil</option>
                                        <option value="Brunei">Brunei</option>
                                        <option value="Bulgaria">Bulgaria</option>
                                        <option value="Cambodia">Cambodia</option>
                                        <option value="Cameroon">Cameroon</option>
                                        <option value="Canada">Canada</option>
                                        <option value="Chile">Chile</option>
                                        <option value="China">China</option>
                                        <option value="Colombia">Colombia</option>
                                        <option value="Croatia">Croatia</option>
                                        <option value="Cuba">Cuba</option>
                                        <option value="Cyprus">Cyprus</option>
                                        <option value="Czech Republic">Czech Republic</option>
                                        <option value="Denmark">Denmark</option>
                                        <option value="Dominican Republic">Dominican Republic</option>
                                        <option value="Ecuador">Ecuador</option>
                                        <option value="Egypt">Egypt</option>
                                        <option value="El Salvador">El Salvador</option>
                                        <option value="Estonia">Estonia</option>
                                        <option value="Ethiopia">Ethiopia</option>
                                        <option value="Finland">Finland</option>
                                        <option value="France">France</option>
                                        <option value="Georgia">Georgia</option>
                                        <option value="Germany">Germany</option>
                                        <option value="Ghana">Ghana</option>
                                        <option value="Greece">Greece</option>
                                        <option value="Guatemala">Guatemala</option>
                                        <option value="Honduras">Honduras</option>
                                        <option value="Hong Kong">Hong Kong</option>
                                        <option value="Hungary">Hungary</option>
                                        <option value="Iceland">Iceland</option>
                                        <option value="India">India</option>
                                        <option value="Indonesia">Indonesia</option>
                                        <option value="Iran">Iran</option>
                                        <option value="Iraq">Iraq</option>
                                        <option value="Ireland">Ireland</option>
                                        <option value="Israel">Israel</option>
                                        <option value="Italy">Italy</option>
                                        <option value="Jamaica">Jamaica</option>
                                        <option value="Japan">Japan</option>
                                        <option value="Jordan">Jordan</option>
                                        <option value="Kazakhstan">Kazakhstan</option>
                                        <option value="Kenya">Kenya</option>
                                        <option value="Kuwait">Kuwait</option>
                                        <option value="Laos">Laos</option>
                                        <option value="Latvia">Latvia</option>
                                        <option value="Lebanon">Lebanon</option>
                                        <option value="Libya">Libya</option>
                                        <option value="Lithuania">Lithuania</option>
                                        <option value="Luxembourg">Luxembourg</option>
                                        <option value="Macau">Macau</option>
                                        <option value="Malaysia">Malaysia</option>
                                        <option value="Maldives">Maldives</option>
                                        <option value="Malta">Malta</option>
                                        <option value="Mexico">Mexico</option>
                                        <option value="Moldova">Moldova</option>
                                        <option value="Monaco">Monaco</option>
                                        <option value="Mongolia">Mongolia</option>
                                        <option value="Montenegro">Montenegro</option>
                                        <option value="Morocco">Morocco</option>
                                        <option value="Myanmar">Myanmar</option>
                                        <option value="Nepal">Nepal</option>
                                        <option value="Netherlands">Netherlands</option>
                                        <option value="New Zealand">New Zealand</option>
                                        <option value="Nicaragua">Nicaragua</option>
                                        <option value="Nigeria">Nigeria</option>
                                        <option value="North Korea">North Korea</option>
                                        <option value="Norway">Norway</option>
                                        <option value="Oman">Oman</option>
                                        <option value="Pakistan">Pakistan</option>
                                        <option value="Panama">Panama</option>
                                        <option value="Paraguay">Paraguay</option>
                                        <option value="Peru">Peru</option>
                                        <option value="Philippines">Philippines</option>
                                        <option value="Poland">Poland</option>
                                        <option value="Portugal">Portugal</option>
                                        <option value="Qatar">Qatar</option>
                                        <option value="Romania">Romania</option>
                                        <option value="Russia">Russia</option>
                                        <option value="Saudi Arabia">Saudi Arabia</option>
                                        <option value="Serbia">Serbia</option>
                                        <option value="Singapore">Singapore</option>
                                        <option value="Slovakia">Slovakia</option>
                                        <option value="Slovenia">Slovenia</option>
                                        <option value="South Africa">South Africa</option>
                                        <option value="South Korea">South Korea</option>
                                        <option value="Spain">Spain</option>
                                        <option value="Sri Lanka">Sri Lanka</option>
                                        <option value="Sweden">Sweden</option>
                                        <option value="Switzerland">Switzerland</option>
                                        <option value="Syria">Syria</option>
                                        <option value="Taiwan">Taiwan</option>
                                        <option value="Thailand">Thailand</option>
                                        <option value="Tunisia">Tunisia</option>
                                        <option value="Turkey">Turkey</option>
                                        <option value="Ukraine">Ukraine</option>
                                        <option value="United Arab Emirates">United Arab Emirates</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                        <option value="United States">United States</option>
                                        <option value="Uruguay">Uruguay</option>
                                        <option value="Uzbekistan">Uzbekistan</option>
                                        <option value="Venezuela">Venezuela</option>
                                        <option value="Vietnam">Vietnam</option>
                                        <option value="Yemen">Yemen</option>
                                        <option value="Zimbabwe">Zimbabwe</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>City</label>
                                    <input name="city" value={form.city} onChange={handleChange} placeholder="City" className={inputClass} />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className={labelClass}>Address</label>
                                <input name="address" value={form.address} onChange={handleChange} placeholder="Street address" className={inputClass} />
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3 border border-[#EBEAE5] text-[#5A5A5A] font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#F9F9F7] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3 bg-[#1A1A1A] text-white font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
