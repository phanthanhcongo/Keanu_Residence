import React, { useEffect, useState, useCallback } from "react";
import {
    Users,
    Briefcase,
    CalendarCheck,
    ChevronDown,
    Loader2,
    Home,
    Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import ConfirmModal from "../../components/admin/modals/ConfirmModal";
import NotificationModal from "../../components/NotificationModal";
import { getProjects, getVillas, getUsers, getReservations, getStatistics, getGHLStatus, connectGHL, disconnectGHL } from "../../services/adminService";

type PeriodOption = { label: string; days: number };

const PERIOD_OPTIONS: PeriodOption[] = [
    { label: "Last 7 Days", days: 7 },
    { label: "Last Month", days: 30 },
    { label: "Last 3 Months", days: 90 },
];

export default function Dashboard() {
    const [stats, setStats] = useState({
        users: 0,
        projects: 0,
        villas: 0,
        reservations: 0,
        loading: true,
    });

    const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_OPTIONS[1]);
    const [periodOpen, setPeriodOpen] = useState(false);
    const [statsData, setStatsData] = useState<{
        data: { date: string; registrations: number; visits: number }[];
        summary: { totalRegistrations: number; totalVisits: number; averageRegistrationsPerDay: string; averageVisitsPerDay: string };
    } | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // GHL Integration state
    const [ghlStatus, setGhlStatus] = useState<{
        connected: boolean;
        status: string;
        locationId?: string;
        tokenExpired?: boolean;
    } | null>(null);
    const [ghlLoading, setGhlLoading] = useState(true);
    const [ghlConnecting, setGhlConnecting] = useState(false);

    // Confirm + Notification Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; title: string; message: string; onConfirm: () => void; isDestructive?: boolean; confirmText?: string;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });
    const [notifModal, setNotifModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });
    const showNotif = (title: string, message: string) => setNotifModal({ isOpen: true, title, message });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersRes, projectsRes, villasRes, reservationsRes] = await Promise.all([
                    getUsers(),
                    getProjects(),
                    getVillas(),
                    getReservations(),
                ]);
                setStats({
                    users: usersRes.meta?.total || usersRes.data?.length || 0,
                    projects: projectsRes.meta?.total || projectsRes.data?.length || 0,
                    villas: villasRes.meta?.total || villasRes.data?.length || 0,
                    reservations: reservationsRes.meta?.total || reservationsRes.data?.length || 0,
                    loading: false,
                });
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };
        fetchStats();
    }, []);

    const fetchGHLStatus = useCallback(async () => {
        setGhlLoading(true);
        try {
            const res = await getGHLStatus();
            setGhlStatus(res.data);
        } catch (error) {
            console.error("Error fetching GHL status:", error);
            setGhlStatus({ connected: false, status: "error" });
        } finally {
            setGhlLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGHLStatus();
    }, [fetchGHLStatus]);

    // Auto-refresh GHL status when window regains focus (after OAuth popup closes)
    useEffect(() => {
        const onFocus = () => fetchGHLStatus();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchGHLStatus]);

    const handleConnectGHL = async () => {
        setGhlConnecting(true);
        try {
            const res = await connectGHL();
            window.open(res.data.authorizationUrl, "_blank", "noopener,noreferrer");
        } catch (error: any) {
            console.error("GHL connect error:", error);
            showNotif("Connection Failed", error?.message || "Failed to initiate GHL connection");
        } finally {
            setGhlConnecting(false);
        }
    };

    const handleDisconnectGHL = () => {
        setConfirmModal({
            isOpen: true,
            title: "Disconnect GHL",
            message: "Are you sure you want to disconnect the GHL integration?",
            isDestructive: true,
            confirmText: "Disconnect",
            onConfirm: async () => {
                setGhlConnecting(true);
                try {
                    await disconnectGHL();
                    await fetchGHLStatus();
                } catch (error: any) {
                    console.error("GHL disconnect error:", error);
                    showNotif("Disconnection Failed", error?.message || "Failed to disconnect GHL");
                } finally {
                    setGhlConnecting(false);
                }
            },
        });
    };

    const fetchStatistics = useCallback(async (days: number) => {
        setStatsLoading(true);
        try {
            const res = await getStatistics(days);
            setStatsData(res);
        } catch (error) {
            console.error("Error fetching statistics:", error);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatistics(selectedPeriod.days);
    }, [selectedPeriod, fetchStatistics]);

    const summaryCards = [
        { label: "Total Users", value: stats.users.toString(), icon: Users, color: "#3B82F6", bgColor: "bg-blue-50" },
        { label: "Total Projects", value: stats.projects.toString(), icon: Briefcase, color: "#10B981", bgColor: "bg-emerald-50" },
        { label: "Total Residences", value: stats.villas.toString(), icon: Home, color: "#8B5CF6", bgColor: "bg-purple-50" },
        { label: "Active Reservations", value: stats.reservations.toString(), icon: CalendarCheck, color: "#F97316", bgColor: "bg-orange-50" },
        { label: "Online Users", value: "1", icon: Activity, color: "#06B6D4", bgColor: "bg-cyan-50", isLive: true },
    ];

    const quickActions = [
        { title: "Manage Users", description: "View and edit user accounts", icon: Users, path: "/admin/users" },
        { title: "Manage Projects", description: "Create and edit projects", icon: Briefcase, path: "/admin/projects" },
        { title: "View Reservations", description: "Monitor all reservations", icon: CalendarCheck, path: "/admin/reservations" },
    ];

    // --- Chart helpers ---
    const buildSvgPath = (
        data: { date: string; registrations: number; visits: number }[],
        key: "visits" | "registrations",
        maxVal: number,
        chartH: number,
        chartW: number,
    ) => {
        if (!data || data.length === 0) return "";
        const xStep = chartW / Math.max(data.length - 1, 1);
        return data
            .map((d, i) => {
                const x = i * xStep;
                const y = maxVal === 0 ? chartH : chartH - (d[key] / maxVal) * chartH;
                return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join(" ");
    };

    const chartData = statsData?.data ?? [];
    const maxVisits = Math.max(...chartData.map(d => d.visits), 1);
    const maxRegs = Math.max(...chartData.map(d => d.registrations), 1);
    const chartMax = Math.max(maxVisits, maxRegs, 1);
    const CHART_W = 1000;
    const CHART_H = 100;

    const visitsPath = buildSvgPath(chartData, "visits", chartMax, CHART_H, CHART_W);
    const regsPath = buildSvgPath(chartData, "registrations", chartMax, CHART_H, CHART_W);

    // X-axis labels — show at most ~8 evenly spaced
    const labelStep = Math.max(1, Math.floor(chartData.length / 8));
    const xLabels = chartData.filter((_, i) => i % labelStep === 0 || i === chartData.length - 1);

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-serif text-[#1C1C1C] tracking-tight">Dashboard</h1>
                    <p className="text-[#4B5563] text-sm mt-1 font-bold">Overview of your system</p>
                </div>
                {stats.loading && (
                    <div className="flex items-center gap-2 text-[#A89882] animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Updating Data...</span>
                    </div>
                )}
            </div>

            {/* Integration Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h3 className="text-lg font-serif text-[#1C1C1C]">GoHighLevel Integration</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {ghlLoading ? (
                            <>
                                <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                                <span className="text-sm text-[#9CA3AF] font-bold">Checking…</span>
                            </>
                        ) : ghlStatus?.connected ? (
                            <>
                                <div className={`w-2 h-2 rounded-full ${ghlStatus.tokenExpired ? "bg-yellow-400" : "bg-green-500"}`}></div>
                                <span className={`text-sm font-bold ${ghlStatus.tokenExpired ? "text-yellow-600" : "text-green-600"}`}>
                                    {ghlStatus.tokenExpired ? "Token Expired" : "Connected"}
                                </span>
                                {ghlStatus.locationId && !ghlStatus.tokenExpired && (
                                    <span className="text-xs text-gray-400 font-mono">· {ghlStatus.locationId}</span>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                <span className="text-sm text-[#4B5563] font-bold">Not Connected</span>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-gray-400 mt-2 font-bold">Automatically create contacts in GHL when users register</p>
                </div>
                {ghlStatus?.connected && !ghlStatus.tokenExpired ? (
                    <button
                        onClick={handleDisconnectGHL}
                        disabled={ghlConnecting || ghlLoading}
                        className="w-full sm:w-auto bg-white border border-red-200 text-red-500 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        {ghlConnecting ? "Disconnecting…" : "Disconnect"}
                    </button>
                ) : (
                    <button
                        onClick={handleConnectGHL}
                        disabled={ghlConnecting || ghlLoading}
                        className="w-full sm:w-auto bg-[#5D5FEF] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#4D4FDF] transition-colors shadow-lg shadow-[#5D5FEF]/20 disabled:opacity-50"
                    >
                        {ghlConnecting ? "Connecting…" : ghlStatus?.tokenExpired ? "Reconnect GHL" : "Connect GHL"}
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {summaryCards.map((card) => (
                    <div
                        key={card.label}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md"
                    >
                        <div className="flex items-start justify-between">
                            <div className={`${card.bgColor} p-3 rounded-xl mb-4`}>
                                <card.icon className="w-6 h-6" style={{ color: card.color }} />
                            </div>
                            {card.isLive && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-50 rounded-full border border-cyan-100">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Live</span>
                                </div>
                            )}
                        </div>
                        <div>
                            <span className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">{card.label}</span>
                            <p className="text-3xl font-serif text-[#111827] mt-1">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Statistics Overview */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-100 shadow-sm space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h3 className="text-xl font-serif text-[#111827]">Statistics Overview</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-[#4B5563] font-bold">Period:</span>
                            {/* Period Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setPeriodOpen(prev => !prev)}
                                    className="text-xs font-bold text-[#1C1C1C] border border-gray-200 px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                >
                                    {selectedPeriod.label}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
                                </button>
                                {periodOpen && (
                                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-100 rounded-xl shadow-lg z-10 min-w-[140px] overflow-hidden">
                                        {PERIOD_OPTIONS.map(opt => (
                                            <button
                                                key={opt.days}
                                                onClick={() => { setSelectedPeriod(opt); setPeriodOpen(false); }}
                                                className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors ${selectedPeriod.days === opt.days ? "text-[#A89882]" : "text-[#1C1C1C]"}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {statsLoading && (
                        <div className="flex items-center gap-2 text-[#A89882] animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-wider">Loading...</span>
                        </div>
                    )}
                </div>

                {/* Stat Boxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-100 p-6 rounded-xl min-w-0 shadow-sm">
                        <span className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">Total Visits</span>
                        <div className="text-2xl font-serif text-[#111827] mt-2">
                            {statsLoading ? "—" : (statsData?.summary.totalVisits ?? 0)}
                        </div>
                        <div className="text-[10px] font-bold text-[#9CA3AF] mt-1 uppercase">
                            Avg: {statsLoading ? "—" : statsData?.summary.averageVisitsPerDay}/day
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 p-6 rounded-xl min-w-0 shadow-sm">
                        <span className="text-xs font-bold text-[#6B7280] tracking-wide uppercase">New Registrations</span>
                        <div className="text-2xl font-serif text-[#111827] mt-2">
                            {statsLoading ? "—" : (statsData?.summary.totalRegistrations ?? 0)}
                        </div>
                        <div className="text-[10px] font-bold text-[#9CA3AF] mt-1 uppercase">
                            Avg: {statsLoading ? "—" : statsData?.summary.averageRegistrationsPerDay}/day
                        </div>
                    </div>
                </div>

                {/* Real SVG Chart */}
                <div className="h-[280px] w-full relative pt-4">
                    {statsLoading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-[#A89882] animate-spin" />
                        </div>
                    ) : (
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${CHART_W} ${CHART_H + 40}`} preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[0, 25, 50, 75, 100].map(y => (
                                <line key={y} x1="0" y1={y} x2={CHART_W} y2={y} stroke="#F0F0F0" strokeWidth="1" strokeDasharray="4 4" />
                            ))}

                            {/* Visits area fill */}
                            {visitsPath && (
                                <path
                                    d={`${visitsPath} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`}
                                    fill="#3B82F6"
                                    fillOpacity="0.06"
                                />
                            )}
                            {/* Registrations area fill */}
                            {regsPath && (
                                <path
                                    d={`${regsPath} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`}
                                    fill="#10B981"
                                    fillOpacity="0.08"
                                />
                            )}

                            {/* Visits Line */}
                            {visitsPath && (
                                <path d={visitsPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                            )}
                            {/* Registrations Line */}
                            {regsPath && (
                                <path d={regsPath} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                            )}

                            {/* X-axis date labels */}
                            <g fontSize="8" fill="#9CA3AF" fontWeight="bold" fontFamily="sans-serif">
                                {xLabels.map((d) => {
                                    const idx = chartData.indexOf(d);
                                    const x = (idx / Math.max(chartData.length - 1, 1)) * CHART_W;
                                    const dateObj = new Date(d.date);
                                    const label = `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`;
                                    return (
                                        <text key={d.date} x={x} y={CHART_H + 18} textAnchor="middle">{label}</text>
                                    );
                                })}
                            </g>
                        </svg>
                    )}
                </div>

                {/* Chart Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-6 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#10B981]"></div>
                        <span className="text-xs font-bold text-green-500 uppercase tracking-wider">New Registrations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-[#3B82F6]"></div>
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Visits</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4 pt-4">
                <h3 className="text-xl font-serif text-[#1C1C1C]">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {quickActions.map((action) => (
                        <Link
                            key={action.title}
                            to={action.path}
                            className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all cursor-pointer text-center space-y-2 group hover:-translate-y-1 block"
                        >
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-[#A89882]/10 transition-colors">
                                <action.icon className="w-6 h-6 text-[#1C1C1C] group-hover:text-[#A89882] transition-colors" />
                            </div>
                            <h4 className="text-lg font-serif text-[#1C1C1C] group-hover:text-[#A89882] transition-colors">{action.title}</h4>
                            <p className="text-sm text-[#4B5563] font-bold">{action.description}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText={confirmModal.confirmText}
            />

            <NotificationModal
                isOpen={notifModal.isOpen}
                onClose={() => setNotifModal(prev => ({ ...prev, isOpen: false }))}
                title={notifModal.title}
                message={notifModal.message}
            />
        </div>
    );
}
