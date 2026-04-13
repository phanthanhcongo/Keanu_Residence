import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { cn } from "../utils/cn";
import { villas as staticVillas } from "../data/villas";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { useTracking } from "../hooks/useTracking";
import { TrackingAction } from "../services/trackingService";
import { getReservations } from "../services/reservationService";
import { getShortlist } from "../services/shortlistService";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type ApiVilla = {
    id: string;
    unitNumber: string;
    unitType: string;
    size: number;
    bedrooms: number;
    bathrooms: number;
    price: number;
    launchPrice: number | null;
    status: string;
    shortlistCount: number;
    imageUrls: string[];
    features: Record<string, any>;
    project: {
        id: string;
        name: string;
        slug: string;
        location: string;
    };
};

// Map villa type label based on unit number letter suffix (A=I, B=II, C=III, D=IV)
function formatVillaLabel(unitNumber: string): string {
    const letter = unitNumber.replace(/[0-9]/g, '').toUpperCase();
    const romanMap: Record<string, string> = { A: 'Type I', B: 'Type II', C: 'Type III', D: 'Type IV' };
    return romanMap[letter] || `Type ${letter}`;
}

// Format bedroom description with guest suite
function formatBedroomDesc(bedrooms: number): string {
    if (bedrooms === 1) return "1 bedroom";
    return `${bedrooms} bedroom + guest suite`;
}

// Map a villa number to a display name (strip letter suffix)
function formatVillaName(unitNumber: string): string {
    // Extract just the number part (e.g. '1A' → '1', '2B' → '2')
    const num = unitNumber.replace(/[A-Za-z]/g, '').trim();
    return `Residence ${num.padStart(2, '0')}`;
}

function getStatusStyle(status: string): string {
    switch (status.toUpperCase()) {
        case "AVAILABLE":
            return "bg-white/20 backdrop-blur-sm border-white/30 text-white";
        case "RESERVED":
            return "bg-[#6B7280]/90 backdrop-blur-md border-[#6B7280] text-white";
        case "SOLD":
            return "bg-[#B91C1C]/90 backdrop-blur-md border-[#B91C1C] text-white";
        case "LOCKED":
        case "PENDING":
            return "bg-[#475569]/90 backdrop-blur-md border-[#475569] text-white";
        case "UNAVAILABLE":
            return "bg-[#6B7280]/90 backdrop-blur-md border-[#6B7280] text-white";
        default:
            return "bg-white/20 backdrop-blur-sm border-white/30 text-white";
    }
}

function getStatusLabel(status: string): string {
    if (status.toUpperCase() === "LOCKED") return "PENDING";
    return status;
}

const filters = ["ALL", "Type I", "Type II", "Type III", "Type IV"];

export function VillaGrid() {
    const [activeFilter, setActiveFilter] = useState("ALL");
    const [apiVillas, setApiVillas] = useState<ApiVilla[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { socket } = useSocket();
    const { isAuthenticated } = useAuth();
    const { trackAction } = useTracking();
    const [myPendingVillaIds, setMyPendingVillaIds] = useState<Set<string>>(new Set());
    const [myShortlistedVillaIds, setMyShortlistedVillaIds] = useState<Set<string>>(new Set());

    // Track filter changes
    useEffect(() => {
        if (activeFilter !== "ALL") {
            trackAction({
                action: TrackingAction.FILTER_UNIT,
                metadata: { filter: activeFilter }
            });
        }
    }, [activeFilter, trackAction]);

    const fetchVillas = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/units/villas`);
            if (!res.ok) throw new Error("Failed to fetch villas");
            const data: ApiVilla[] = await res.json();
            setApiVillas(data);
            setError(false);
        } catch (err) {
            console.error("Failed to fetch villas from API:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchVillas();
    }, [fetchVillas]);

    // Fetch current user's pending reservations to know which locked units are theirs
    useEffect(() => {
        if (!isAuthenticated) return;
        async function fetchMyPending() {
            try {
                const response = await getReservations({ status: 'PENDING' });
                const reservations = Array.isArray(response.data) ? response.data : [];
                const villaIds = new Set<string>(reservations.map((r: any) => r.unit?.id).filter(Boolean));
                setMyPendingVillaIds(villaIds);
            } catch {
                // silently ignore
            }
        }
        fetchMyPending();
    }, [isAuthenticated]);

    // Fetch current user's shortlisted villas for "SHORTLISTED" marker on cards
    useEffect(() => {
        if (!isAuthenticated) {
            setMyShortlistedVillaIds(new Set());
            return;
        }

        async function fetchMyShortlist() {
            try {
                const response = await getShortlist();
                const shortlistItems = Array.isArray(response.data) ? response.data : [];
                const villaIds = new Set<string>(
                    shortlistItems
                        .map((item: any) => item.unitId || item.unit?.id)
                        .filter(Boolean)
                );
                setMyShortlistedVillaIds(villaIds);
            } catch {
                // silently ignore shortlist fetch errors
            }
        }

        fetchMyShortlist();
    }, [isAuthenticated]);

    // Listen for project status changes to re-fetch villa list
    useEffect(() => {
        if (!socket) return;

        const handleProjectLive = () => {
            console.log("VillaGrid: project:live received, re-fetching villas");
            fetchVillas();
        };

        const handleProjectStatusChanged = () => {
            console.log("VillaGrid: project:status-changed received, re-fetching villas");
            fetchVillas();
        };

        socket.on("project:live", handleProjectLive);
        socket.on("project:status-changed", handleProjectStatusChanged);

        return () => {
            socket.off("project:live", handleProjectLive);
            socket.off("project:status-changed", handleProjectStatusChanged);
        };
    }, [socket, fetchVillas]);

    // Listen for unit-level status changes (lock, unlock, expire, cancel, reserve)
    useEffect(() => {
        if (!socket) return;

        const updateUnitStatus = (unitId: string, newStatus: string) => {
            setApiVillas((prev) =>
                prev.map((v) =>
                    v.id === unitId ? { ...v, status: newStatus } : v
                )
            );
        };

        const handleUnitLocked = (data: { unitId: string }) => {
            updateUnitStatus(data.unitId, "LOCKED");
        };

        const handleUnitUnlocked = (data: { unitId: string }) => {
            updateUnitStatus(data.unitId, "AVAILABLE");
        };

        const handleUnitReserved = (data: { unitId: string }) => {
            updateUnitStatus(data.unitId, "RESERVED");
        };

        const handleReservationExpired = (data: { unitId: string }) => {
            updateUnitStatus(data.unitId, "AVAILABLE");
        };

        const handleReservationCancelled = (data: { unitId: string }) => {
            updateUnitStatus(data.unitId, "AVAILABLE");
        };

        const handleReservationUpdated = (data: { unitId: string; status: string }) => {
            if (data.status === "CONFIRMED") {
                updateUnitStatus(data.unitId, "RESERVED");
            }
        };

        socket.on("unit:locked", handleUnitLocked);
        socket.on("unit:unlocked", handleUnitUnlocked);
        socket.on("unit:reserved", handleUnitReserved);
        socket.on("reservation:expired", handleReservationExpired);
        socket.on("reservation:cancelled", handleReservationCancelled);
        socket.on("reservation:updated", handleReservationUpdated);

        return () => {
            socket.off("unit:locked", handleUnitLocked);
            socket.off("unit:unlocked", handleUnitUnlocked);
            socket.off("unit:reserved", handleUnitReserved);
            socket.off("reservation:expired", handleReservationExpired);
            socket.off("reservation:cancelled", handleReservationCancelled);
            socket.off("reservation:updated", handleReservationUpdated);
        };
    }, [socket]);

    // Filter API villas based on active filter (by letter suffix: A=Type I, B=Type II, etc.)
    const filterLetterMap: Record<string, string> = { 'Type I': 'A', 'Type II': 'B', 'Type III': 'C', 'Type IV': 'D' };
    const filteredApiVillas = apiVillas.filter((villa) => {
        if (activeFilter === "ALL") return true;
        const targetLetter = filterLetterMap[activeFilter];
        if (!targetLetter) return true;
        const villaLetter = villa.unitNumber.replace(/[0-9]/g, '').toUpperCase();
        return villaLetter === targetLetter;
    }).sort((a, b) => {
        // Sort by numeric part of unitNumber (1 → 10)
        const numA = parseInt(a.unitNumber.replace(/[A-Za-z]/g, ''), 10) || 0;
        const numB = parseInt(b.unitNumber.replace(/[A-Za-z]/g, ''), 10) || 0;
        return numA - numB;
    });

    // Use static villas as fallback if API fails
    const useStaticFallback = error || (apiVillas.length === 0 && !loading);

    return (
        <section
            id="available-villas"
            className="px-8 md:px-16 py-16 md:pt-[58px] md:pb-24 bg-[#F5F2EBE5]"
        >
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b-2 border-[#D1CDC7] pb-6">
                <div>
                    <h2 className="font-cinzel text-3xl md:text-4xl text-[#1A1A1A] mb-2 uppercase tracking-wide">
                        Available Residences
                    </h2>
                    <p className="font-lato text-[13px] tracking-[0.15em] uppercase text-[#7A7A7A] font-medium">
                        Private Introduction
                    </p>
                </div>
                <div className="flex items-center gap-6 mt-8 md:mt-0 overflow-x-auto pb-2 md:pb-0">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "font-display text-[13px] tracking-[0.1em] uppercase whitespace-nowrap pb-1 transition-colors font-medium",
                                activeFilter === filter
                                    ? "text-[#A69279] border-b-2 border-[#A69279]"
                                    : "text-[#7A7A7A] hover:text-[#A69279]"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="aspect-[3/4] md:aspect-[4/5] bg-[#EAE8E2] animate-pulse"
                        />
                    ))}
                </div>
            ) : useStaticFallback ? (
                /* Fallback to static data */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staticVillas.map((villa) => (
                        <Link
                            key={villa.id}
                            to={`/villa/${villa.id}`}
                            className="group relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-[#EAE8E2] block"
                        >
                            <img
                                src={villa.image}
                                alt={villa.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute top-5 left-5 z-10">
                                <span className="inline-block px-2.5 py-1 bg-white/30 backdrop-blur-md border border-white/40 text-white font-display text-[11px] tracking-[0.15em] uppercase font-bold">
                                    {villa.status}
                                </span>
                            </div>
                            <div className="absolute bottom-[100px] left-8 right-8">
                                <h3 className="font-serif text-4xl sm:text-5xl text-white mb-2 uppercase tracking-wide font-light drop-shadow-md">
                                    {villa.subtitle || villa.title}
                                </h3>
                                <p className="font-lato text-[13px] sm:text-[14px] tracking-[0.15em] uppercase text-white drop-shadow font-medium">
                                    {villa.details}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                /* Live API data */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredApiVillas.map((villa) => {
                        const statusUp = villa.status.toUpperCase();
                        const isReserved = statusUp === "RESERVED";
                        const isSold = statusUp === "SOLD";
                        const isPendingStatus = statusUp === "LOCKED" || statusUp === "PENDING";
                        const isMyPending = isPendingStatus && myPendingVillaIds.has(villa.id);
                        const isMyShortlisted = myShortlistedVillaIds.has(villa.id);
                        // Unavailable if reserved, sold, or pending by another user
                        const isUnavailable = isReserved || isSold || (isPendingStatus && !isMyPending);

                        const cardContent = (
                            <>
                                <img
                                    src={villa.imageUrls?.[0] || "/images/unit_primary/Villa exterior with pool at dusk.png"}
                                    alt={formatVillaName(villa.unitNumber)}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-0 pointer-events-none" />

                                {myShortlistedVillaIds.has(villa.id) && (
                                    <div className="absolute top-5 right-5 z-20">
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#C9A96E] border border-[#E8D5A3] text-[#1A1A1A] font-display text-[11px] tracking-[0.15em] uppercase shadow-lg font-bold">
                                            <Heart size={13} fill="currentColor" />
                                            Shortlisted
                                        </span>
                                    </div>
                                )}

                                {isReserved ? (
                                    /* Gray overlay for RESERVED units */
                                    <div className="absolute inset-0 bg-[#6B7280]/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                                        <span className="font-cinzel text-white text-2xl sm:text-3xl tracking-[0.2em] uppercase drop-shadow-lg">
                                            Reserved
                                        </span>
                                    </div>
                                ) : isSold ? (
                                    /* Deep red overlay for SOLD units — same style as Pending */
                                    <div className="absolute inset-0 bg-[#6B7280]/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                                        <span className="font-cinzel text-white text-2xl sm:text-3xl tracking-[0.2em] uppercase drop-shadow-lg">
                                            Sold
                                        </span>
                                        <span className="font-lato text-white/70 text-[10px] tracking-[0.2em] uppercase">
                                            No longer available
                                        </span>
                                    </div>
                                ) : isPendingStatus && !isMyPending ? (
                                    /* Gray overlay for LOCKED / PENDING units by other users */
                                    <div className="absolute inset-0 bg-[#6B7280]/75 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                                        <span className="font-cinzel text-white text-2xl sm:text-3xl tracking-[0.2em] uppercase drop-shadow-lg">
                                            Pending
                                        </span>
                                        <span className="font-lato text-white text-[12px] tracking-[0.15em] uppercase font-bold">
                                            Not available
                                        </span>
                                    </div>
                                ) : isMyPending ? (
                                    /* User's own pending villa — show Continue Checkout prompt */
                                    <>
                                        <div className="absolute inset-0 bg-black/40 z-10 flex flex-col items-center justify-center gap-4">
                                            <span className="inline-block px-5 py-2.5 bg-[#C9A96E] text-[#1A1A0A] font-display text-[13px] tracking-[0.15em] uppercase font-bold shadow-lg animate-pulse">
                                                Continue Checkout →
                                            </span>
                                            <span className="font-lato text-white text-[12px] tracking-[0.15em] uppercase font-bold">
                                                Your reservation is active
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="absolute top-5 left-5 z-10">
                                            <span className={cn(
                                                "inline-block px-2.5 py-1 border font-display text-[11px] tracking-[0.15em] uppercase font-bold",
                                                getStatusStyle(villa.status)
                                            )}>
                                                {getStatusLabel(villa.status)}
                                            </span>
                                        </div>

                                        <div className="absolute bottom-[60px] left-8 right-8 z-10">
                                            <h3 className="font-cinzel text-4xl sm:text-5xl text-white mb-2 uppercase tracking-wide font-normal">
                                                {formatVillaName(villa.unitNumber)}
                                            </h3>
                                            <p className="font-display text-[12px] sm:text-[13px] tracking-[0.2em] uppercase text-white font-semibold mb-2">
                                                {formatVillaLabel(villa.unitNumber)}
                                            </p>
                                            <p className="font-lato text-[13px] sm:text-[14px] text-white font-medium mb-1">
                                                {formatBedroomDesc(villa.bedrooms)}
                                            </p>
                                            <p className="font-lato text-[13px] sm:text-[14px] text-white/90 font-medium mb-1.5">
                                                {villa.features?.levels || '2 Storey + Rooftop'}
                                            </p>
                                            <p className="font-lato text-[12px] sm:text-[13px] tracking-wide uppercase text-white/90 font-medium">
                                                Interior {villa.size} m² | Plot {villa.features?.land || '—'} m²
                                            </p>
                                        </div>
                                    </>
                                )}
                            </>
                        );

                        if (isUnavailable) {
                            return (
                                <div
                                    key={villa.id}
                                    className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-[#EAE8E2] sm:shadow cursor-not-allowed select-none"
                                >
                                    {cardContent}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={villa.id}
                                to={`/villa/${villa.id}`}
                                className="group relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-[#EAE8E2] block sm:shadow hover:shadow-lg transition-all"
                            >
                                {cardContent}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
