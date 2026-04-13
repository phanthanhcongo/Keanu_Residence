import React from "react";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl flex flex-col pt-2 pb-6 px-6 relative items-center text-center">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className={`w-12 h-12 rounded-full flex items-center justify-center mt-6 mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-[#FFFBF0] text-[#D97706]'}`}>
                    <AlertTriangle className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-serif text-[#1C1C1C] mb-2">{title}</h3>

                <p className="text-[#4B5563] text-sm mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 font-bold rounded-lg transition-colors text-white ${isDestructive
                                ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
                                : "bg-[#A89882] hover:bg-[#978670] shadow-lg shadow-[#A89882]/20"
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
