import React, { useEffect, useState } from "react";
import { CalendarCheck, User, MapPin, Tag, Loader2, ChevronDown, Download, Search, Calendar, Edit2, X } from "lucide-react";
import { getReservations, exportReservationsCSV, updateReservationStatus, updatePaymentStatus } from "../../services/adminService";
import NotificationModal from "../../components/NotificationModal";
import { toUserErrorMessage } from "../../utils/errorMessage";

export default function Reservations() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter States
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [exporting, setExporting] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    const [pendingStatus, setPendingStatus] = useState<string>("");
    const [pendingPaymentStatus, setPendingPaymentStatus] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    // Notification Modal State
    const [notifModal, setNotifModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: "success" | "error" | "info";
    }>({ isOpen: false, title: "", message: "", variant: "info" });
    const showNotif = (
        title: string,
        message: string,
        variant: "success" | "error" | "info" = "info"
    ) => setNotifModal({ isOpen: true, title, message, variant });



    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getReservations();
                setReservations(response.data || []);
            } catch (err: any) {
                setError(toUserErrorMessage(err));
                setReservations([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredReservations = reservations.filter(res => {
        // Search
        const name = (res.buyerName || `${res.user?.firstName || ""} ${res.user?.lastName || ""}`).toLowerCase();
        const unit = (res.unit?.unitNumber || '').toLowerCase();
        const matchesSearch = name.includes(search.toLowerCase()) || unit.includes(search.toLowerCase());

        // Status
        const status = (res.paymentStatus || res.status || "").toUpperCase();
        const matchesStatus = statusFilter === "ALL" || status === statusFilter;



        // Date Range
        const resDate = new Date(res.createdAt).setHours(0, 0, 0, 0);
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
        const end = endDate ? new Date(endDate).setHours(0, 0, 0, 0) : null;

        const matchesStartDate = !start || resDate >= start;
        const matchesEndDate = !end || resDate <= end;

        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });

    const handleClearFilters = () => {
        setSearch("");
        setStatusFilter("ALL");
        setStartDate("");
        setEndDate("");
    };

    const getStatusColor = (status: string) => {
        const s = (status || "").toUpperCase();
        if (s === 'SUCCEEDED' || s === 'PAID') return 'bg-green-50 text-green-700 border-green-100';
        if (s === 'CONFIRMED') return 'bg-blue-50 text-blue-700 border-blue-100';
        if (s === 'FAILED' || s === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-100';
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportReservationsCSV();
        } catch (err: any) {
            showNotif("Export Failed", toUserErrorMessage(err, "Failed to export reservations CSV"));
        } finally {
            setExporting(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string, type: 'reservation' | 'payment') => {
        setUpdatingId(id);
        try {
            if (type === 'reservation') {
                await updateReservationStatus(id, newStatus);
            } else {
                await updatePaymentStatus(id, newStatus);
            }
            
            // Refresh data
            const response = await getReservations();
            const updatedReservations = response.data || [];
            setReservations(updatedReservations);

            // Update local selected reservation if modal is open
            if (selectedReservation && selectedReservation.id === id) {
                const updated = updatedReservations.find((r: any) => r.id === id);
                if (updated) setSelectedReservation(updated);
            }

            showNotif("Success", `Updated ${type} status successfully`, "success");
        } catch (err: any) {
            showNotif("Update Failed", toUserErrorMessage(err), "error");
        } finally {
            setUpdatingId(null);
        }
    };

    const openEditModal = (res: any) => {
        setSelectedReservation(res);
        setPendingStatus(res.status);
        setPendingPaymentStatus(res.paymentStatus);
        setIsEditModalOpen(true);
    };

    const handleSaveModal = async () => {
        if (!selectedReservation) return;
        
        const hasStatusChange = pendingStatus !== selectedReservation.status;
        const hasPaymentChange = pendingPaymentStatus !== selectedReservation.paymentStatus;

        if (!hasStatusChange && !hasPaymentChange) {
            setIsEditModalOpen(false);
            return;
        }

        setIsSaving(true);
        try {
            if (hasStatusChange) {
                await updateReservationStatus(selectedReservation.id, pendingStatus);
            }
            if (hasPaymentChange) {
                await updatePaymentStatus(selectedReservation.id, pendingPaymentStatus);
            }

            // Refresh data
            const response = await getReservations();
            const updatedReservations = response.data || [];
            setReservations(updatedReservations);

            showNotif("Success", "Updated reservation successfully", "success");
            setIsEditModalOpen(false);
        } catch (err: any) {
            showNotif("Update Failed", toUserErrorMessage(err), "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                    <div>
                        <h1 className="text-[32px] font-serif text-gray-900 tracking-tight">Reservations</h1>
                        <p className="text-gray-500 text-[15px] font-bold mt-1">Monitor and manage all residence bookings and payment statuses.</p>
                    </div>
                    <div className="flex gap-3 w-full xl:w-auto">
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-full xl:w-auto flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {exporting ? "Exporting..." : "Export CSV"}
                        </button>
                    </div>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search customer or residence..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#A89882] transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full appearance-none bg-white pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium outline-none focus:border-[#A89882]"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="SUCCEEDED">Succeeded</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="FAILED">Failed</option>
                                <option value="CONFIRMED">Confirmed</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Date From */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium outline-none focus:border-[#A89882]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        {/* Date To */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium outline-none focus:border-[#A89882]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        {/* Clear Button */}
                        <button
                            onClick={handleClearFilters}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-[#A89882] hover:border-[#A89882] transition-all flex items-center justify-center gap-2 lg:col-span-1"
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="w-8 h-8 animate-spin text-[#A89882]" />
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl m-4 border border-red-100 shadow-sm">
                                {error}
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-widest text-gray-400 font-bold bg-[#FAFAFA]">
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Residence</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Down Payment</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredReservations.map((res) => (
                                        <tr key={res.id} className="hover:bg-gray-50 transition-colors text-sm">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                {res.id ? res.id.split('-')[0] : 'N/A'}...
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-3.5 h-3.5 text-[#A89882]" />
                                                        <span className="font-bold text-gray-900">
                                                            {res.unit?.unitNumber ? `Residence ${res.unit.unitNumber}` : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight mt-0.5">
                                                        {res.project?.name || 'Unknown Project'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-gray-600 font-bold">
                                                        {res.buyerName || `${res.user?.firstName || ""} ${res.user?.lastName || ""}`.trim() || "Unknown"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">
                                                {new Date(res.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-gray-900">
                                                ${Number(res.depositAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(res.status)}`}>
                                                            {res.status}
                                                        </span>
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(res.paymentStatus)}`}>
                                                            PMT: {res.paymentStatus}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => openEditModal(res)}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-[#A89882]"
                                                        title="Edit Status"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredReservations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">
                                                No reservations found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!loading && !error && (
                        <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white text-xs text-gray-500 font-medium">
                            Showing <span className="font-bold text-[#333]">{filteredReservations.length}</span> of {reservations.length} Reservations
                        </div>
                    )}
                </div>
            </div>

            <NotificationModal
                isOpen={notifModal.isOpen}
                onClose={() => setNotifModal(prev => ({ ...prev, isOpen: false }))}
                title={notifModal.title}
                message={notifModal.message}
                variant={notifModal.variant}
            />

            {/* Edit Status Modal */}
            {isEditModalOpen && selectedReservation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-[#FAFAFA]">
                            <div>
                                <h3 className="text-lg font-serif text-gray-900">Edit Reservation Status</h3>
                                <p className="text-xs text-gray-500 font-medium">Residence {selectedReservation.unit?.unitNumber} - {selectedReservation.buyerName || 'Customer'}</p>
                            </div>
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Reservation Status */}
                            <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1">Reservation Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'FAILED'].map((status) => (
                                        <button
                                            key={status}
                                            disabled={isSaving}
                                            onClick={() => setPendingStatus(status)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                pendingStatus === status 
                                                ? `${getStatusColor(status)} shadow-sm scale-[1.02]` 
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                            } flex items-center justify-center gap-2`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Status */}
                            <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-widest text-gray-400 font-bold px-1">Payment Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED'].map((pStatus) => (
                                        <button
                                            key={pStatus}
                                            disabled={isSaving}
                                            onClick={() => setPendingPaymentStatus(pStatus)}
                                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                                pendingPaymentStatus === pStatus 
                                                ? `${getStatusColor(pStatus)} shadow-sm scale-[1.02]` 
                                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                            } flex items-center justify-center gap-2`}
                                        >
                                            {pStatus}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-[#FAFAFA] border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSaving}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveModal}
                                disabled={isSaving}
                                className="px-6 py-2 bg-[#A89882] hover:bg-[#978670] disabled:bg-[#d4cdbd] text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
