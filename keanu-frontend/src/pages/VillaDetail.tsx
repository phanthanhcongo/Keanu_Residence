import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { EnquiryModal } from "../components/EnquiryModal";
import NotificationModal from "../components/NotificationModal";
import { useAuth } from "../contexts/AuthContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useSocket } from "../contexts/SocketContext";
import {
    addToShortlist,
    removeFromShortlist,
    getShortlist,
} from "../services/shortlistService";
import { createReservationLock, getReservations } from "../services/reservationService";
import { CurrencySwitcher } from "../components/CurrencySwitcher";

import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CalendarCheck,
    Heart,
    Lock,
    Check,
    X,
} from "lucide-react";
import { useTracking } from "../hooks/useTracking";
import { TrackingAction } from "../services/trackingService";
import { toUserErrorMessage } from "../utils/errorMessage";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type ApiVillaDetail = {
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
    description: string;
    floorPlanUrl: string;
    project: {
        id: string;
        name: string;
        slug: string;
        location: string;
        launchDate: string;
        launchTime: string;
    };
};

function getStatusStyle(status: string): string {
    switch (status.toUpperCase()) {
        case "AVAILABLE":
            return "bg-white/20 backdrop-blur-sm border-white/30 text-white";
        case "RESERVED":
            return "bg-[#A89B8C]/90 backdrop-blur-md border-[#A89B8C] text-white";
        case "SOLD":
            return "bg-[#1A1A1A]/90 backdrop-blur-md border-[#1A1A1A] text-white";
        case "LOCKED":
            return "bg-[#6D6353]/90 backdrop-blur-md border-[#6D6353] text-white";
        default:
            return "bg-white/20 backdrop-blur-sm border-white/30 text-white";
    }
}

export default function VillaDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { trackAction } = useTracking();
    const [villa, setVilla] = useState<ApiVillaDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImage, setCurrentImage] = useState(0);
    const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
    const [isShortlisted, setIsShortlisted] = useState(false);
    const [shortlistLoading, setShortlistLoading] = useState(false);
    const [lockLoading, setLockLoading] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "" });
    const [pendingReservationId, setPendingReservationId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "info" }>({ show: false, message: "", type: "success" });
    const [inclusionsOpen, setInclusionsOpen] = useState(false);
    const [selectedFloorplan, setSelectedFloorplan] = useState<string | null>(null);

    const showToast = useCallback((message: string, type: "success" | "info" = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    }, []);

    const handleDownloadAllFloorplans = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!villa) return;
        const plans = villa.features?.floorplans || [villa.floorPlanUrl];
        if (!plans || plans.length === 0) return;

        plans.forEach((plan: string, idx: number) => {
            const a = document.createElement("a");
            a.href = plan;
            a.download = `floor-plan-${villa.unitNumber || "residence"}-${idx + 1}.jpg`;
            a.target = "_blank"; // Provide a fallback target just in case
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    };

    const { socket } = useSocket();

    useEffect(() => {
        async function fetchVilla() {
            if (!id) return;
            try {
                // If it's a number (static ID), fallback to unit 42782d64-6818-4233-813e-04c931515ab3 for testing
                // Real usage will have UUIDs
                const fetchId = Number.isNaN(Number(id)) ? id : "42782d64-6818-4233-813e-04c931515ab3";
                const res = await fetch(`${API_BASE}/units/${fetchId}`);
                if (!res.ok) throw new Error("Failed to fetch villa");
                const json = await res.json();
                setVilla(json.data || json);
            } catch (err) {
                console.error("Failed to fetch villa:", err);

                // Fallback placeholder data when unit is not found
                setVilla({
                    id: String(id),
                    unitNumber: "K-001 (Placeholder)",
                    unitType: "3-bed",
                    size: 320,
                    bedrooms: 3,
                    bathrooms: 3,
                    price: 2400000,
                    launchPrice: 2250000,
                    status: "AVAILABLE",
                    shortlistCount: 15,
                    imageUrls: [
                        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&h=1000&fit=crop",
                        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&h=1000&fit=crop",
                        "https://images.unsplash.com/photo-1600607687931-ce8e00263560?w=1600&h=1000&fit=crop",
                        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1600&h=1000&fit=crop"
                    ],
                    features: {
                        land: 450,
                        pool: 15,
                        leasehold: 30
                    },
                    description: "An exquisite placeholder residence showcasing the epitome of elegant coastal living. Designed with expansive open layouts, high-end finishes, and an abundance of natural light, offering unmatched comfort and tranquility.",
                    floorPlanUrl: "",
                    project: {
                        id: "placeholder-prj",
                        name: "Keanu Estate",
                        slug: "keanu",
                        location: "Coastal Region",
                        launchDate: new Date().toISOString(),
                        launchTime: "08:00 AM"
                    }
                });
            } finally {
                setLoading(false);
            }
        }
        fetchVilla();
    }, [id]);

    // Track Residence View
    useEffect(() => {
        if (villa?.id) {
            trackAction({
                action: TrackingAction.UNIT_VIEW,
                entityId: villa.id,
                entity: 'Residence',
                metadata: { unitNumber: villa.unitNumber }
            });
        }
    }, [villa?.id, trackAction]);

    // Handle Socket real-time updates
    useEffect(() => {
        if (!socket || !villa) return;

        const handleUnitLocked = (data: { unitId: string }) => {
            if (data.unitId === villa.id) {
                setVilla(prev => prev ? { ...prev, status: 'LOCKED' } : prev);
            }
        };

        const handleUnitReserved = (data: { unitId: string }) => {
            if (data.unitId === villa.id) {
                setVilla(prev => prev ? { ...prev, status: 'RESERVED' } : prev);
            }
        };

        const handleUnitUnlocked = (data: { unitId: string }) => {
            if (data.unitId === villa.id) {
                setVilla(prev => prev ? { ...prev, status: 'AVAILABLE' } : prev);
                setPendingReservationId(null);
            }
        };

        const handleReservationExpired = (data: { unitId: string }) => {
            if (data.unitId === villa.id) {
                setVilla(prev => prev ? { ...prev, status: 'AVAILABLE' } : prev);
                setPendingReservationId(null);
            }
        };

        const handleReservationCancelled = (data: { unitId: string }) => {
            if (data.unitId === villa.id) {
                setVilla(prev => prev ? { ...prev, status: 'AVAILABLE' } : prev);
                setPendingReservationId(null);
            }
        };

        const handleProjectLive = (data: { projectId: string }) => {
            // If this unit belongs to the launched project, set to AVAILABLE
            if (villa.project?.id === data.projectId && villa.status === 'UNAVAILABLE') {
                setVilla(prev => prev ? { ...prev, status: 'AVAILABLE' } : prev);
            }
        };

        const handleProjectStatusChanged = (data: { projectId: string; status: string }) => {
            if (villa.project?.id === data.projectId) {
                // Re-fetch the unit to get updated status
                const fetchId = Number.isNaN(Number(id)) ? id : "42782d64-6818-4233-813e-04c931515ab3";
                fetch(`${API_BASE}/units/${fetchId}`)
                    .then(res => res.json())
                    .then(json => setVilla(json.data || json))
                    .catch(err => console.error("Failed to re-fetch villa:", err));
            }
        };

        socket.on('unit:locked', handleUnitLocked);
        socket.on('unit:reserved', handleUnitReserved);
        socket.on('unit:unlocked', handleUnitUnlocked);
        socket.on('reservation:expired', handleReservationExpired);
        socket.on('reservation:cancelled', handleReservationCancelled);
        socket.on('project:live', handleProjectLive);
        socket.on('project:status-changed', handleProjectStatusChanged);

        return () => {
            socket.off('unit:locked', handleUnitLocked);
            socket.off('unit:reserved', handleUnitReserved);
            socket.off('unit:unlocked', handleUnitUnlocked);
            socket.off('reservation:expired', handleReservationExpired);
            socket.off('reservation:cancelled', handleReservationCancelled);
            socket.off('project:live', handleProjectLive);
            socket.off('project:status-changed', handleProjectStatusChanged);
        };
    }, [socket, villa?.id]);

    // Check if the unit is already in the user's shortlist and check pending reservations
    useEffect(() => {
        if (!isAuthenticated || !id) return;

        async function checkShortlist() {
            try {
                const response = await getShortlist();
                const found = response.data.some((item) => item.unitId === id);
                setIsShortlisted(found);
            } catch {
                // silently ignore — user may not be logged in
            }
        }

        async function checkPendingReservation() {
            if (!villa) return;
            try {
                const fetchId = Number.isNaN(Number(id)) ? id : "42782d64-6818-4233-813e-04c931515ab3";
                const response = await getReservations({ status: 'PENDING' });
                // Note: The API response format in reservations.controller.ts is `{ data: [...] }`
                const reservations = Array.isArray(response.data) ? response.data : [];
                const matchedReservation = reservations.find((r: any) => r.unit && r.unit.id === fetchId);

                if (matchedReservation) {
                    setPendingReservationId(matchedReservation.id);
                }
            } catch (err: any) {
                console.error("Failed to check pending reservations:", err);
            }
        }

        checkShortlist();
        checkPendingReservation();
    }, [id, isAuthenticated, villa?.id]);

    const handleShortlistToggle = async () => {
        if (!isAuthenticated) {
            navigate("/login");
            return;
        }
        if (!villa || shortlistLoading) return;
        setShortlistLoading(true);
        try {
            if (isShortlisted) {
                await removeFromShortlist(villa.id);
                setIsShortlisted(false);
                setVilla(prev => prev ? { ...prev, shortlistCount: Math.max(0, prev.shortlistCount - 1) } : prev);
                showToast("Removed from Shortlist", "info");
                trackAction({
                    action: TrackingAction.SHORTLISTED_UNIT,
                    entityId: id,
                    entity: 'Residence',
                    metadata: { type: 'remove' }
                });
            } else {
                await addToShortlist(villa.id);
                setIsShortlisted(true);
                setVilla(prev => prev ? { ...prev, shortlistCount: prev.shortlistCount + 1 } : prev);
                showToast("Added to Shortlist", "success");
                trackAction({
                    action: TrackingAction.SHORTLISTED_UNIT,
                    entityId: id,
                    entity: 'Residence',
                    metadata: { type: 'add' }
                });
            }
        } catch (err: any) {
            console.error("Shortlist toggle failed:", err);
        } finally {
            setShortlistLoading(false);
        }
    };

    const handleHoldVilla = async () => {
        if (!isAuthenticated) {
            navigate("/login"); // or navigate login with return path
            return;
        }

        if (pendingReservationId) {
            // Simply resume checkout if they already have one pending for this villa
            navigate(`/checkout/review/${pendingReservationId}`);
            return;
        }

        if (!villa || !villa.project?.id || lockLoading) return;

        setLockLoading(true);
        try {
            const res = await createReservationLock(villa.id, villa.project.id);
            if (res && res.data && res.data.id) {
                trackAction({
                    action: TrackingAction.RESERVED_UNIT,
                    entityId: villa.id,
                    entity: 'Residence',
                    metadata: { reservationId: res.data.id }
                });
                // Navigate to the review page using the newly created reservation ID
                navigate(`/checkout/review/${res.data.id}`);
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err: any) {
            console.error("Failed to hold villa:", err);
            setErrorModal({
                isOpen: true,
                title: "Reservation Failed",
                message: toUserErrorMessage(err, "Failed to secure the residence. It may have just been locked by someone else.")
            });
        } finally {
            setLockLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F2EBE5] flex items-center justify-center">
                <span className="font-display text-xs tracking-[0.15em] uppercase text-[#8B95A1] animate-pulse">
                    Loading Residence...
                </span>
            </div>
        );
    }

    if (!villa) {
        return (
            <div className="min-h-screen bg-[#F5F2EBE5]">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <h2 className="font-serif text-3xl text-[#1A1A1A] mb-4">
                            Residence Not Found
                        </h2>
                        <Link
                            to="/"
                            className="font-display text-xs tracking-[0.15em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors"
                        >
                            ← Back to Collection
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const prevImage = () =>
        setCurrentImage((prev) =>
            prev === 0 ? villa.imageUrls.length - 1 : prev - 1
        );
    const nextImage = () =>
        setCurrentImage((prev) =>
            prev === villa.imageUrls.length - 1 ? 0 : prev + 1
        );

    const numStr = villa.unitNumber.replace(/[A-Za-z]/g, '').trim();
    const title = `Residence ${numStr.padStart(2, '0')}`;
    const letterSuffix = villa.unitNumber.replace(/[0-9]/g, '').toUpperCase();
    const romanMap: Record<string, string> = { A: 'Type I', B: 'Type II', C: 'Type III', D: 'Type IV' };
    const typeLabel = romanMap[letterSuffix] || `Type ${letterSuffix}`;

    // Display texts from API features
    const livingConceptText = villa.features?.livingConcept || '';
    const settingText = villa.features?.setting || '';
    const { formatPrice } = useCurrency();
    const formattedPrice = formatPrice(villa.launchPrice || villa.price);

    return (
        <div className="min-h-screen bg-[#F5F2EBE5] selection:bg-[#A89B8C] selection:text-white">
            <section className="px-6 md:px-12 lg:px-16 py-8 md:py-12">
                {/* Main Layout: Two columns */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
                    {/* Left Column */}
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 mb-8">
                            <Link
                                to="/"
                                className="font-display text-[13px] tracking-[0.15em] uppercase text-[#A89B8C] hover:text-[#1A1A1A] transition-colors"
                            >
                                Collection
                            </Link>
                            <span className="text-[#A89B8C] text-sm">›</span>
                            <span className="font-display text-[13px] tracking-[0.15em] uppercase text-[#1A1A1A] font-medium">
                                {title}
                            </span>
                        </div>
                        {/* Title + Type */}
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-[#EBEAE5] mb-6">
                            <h1 className="font-cinzel text-5xl md:text-7xl lg:text-8xl text-[#1A1A1A] uppercase tracking-wide leading-none">
                                {title}
                            </h1>
                            <span className="font-display text-xs tracking-[0.15em] uppercase text-[#5A5A5A] mt-2 sm:mt-0 sm:mb-2">
                                {typeLabel}
                            </span>
                        </div>

                        {/* Opening */}
                        <p className="font-display font-light text-[15px] md:text-[17px] text-[#5A5A5A] leading-relaxed mb-10 max-w-xl">
                            {villa.description}
                        </p>

                        {/* Image Gallery */}
                        <div className="relative aspect-[3/2] overflow-hidden bg-[#EBEAE5] mb-12">
                            {/* Badge */}
                            <div className="absolute top-5 left-5 z-10">
                                <span className={`inline-block px-4 py-1.5 border font-display text-[11px] tracking-[0.18em] uppercase font-medium ${getStatusStyle(villa.status)}`}>
                                    {villa.status}
                                </span>
                            </div>

                            {/* Image */}
                            <img
                                src={villa.imageUrls[currentImage] || "/images/unit_images/3.png"}
                                alt={`${title} - Image ${currentImage + 1}`}
                                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                                referrerPolicy="no-referrer"
                            />

                            {/* Navigation Arrows */}
                            {villa.imageUrls.length > 1 && (
                                <div className="absolute bottom-5 right-5 flex items-center gap-2 z-10">
                                    <button
                                        onClick={prevImage}
                                        className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/40 transition-colors"
                                        aria-label="Previous image"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/40 transition-colors"
                                        aria-label="Next image"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            )}

                            {/* Image Dots */}
                            {villa.imageUrls.length > 1 && (
                                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                                    {villa.imageUrls.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentImage(idx)}
                                            className={`w-2 h-2 rounded-full transition-all ${idx === currentImage
                                                ? "bg-white w-6"
                                                : "bg-white/50 hover:bg-white/70"
                                                }`}
                                            aria-label={`Go to image ${idx + 1}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Living Concept + Setting */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 mb-12">
                            {livingConceptText && (
                                <div>
                                    <h3 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-4 italic">
                                        Living Concept
                                    </h3>
                                    <p className="text-sm text-[#5A5A5A] leading-relaxed font-light">
                                        {livingConceptText}
                                    </p>
                                </div>
                            )}
                            {settingText && (
                                <div>
                                    <h3 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-4 italic">
                                        Setting
                                    </h3>
                                    <p className="text-sm text-[#5A5A5A] leading-relaxed font-light">
                                        {settingText}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Interior Images Row - display up to 3 */}
                        {villa.imageUrls.length > 1 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-16">
                                {villa.imageUrls.slice(1, 4).map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="aspect-[4/3] overflow-hidden bg-[#EBEAE5]"
                                    >
                                        <img
                                            src={img}
                                            alt={`${title} interior ${idx + 1}`}
                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Features & Inclusions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 mb-16 pt-10 border-t border-[#EBEAE5]">
                            <div>
                                <h3 className="font-serif text-xl md:text-2xl text-[#1A1A1A] mb-4">
                                    Distinctive Features
                                </h3>
                                <ul className="space-y-2">
                                    {villa.features?.distinctiveFeatures?.split('\n').map((feature: string, idx: number) => {
                                        const text = feature.replace(/^•\s*/, '');
                                        if (!text.trim()) return null;
                                        return (
                                            <li key={idx} className="flex items-start gap-2 text-[15px] text-[#5A5A5A] leading-relaxed font-light">
                                                <span className="mt-2 w-1 h-1 rounded-full bg-[#1A1A1A] shrink-0" />
                                                <span>{text}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                            <div>
                                <button
                                    onClick={() => setInclusionsOpen(!inclusionsOpen)}
                                    className="w-full flex items-center justify-between py-2 border-b border-[#1A1A1A] group"
                                >
                                    <h3 className="font-serif text-xl md:text-2xl text-[#1A1A1A] transition-colors">
                                        Key Inclusions
                                    </h3>
                                    {inclusionsOpen ? <ChevronUp size={24} className="text-[#1A1A1A]" /> : <ChevronDown size={24} className="text-[#1A1A1A]" />}
                                </button>
                                {inclusionsOpen && (
                                    <ul className="pt-6 space-y-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                        {villa.features?.keyInclusions?.split('\n').map((inclusion: string, idx: number) => {
                                            if (!inclusion.trim()) return null;
                                            return (
                                                <li key={idx} className="flex items-start gap-2 text-[15px] text-[#5A5A5A] leading-relaxed font-light">
                                                    <span className="mt-2 w-1 h-1 rounded-full bg-[#1A1A1A] shrink-0" />
                                                    <span>{inclusion.replace(/^•\s*/, '')}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Floor Plan Section */}
                        {(villa.features?.floorplans?.length > 0 || villa.floorPlanUrl) && (
                            <div className="border-t border-[#EBEAE5] pt-10 mb-12">
                                <div className="flex justify-between items-end mb-12">
                                    <h3 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] italic">
                                        Floorplan
                                    </h3>
                                    <button
                                        onClick={handleDownloadAllFloorplans}
                                        className="font-display text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A] hover:text-[#A89B8C] transition-colors underline underline-offset-4"
                                    >
                                        Download All Images
                                    </button>
                                </div>

                                <div className="space-y-16">
                                    {(villa.features?.floorplans || [villa.floorPlanUrl]).map((plan: string, idx: number) => {
                                        const floorNames = ["Ground Floor", "Upper Floor", "Ocean-View Rooftop Terrace"];
                                        const title = floorNames[idx] || `Floor ${idx + 1}`;

                                        return (
                                            <div key={idx} className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                                                {/* Left: Floorplan Image */}
                                                <div
                                                    className="w-full lg:w-[80%] xl:w-[85%] overflow-hidden relative group bg-[#FAFAF8] border border-[#EBEAE5] p-2 sm:p-6 cursor-pointer"
                                                    onClick={() => setSelectedFloorplan(plan)}
                                                >
                                                    <div className="absolute top-4 left-6 z-10 font-display text-[14px] text-[#1A1A1A]">
                                                        {title}
                                                    </div>
                                                    <img
                                                        src={plan}
                                                        alt={`${villa.unitNumber} ${title} Plan`}
                                                        className="w-full h-auto object-contain mt-8 group-hover:scale-[1.02] transition-transform duration-700"
                                                    />
                                                </div>

                                                {/* Right: Area Stats */}
                                                <div className="flex-1 min-w-[250px] xl:min-w-[280px] flex flex-col justify-center gap-2 border-t lg:border-t-0 border-[#EBEAE5] pt-4 lg:pt-0">
                                                    {idx === 0 && (
                                                        <>
                                                            {villa.features?.groundFloor && (
                                                                <div className="font-display text-[15px] text-[#1A1A1A] max-w-max whitespace-nowrap">
                                                                    Ground Floor Internal Area <span className="font-bold">{villa.features.groundFloor} sq m</span>
                                                                </div>
                                                            )}
                                                            {villa.features?.terrace && (
                                                                <div className="font-display text-[15px] text-[#1A1A1A] max-w-max whitespace-nowrap">
                                                                    Terrace <span className="font-bold">{villa.features.terrace} sq m</span>
                                                                </div>
                                                            )}
                                                            {villa.features?.pool && (
                                                                <div className="font-display text-[15px] text-[#1A1A1A] max-w-max whitespace-nowrap">
                                                                    Private Pool <span className="font-bold">{villa.features.pool} sq m</span>
                                                                </div>
                                                            )}
                                                            {villa.features?.garden && (
                                                                <div className="font-display text-[15px] text-[#1A1A1A] max-w-max whitespace-nowrap">
                                                                    Landscaped Garden <span className="font-bold">{villa.features.garden} sq m</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {idx === 1 && (
                                                        <div className="font-display text-[15px] text-[#1A1A1A] max-w-max whitespace-nowrap">
                                                            Total Area <span className="font-bold">{villa.features?.upperFloor || '—'} sq m</span>
                                                        </div>
                                                    )}
                                                    {idx === 2 && (
                                                        <div className="font-display text-[15px] text-[#1A1A1A] max-w-max whitespace-nowrap">
                                                            Total Area <span className="font-bold">{villa.features?.rooftopArea || '—'} sq m</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column — Sidebar */}
                    <div className="lg:sticky lg:top-28 lg:self-start">
                        {/* At A Glance Card */}
                        <div className="bg-[#FAFAF8] border border-[#EBEAE5] p-5 mb-4">
                            <h3 className="font-serif text-xl text-[#1A1A1A] mb-3 italic">
                                At a Glance
                            </h3>

                            <div className="divide-y divide-[#EBEAE5]">
                                {[
                                    { label: "Land area:", value: `${villa.features?.land || '—'} sq m` },
                                    { label: "Interior area:", value: `${villa.size} sq m` },
                                    { label: "Levels:", value: villa.features?.levels || '2 Storey + Rooftop' },
                                    { label: "Configuration:", value: villa.features?.configuration || `${villa.bedrooms} BR` },
                                    { label: "Bathrooms:", value: `${villa.bathrooms}` },
                                    { label: "Tenure:", value: villa.features?.tenure || `Leasehold (${villa.features?.leasehold || 48} years)` },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between py-2.5"
                                    >
                                        <span className="font-display text-sm text-[#4A4A4A] leading-none">
                                            {item.label}
                                        </span>
                                        <span className="font-display text-sm font-medium text-[#1A1A1A] leading-none">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Price */}
                            <div className="pt-5 mt-4 border-t border-[#EBEAE5]">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C]">
                                        Starting Price
                                    </span>
                                    <CurrencySwitcher />
                                </div>
                                <div className="flex items-center gap-3 pb-2">
                                    <span className="font-cinzel text-4xl text-[#1A1A1A] block leading-tight">
                                        {formattedPrice}
                                    </span>
                                    {villa.launchPrice && villa.price > villa.launchPrice && (
                                        <span className="font-serif text-2xl text-[#A89B8C] line-through decoration-[#A89B8C]/50 translate-y-1">
                                            {formatPrice(villa.price)}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] text-[#A89B8C] block">
                                    *Including taxes & fees
                                </span>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        {pendingReservationId ? (
                            <button
                                onClick={handleHoldVilla}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-[#6D6353] text-white font-display text-xs tracking-[0.15em] uppercase hover:bg-[#5A5144] transition-colors mb-3 shadow-md"
                            >
                                <Lock size={16} />
                                Continue Reserve
                            </button>
                        ) : villa.status === 'AVAILABLE' ? (
                            <button
                                onClick={handleHoldVilla}
                                disabled={lockLoading}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-[#1A1A1A] text-white font-display text-xs tracking-[0.15em] uppercase hover:bg-[#333333] transition-colors mb-3 disabled:opacity-50"
                            >
                                <Lock size={16} />
                                {lockLoading ? "SECURING..." : "Request Priority Reservation"}
                            </button>
                        ) : (
                            <Link
                                to="/book-consultant"
                                className="w-full flex items-center justify-center gap-3 py-4 bg-[#E6E1D6] text-[#1A1A1A] font-display text-xs tracking-[0.15em] uppercase hover:bg-[#D5D0C5] transition-colors mb-3"
                            >
                                <CalendarCheck size={16} />
                                Book Consultation
                            </Link>
                        )}

                        <button
                            onClick={handleShortlistToggle}
                            disabled={shortlistLoading}
                            className={`w-full flex items-center justify-center gap-3 py-4 font-display text-xs tracking-[0.15em] uppercase transition-colors mb-6 disabled:opacity-50 ${isShortlisted
                                ? "bg-[#1A1A1A] text-white border border-[#1A1A1A] hover:bg-[#333]"
                                : "bg-transparent border border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                                }`}
                        >
                            <Heart size={16} fill={isShortlisted ? "currentColor" : "none"} />
                            {shortlistLoading
                                ? "Processing..."
                                : isShortlisted
                                    ? "Remove from Shortlist"
                                    : "Add to Shortlist"}
                        </button>

                        {/* Advisor Card */}
                        <div className="bg-[#FAFAF8] border border-[#EBEAE5] p-6 flex items-center gap-4">
                            <img
                                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"
                                alt="Sarah Jenkins"
                                className="w-14 h-14 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                            <div>
                                <span className="font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] block mb-1">
                                    Your Personal Advisor
                                </span>
                                <span className="font-display text-sm font-medium text-[#1A1A1A] uppercase tracking-wider block">
                                    Sarah Jenkins
                                </span>
                                <a
                                    href="#"
                                    className="text-xs text-[#A89B8C] hover:text-[#1A1A1A] transition-colors underline"
                                >
                                    Contact directly
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <EnquiryModal
                isOpen={isEnquiryOpen}
                onClose={() => setIsEnquiryOpen(false)}
                propertyName={title}
            />

            <NotificationModal
                isOpen={errorModal.isOpen}
                onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
                title={errorModal.title}
                message={errorModal.message}
            />

            {/* Full-size Floorplan Modal */}
            {selectedFloorplan && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedFloorplan(null)}
                >
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors"
                        onClick={() => setSelectedFloorplan(null)}
                        aria-label="Close fullscreen image"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedFloorplan}
                        alt="Full Size Floorplan"
                        className="max-w-full max-h-[90vh] object-contain animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Shortlist Toast Notification */}
            <div
                className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 shadow-lg border transition-all duration-500 ease-out ${toast.show
                    ? "translate-x-0 opacity-100"
                    : "translate-x-[120%] opacity-0"
                    } ${toast.type === "success"
                        ? "bg-[#2C3E2D] border-[#4A6B4C] text-white"
                        : "bg-[#3D3928] border-[#6B6340] text-white"
                    }`}
            >
                {toast.type === "success" ? (
                    <Heart size={16} fill="currentColor" className="text-[#C9A96E] flex-shrink-0" />
                ) : (
                    <Heart size={16} className="text-[#A89B8C] flex-shrink-0" />
                )}
                <span className="font-display text-[11px] tracking-[0.15em] uppercase">
                    {toast.message}
                </span>
            </div>
        </div>
    );
}
