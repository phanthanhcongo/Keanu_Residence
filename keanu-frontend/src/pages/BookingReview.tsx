import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { getReservation, cancelReservation } from "../services/reservationService";
import { useSocket } from "../contexts/SocketContext";
import NotificationModal from "../components/NotificationModal";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toUserErrorMessage } from "../utils/errorMessage";
import { useCurrency } from "../contexts/CurrencyContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type ApiVillaDetail = {
    id: string;
    unitNumber: string;
    unitType: string;
    size: number;
    bedrooms: number;
    price: number;
    launchPrice: number | null;
    imageUrls: string[];
    description: string;
    project: {
        name: string;
        depositAmount: number;
    };
};

export default function BookingReview() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [villa, setVilla] = useState<ApiVillaDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const { socket } = useSocket();

    useEffect(() => {
        async function fetchVilla() {
            if (!id) return;
            try {
                const fetchId = Number.isNaN(Number(id)) ? id : "42782d64-6818-4233-813e-04c931515ab3";

                // Fetch the reservation to get the locked unit details
                const res = await getReservation(fetchId);
                if (res && res.unit) {
                    setVilla({
                        ...res.unit,
                        project: {
                            ...res.project,
                            depositAmount: res.depositAmount
                        }
                    });
                } else {
                    throw new Error("Invalid reservation data");
                }
            } catch (err) {
                console.error("Failed to fetch villa:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchVilla();
    }, [id]);

    useEffect(() => {
        if (!socket || !id) return;

        const handleReservationExpired = (data: { reservationId: string }) => {
            if (data.reservationId === id) {
                setErrorModal({
                    isOpen: true,
                    title: "Reservation Expired",
                    message: "Your reservation lock has expired. You will be redirected to the homepage."
                });
            }
        };

        socket.on('reservation:expired', handleReservationExpired);

        return () => {
            socket.off('reservation:expired', handleReservationExpired);
        };
    }, [socket, id, navigate]);

    const handleCancelReservation = async () => {
        if (!id) return;
        try {
            setIsCancelling(true);
            await cancelReservation(id);
            setIsCancelModalOpen(false);
            navigate("/");
        } catch (err) {
            console.error("Failed to cancel reservation:", err);
            setErrorModal({
                isOpen: true,
                title: "Cancellation Failed",
                message: toUserErrorMessage(err, "Failed to cancel reservation. Please try again.")
            });
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#eae8e2] flex items-center justify-center">
                <span className="font-display text-xs tracking-[0.15em] uppercase text-[#8B95A1] animate-pulse">
                    Retrieving Reservation Details...
                </span>
            </div>
        );
    }

    if (!villa) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <h2 className="font-serif text-3xl text-[#1A1A1A] mb-4">Villa Not Found</h2>
                    <Link to="/" className="font-display text-xs tracking-[0.15em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors">
                        ← Back to Collection
                    </Link>
                </div>
            </div>
        );
    }

    const numStr = villa.unitNumber.replace(/[A-Za-z]/g, '').trim();
    const title = `Residence ${numStr.padStart(2, '0')}`;
    const letterSuffix = villa.unitNumber.replace(/[0-9]/g, '').toUpperCase();
    const romanMap: Record<string, string> = { A: 'Type I', B: 'Type II', C: 'Type III', D: 'Type IV' };
    const typeLabel = romanMap[letterSuffix] || `Type ${letterSuffix}`;

    const depositAmount = villa.project?.depositAmount || 1000;
    const { formatPrice, currency } = useCurrency();
    const formattedDeposit = formatPrice(depositAmount);

    return (
        <section className="px-6 md:px-12 lg:px-16 py-8 md:py-12 bg-[#eae8e2] min-h-screen">
            {/* Synchronized Checkout Header */}
            <div className="py-8 flex flex-col md:flex-row items-center justify-between w-full relative z-[60] gap-6 md:gap-0 bg-transparent mb-12">
                <Link
                    to={villa ? `/villa/${villa.id}` : "/"}
                    className="flex items-center gap-2 font-display text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A] hover:bg-[#D5D3CC]/20 transition-all border border-[#D5D3CC] px-4 py-2 rounded-sm font-bold shadow-sm bg-white/50"
                >
                    <ChevronLeft size={16} />
                    <span>Back to Residences</span>
                </Link>
                <div className="flex items-center gap-8">
                    <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A] font-black border-b-2 border-[#1A1A1A] pb-1">01 Review</span>
                    <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[#4A4A4A] font-bold">02 Payment</span>
                    <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[#4A4A4A] font-bold">03 Confirmation</span>
                </div>
            </div>

            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
                    {/* Left Column: Terms & Summary */}
                    <div>
                        <span className="font-display text-[11px] tracking-[0.25em] uppercase text-[#6D6353] block mb-3 font-bold">Priority Reservation</span>
                        <h1 className="font-serif text-5xl md:text-6xl text-[#1A1A1A] mb-8 leading-tight uppercase font-black">
                            Review your <br /><span className="italic">Reservation</span>
                        </h1>

                        <div className="space-y-10">
                            {/* Villa Highlight */}
                            <div className="flex gap-6 items-start pb-10 border-b border-[#EBEAE5]">
                                <div className="w-48 h-32 overflow-hidden bg-[#EBEAE5] shrink-0">
                                    <img
                                        src={villa.imageUrls?.[0] || "/images/3.png"}
                                        alt={title}
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                </div>
                                <div>
                                    <h2 className="font-serif text-2xl text-[#1A1A1A] mb-1 font-bold">{title}</h2>
                                    <p className="font-display text-[11px] tracking-[0.15em] uppercase text-[#6D6353] mb-3 font-bold">{typeLabel} — {villa.bedrooms} Bedrooms</p>
                                    <p className="text-[15px] text-[#4A4A4A] leading-relaxed font-medium line-clamp-2 italic">
                                        "{villa.description}"
                                    </p>
                                </div>
                            </div>

                            {/* Reservation Terms */}
                            <div>
                                <h3 className="font-serif text-xl text-[#1A1A1A] mb-6 flex items-center gap-3 font-bold">
                                    <ShieldCheck size={20} className="text-[#6D6353]" />
                                    Reservation Terms
                                </h3>
                                <div className="space-y-4 text-[15px] text-[#1A1A1A] font-medium leading-relaxed">
                                    <div className="flex gap-4 p-4 bg-white border border-[#D5D3CC] shadow-sm">
                                        <div className="w-1.5 h-full bg-[#6D6353]" />
                                        <p>This reservation deposit of <span className="font-black text-[#1A1A1A] underline">{formattedDeposit} USD</span> secures your priority position for {title}. This amount is fully refundable within 14 days of payment, pending contract review.</p>
                                    </div>
                                    <p>By proceeding, you acknowledge that this is a reservation fee and not the full purchase price. You will be contacted by your advisor within 24 hours to schedule a final contract review and virtual walkthrough.</p>
                                    <ul className="list-disc pl-5 space-y-2 text-[14px] font-bold text-[#4A4A4A]">
                                        <li>Priority selection to floor plan customizations</li>
                                        <li>Direct advisor coordination through review and documentation</li>
                                        <li>Reservation terms confirmed before contract stage</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary Card */}
                    <div className="lg:sticky lg:top-8 lg:self-start">
                        <div className="bg-white border border-[#EBEAE5] p-8 shadow-sm">
                            <h3 className="font-serif text-2xl text-[#1A1A1A] mb-8 uppercase tracking-wider italic">Reservation Summary</h3>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-display text-[11px] tracking-[0.15em] uppercase text-[#4A4A4A] font-bold">Reservation Deposit</span>
                                    <span className="font-display text-base font-black text-[#1A1A1A]">{formattedDeposit}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-display text-[11px] tracking-[0.15em] uppercase text-[#4A4A4A] font-bold">Processing Fee</span>
                                    <span className="font-display text-base font-black text-[#1A1A1A]">$0.00</span>
                                </div>
                                <div className="pt-4 border-t border-[#D5D3CC] flex justify-between items-end">
                                    <div>
                                        <span className="font-display text-[11px] tracking-[0.15em] uppercase text-[#6D6353] block mb-1 font-black">Total Due Today</span>
                                        <span className="text-[11px] text-[#6D6353] font-bold italic underline decoration-dotted">Currency: {currency}</span>
                                    </div>
                                    <span className="font-serif text-3xl md:text-4xl text-[#1A1A1A] leading-none font-black">{formattedDeposit}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-[#F2F1ED] mb-8 text-[#1A1A1A] border border-[#D5D3CC]">
                                <Clock size={16} className="shrink-0 text-[#6D6353]" />
                                <span className="text-[12px] leading-snug font-bold italic">Your quoted rate and availability are held for the next 10 minutes while you finalise your reservation.</span>
                            </div>

                            <button
                                onClick={() => navigate(`/checkout/payment/${id}`)}
                                className="w-full flex items-center justify-center gap-3 py-5 bg-[#1A1A1A] text-white font-display text-[11px] tracking-[0.2em] uppercase hover:bg-[#333] transition-all group"
                            >
                                Proceed to Payment
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>

                            <p className="mt-6 text-[10px] text-center text-[#A89B8C] leading-relaxed">
                                All major credit cards and wire transfers accepted.
                            </p>

                            <button
                                onClick={() => setIsCancelModalOpen(true)}
                                className="w-full flex items-center justify-center gap-2 mt-4 py-3 border border-red-200 text-red-500 font-display text-[10px] tracking-[0.2em] uppercase hover:bg-red-50 transition-all group"
                            >
                                <Trash2 size={14} />
                                Cancel Reservation
                            </button>
                        </div>
                    </div>
                </div>

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
                                        Are you sure you want to cancel your reservation for <span className="font-semibold">{title}</span>? This will release the villa lock for other buyers.
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
                                        onClick={handleCancelReservation}
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

                <NotificationModal
                    isOpen={errorModal.isOpen}
                    onClose={() => {
                        setErrorModal(prev => ({ ...prev, isOpen: false }));
                        navigate("/");
                    }}
                    title={errorModal.title}
                    message={errorModal.message}
                />
            </div>
        </section>
    );
}
