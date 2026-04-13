import React, { useState, useEffect } from "react";
import { X, Mail, Phone, User, MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useTracking } from "../hooks/useTracking";
import { TrackingAction } from "../services/trackingService";
import { submitEnquiry } from "../services/enquiryService";
import { useAuth } from "../contexts/AuthContext";

interface EnquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyName?: string;
}

export function EnquiryModal({ isOpen, onClose, propertyName }: EnquiryModalProps) {
    const { user } = useAuth();
    const { trackAction } = useTracking();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        property: propertyName || "General Inquiry",
        inquiryType: "Private Viewing",
        message: "",
        contactViaWhatsApp: true,
    });

    // Sync property name if it changes via props
    useEffect(() => {
        if (propertyName) {
            setFormData(prev => ({ ...prev, property: propertyName }));
        }
    }, [propertyName]);

    // Pre-fill form with user data if logged in
    useEffect(() => {
        if (isOpen && user) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || `${user.firstName} ${user.lastName}`.trim(),
                email: prev.email || user.email,
                phone: prev.phone || user.phoneNumber || "",
            }));
        }
    }, [isOpen, user]);

    // Disable body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            await submitEnquiry({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                property: formData.property,
                inquiryType: formData.inquiryType,
                message: formData.message || undefined,
                contactViaWhatsApp: formData.contactViaWhatsApp,
            });

            setIsSuccess(true);
            trackAction({
                action: TrackingAction.ENQUIRE_SUBMIT,
                entity: 'Inquiry',
                metadata: {
                    property: formData.property,
                    type: formData.inquiryType,
                    whatsapp: formData.contactViaWhatsApp
                }
            });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-5">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-6xl bg-[#F5F2EBE5] flex flex-col md:flex-row shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 max-h-[calc(100vh-1.5rem)]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 text-[#1A1A1A] hover:text-[#A89B8C] transition-colors"
                >
                    <X size={24} strokeWidth={1} />
                </button>

                {/* Left Side: Visual/Context */}
                <div className="hidden md:flex md:w-2/5 relative overflow-hidden bg-[#1A1A1A]">
                    <img
                        src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=1200&fit=crop"
                        alt="Estate"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay scale-110 animate-pulse duration-[10000ms]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-80" />
                    <div className="relative z-10 flex flex-col justify-between h-full p-10 lg:p-14">
                        <div>
                            <img
                                src="/images/logos/Submark/Keanu Submark Logo White.png"
                                alt="Keanu Submark"
                                className="h-12 w-auto object-contain mb-8"
                            />
                            <h2 className="font-serif text-4xl lg:text-5xl text-white leading-tight uppercase tracking-wider mb-6">
                                Your Path To <br />
                                <span className="italic">Keanu</span>
                            </h2>
                            <p className="text-white text-base tracking-[0.2em] uppercase font-display mb-8">
                                Sunrise Coast Living
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="flex items-center gap-4 text-white">
                                <CheckCircle2 size={20} className="text-[#C4956A]" />
                                <span className="text-sm uppercase tracking-wider font-display font-medium">Private Selection</span>
                            </div>
                            <div className="flex items-center gap-4 text-white">
                                <CheckCircle2 size={20} className="text-[#C4956A]" />
                                <span className="text-sm uppercase tracking-wider font-display font-medium">Advisor Support</span>
                            </div>
                            <div className="flex items-center gap-4 text-white">
                                <CheckCircle2 size={20} className="text-[#C4956A]" />
                                <span className="text-sm uppercase tracking-wider font-display font-medium">Priority Reservation</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 px-7 py-8 md:px-10 md:py-8 lg:px-12 overflow-y-auto">
                    {isSuccess ? (
                        <div className="h-full flex flex-col items-center justify-center text-center py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="w-20 h-20 bg-white border border-[#EBEAE5] rounded-full flex items-center justify-center mb-8">
                                <CheckCircle2 size={32} className="text-[#A89B8C]" strokeWidth={1} />
                            </div>
                            <h3 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] mb-4">
                                Thank You
                            </h3>
                            <p className="text-sm text-[#5A5A5A] font-light leading-relaxed mb-10 max-w-xs">
                                Your inquiry has been received. Our concierge team will reach out to you within 24 hours.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-10 py-4 border border-[#1A1A1A] text-[#1A1A1A] font-display text-[10px] tracking-[0.2em] uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors"
                            >
                                Close Window
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h3 className="font-serif text-2xl text-[#1A1A1A] mb-1 font-semibold">
                                    Request a private introduction
                                </h3>
                                <p className="text-xs text-[#333] font-semibold uppercase tracking-[0.12em] font-display">
                                    Connect with our private advisor
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Full Name */}
                                <div className="space-y-3">
                                    <label className="font-display text-xs tracking-[0.15em] uppercase text-[#1A1A1A] font-extrabold block">Full Name</label>
                                    <div className="relative group">
                                        <User size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-[#333] group-focus-within:text-[#1A1A1A] transition-colors" />
                                        <input
                                            required
                                            readOnly={!!user}
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleChange}
                                            placeholder="Alexander Keanu"
                                            className={`w-full pl-8 pr-4 py-3 bg-transparent border-b border-[#D5D3CC] text-base text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] transition-colors placeholder:text-[#888] placeholder:text-sm font-medium ${user ? 'cursor-not-allowed text-[#555]' : ''}`}
                                        />
                                    </div>
                                </div>

                                {/* Contact Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-3">
                                        <label className="font-display text-xs tracking-[0.15em] uppercase text-[#1A1A1A] font-extrabold block">Email</label>
                                        <div className="relative group">
                                            <Mail size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-[#333] group-focus-within:text-[#1A1A1A] transition-colors" />
                                            <input
                                                required
                                                readOnly={!!user}
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="your@email.com"
                                                className={`w-full pl-8 pr-4 py-3 bg-transparent border-b border-[#D5D3CC] text-base text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:border-b-2 transition-all placeholder:text-[#888] placeholder:text-sm font-medium ${user ? 'cursor-not-allowed text-[#555]' : ''}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="font-display text-xs tracking-[0.15em] uppercase text-[#1A1A1A] font-extrabold block">Phone</label>
                                        <div className="relative group">
                                            <Phone size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-[#333] group-focus-within:text-[#1A1A1A] transition-colors" />
                                            <input
                                                required
                                                readOnly={!!user}
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder="+62"
                                                className={`w-full pl-8 pr-4 py-3 bg-transparent border-b border-[#D5D3CC] text-base text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] transition-colors placeholder:text-[#888] placeholder:text-sm font-medium ${user ? 'cursor-not-allowed text-[#555]' : ''}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Interest Selector */}
                                <div className="space-y-3 p-5 bg-[#F9F9F7] border border-[#EBEAE5] rounded-sm shadow-sm relative group">
                                    <label className="font-display text-[10px] tracking-[0.2em] uppercase text-[#333] font-extrabold block mb-1">How can we help?</label>
                                    <div className="relative">
                                        <select
                                            name="inquiryType"
                                            value={formData.inquiryType}
                                            onChange={handleChange}
                                            className="w-full bg-transparent font-serif text-xl italic text-[#1A1A1A] leading-tight font-medium appearance-none focus:outline-none cursor-pointer pr-10"
                                        >
                                            <option value="General Inquiry">General Inquiry</option>
                                            <option value="Private Viewing">Private Viewing</option>
                                            <option value="Investment Opportunity">Investment Opportunity</option>
                                            <option value="Early Access Reservation">Early Access Reservation</option>
                                        </select>
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-[#A89B8C]">
                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M1 1L6 6L11 1" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Message */}
                                <div className="space-y-3">
                                    <label className="font-display text-xs tracking-[0.15em] uppercase text-[#1A1A1A] font-extrabold block">Message</label>
                                    <div className="relative group">
                                        <MessageSquare size={18} className="absolute left-0 top-4 text-[#333] group-focus-within:text-[#1A1A1A] transition-colors" />
                                        <textarea
                                            name="message"
                                            rows={2}
                                            value={formData.message}
                                            onChange={handleChange}
                                            placeholder="Tell us what you are looking for"
                                            className="w-full pl-8 pr-4 py-3 bg-transparent border-b border-[#D5D3CC] text-base text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:border-b-2 transition-all placeholder:text-[#888] placeholder:text-sm font-medium resize-none leading-relaxed"
                                        />
                                    </div>
                                </div>

                                {/* WhatsApp Option */}
                                <div className="flex items-center gap-3 py-1">
                                    <input
                                        type="checkbox"
                                        id="contactViaWhatsApp"
                                        name="contactViaWhatsApp"
                                        checked={formData.contactViaWhatsApp}
                                        onChange={handleChange}
                                        className="w-4 h-4 accent-[#1A1A1A] cursor-pointer"
                                    />
                                    <label htmlFor="contactViaWhatsApp" className="text-[11px] uppercase tracking-widest font-display text-[#1A1A1A] cursor-pointer font-bold">
                                        Contact me via WhatsApp
                                    </label>
                                </div>

                                {/* Submit */}
                                {errorMessage && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                                        <AlertCircle size={14} className="flex-shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                <button
                                    disabled={isSubmitting}
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-3 py-5 bg-[#1A1A1A] text-white font-display text-[10px] tracking-[0.2em] uppercase hover:bg-black hover:shadow-[0_0_20px_rgba(0,0,0,0.2)] transition-all group disabled:bg-[#5A5A5A]"
                                >
                                    {isSubmitting ? (
                                        <span className="animate-pulse">Processing...</span>
                                    ) : (
                                        <>
                                            Request Private Consultation
                                            <Send size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-6">
                                        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[#5A5A5A] font-bold">
                                            <CheckCircle2 size={10} className="text-[#A89B8C]" />
                                            100% Confidential
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[#5A5A5A] font-bold">
                                            <CheckCircle2 size={10} className="text-[#A89B8C]" />
                                            Private Advisor Only
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em] text-[#5A5A5A] font-bold">
                                            <CheckCircle2 size={10} className="text-[#A89B8C]" />
                                            No Spam
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-center text-[#999] font-display font-medium tracking-[0.1em] uppercase">
                                        All inquiries confidential and are handled privately by the Keanu advisory team.
                                    </p>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
