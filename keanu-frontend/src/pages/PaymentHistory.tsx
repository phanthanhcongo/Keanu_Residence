import React, { useState, useEffect } from "react";
import {
    ArrowUpRight,
    ArrowDownLeft,
    Download,
    Filter,
    Calendar,
    ChevronRight,
    Search,
    Loader2,
    AlertTriangle,
    X,
    Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { getReservations, cancelReservation } from "../services/reservationService";
import { useAuth } from "../contexts/AuthContext";
import { toUserErrorMessage } from "../utils/errorMessage";
import { useCurrency } from "../contexts/CurrencyContext";

export default function PaymentHistory() {
    const { user } = useAuth();
    const { formatPrice } = useCurrency();
    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<any>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // Pagination states
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const LIMIT = 10;

    const fetchReservations = async (currentPage: number, isInitial = false) => {
        try {
            if (isInitial) setIsLoading(true);
            else setIsLoadingMore(true);

            const response = await getReservations({ page: currentPage, limit: LIMIT });
            const data = response?.data || [];

            if (isInitial) {
                setReservations(data);
            } else {
                setReservations(prev => [...prev, ...data]);
            }

            // Check if there are more
            if (data.length < LIMIT) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch reservations:", err);
            setError(toUserErrorMessage(err, "Failed to load your reservation history."));
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchReservations(1, true);
    }, []);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchReservations(nextPage);
    };

    const handleCancelClick = (reservation: any) => {
        setSelectedReservation(reservation);
        setIsCancelModalOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!selectedReservation) return;
        try {
            setIsCancelling(true);
            await cancelReservation(selectedReservation.id);
            setReservations(prev => prev.map(r =>
                r.id === selectedReservation.id ? { ...r, status: 'CANCELLED' } : r
            ));
            setIsCancelModalOpen(false);
            setSelectedReservation(null);
        } catch (err) {
            console.error("Failed to cancel reservation:", err);
            alert("Failed to cancel reservation. Please try again.");
        } finally {
            setIsCancelling(false);
        }
    };

    const formatStatus = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'Completed';
            case 'PENDING': return 'Pending';
            case 'EXPIRED': return 'Expired';
            case 'CANCELLED': return 'Cancelled';
            case 'FAILED': return 'Failed';
            default: return status;
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-700';
            case 'PENDING': return 'bg-blue-100 text-blue-700';
            case 'CANCELLED': return 'bg-red-100 text-red-700';
            case 'EXPIRED': return 'bg-gray-100 text-gray-700';
            default: return 'bg-orange-100 text-orange-700';
        }
    };

    const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMED');
    const pendingReservations = reservations.filter(r => r.status === 'PENDING');

    const totalInvested = confirmedReservations.reduce((sum, r) => sum + (Number(r.depositAmount) || 0), 0);
    const pendingCount = pendingReservations.length;

    const summary = [
        {
            label: "Total Deposits",
            value: formatPrice(totalInvested),
            sub: `${confirmedReservations.length} Confirmed`
        },
        {
            label: "Pending Reservations",
            value: pendingCount.toString(),
            sub: "Needs payment"
        }
    ];

    return (
        <div className="min-h-screen bg-[#F5F2EBE5] selection:bg-[#A89B8C] selection:text-white">

            <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                    <div>
                        <span className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] block mb-2 font-medium">
                            Financial Records
                        </span>
                        <h1 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] leading-tight mb-2">
                            Payment History
                        </h1>
                        <p className="text-[#5A5A5A] text-sm font-light max-w-lg">
Review your reservation activity, payments and downloadable statements
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-[#EBEAE5] text-[#1A1A1A] font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#F9F9F7] transition-colors shadow-sm">
                            <Download size={14} />
                            Download Statement
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                    {summary.map((item) => (
                        <div key={item.label} className="bg-white border border-[#EBEAE5] p-8 shadow-sm group hover:border-[#A89B8C] transition-colors">
                            <p className="font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] mb-4">
                                {item.label}
                            </p>
                            <h3 className="font-serif text-3xl text-[#1A1A1A] mb-2">
                                {item.value}
                            </h3>
                            <p className="text-xs text-[#5A5A5A] font-light italic">
                                {item.sub}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Transaction List Section */}
                <section className="bg-white border border-[#EBEAE5] shadow-sm overflow-hidden">
                    {/* Filters & Search */}
                    <div className="p-6 md:px-8 border-b border-[#F5F2EBE5] flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="relative w-full md:w-80">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A89B8C]" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                className="w-full pl-10 pr-4 py-3 bg-[#F9F9F7] border border-[#EBEAE5] text-xs font-light focus:outline-none focus:border-[#A89B8C] transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                            <button className="flex items-center gap-2 px-4 py-2 text-[#5A5A5A] hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
                                <Filter size={14} />
                                <span className="font-display text-[10px] tracking-[0.1em] uppercase">All Status</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-[#5A5A5A] hover:text-[#1A1A1A] transition-colors whitespace-nowrap">
                                <Calendar size={14} />
                                <span className="font-display text-[10px] tracking-[0.1em] uppercase">Last 12 Months</span>
                            </button>
                        </div>
                    </div>

                    {/* Content Section */}
                    {isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-[#A89B8C] gap-4">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="font-display text-[10px] tracking-[0.2em] uppercase">Retrieving Records...</span>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center text-red-500 font-display text-[10px] tracking-[0.1em] uppercase">
                            {error}
                        </div>
                    ) : reservations.length === 0 ? (
                        <div className="py-20 text-center text-[#A89B8C] font-display text-[10px] tracking-[0.1em] uppercase shadow-inner">
                            No payment history found.
                        </div>
                    ) : (
                        <>
                            {/* Table (Desktop) */}
                            <div className="hidden lg:block">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[#F9F9F7] border-b border-[#F5F2EBE5]">
                                            <th className="px-8 py-5 font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] font-semibold">Description</th>
                                            <th className="px-8 py-5 font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] font-semibold">Date</th>
                                            <th className="px-8 py-5 font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] font-semibold">Status</th>
                                            <th className="px-8 py-5 font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] font-semibold">Amount</th>
                                            <th className="px-8 py-5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F5F2EBE5]">
                                        {reservations.map((res) => (
                                            <tr key={res.id} className="hover:bg-[#FAFAF8] transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${res.status === 'CONFIRMED' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                            {res.status === 'CONFIRMED' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-display text-sm text-[#1A1A1A] font-medium mb-0.5">
                                                                Reservation - {res.unit?.unitNumber || 'Villa'}
                                                            </p>
                                                            <p className="text-[10px] text-[#A89B8C] uppercase tracking-wider">
                                                                {res.unit?.project?.name || 'Keanu Riverside'} • {res.id.slice(0, 8).toUpperCase()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 font-display text-xs text-[#5A5A5A]">
                                                    {new Date(res.createdAt || res.lockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[9px] tracking-[0.1em] uppercase font-bold ${getStatusStyles(res.status)}`}>
                                                        {formatStatus(res.status)}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 font-display text-base font-semibold text-[#1A1A1A]">
                                                    {formatPrice(res.depositAmount)}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {res.status === 'PENDING' && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCancelClick(res)}
                                                                    className="px-3 py-1.5 border border-red-100 text-red-500 text-[9px] tracking-widest uppercase hover:bg-red-50 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <Link
                                                                    to={`/checkout/payment/${res.id}`}
                                                                    className="px-3 py-1.5 bg-[#1A1A1A] text-white text-[9px] tracking-widest uppercase hover:bg-[#333] transition-colors"
                                                                >
                                                                    Pay
                                                                </Link>
                                                            </>
                                                        )}
                                                        {res.status === 'CONFIRMED' && (
                                                            <button className="p-2 text-[#A89B8C] opacity-0 group-hover:opacity-100 hover:text-[#1A1A1A] transition-all">
                                                                <Download size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View (Cards) */}
                            <div className="lg:hidden divide-y divide-[#F5F2EBE5]">
                                {reservations.map((res) => (
                                    <div key={res.id} className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${res.status === 'CONFIRMED' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    {res.status === 'CONFIRMED' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                                </div>
                                                <div>
                                                    <p className="font-display text-sm text-[#1A1A1A] font-medium">Reservation - {res.unit?.unitNumber || 'Villa'}</p>
                                                    <p className="text-[10px] text-[#A89B8C] uppercase tracking-wider">
                                                        {new Date(res.createdAt || res.lockedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-display text-base font-semibold text-[#1A1A1A]">
                                                {formatPrice(res.depositAmount)}
                                            </p>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className={`inline-block px-3 py-1 rounded-full text-[9px] tracking-[0.1em] uppercase font-bold ${getStatusStyles(res.status)}`}>
                                                {formatStatus(res.status)}
                                            </span>
                                            <div className="flex gap-3">
                                                {res.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleCancelClick(res)}
                                                            className="text-[9px] tracking-[0.1em] uppercase text-red-500 font-bold"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <Link
                                                            to={`/checkout/payment/${res.id}`}
                                                            className="text-[9px] tracking-[0.1em] uppercase text-[#1A1A1A] font-bold"
                                                        >
                                                            Pay
                                                        </Link>
                                                    </>
                                                )}
                                                {res.status === 'CONFIRMED' && (
                                                    <button className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase text-[#A89B8C] font-semibold">
                                                        Receipt <Download size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {!isLoading && hasMore && reservations.length > 0 && (
                        <div className="p-8 bg-[#F9F9F7] text-center border-t border-[#F5F2EBE5]">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="font-display text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                            >
                                {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoadingMore ? "Loading..." : "Load More Transactions"}
                            </button>
                        </div>
                    )}
                </section>

                {/* Cancellation Confirmation Modal */}
                {isCancelModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md shadow-2xl border border-[#EBEAE5] p-8 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex flex-col items-center text-center space-y-6">
                                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h2 className="font-serif text-2xl text-[#1A1A1A] mb-2">Cancel Reservation?</h2>
                                    <p className="text-sm text-[#5A5A5A] font-light leading-relaxed">
                                        Are you sure you want to cancel your reservation for <span className="font-semibold">{selectedReservation?.unit?.unitNumber || 'this villa'}</span>? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex gap-4 w-full">
                                    <button
                                        onClick={() => setIsCancelModalOpen(false)}
                                        className="flex-1 py-4 border border-[#EBEAE5] text-[#5A5A5A] font-display text-[10px] tracking-[0.2em] uppercase hover:bg-[#F9F9F7] transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleConfirmCancel}
                                        disabled={isCancelling}
                                        className="flex-1 py-4 bg-red-600 text-white font-display text-[10px] tracking-[0.2em] uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {isCancelling ? "Cancelling..." : "Confirm Cancel"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
