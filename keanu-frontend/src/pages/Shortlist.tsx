import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Plus,
    CheckCircle2,
    Circle,
    MessageCircle,
    Trash2,
} from "lucide-react";
import {
    getShortlist,
    removeFromShortlist,
    ShortlistItem,
} from "../services/shortlistService";
import { toUserErrorMessage } from "../utils/errorMessage";
import { useCurrency } from "../contexts/CurrencyContext";

/* ── readiness steps ── */
const readinessSteps = [
    {
        label: "Profile Complete",
        desc: "Identity verification and contact details confirmed.",
        done: true,
        highlight: false,
        action: null as string | null,
    },
    {
        label: "Mobile verified",
        desc: "Verify your mobile number to enable instant reservation.",
        done: true,
        highlight: false,
        action: null as string | null,
    }
];

/* helpers */
function formatVillaName(unitNumber: string): string {
    const num = unitNumber.replace(/[A-Za-z]/g, '').trim();
    return `Residence ${num.padStart(2, '0')}`;
}



export default function Shortlist() {
    const { formatPrice } = useCurrency();
    const [items, setItems] = useState<ShortlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchShortlist() {
            try {
                const response = await getShortlist();
                setItems(response.data);
                setError(null);
            } catch (err: any) {
                console.error("Failed to fetch shortlist:", err);
                setError(toUserErrorMessage(err, "Failed to load shortlist"));
            } finally {
                setLoading(false);
            }
        }
        fetchShortlist();
    }, []);

    const handleRemove = async (unitId: string) => {
        setRemovingId(unitId);
        try {
            await removeFromShortlist(unitId);
            setItems((prev) => prev.filter((item) => item.unitId !== unitId));
        } catch (err: any) {
            console.error("Failed to remove from shortlist:", err);
        } finally {
            setRemovingId(null);
        }
    };

    const totalValue = items.reduce(
        (sum, item) => sum + (item.unit.launchPrice || item.unit.price || 0),
        0
    );

    return (
        <>
            <section className="px-6 md:px-12 lg:px-16 py-10 md:py-14">
                {/* ── Two‑column layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-[70vh]">
                    {/* ═══ Left: Header & Residence Cards ═══ */}
                    <div className="lg:pr-14">
                        {/* ── Header ── */}
                        <div className="mb-14">
                            <span className="font-display text-[13px] tracking-[0.15em] uppercase text-[#A89279] block mb-3 font-medium">
                                Private Selection
                            </span>
                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                                <h1 className="font-serif text-5xl md:text-6xl text-[#2C352E] leading-tight">
                                    My Shortlist
                                </h1>
                                {!loading && items.length > 0 && (
                                    <p className="font-display text-[10px] sm:text-[11px] tracking-[0.15em] uppercase text-[#9FA09D] font-medium pb-2 leading-relaxed">
                                        <span className="block md:inline">{items.length} Residences Selected</span>
                                        <span className="hidden md:inline mx-3 text-[#D5D3CC]">|</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            /* Loading skeleton */
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="border border-[#EBEAE5] bg-white flex flex-col"
                                    >
                                        <div className="aspect-[4/3] bg-[#EAE8E2] animate-pulse" />
                                        <div className="p-5 space-y-3">
                                            <div className="h-4 bg-[#EAE8E2] animate-pulse rounded w-2/3" />
                                            <div className="h-3 bg-[#EAE8E2] animate-pulse rounded w-1/2" />
                                            <div className="h-3 bg-[#EAE8E2] animate-pulse rounded w-1/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            /* Error state */
                            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                                <p className="text-sm text-[#5A5A5A] mb-4">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-3 border border-[#1A1A1A] font-display text-[10px] tracking-[0.15em] uppercase text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : items.length === 0 ? (
                            /* Empty state */
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                                <div className="w-16 h-16 flex items-center justify-center border border-[#EBEAE5] mb-6">
                                    <Plus size={24} className="text-[#A89B8C]" />
                                </div>
                                <h3 className="font-serif text-2xl text-[#1A1A1A] mb-3">
                                    Your Shortlist is Empty
                                </h3>
                                <p className="text-sm text-[#5A5A5A] font-light mb-8 max-w-sm">
                                    Explore our residences and add your favourite ones to start building your private selection.
                                </p>
                                <Link
                                    to="/#available-villas"
                                    className="px-8 py-4 bg-[#1A1A1A] text-white font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#333] transition-colors"
                                >
                                    Browse Residences
                                </Link>
                            </div>
                        ) : (
                            /* Shortlist cards */
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group bg-white flex flex-col border border-[#EBEAE5]"
                                    >
                                        {/* Image */}
                                        <Link
                                            to={`/villa/${item.unit.id}`}
                                            className="relative aspect-[4/3] overflow-hidden bg-[#F5F2EB] block"
                                        >
                                            <img
                                                src={
                                                    item.unit.imageUrls?.[0] ||
                                                    "/images/unit_images/3.png"
                                                }
                                                alt={formatVillaName(item.unit.unitNumber)}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className="absolute top-4 right-4 px-3 py-1 bg-[#2C352E]/70 backdrop-blur-sm text-white font-display text-[10px] tracking-[0.1em] uppercase">
                                                {item.unit.status || "Available"}
                                            </div>
                                        </Link>

                                        {/* Info */}
                                        <div className="p-4 md:px-3 md:py-4 flex flex-col flex-1">
                                            <div className="flex items-baseline justify-between mb-6">
                                                <h3 className="font-serif text-[26px] text-[#2C352E] font-medium">
                                                    {formatVillaName(item.unit.unitNumber)}
                                                </h3>
                                                <span className="font-display text-[15px] font-medium text-[#9FA09D] whitespace-nowrap">
                                                    {formatPrice(item.unit.launchPrice || item.unit.price)}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-display tracking-[0.05em] uppercase text-[#9FA09D] mb-10 font-medium">
                                                <span>{item.unit.bedrooms} Bed</span>
                                                <span className="text-[#D5D3CC]">·</span>
                                                <span>{item.unit.size} Sqm</span>
                                                <span className="text-[#D5D3CC]">·</span>
                                                <span>{item.unit.bedrooms > 4 ? 'Ocean View' : 'Garden'}</span>
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-3 pt-7 border-t border-[#EBEAE5]">
                                                <Link
                                                    to={`/villa/${item.unit.id}`}
                                                    className="flex items-center gap-2 font-display text-[10px] tracking-[0.2em] uppercase text-[#2C352E] hover:text-[#A5815F] transition-colors font-bold"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mb-0.5">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                    <div className="flex flex-col items-start text-left leading-[1.6]">
                                                        <span>VIEW</span>
                                                        <span>DETAILS</span>
                                                    </div>
                                                </Link>
                                                <button
                                                    onClick={() => handleRemove(item.unitId)}
                                                    disabled={removingId === item.unitId}
                                                    className="px-5 py-2 border border-[#A5815F] font-display text-[10px] tracking-[0.2em] uppercase text-[#A5815F] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all font-bold disabled:opacity-50"
                                                >
                                                    {removingId === item.unitId ? "Removing..." : "REMOVE"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Explore More tile */}
                                <Link
                                    to="/#available-villas"
                                    className="group flex flex-col items-center justify-center gap-4 min-h-[420px] border border-dashed border-[#D5D3CC] hover:border-[#A89279] transition-colors cursor-pointer"
                                >
                                    <div className="w-12 h-12 flex items-center justify-center border border-[#D5D3CC] group-hover:border-[#A89279] transition-colors">
                                        <Plus size={20} className="text-[#A89279]" />
                                    </div>
                                    <span className="font-display text-[12px] tracking-[0.15em] uppercase text-[#A89279] font-bold">
                                        Explore More Residences
                                    </span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* ═══ Right Sidebar ═══ */}
                    <aside className="flex flex-col gap-5 mt-6 lg:mt-0 lg:sticky lg:top-28 lg:self-start">
                        {/* ── Launch Day Readiness ── */}
                        <div className="bg-white border border-[#EBEAE5] p-7">
                            <h3 className="font-serif text-xl text-[#1A1A1A] mb-1">
                                Launch Day Readiness
                            </h3>
                            <p className="text-[13px] text-[#8C7E6D] mb-6 leading-relaxed">
                                Complete these steps to enable priority selection.
                            </p>

                            <div className="flex flex-col gap-5">
                                {readinessSteps.map((step) => (
                                    <div key={step.label} className="flex items-start gap-3">
                                        {step.done ? (
                                            <CheckCircle2
                                                size={20}
                                                className="text-[#A89B8C] mt-0.5 shrink-0"
                                            />
                                        ) : step.highlight ? (
                                            <div className="w-5 h-5 rounded-full border-2 border-[#C4956A] flex items-center justify-center mt-0.5 shrink-0">
                                                <div className="w-2 h-2 rounded-full bg-[#C4956A]" />
                                            </div>
                                        ) : (
                                            <Circle
                                                size={20}
                                                className="text-[#D5D3CC] mt-0.5 shrink-0"
                                            />
                                        )}

                                        <div>
                                            <span
                                                className={`font-display text-[13px] tracking-[0.05em] uppercase block mb-0.5 ${step.done || step.highlight
                                                    ? "text-[#1A1A1A] font-bold"
                                                    : "text-[#4A4A4A] font-medium"
                                                    }`}
                                            >
                                                {step.label}
                                            </span>
                                            <span className="text-[12px] text-[#7A7A7A] leading-relaxed block">
                                                {step.desc}
                                            </span>
                                            {step.action && (
                                                <button className="text-[11px] text-[#1A1A1A] underline mt-1 hover:text-[#A89B8C] transition-colors">
                                                    {step.action}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Concierge Support ── */}
                        <div className="bg-[#FAFAF8] border border-[#EBEAE5] p-7">
                            <h4 className="font-serif text-lg italic text-[#1A1A1A] mb-2">
                                Concierge Support
                            </h4>
                            <p className="text-[13px] text-[#7A7A7A] leading-relaxed mb-5">
                                Need assistance refining your shortlist? Your Keanu advisor is available for a private consultation
                            </p>
                            <a
                                href="https://wa.me/6281190010008?text=Hi%2C%20I%27d%20like%20to%20schedule%20a%20private%20consultation%20about%20Keanu%20residences."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-4 bg-[#C4956A] text-white font-display text-[13px] tracking-[0.15em] uppercase hover:bg-[#b3845c] transition-colors font-semibold"
                            >
                                <MessageCircle size={15} />
                                Schedule a private call
                            </a>
                        </div>
                    </aside>
                </div>
            </section>


        </>
    );
}
