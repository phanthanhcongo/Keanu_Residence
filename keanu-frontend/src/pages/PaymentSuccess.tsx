import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { Clock, Download, ChevronLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { checkReservationPaymentStatus, getReservation } from "../services/reservationService";
import { useCurrency } from "../contexts/CurrencyContext";

type ReservationData = {
    id: string;
    createdAt: string;
    depositAmount: number;
    status: string;
    paymentStatus: string;
    unit: {
        id: string;
        unitNumber: string;
        unitType: string;
        imageUrls?: string[];
        project?: {
            name: string;
            estimatedCompletion?: string;
        };
    };
};

// Short reservation display ID from UUID
function shortReservationId(id: string): string {
    if (!id) return "KR-XXXX-X";
    const parts = id.replace(/-/g, "").toUpperCase();
    return `KR-${parts.slice(0, 4)}-${parts.slice(4, 5)}`;
}



export default function PaymentSuccess() {
    const { formatPrice, currency } = useCurrency();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [reservation, setReservation] = useState<ReservationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [revealed, setRevealed] = useState(false);
    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntentFromRedirect = searchParams.get("payment_intent");

    // Intercept browser back button — redirect to Home instead of payment pages
    useEffect(() => {
        window.history.pushState(null, "", window.location.href);
        const handlePopState = () => {
            navigate("/", { replace: true });
        };
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [navigate]);

    useEffect(() => {
        let isActive = true;

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        const toFailedCheckout = (reason: string) => {
            if (!id) {
                navigate("/", { replace: true });
                return;
            }
            const query = new URLSearchParams({ reason }).toString();
            navigate(`/checkout/failed/${id}?${query}`, { replace: true });
        };

        async function fetchReservation() {
            if (!id) {
                setLoading(false);
                return;
            }

            if (redirectStatus && redirectStatus !== "succeeded" && redirectStatus !== "processing") {
                toFailedCheckout("Checkout failed. Your payment was not completed.");
                return;
            }

            try {
                let latestReservation: ReservationData | null = null;

                for (let attempt = 0; attempt < 8; attempt++) {
                    // Force backend sync (Stripe -> reservation -> unit status)
                    await checkReservationPaymentStatus(
                        id,
                        paymentIntentFromRedirect || undefined,
                    ).catch(() => null);

                    const res = await getReservation(id);
                    latestReservation = res;

                    if (res?.paymentStatus === "SUCCEEDED" && res?.status === "CONFIRMED") {
                        if (isActive) {
                            setReservation(res);
                        }
                        return;
                    }

                    if (res?.paymentStatus === "FAILED" || res?.status === "FAILED" || res?.status === "CANCELLED") {
                        toFailedCheckout("Checkout failed. Your card was not charged.");
                        return;
                    }

                    if (attempt < 7) {
                        await sleep(1000);
                    }
                }

                if (latestReservation?.paymentStatus === "SUCCEEDED" && latestReservation?.status === "CONFIRMED") {
                    if (isActive) {
                        setReservation(latestReservation);
                    }
                    return;
                }

                // Stripe redirected with succeeded, but backend sync may still be in progress.
                // Do not force-fail in this state to avoid false negative UX.
                if ((redirectStatus === "succeeded" || redirectStatus === "processing") && latestReservation) {
                    if (isActive) {
                        setReservation(latestReservation);
                    }
                    return;
                }

                toFailedCheckout("We could not verify your payment. Please try again.");
            } catch (err) {
                console.error("Failed to fetch reservation:", err);
                toFailedCheckout("Unable to verify checkout status. Please try again.");
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        }

        fetchReservation();

        return () => {
            isActive = false;
        };
    }, [id, navigate, paymentIntentFromRedirect, redirectStatus]);

    // Trigger card reveal + gold confetti after load
    useEffect(() => {
        if (loading) return;

        // Stagger: slight delay so background renders first
        const revealTimer = setTimeout(() => setRevealed(true), 100);

        // Gold confetti burst — elegant, luxury palette
        const fireConfetti = () => {
            const colors = ["#C9A96E", "#E8D5A3", "#F5ECD7", "#8B7355", "#ffffff"];

            // Left burst
            confetti({
                particleCount: 60,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.65 },
                colors,
                gravity: 0.9,
                scalar: 1.1,
                drift: 0.5,
            });

            // Right burst
            confetti({
                particleCount: 60,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.65 },
                colors,
                gravity: 0.9,
                scalar: 1.1,
                drift: -0.5,
            });
        };

        const confettiTimer1 = setTimeout(fireConfetti, 400);
        const confettiTimer2 = setTimeout(fireConfetti, 1200);

        return () => {
            clearTimeout(revealTimer);
            clearTimeout(confettiTimer1);
            clearTimeout(confettiTimer2);
        };
    }, [loading]);

    const handleDownloadReceipt = () => {
        // Simple and effective: Use window.print() which allows saving as PDF
        // with specialized @media print styles added below.
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#2C2F28] flex items-center justify-center">
                <span className="font-display text-xs tracking-[0.2em] uppercase text-white/40 animate-pulse">
                    Confirming Reservation...
                </span>
            </div>
        );
    }

    const unit = reservation?.unit;
    const villaImage =
        unit?.imageUrls?.[0] ||
        "/images/unit_primary/Villa exterior with pool at dusk.png";
    const residenceName = unit ? `Residence ${unit.unitNumber}` : "Your Residence";
    const displayId = shortReservationId(reservation?.id || "");
    const depositAmount = reservation?.depositAmount ?? 1000;
    const estimatedCompletion =
        unit?.project?.estimatedCompletion || "Q4 2027 (PBG Secured)";

    return (
        <div
            className="min-h-screen w-full relative flex flex-col"
            style={{
                backgroundImage: "url('/images/reservation/bg_reservation_secure.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}
        >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/55 z-0" />


            {/* Synchronized Checkout Header (Dark Version) */}
            <div className="py-8 px-6 md:px-16 flex flex-col md:flex-row items-center justify-between w-full relative z-[60] gap-6 md:gap-0 bg-transparent">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <Link
                        to="/"
                        className="flex items-center gap-2 text-white hover:bg-white/10 transition-all font-display text-[10px] tracking-[0.2em] uppercase border border-white/30 px-4 py-2 rounded-sm font-bold shadow-sm bg-black/20"
                    >
                        <ChevronLeft size={16} />
                        <span>Back to Home</span>
                    </Link>
                </div>

                <div className="flex items-center gap-6 md:gap-8">
                    <span className="font-display text-[10px] tracking-[0.2em] uppercase text-white/50 font-bold">01 Review</span>
                    <span className="font-display text-[10px] tracking-[0.2em] uppercase text-white/50 font-bold">02 Payment</span>
                    <span className="font-display text-[10px] tracking-[0.2em] uppercase text-white font-black border-b-2 border-white pb-1">03 Confirmation</span>
                </div>
            </div>

            {/* Main content — vertically and horizontally centered */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
                <div className="w-full max-w-3xl">
                    {/* Split Card — animates in on reveal */}
                    <div
                        className="flex flex-col md:flex-row shadow-2xl transition-all duration-700 ease-out"
                        style={{
                            opacity: revealed ? 1 : 0,
                            transform: revealed ? "translateY(0px)" : "translateY(32px)",
                        }}
                    >
                        {/* Left — Villa Image */}
                        <div className="relative md:w-[42%] aspect-[3/4] md:aspect-auto min-h-[280px] flex-shrink-0 overflow-hidden">
                            <img
                                src={villaImage}
                                alt={residenceName}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            {/* Bottom overlay on image */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <p className="font-display text-[9px] tracking-[0.2em] uppercase text-white/60 mb-1">
                                    {unit?.project?.name || "Keanu Residences"}
                                </p>
                                <h2 className="font-cinzel text-white text-xl md:text-2xl uppercase tracking-wide">
                                    {residenceName}
                                </h2>
                            </div>
                        </div>

                        {/* Right — Details Panel */}
                        <div className="flex-1 bg-[#3A3D30] p-8 md:p-10 flex flex-col justify-between">
                            <div>
                                {/* Status badge */}
                                <span
                                    className="inline-block border border-white/30 text-white/80 font-display text-[9px] tracking-[0.2em] uppercase px-3 py-1 mb-6 transition-all duration-500 ease-out"
                                    style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: "200ms" }}
                                >
                                    Status: Confirmed
                                </span>

                                <h1
                                    className="font-cinzel text-white text-3xl md:text-4xl leading-tight mb-4 transition-all duration-600 ease-out"
                                    style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(16px)", transitionDelay: "350ms" }}
                                >
                                    Reservation<br />Secured
                                </h1>

                                <p
                                    className="font-lato text-white/60 text-sm leading-relaxed mb-8 transition-all duration-500 ease-out"
                                    style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: "500ms" }}
                                >
                                    Welcome to Keanu. Your place in our private enclave
                                    has been successfully reserved.
                                </p>

                                {/* Details grid */}
                                <div
                                    className="grid grid-cols-2 gap-x-6 gap-y-5 mb-8 transition-all duration-500 ease-out"
                                    style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: "650ms" }}
                                >
                                    <div>
                                        <p className="font-display text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1">
                                            Reservation ID
                                        </p>
                                        <p className="font-cinzel text-white/90 text-base tracking-wide">
                                            {displayId}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-display text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1">
                                            Deposit Amount
                                        </p>
                                        <p className="font-cinzel text-white/90 text-base tracking-wide">
                                            {formatPrice(depositAmount)} {currency}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="font-display text-[9px] tracking-[0.2em] uppercase text-white/40 mb-1">
                                            Estimated Completion
                                        </p>
                                        <p className="font-cinzel text-white/90 text-base tracking-wide">
                                            {estimatedCompletion}
                                        </p>
                                    </div>
                                </div>

                                {/* Next Steps box */}
                                <div
                                    className="bg-white/5 border border-white/10 p-5 mb-8 transition-all duration-500 ease-out"
                                    style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: "800ms" }}
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock size={13} className="text-white/50" />
                                        <p className="font-display text-[10px] tracking-[0.15em] uppercase text-white/70">
                                            Next Steps
                                        </p>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {[
                                            "Our concierge will contact you within 24 hours.",
                                            "Formal sales documentation will be shared privately.",
                                            "Schedule your site visit or virtual walkthrough.",
                                        ].map((step) => (
                                            <li
                                                key={step}
                                                className="font-lato text-white/50 text-[11px] leading-relaxed"
                                            >
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div
                                className="flex flex-col sm:flex-row gap-3 transition-all duration-500 ease-out"
                                style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: "950ms" }}
                            >
                                <button
                                    onClick={handleDownloadReceipt}
                                    className="flex items-center justify-center gap-2 flex-1 py-3 px-6 bg-[#8B7355] hover:bg-[#7A6448] text-white font-display text-[10px] tracking-[0.2em] uppercase transition-colors no-print"
                                >
                                    <Download size={13} />
                                    Download Receipt
                                </button>
                                <Link
                                    to="/"
                                    className="flex items-center justify-center flex-1 py-3 px-6 border border-white/30 text-white/80 hover:bg-white/10 font-display text-[10px] tracking-[0.2em] uppercase transition-colors"
                                >
                                    Return to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print, .canvas-confetti { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .min-h-screen { min-height: auto !important; height: auto !important; background: none !important; }
                    .bg-black\\/55, .absolute.inset-0 { display: none !important; }
                    .relative.z-10 { position: static !important; }
                    .max-w-3xl { max-width: 100% !important; margin: 0 !important; width: 100% !important; }
                    .bg-\\[\\#3A3D30\\] { background: #f9f9f9 !important; border: 1px solid #eee !important; color: #1a1a1a !important; }
                    .text-white, .text-white\\/90, .text-white\\/80, .text-white\\/70, .text-white\\/60, .text-white\\/50, .text-white\\/40 { color: #1a1a1a !important; }
                    .border-white\\/30, .border-white\\/10 { border-color: #ddd !important; }
                    .bg-white\\/5 { background: #f0f0f0 !important; border: 1px solid #ddd !important; }
                    img { max-width: 300px !important; margin-bottom: 20px !important; }
                    .flex-col.md\\:flex-row { flex-direction: column !important; }
                    .md\\:w-\\[42\\%\\] { width: 100% !important; }
                    .aspect-\\[3\\/4\\] { aspect-ratio: 16/9 !important; }
                    .p-8, .p-10 { padding: 20px !important; }
                    .shadow-2xl { shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
