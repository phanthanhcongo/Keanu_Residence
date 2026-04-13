import React, { useState, useEffect } from "react";
import { Mail, Phone, MessageSquare, MapPin, Send, CheckCircle2, Clock, Globe } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { submitEnquiry } from "../services/enquiryService";

export default function Contact() {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        subject: "General Inquiry",
        message: "",
        phone: "" // Added phone field as it's required by the API
    });

    // Autofill user data if logged in
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || `${user.firstName} ${user.lastName} `.trim(),
                email: prev.email || user.email,
                phone: prev.phone || user.phoneNumber || ""
            }));
        }
    }, [user]);

    const contactMethods = [
        {
            title: "Direct Line",
            value: "+62 811 9001 0008",
            icon: Phone,
            desc: "Available daily for private consultation."
        },
        {
            title: "General Inquiry",
            value: "welcome@keanubali.com",
            icon: Mail,
            desc: "For general questions & property details."
        },
        {
            title: "Official Website",
            value: "keanubali.com",
            icon: Globe,
            desc: "Explore our digital residence gallery."
        }
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await submitEnquiry({
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                inquiryType: formData.subject,
                message: formData.message
            });
            setIsSuccess(true);
        } catch (err: any) {
            console.error("Failed to submit enquiry:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F2EBE5] selection:bg-[#A89B8C] selection:text-white">

            <main>
                {/* Hero Section */}
                <section className="px-6 md:px-12 lg:px-16 pt-20 pb-16 md:pt-32 md:pb-24 text-center border-b border-[#EBEAE5]">
                    <span className="font-display text-[11px] tracking-[0.3em] uppercase text-[#A89B8C] block mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        Connect With Us
                    </span>
                    <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-[#1A1A1A] leading-tight uppercase tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        Contact <span className="italic">Keanu</span>
                    </h1>
                </section>

                <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 md:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-16 lg:gap-24">

                        {/* Left Side: Contact Info & Methods */}
                        <div className="space-y-16">
                            <div className="max-w-xl">
                                <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] mb-6 italic">
Our advisory team is here to assist with private introductions, residence selection, ownership questions, and site visits.
                                </h2>
                                <p className="text-[#333333] text-sm md:text-base font-normal leading-relaxed">
Whether you are inquiring about a specific residence, arranging a private viewing, or seeking guidance on ownership structure, our team provides a discreet and personalised response
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {contactMethods.map((method) => (
                                    <div key={method.title} className="p-8 bg-white border border-[#EBEAE5] shadow-sm hover:border-[#A89B8C] transition-colors group">
                                        <div className="w-10 h-10 rounded-full bg-[#F9F9F7] flex items-center justify-center text-[#A89B8C] mb-6 group-hover:bg-[#1A1A1A] group-hover:text-white transition-all">
                                            <method.icon size={18} strokeWidth={1.5} />
                                        </div>
                                        <h3 className="font-display text-[10px] tracking-[0.2em] uppercase text-[#8C7E6A] mb-2 font-bold">
                                            {method.title}
                                        </h3>
                                        <p className="font-display text-sm text-[#1A1A1A] mb-3 break-words font-medium">
                                            {method.value}
                                        </p>
                                        <p className="text-xs text-[#333333] font-normal leading-relaxed">
                                            {method.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Office Location */}
                            <div className="pt-8 border-t border-[#EBEAE5]">
                                <div className="flex flex-col md:flex-row gap-12 items-start">
                                    <div className="flex-1">
                                        <h3 className="font-display text-[10px] tracking-[0.2em] uppercase text-[#8C7E6A] mb-6 font-bold">
                                            Private Office
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex gap-4">
                                                <MapPin size={18} className="text-[#8C7E6A] shrink-0" />
                                                <p className="text-sm text-[#1A1A1A] font-normal leading-relaxed">
                                                    Jl. Pantai Keramas No. 88<br />
                                                    Gianyar, Bali 80581<br />
                                                    Indonesia
                                                </p>
                                            </div>
                                            <div className="flex gap-4">
                                                <Clock size={18} className="text-[#8C7E6A] shrink-0" />
                                                <p className="text-sm text-[#1A1A1A] font-normal">
                                                    Monday — Friday: 9am - 6pm<br />
                                                    Saturday: 10am - 4pm
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full md:w-64 aspect-square bg-[#EBEAE5] overflow-hidden transition-all duration-700">
                                        <img
                                            src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=400&h=400&fit=crop"
                                            alt="Location"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Contact Form */}
                        <aside className="lg:sticky lg:top-8 lg:self-start">
                            <div className="bg-white border border-[#EBEAE5] p-8 md:p-12 shadow-lg">
                                {isSuccess ? (
                                    <div className="py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="w-16 h-16 bg-[#F9F9F7] rounded-full flex items-center justify-center mx-auto mb-8">
                                            <CheckCircle2 size={32} className="text-[#A89B8C]" strokeWidth={1} />
                                        </div>
                                        <h3 className="font-serif text-3xl text-[#1A1A1A] mb-4 italic">Message Sent</h3>
                                        <p className="text-sm text-[#333333] font-normal leading-relaxed mb-8">
                                            Thank you for reaching out. An advisor will contact you shortly to discuss your requirements.
                                        </p>
                                        <button
                                            onClick={() => setIsSuccess(false)}
                                            className="text-[10px] tracking-[0.2em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] underline underline-offset-4"
                                        >
                                            Send another message
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="font-serif text-3xl text-[#1A1A1A] mb-8 italic">Private inquiry</h3>
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="space-y-1.5">
                                                <label className="font-display text-[9px] tracking-[0.2em] uppercase text-[#8C7E6A] font-bold">Full Name</label>
                                                <input
                                                    required
                                                    readOnly={!!user}
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    className={`w-full bg-[#F9F9F7] border border-[#EBEAE5] px-4 py-3 text-sm focus:outline-none focus:border-[#8C7E6A] transition-all font-normal placeholder:text-[#888888] ${user ? 'cursor-not-allowed opacity-75' : ''} `}
                                                    placeholder="Alexander Keanu"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-display text-[9px] tracking-[0.2em] uppercase text-[#8C7E6A] font-bold">Email Address</label>
                                                <input
                                                    required
                                                    readOnly={!!user}
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className={`w-full bg-[#F9F9F7] border border-[#EBEAE5] px-4 py-3 text-sm focus:outline-none focus:border-[#8C7E6A] transition-all font-normal placeholder:text-[#888888] ${user ? 'cursor-not-allowed opacity-75' : ''} `}
                                                    placeholder="alex@example.com"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-display text-[9px] tracking-[0.2em] uppercase text-[#8C7E6A] font-bold">Phone Number</label>
                                                <input
                                                    required
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className={`w-full bg-[#F9F9F7] border border-[#EBEAE5] px-4 py-3 text-sm focus:outline-none focus:border-[#8C7E6A] transition-all font-normal placeholder:text-[#888888]`}
                                                    placeholder="+62 812..."
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-display text-[9px] tracking-[0.2em] uppercase text-[#8C7E6A] font-bold">Subject</label>
                                                <select
                                                    name="subject"
                                                    value={formData.subject}
                                                    onChange={handleChange}
                                                    className="w-full bg-[#F9F9F7] border border-[#EBEAE5] px-4 py-3 text-sm focus:outline-none focus:border-[#8C7E6A] transition-all font-normal appearance-none text-[#333333]"
                                                >
                                                    <option value="General Inquiry">General Inquiry</option>
                                                    <option value="Sales & Acquisition">Sales & Acquisition</option>
                                                    <option value="Partnership">Partnership</option>
                                                    <option value="Site Visit Request">Site Visit Request</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="font-display text-[9px] tracking-[0.2em] uppercase text-[#8C7E6A] font-bold">Message</label>
                                                <textarea
                                                    required
                                                    name="message"
                                                    value={formData.message}
                                                    onChange={handleChange}
                                                    rows={4}
                                                    className="w-full bg-[#F9F9F7] border border-[#EBEAE5] px-4 py-3 text-sm focus:outline-none focus:border-[#8C7E6A] transition-all font-normal resize-none placeholder:text-[#888888]"
                                                    placeholder="How may we assist you?"
                                                />
                                            </div>
                                            {error && (
                                                <p className="text-red-500 text-xs italic">{error}</p>
                                            )}
                                            <button
                                                disabled={isSubmitting}
                                                type="submit"
                                                className="w-full bg-[#1A1A1A] text-white py-5 font-display text-[10px] tracking-[0.3em] uppercase hover:bg-black transition-all flex items-center justify-center gap-3 disabled:bg-[#5A5A5A]"
                                            >
                                                {isSubmitting ? (
                                                    <span className="animate-pulse">Sending...</span>
                                                ) : (
                                                    <>
                                                        Send Message
                                                        <Send size={14} />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}
