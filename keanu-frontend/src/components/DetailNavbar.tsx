import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { EnquiryModal } from "./EnquiryModal";
import { useTracking } from "../hooks/useTracking";
import { TrackingAction } from "../services/trackingService";
import { User } from "lucide-react";

export function DetailNavbar() {
    const { trackAction } = useTracking();
    const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
    const { pathname } = useLocation();
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [launchDate, setLaunchDate] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [loading, setLoading] = useState(true);
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

    useEffect(() => {
        async function fetchCountdown() {
            try {
                const res = await fetch(`${API_BASE}/projects/primary`);
                if (!res.ok) throw new Error("Failed to fetch project");
                const json = await res.json();
                const project = json.data || json;

                if (project.status === "LIVE") {
                    setIsLive(true);
                    setLoading(false);
                    return;
                }

                if (project.launchDate) {
                    const dateStr = project.launchDate.substring(0, 10);
                    const launchTime = project.launchTime || "18:00";

                    const tz = project.timezone || "Asia/Makassar";
                    const launchLocal = new Date(`${dateStr}T${launchTime}:00`);

                    const formatter = new Intl.DateTimeFormat("en-US", {
                        timeZone: tz,
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                        hour12: false,
                    });
                    const nowUtc = new Date();
                    const tzParts = formatter.formatToParts(nowUtc);
                    const get = (type: string) => tzParts.find(p => p.type === type)?.value || "0";
                    const nowInTz = new Date(
                        `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`
                    );
                    const offsetMs = nowInTz.getTime() - nowUtc.getTime();

                    const target = new Date(launchLocal.getTime() - offsetMs);
                    setLaunchDate(target);
                }
            } catch (err) {
                console.error("Failed to fetch countdown:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCountdown();
    }, []);

    useEffect(() => {
        if (!launchDate || isLive) return;

        function calculateCountdown() {
            const now = new Date().getTime();
            const target = launchDate!.getTime();
            const diff = Math.max(0, target - now);

            if (diff <= 0) {
                setIsLive(true);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        }

        calculateCountdown();
        const interval = setInterval(calculateCountdown, 1000);
        return () => clearInterval(interval);
    }, [launchDate, isLive]);

    const pad = (n: number) => String(n).padStart(2, "0");

    const navLinks = [
        { label: "Residences", to: "/" },
        { label: "Masterplan", to: "/masterplan" },
        { label: "Explore", to: "/about" },
        { label: "Shortlist", to: "/shortlist" },
    ];

    return (
        <nav className="w-full sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 lg:px-16 py-5 border-b border-[#EBEAE5] bg-[#F5F2EBE5]">
            {/* Left: Logo + Nav Links */}
            <div className="flex items-center gap-10">
                <Link to="/" className="flex items-center">
                    <img
                        src="/images/logos/Secondary Logo/Keanu Secondary Logo Black.png"
                        alt="Keanu Logo"
                        className="h-5 w-auto object-contain"
                    />
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => {
                        const isActive = link.to === pathname;
                        return (
                            <Link
                                key={link.label}
                                to={link.to}
                                className={`font-display text-[13px] tracking-[0.1em] uppercase transition-colors font-bold ${isActive ? "text-[#A69279]" : "text-[#6B7280] hover:text-[#A69279]"}`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Right: Countdown + Enquire + User */}
            <div className="flex items-center gap-5">
                {/* Countdown */}
                {!loading && !isLive && (
                    <div className="hidden lg:flex items-center gap-3">
                        <span className="font-display text-[9px] tracking-[0.15em] uppercase text-[#A89B8C]">
                            Private Introduction Ends In
                        </span>
                        <span className="font-display text-[13px] tracking-[0.1em] text-[#1A1A1A] font-medium tabular-nums">
                            {pad(timeLeft.days)} : {pad(timeLeft.hours)} : {pad(timeLeft.minutes)} : {pad(timeLeft.seconds)}
                        </span>
                    </div>
                )}
                {!loading && isLive && (
                    <div className="hidden lg:flex items-center gap-3">
                        <span className="font-display text-[13px] tracking-[0.15em] text-[#1A1A1A] font-medium uppercase tabular-nums">
                            Now Live
                        </span>
                    </div>
                )}

                {/* Enquire Button */}
                <button
                    onClick={() => {
                        setIsEnquiryOpen(true);
                        trackAction({ action: TrackingAction.ENQUIRE_CLICK });
                    }}
                    className="px-6 py-2.5 bg-[#E6E1D6] text-[#1A1A1A] font-display text-[10px] tracking-[0.15em] uppercase hover:bg-[#D5D0C5] transition-colors font-bold"
                >
                    Enquire
                </button>

                {/* User Dropdown */}
                <UserProfileDropdown />
            </div>

            <EnquiryModal
                isOpen={isEnquiryOpen}
                onClose={() => setIsEnquiryOpen(false)}
            />
        </nav>
    );
}
