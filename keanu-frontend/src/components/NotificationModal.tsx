import React from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant?: "success" | "error" | "info";
}

export default function NotificationModal({ isOpen, onClose, title, message, variant }: NotificationModalProps) {
    if (!isOpen) return null;

    const normalizedTitle = title.toLowerCase();
    const resolvedVariant = variant
        || (normalizedTitle.includes("success") ? "success" : null)
        || (normalizedTitle.includes("error") || normalizedTitle.includes("failed") ? "error" : "info");

    const iconStyles =
        resolvedVariant === "success"
            ? "bg-emerald-50 text-emerald-600"
            : resolvedVariant === "error"
                ? "bg-red-50 text-red-500"
                : "bg-amber-50 text-amber-600";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white max-w-sm w-full shadow-2xl overflow-hidden relative origin-bottom animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#A89B8C] hover:text-[#5C4A3A] transition-colors"
                >
                    <X size={20} />
                </button>
                <div className="p-8 text-center flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 mx-auto ${iconStyles}`}>
                        {resolvedVariant === "success" ? (
                            <CheckCircle2 size={24} />
                        ) : resolvedVariant === "error" ? (
                            <AlertCircle size={24} />
                        ) : (
                            <Info size={24} />
                        )}
                    </div>
                    <h3 className="font-cinzel text-xl text-[#1A1A1A] mb-3 uppercase tracking-wide">
                        {title}
                    </h3>
                    <p className="font-lato text-sm text-[#5A5A5A] leading-relaxed mb-8">
                        {message}
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#5C4A3A] text-white font-cinzel text-[10px] tracking-[0.2em] uppercase hover:bg-[#4A3E31] transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
