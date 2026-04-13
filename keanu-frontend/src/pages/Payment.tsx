import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Lock, ArrowRight, CreditCard, Menu, X } from "lucide-react";
import { getReservation } from "../services/reservationService";
import { useSocket } from "../contexts/SocketContext";
import NotificationModal from "../components/NotificationModal";
import CheckoutProvider from "../components/payment/CheckoutProvider";
import PaymentForm from "../components/payment/PaymentForm";
import { UserProfileDropdown } from "../components/UserProfileDropdown";
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
    features: Record<string, any>;
    project: {
        name: string;
        depositAmount: number;
    };
};

export default function Payment() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [villa, setVilla] = useState<ApiVillaDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [reservationEmail, setReservationEmail] = useState<string | null>(null);

    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
    const { socket } = useSocket();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { pathname } = useLocation();

    const navLinks = [
        { to: "/", label: "Residences" },
        { to: "/masterplan", label: "Masterplan" },
        { to: "/about", label: "About" },
        { to: "/shortlist", label: "Shortlist" },
    ];

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        async function fetchVillaAndIntent() {
            if (!id) return;
            try {
                const fetchId = Number.isNaN(Number(id)) ? id : "42782d64-6818-4233-813e-04c931515ab3";
                const res = await getReservation(fetchId);
                if (res && res.unit) {
                    // Guard: if already paid, redirect to success page
                    if (res.paymentStatus === "SUCCEEDED" && res.status === "CONFIRMED") {
                        navigate(`/checkout/success/${id}`, { replace: true });
                        return;
                    }
                    const mappedVilla = {
                        ...res.unit,
                        project: {
                            ...res.project,
                            depositAmount: res.depositAmount
                        }
                    };
                    setVilla(mappedVilla);
                    if (res.timeRemaining !== undefined) {
                        setTimeLeft(Math.max(0, res.timeRemaining));
                    }
                    if (res.buyerEmail) {
                        setReservationEmail(res.buyerEmail);
                    } else if (res.user?.email) {
                        setReservationEmail(res.user.email);
                    }

                    // Create payment intent using the reservation-specific endpoint
                    try {
                        const token = localStorage.getItem("accessToken");
                        const intentResponse = await fetch(`${API_BASE}/payment/${id}/payment-intent`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                                paymentMethod: 'stripe'
                            }),
                        });

                        if (intentResponse.ok) {
                            const data = await intentResponse.json();
                            if (data.clientSecret) {
                                setClientSecret(data.clientSecret);
                            }
                        } else {
                            console.error("Failed to create Stripe payment intent");
                        }
                    } catch (intentErr) {
                        console.error("Error creating payment intent:", intentErr);
                    }

                } else {
                    throw new Error("Invalid reservation data");
                }
            } catch (err) {
                console.error("Failed to fetch villa:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchVillaAndIntent();
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

    useEffect(() => {
        if (timeLeft <= 0) {
            setErrorModal({
                isOpen: true,
                title: "Reservation Expired",
                message: "Your reservation lock has expired. You will be redirected to the homepage."
            });
            return;
        }
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, navigate]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#EAE8E2] flex items-center justify-center">
                <span className="font-display text-xs tracking-[0.15em] uppercase text-[#8B95A1] animate-pulse">
                    Preparing Checkout...
                </span>
            </div>
        );
    }

    if (!villa) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] bg-[#EAE8E2]">
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

    // For string manipulation in the form '1 Suites'
    const displayBedrooms = villa.bedrooms;
    const handleBackToReview = () => {
        if (id) {
            navigate(`/checkout/review/${id}`);
            return;
        }
        navigate("/shortlist");
    };

    return (
        <div className="bg-[#EAE8E2] text-[#2A332C] min-h-screen flex flex-col relative">
            {/* Left side grey block accent from image */}

            {/* Synchronized Checkout Header */}
            <div className="pt-8 pb-4 px-4 sm:px-6 md:px-16 flex flex-col w-full relative z-[60] gap-4 bg-transparent">
                {/* Row 1: Timer (Full Width) */}
                <div className="w-full flex justify-center">
                    <div className="flex items-center gap-2 text-[#2A332C] bg-white px-4 py-2.5 rounded-sm border border-[#D5D3CC] shadow-sm w-full sm:w-auto justify-center">
                        <ClockIcon className="w-4 h-4 shrink-0 text-[#6D6353]" />
                        <span className="font-display text-[11px] tracking-[0.15em] uppercase whitespace-nowrap font-black">
                            RESERVATION LOCKED: <span className="text-[#6D6353] ml-1">{formatTime(timeLeft)}</span>
                        </span>
                    </div>
                </div>

                {/* Row 2: Back Button and Steps */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
                    <div className="relative z-[70] pointer-events-auto flex items-center justify-between w-full md:w-auto">
                        <button
                            type="button"
                            onClick={handleBackToReview}
                            className="flex items-center gap-2 text-[#1A1A1A] hover:bg-[#D5D3CC]/20 transition-all font-display text-[10px] tracking-[0.2em] uppercase border border-[#D5D3CC] px-4 py-2 rounded-sm font-bold shadow-sm bg-white/50"
                        >
                            <ChevronLeft size={16} />
                            <span>Back to Review</span>
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            className="text-[#2A332C] hover:opacity-70 transition-opacity md:hidden"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8">
                        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[#4A4A4A] font-bold">01 Review</span>
                        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[#1A1A1A] font-black border-b-2 border-[#1A1A1A] pb-1">02 Payment</span>
                        <span className="font-display text-[10px] tracking-[0.2em] uppercase text-[#4A4A4A] font-bold">03 Confirmation</span>
                    </div>
                </div>
            </div>

            {/* Mobile/Global Menu Overlay */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-[55] bg-[#EAE8E2] flex flex-col pt-32 px-10 pb-10 animate-fade-in sm:hidden">
                    <div className="flex flex-col gap-8 text-center flex-1">
                        {navLinks.map((link) => {
                            const isActive = link.to === pathname;
                            return (
                                <Link
                                    key={link.label}
                                    to={link.to}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`font-serif text-3xl tracking-wide uppercase transition-colors ${isActive ? "text-[#1A1A1A]" : "text-[#7A7E7A]"}`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-6 mt-auto">
                        <div className="flex justify-center border-t border-[#D5D3CC] pt-8">
                            <UserProfileDropdown dropUp onItemClick={() => setIsMenuOpen(false)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Side Menu Drawer for Desktop */}
            {isMenuOpen && (
                <div className="hidden sm:block fixed inset-0 z-[55] animate-fade-in">
                    <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="absolute top-0 right-0 w-[400px] h-full bg-[#EAE8E2] shadow-2xl p-16 flex flex-col justify-center animate-slide-in-right">
                        <h2 className="font-display text-[10px] tracking-[0.3em] uppercase text-[#A0A29F] mb-12">Navigation</h2>
                        <div className="flex flex-col gap-8">
                            {navLinks.map((link) => {
                                const isActive = link.to === pathname;
                                return (
                                    <Link
                                        key={link.label}
                                        to={link.to}
                                        onClick={() => setIsMenuOpen(false)}
                                        className={`font-serif text-5xl tracking-tight uppercase transition-colors hover:translate-x-3 duration-300 inline-block ${isActive ? "text-[#1A1A1A]" : "text-[#7A7E7A] hover:text-[#1A1A1A]"}`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="mt-20 pt-10 border-t border-[#D5D3CC]">
                            <p className="font-display text-[9px] tracking-[0.2em] uppercase text-[#7A7E7A] mb-4">Contact us</p>
                            <p className="font-serif text-lg text-[#1A1A1A]">info@keanuresidences.com</p>
                            <p className="font-serif text-lg text-[#1A1A1A] mt-1">+62 819-5960-0007</p>
                        </div>
                    </div>
                </div>
            )}

            <section className="flex-1 px-4 sm:px-6 md:px-16 py-12 max-w-[1500px] w-full mx-auto">
                {/* Checkout Flow Steps */}
                <div className="flex items-center gap-2 mb-10 font-display text-[9px] tracking-[0.2em] uppercase text-[#A0A29F]">
                    <span>SELECT</span>
                    <span>›</span>
                    <span>REVIEW</span>
                    <span>›</span>
                    <span className="text-[#6D6353] font-bold">PAYMENT</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-16 items-start">
                    {/* Left Column: Summary */}
                    <div className="max-w-xl">
                        <h2 className="font-serif text-[36px] md:text-[42px] text-[#1A1A1A] leading-[1.05] uppercase mb-4 tracking-wide font-black">
                            Confirm Your Selection
                        </h2>
                        <p className="font-lato text-[14px] text-[#4A4A4A] font-medium leading-relaxed mb-10 max-w-md">
                            Complete the reservation deposit to confirm your selection, subject to adviser review and reservation terms.
                        </p>

                        {/* Villa Card (Mini) */}
                        <div className="bg-white border-0 flex overflow-hidden relative group mb-14 drop-shadow-sm min-h-[180px] md:h-[200px]">
                            <div className="w-[38%] sm:w-[45%] shrink-0 relative overflow-hidden bg-[#EBEAE5]">
                                <img
                                    src={villa.imageUrls?.[0] || "/images/3.png"}
                                    alt={title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[10%]"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="flex-1 min-w-0 p-4 sm:p-6 flex flex-col justify-center relative bg-white">
                                <div className="absolute top-1/2 -translate-y-1/2 -right-6 pointer-events-none opacity-[0.05] z-0">
                                    <span className="font-serif text-[220px] leading-none">K</span>
                                </div>
                                <div className="relative z-10 flex justify-between items-start mb-1 gap-2">
                                    <h3 className="font-serif text-lg sm:text-2xl text-[#1A1A1A] uppercase tracking-wide leading-tight font-bold">{title}</h3>
                                    <span className="bg-[#1A1A1A] text-white text-[9px] font-display tracking-[0.2em] uppercase px-2.5 py-1.5 shrink-0 font-bold">SELECTED</span>
                                </div>
                                <p className="font-display text-[10px] tracking-[0.15em] uppercase text-[#6D6353] mb-4 font-bold">{typeLabel}</p>

                                <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                                    <div>
                                        <span className="block font-display text-[8px] tracking-[0.15em] uppercase text-[#6D6353] mb-1 font-bold">INTERIOR</span>
                                        <span className="font-lato text-[12px] text-[#1A1A1A] font-bold">{villa.size} sq m</span>
                                    </div>
                                    <div>
                                        <span className="block font-display text-[8px] tracking-[0.15em] uppercase text-[#6D6353] mb-1 font-bold">EXTERIOR</span>
                                        <span className="font-lato text-[12px] text-[#1A1A1A] font-bold">{villa.features?.land || '-'} sq m</span>
                                    </div>
                                    <div>
                                        <span className="block font-display text-[8px] tracking-[0.15em] uppercase text-[#6D6353] mb-1 font-bold">BEDROOMS</span>
                                        <span className="font-lato text-[12px] text-[#1A1A1A] font-bold">{displayBedrooms} Suites</span>
                                    </div>
                                    <div>
                                        <span className="block font-display text-[8px] tracking-[0.15em] uppercase text-[#6D6353] mb-1 font-bold">COMPLETION</span>
                                        <span className="font-lato text-[12px] text-[#1A1A1A] font-bold">Q2 2026</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="space-y-4">
                            <h4 className="font-serif text-[16px] sm:text-[20px] text-[#1A1A1A] uppercase tracking-wider mb-4 font-bold">Payment Summary</h4>
                            <div className="flex justify-between items-center py-2.5 border-b border-[#D5D3CC]">
                                <span className="font-lato text-[13px] sm:text-[14px] text-[#4A4A4A] font-bold">Reservation Deposit</span>
                                <span className="font-display text-[13px] font-bold text-[#1A1A1A] ml-4 shrink-0">{formattedDeposit} {currency}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-[#D5D3CC]">
                                <span className="font-lato text-[13px] sm:text-[14px] text-[#4A4A4A] font-bold">Processing Fee</span>
                                <span className="font-display text-[13px] font-bold text-[#1A1A1A] ml-4 shrink-0">$0.00</span>
                            </div>
                            <div className="pt-4 flex justify-between items-baseline gap-4">
                                <span className="font-serif text-[18px] sm:text-[20px] text-[#1A1A1A] tracking-wider uppercase font-bold">Total Due Today</span>
                                <span className="font-serif text-[20px] sm:text-[24px] text-[#6D6353] font-black shrink-0">{formattedDeposit} {currency}</span>
                            </div>
                            <p className="font-lato text-[11px] text-[#6D6353] mt-6 font-bold max-w-sm italic">
                                * This deposit is fully refundable within 14 days pending contract review.
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Secure Checkout Form */}
                    {clientSecret ? (
                        <CheckoutProvider clientSecret={clientSecret}>
                            <PaymentForm reservationId={id || ''} email={reservationEmail || ''} />
                        </CheckoutProvider>
                    ) : (
                        <div className="w-full bg-white p-5 sm:p-8 lg:p-10 xl:p-12 shadow-xl border border-[#EBE9E1] min-h-[500px] flex items-center justify-center">
                            <span className="font-display text-xs tracking-[0.15em] uppercase text-[#8B95A1] animate-pulse">
                                Securing payment context...
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="w-full border-t border-[#DFDDD7] px-8 md:px-16 pt-12 pb-16 mt-16 flex flex-col md:flex-row justify-between items-start md:items-end bg-transparent">
                <div>
                    <img
                        src="/images/logos/Primary Logo/Keanu Primary Logo Brown.png"
                        alt="KEANU Residences"
                        className="h-10 mb-6"
                    />
                    <h5 className="font-display text-[9px] tracking-[0.2em] uppercase text-[#7A7E7A] mb-2 font-medium">Residences</h5>
                    <p className="font-lato text-[11px] text-[#A0A29F] font-light leading-relaxed mb-4 md:mb-0">Keramas, Bali <br /> Sunrise Coast Living</p>
                </div>

                <div className="flex flex-col items-start md:items-end">
                    <div className="flex gap-6 mb-10">
                        <Link to="/#residences" className="font-display text-[10px] tracking-[0.15em] uppercase text-[#2A332C] font-semibold hover:text-[#6D6353]">Residences</Link>
                        <Link to="/#location" className="font-display text-[10px] tracking-[0.15em] uppercase text-[#2A332C] font-semibold hover:text-[#6D6353]">Location</Link>
                        <Link to="/contact" className="font-display text-[10px] tracking-[0.15em] uppercase text-[#2A332C] font-semibold hover:text-[#6D6353]">Contact</Link>
                    </div>
                    <p className="font-lato text-[9px] text-[#A0A29F] font-light">© 2024 Keanu Residences. All rights reserved.</p>
                </div>
            </footer>

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
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
