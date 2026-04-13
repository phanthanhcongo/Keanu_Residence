import React, { useEffect, useState, useCallback } from "react";
import { Clock, Zap, ZapOff, Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { triggerFomo, stopFomo, getFomoStatus, getManipulatedUserCount } from "../../services/adminService";
import ConfirmModal from "../../components/admin/modals/ConfirmModal";
import { toUserErrorMessage } from "../../utils/errorMessage";

type FomoStatus = {
    active: boolean;
    totalRecords: number;
    currentDelta: number;
    startTime: string | null;
    endTime: string | null;
};

type UserCountBreakdown = {
    realCount: number;
    delta: number;
    totalCount: number;
    timestamp: string;
};

const BALI_TIMEZONE = "Asia/Makassar"; // Bali, Indonesia (WITA, UTC+8)

function formatBaliTime(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-GB", {
        timeZone: BALI_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
}

export default function LaunchTime() {
    const [status, setStatus] = useState<FomoStatus | null>(null);
    const [userCount, setUserCount] = useState<UserCountBreakdown | null>(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [isConfirmOpen, setConfirmOpen] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const [fomoStatus, countBreakdown] = await Promise.all([
                getFomoStatus(),
                getManipulatedUserCount(),
            ]);
            setStatus(fomoStatus);
            setUserCount(countBreakdown);
        } catch (err: any) {
            // Silently swallow fetch status errors to prevent console spam
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // poll every 5s
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleTrigger = async () => {
        setTriggering(true);
        setMessage(null);
        try {
            const result = await triggerFomo();
            setMessage({ type: "success", text: result.message || "FOMO effect triggered!" });
            await fetchStatus();
        } catch (err: any) {
            // If the message is the same, clear it and set it again after a tiny delay
            // to force the animation/re-render and make it obvious it was triggered again
            setMessage(null);
            setTimeout(() => {
                setMessage({ type: "error", text: toUserErrorMessage(err, "Failed to trigger FOMO effect.") });
            }, 50);
        } finally {
            setTriggering(false);
        }
    };

    const handleStopClick = () => {
        setConfirmOpen(true);
    };

    const executeStop = async () => {
        setStopping(true);
        setMessage(null);
        try {
            const result = await stopFomo();
            setMessage({ type: "success", text: result.message || "FOMO effect stopped." });
            await fetchStatus();
        } catch (err: any) {
            setMessage({ type: "error", text: toUserErrorMessage(err, "Failed to stop FOMO effect.") });
        } finally {
            setStopping(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
            <ConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={executeStop}
                title="Stop FOMO Effect"
                message="Are you sure you want to stop the FOMO effect? This will immediately remove all fake user counts."
                confirmText="Stop Effect"
                isDestructive={true}
            />

            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif text-[#1C1C1C] tracking-tight">Launch Time & FOMO</h1>
                <p className="text-[#4B5563] text-sm mt-1 font-bold">
                    Configure the FOMO effect for upcoming launches. User count manipulation will inflate the displayed online user count.
                </p>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6 gap-3">
                    <h3 className="text-xl font-serif text-[#111827]">FOMO Effect Status</h3>
                    <button
                        onClick={fetchStatus}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        title="Refresh status"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-[#A89882]" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Status indicator */}
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${status?.active ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                            <span className={`text-sm font-bold uppercase tracking-wider ${status?.active ? "text-green-600" : "text-gray-400"}`}>
                                {status?.active ? "Active" : "Inactive"}
                            </span>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Delta</span>
                                <p className="text-2xl font-serif text-[#1C1C1C] mt-1">+{status?.currentDelta || 0}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Records</span>
                                <p className="text-2xl font-serif text-[#1C1C1C] mt-1">{status?.totalRecords || 0}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Time Range</span>
                                <p className="text-sm font-bold text-[#4B5563] mt-2">
                                    {status?.startTime
                                        ? `${formatBaliTime(status.startTime)} – ${formatBaliTime(status.endTime)} WITA`
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        {/* User count grid */}
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">User Count</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-[#F8FAFC] rounded-xl p-4 border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Real Users</span>
                                    <p className="text-2xl font-serif text-[#1C1C1C] mt-1">{userCount?.realCount ?? 0}</p>
                                </div>
                                <div className="bg-[#FFF7ED] rounded-xl p-4 border border-orange-100">
                                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">FOMO Delta</span>
                                    <p className="text-2xl font-serif text-[#C2410C] mt-1">+{userCount?.delta ?? 0}</p>
                                </div>
                                <div className="bg-[#ECFDF5] rounded-xl p-4 border border-emerald-100">
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Displayed Users</span>
                                    <p className="text-2xl font-serif text-[#047857] mt-1">{userCount?.totalCount ?? 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Message */}
                        {message && (
                            <div className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-bold ${message.type === "success"
                                ? "bg-green-50 border-green-100 text-green-700"
                                : "bg-red-50 border-red-100 text-red-700"
                                }`}>
                                {message.type === "success"
                                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                    : <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                }
                                {message.text}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={handleTrigger}
                                disabled={triggering || stopping}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#A89882] hover:bg-[#978670] disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-[#A89882]/20"
                            >
                                {triggering ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Zap className="w-4 h-4" />
                                )}
                                {triggering ? "Triggering..." : "Trigger FOMO"}
                            </button>
                            <button
                                onClick={handleStopClick}
                                disabled={triggering || stopping || !status?.totalRecords}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-red-200 text-red-600 hover:bg-red-50 disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white font-semibold rounded-lg transition-colors"
                            >
                                {stopping ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ZapOff className="w-4 h-4" />
                                )}
                                {stopping ? "Stopping..." : "Stop FOMO"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="bg-[#FFFBF0] rounded-2xl p-6 border border-[#F5E6C8] shadow-sm">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#D97706] mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-[#92400E] space-y-1">
                        <p className="font-bold">How does FOMO work?</p>
                        <p>
                            The FOMO effect adds fake user counts to the displayed "online users"
                            number. It can only be triggered within <strong>60 minutes</strong> of the
                            primary project's launch time. The effect escalates gradually from +20 to +60
                            users over a 120-minute window (60 min before to 60 min after launch).
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
