import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toUserErrorMessage } from "../../../utils/errorMessage";

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, newRole?: string, newStatus?: string) => Promise<void>;
    initialData: any;
}

export default function UserModal({ isOpen, onClose, onSave, initialData }: UserModalProps) {
    const [formData, setFormData] = useState({
        role: "BUYER",
        status: "ACTIVE",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                role: initialData.role || "BUYER",
                status: initialData.status || "ACTIVE",
            });
            setError(null);
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let newRole = formData.role !== initialData.role ? formData.role : undefined;
        let newStatus = formData.status !== initialData.status ? formData.status : undefined;

        if (!newRole && !newStatus) {
            onClose(); // No changes made
            return;
        }

        setLoading(true);
        try {
            await onSave(initialData.id, newRole, newStatus);
            onClose();
        } catch (err: any) {
            setError(toUserErrorMessage(err, "Failed to update user"));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !initialData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-serif text-[#1C1C1C]">Edit User</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <p className="text-sm text-gray-500 mb-1">User Details</p>
                        <p className="font-bold text-[#1C1C1C]">{initialData.firstName} {initialData.lastName}</p>
                        <p className="text-sm text-gray-500">{initialData.email}</p>
                    </div>

                    <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Role</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                <option value="BUYER">Buyer</option>
                                <option value="SALES">Sales</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={loading} className="w-full sm:w-auto px-6 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" form="user-form" disabled={loading} className="w-full sm:w-auto px-6 py-2 bg-[#A89882] text-white font-bold rounded-lg hover:bg-[#978670] transition-colors shadow-lg shadow-[#A89882]/20 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
