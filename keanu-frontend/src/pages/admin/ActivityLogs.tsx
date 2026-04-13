import React, { useEffect, useState } from "react";
import { Activity, User, Clock, ShieldCheck, Settings, Key, AlertCircle, Loader2, Database, Briefcase, FileText, Monitor, Globe, ChevronDown, ChevronRight, Search, RefreshCw, X, Download } from "lucide-react";
import { getActivityLogs, exportActivityLogsCSV } from "../../services/adminService";
import NotificationModal from "../../components/NotificationModal";
import { toUserErrorMessage } from "../../utils/errorMessage";

const PAGE_SIZE = 20;

type ActivityPagination = {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
};

export default function ActivityLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [exporting, setExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Notification Modal State
    const [notifModal, setNotifModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });
    const showNotif = (title: string, message: string) => setNotifModal({ isOpen: true, title, message });

    const [pagination, setPagination] = useState<ActivityPagination>({
        page: 1,
        limit: PAGE_SIZE,
        total: 0,
        totalPages: 0,
    });

    const fetchLogs = async (page: number = currentPage, search: string = searchTerm) => {
        setLoading(true);
        try {
            const response = await getActivityLogs({
                page,
                limit: PAGE_SIZE,
                search,
            });
            setLogs(response.data || []);
            setPagination(response.pagination || {
                page,
                limit: PAGE_SIZE,
                total: response.data?.length || 0,
                totalPages: 1,
            });
            setExpandedLogId(null);
            setError(null);
        } catch (err: any) {
            setError(toUserErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(currentPage, searchTerm);
    }, [currentPage, searchTerm]);

    const getLogMetadata = (action: string, entity: string) => {
        const actionUpper = (action || '').toUpperCase();
        const entityUpper = (entity || '').toUpperCase();

        let type = 'default';
        let Icon = Activity;

        if (actionUpper.includes('CREATE') || actionUpper.includes('REGISTER')) type = 'create';
        else if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) type = 'update';
        else if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE')) type = 'delete';
        else if (actionUpper.includes('LOGIN') || actionUpper.includes('AUTH') || actionUpper.includes('OTP')) type = 'security';
        else if (actionUpper.includes('RESTORE')) type = 'restore';

        if (entityUpper.includes('USER') || actionUpper.includes('USER')) Icon = User;
        else if (entityUpper.includes('PROJECT')) Icon = Briefcase;
        else if (entityUpper.includes('UNIT') || entityUpper.includes('VILLA')) Icon = Database;
        else if (entityUpper.includes('RESERVATION')) Icon = FileText;
        else if (type === 'security') Icon = ShieldCheck;
        else if (type === 'update') Icon = Settings;

        return { type, Icon };
    };

    const toggleExpand = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    const formatMetadata = (metadata: any) => {
        if (!metadata) return null;
        // Filter out userInfo as it's redundant (shown in 'Performed By' or already present in metadata)
        const { userInfo, ...rest } = metadata;
        if (Object.keys(rest).length === 0) return null;
        return rest;
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportActivityLogsCSV();
        } catch (err: any) {
            showNotif("Export Failed", toUserErrorMessage(err, "Failed to export activity logs CSV"));
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <h1 className="text-3xl sm:text-[38px] font-serif tracking-tight text-[#1C1C1C]">Activity Logs</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {exporting ? "Exporting..." : "Export CSV"}
                            </button>
                            <button
                                onClick={() => fetchLogs(currentPage, searchTerm)}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>
                    <p className="text-[#4B5563] text-[15px] leading-relaxed font-bold">
                        Audit trail of all administrative actions and system events.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="bg-white border border-gray-200 rounded p-3 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs by action, entity, or user..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-sm outline-none focus:border-[#A69279] transition-colors"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#A89882]" />
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        {error ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl m-6 border border-red-100 shadow-sm">
                                {error}
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                    <Activity className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-serif text-gray-900 mb-1">No Activity Found</h3>
                                <p className="text-gray-500 text-sm font-medium">Try adjusting your search filters.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-widest text-[#111827] font-bold bg-[#FAFAFA]">
                                        <th className="px-6 py-5 w-10"></th>
                                        <th className="px-6 py-5">Action & Entity</th>
                                        <th className="px-6 py-5">Performed By</th>
                                        <th className="px-6 py-5">Metadata</th>
                                        <th className="px-6 py-5">Origin</th>
                                        <th className="px-6 py-5 text-right">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {logs.map((log) => {
                                        const { type, Icon } = getLogMetadata(log.action, log.entity);
                                        const userDisplayName = log.user?.firstName || log.user?.lastName
                                            ? `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim()
                                            : log.user?.email || 'System';

                                        const isExpanded = expandedLogId === log.id;
                                        const metadata = formatMetadata(log.metadata);

                                        return (
                                            <React.Fragment key={log.id}>
                                                <tr
                                                    className={`hover:bg-gray-50 transition-colors cursor-pointer group ${isExpanded ? 'bg-gray-50/50' : ''}`}
                                                    onClick={() => toggleExpand(log.id)}
                                                >
                                                    <td className="px-6 py-4">
                                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#A89882]" />}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg 
                                                            ${type === 'create' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                                    type === 'update' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                        type === 'delete' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                            type === 'restore' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                                                                type === 'security' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                                                    'bg-gray-50 text-gray-600 border border-gray-100'
                                                                }`}>
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="text-[14px] font-bold text-[#1C1C1C] uppercase tracking-tight">{log.action || 'ACTION'}</div>
                                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{log.entity || 'GENERAL'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase border border-gray-200">
                                                                {userDisplayName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-[13px] font-bold text-gray-700">{userDisplayName}</div>
                                                                <div className="text-[10px] text-gray-400">{log.user?.role || 'SYSTEM'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 max-w-[200px] overflow-hidden text-ellipsis">
                                                        {metadata ? (
                                                            <span className="text-xs text-gray-500 font-medium">
                                                                {JSON.stringify(metadata).substring(0, 40)}...
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-300 italic">No extra data</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                                                                <Globe className="w-3 h-3" />
                                                                {log.ipAddress || '0.0.0.0'}
                                                            </div>
                                                            {log.userAgent && (
                                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 italic">
                                                                    <Monitor className="w-3 h-3" />
                                                                    PC / Browser
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <div className="text-[13px] font-bold text-[#1C1C1C]">
                                                                {new Date(log.createdAt).toLocaleDateString()}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr className="bg-gray-50/80 border-l-4 border-l-[#A89882]">
                                                        <td colSpan={6} className="px-12 py-6">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div>
                                                                    <h4 className="text-[11px] uppercase font-bold text-[#A89882] tracking-widest mb-3 flex items-center gap-2">
                                                                        <Monitor className="w-3 h-3" />
                                                                        System Context
                                                                    </h4>
                                                                    <div className="space-y-2 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                                            <span className="text-[11px] text-gray-400 font-bold uppercase">IP Address</span>
                                                                            <span className="text-xs font-mono font-bold text-gray-700">{log.ipAddress || 'Unavailable'}</span>
                                                                        </div>
                                                                        <div className="py-1">
                                                                            <span className="text-[11px] text-gray-400 font-bold uppercase block mb-1">User Agent</span>
                                                                            <span className="text-[11px] leading-relaxed text-gray-500 break-all">{log.userAgent || 'Unavailable'}</span>
                                                                        </div>
                                                                        <div className="flex justify-between py-1 border-t border-gray-50 pt-2">
                                                                            <span className="text-[11px] text-gray-400 font-bold uppercase">Entity ID</span>
                                                                            <span className="text-[11px] font-mono font-black text-[#A89882]">{log.entityId || 'None'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-[11px] uppercase font-bold text-[#A89882] tracking-widest mb-3 flex items-center gap-2">
                                                                        <Database className="w-3 h-3" />
                                                                        Payload Data
                                                                    </h4>
                                                                    <div className="bg-[#1C1C1C] p-4 rounded-xl shadow-inner max-h-[300px] overflow-y-auto">
                                                                        <pre className="text-[11px] text-green-400 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                                                                            {JSON.stringify(log.metadata, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {!loading && !error && pagination.total > 0 && (
                        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white text-xs text-gray-500 font-medium">
                            <div>
                                Showing{" "}
                                <span className="font-bold text-[#1C1C1C]">
                                    {(pagination.page - 1) * pagination.limit + 1}-
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>{" "}
                                of <span className="font-bold text-[#1C1C1C]">{pagination.total}</span> activity events
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage <= 1 || loading}
                                        className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-xs text-gray-500 min-w-[90px] text-center">
                                        Page <span className="font-bold text-[#1C1C1C]">{pagination.page}</span> / {Math.max(pagination.totalPages, 1)}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.max(pagination.totalPages, 1)))}
                                        disabled={currentPage >= Math.max(pagination.totalPages, 1) || loading}
                                        className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        <span>Creation</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        <span>Updates</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        <span>Deletion</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <NotificationModal
                isOpen={notifModal.isOpen}
                onClose={() => setNotifModal(prev => ({ ...prev, isOpen: false }))}
                title={notifModal.title}
                message={notifModal.message}
            />
        </>
    );
}
