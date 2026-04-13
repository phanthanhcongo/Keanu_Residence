import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toUserErrorMessage } from "../../../utils/errorMessage";

interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
    title: string;
}

export default function ProjectModal({ isOpen, onClose, onSave, initialData, title }: ProjectModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        developer: "",
        launchDate: "",
        launchTime: "00:00",
        timezone: "UTC",
        status: "UPCOMING",
        depositAmount: 0,
        reservationDuration: 10,
        isPrimary: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                name: initialData.name || "",
                slug: initialData.slug || "",
                developer: initialData.developer || "",
                launchDate: initialData.launchDate ? new Date(initialData.launchDate).toISOString().split('T')[0] : "",
                launchTime: initialData.launchTime || "00:00",
                timezone: initialData.timezone || "UTC",
                status: initialData.status || "UPCOMING",
                depositAmount: initialData.depositAmount || 0,
                reservationDuration: initialData.reservationDuration || 10,
                isPrimary: initialData.isPrimary || false,
            });
            setError(null);
        } else if (isOpen && !initialData) {
            setFormData({
                name: "",
                slug: "",
                developer: "",
                launchDate: "",
                launchTime: "00:00",
                timezone: "UTC",
                status: "UPCOMING",
                depositAmount: 0,
                reservationDuration: 10,
                isPrimary: false,
            });
            setError(null);
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | { name: string; value: any; type?: string; checked?: boolean }>) => {
        const { name, value, type, checked } = e.target as any;
        setFormData(prev => {
            const newForm = { ...prev, [name]: type === 'checkbox' ? checked : (name === 'depositAmount' || name === 'reservationDuration' ? Number(value) : value) };
            if (name === 'name' && !initialData) {
                newForm.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            }
            return newForm;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            // Convert date to ISO timestamp to satisfy backend API requirements
            const dateStr = `${formData.launchDate}T00:00:00.000Z`;
            await onSave({ ...formData, launchDate: dateStr });
            onClose();
        } catch (err: any) {
            setError(toUserErrorMessage(err, "Failed to save project"));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-serif text-[#1C1C1C]">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Project Name</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. Ocean Breeze" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Slug</label>
                                <input required type="text" name="slug" value={formData.slug} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none bg-gray-50" placeholder="ocean-breeze" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700">Developer</label>
                                <input required type="text" name="developer" value={formData.developer} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. Keanu Group" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Launch Date</label>
                                <input required type="date" name="launchDate" value={formData.launchDate} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Launch Time (HH:MM)</label>
                                <input required type="time" name="launchTime" value={formData.launchTime} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Timezone</label>
                                <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">Eastern Time – New York (UTC-5 / UTC-4)</option>
                                    <option value="Asia/Dubai">Gulf Standard Time – Dubai (UTC+4)</option>
                                    <option value="Asia/Ho_Chi_Minh">Vietnam Time – Ho Chi Minh City (UTC+7)</option>
                                    <option value="Asia/Makassar">Central Indonesia Time – Bali (UTC+8)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="LIVE">Live</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Deposit Amount (USD)</label>
                                <input required type="number" min="0" step="0.01" name="depositAmount" value={formData.depositAmount} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Reservation Duration (Mins)</label>
                                <input required type="number" min="1" name="reservationDuration" value={formData.reservationDuration} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" />
                            </div>
                            <div className="md:col-span-2 p-4 bg-[#F5F5F4] rounded-xl border border-[#EBEAE6] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <label className="text-sm font-bold text-[#1C1C1C] block">Primary Project</label>
                                    <span className="text-xs text-[#4B5563] font-medium">Designate this as the main project to be featured.</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="isPrimary" checked={formData.isPrimary} onChange={handleChange} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A89882]"></div>
                                </label>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-auto">
                    <button type="button" onClick={onClose} disabled={loading} className="w-full sm:w-auto px-6 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" form="project-form" disabled={loading} className="w-full sm:w-auto px-6 py-2 bg-[#A89882] text-white font-bold rounded-lg hover:bg-[#978670] transition-colors shadow-lg shadow-[#A89882]/20 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Project
                    </button>
                </div>
            </div>
        </div>
    );
}
