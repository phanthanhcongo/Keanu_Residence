import React, { useState, useEffect } from "react";
import { useSocket } from "../contexts/SocketContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type CountdownData = {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
};

export function Hero() {
    const [countdown, setCountdown] = useState<CountdownData>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });
    const [launchDate, setLaunchDate] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [isClosed, setIsClosed] = useState(false);
    const { socket } = useSocket();

    // Fetch the primary project's launch date once
    useEffect(() => {
        async function fetchCountdown() {
            try {
                const res = await fetch(`${API_BASE}/projects/primary`);
                if (!res.ok) throw new Error("Failed to fetch project");
                const json = await res.json();
                const project = json.data || json;

                // If project is already LIVE or CLOSED, skip countdown
                if (project.status === "CLOSED") {
                    setIsClosed(true);
                    setLoading(false);
                    return;
                }
                if (project.status === "LIVE") {
                    setIsLive(true);
                    setLoading(false);
                    return;
                }

                // Combine launchDate + launchTime in the project's timezone
                if (project.launchDate) {
                    // Extract the date portion (YYYY-MM-DD)
                    const dateStr = project.launchDate.substring(0, 10);
                    const launchTime = project.launchTime || "18:00";

                    // Use timezone from API to calculate UTC target
                    const tz = project.timezone || "Asia/Makassar";
                    const launchLocal = new Date(`${dateStr}T${launchTime}:00`);
                    // Calculate offset between project timezone and UTC using Intl
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
                    // Target in UTC = local launch time - offset
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

    // Live countdown timer
    useEffect(() => {
        if (!launchDate || isLive) return;

        function calculateCountdown() {
            const now = new Date().getTime();
            const target = launchDate!.getTime();
            const diff = Math.max(0, target - now);

            // If countdown reaches zero, set live
            if (diff <= 0) {
                setIsLive(true);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
                (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
            );
            const minutes = Math.floor(
                (diff % (1000 * 60 * 60)) / (1000 * 60)
            );
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown({ days, hours, minutes, seconds });
        }

        calculateCountdown();
        const interval = setInterval(calculateCountdown, 1000);
        return () => clearInterval(interval);
    }, [launchDate, isLive]);

    // Listen for project:live WebSocket event
    useEffect(() => {
        if (!socket) return;

        const handleProjectLive = () => {
            console.log("Hero: project:live received, switching to LIVE state");
            setIsLive(true);
        };

        socket.on("project:live", handleProjectLive);

        return () => {
            socket.off("project:live", handleProjectLive);
        };
    }, [socket]);

    const pad = (n: number) => String(n).padStart(2, "0");

    return (
        <section className="flex flex-col items-center justify-center pt-16 pb-14 px-4 text-center">
            <img
                src="/images/logos/Primary Logo/Keanu Primary Logo Brown.png"
                alt="Keanu Residences Logo"
                className="w-[85%] max-w-[380px] md:max-w-[550px] lg:max-w-[650px] object-contain mb-10 md:mb-12"
            />
            <p className="font-display text-[12px] md:text-[14px] tracking-[0.2em] uppercase text-[#8B95A1] mb-8 md:mb-10 font-medium">
                Keramas, Bali — Sunrise Coast Living
            </p>

            <div className="flex items-center justify-center mb-14 py-6 px-2 sm:px-4 md:py-8 md:px-14 bg-white/60 backdrop-blur-sm border border-[#EBEAE5] shadow-xl shadow-black/5 w-full max-w-[90vw] md:max-w-none md:w-auto overflow-hidden">
                {loading ? (
                    <span className="font-display text-xs tracking-[0.15em] uppercase text-[#8B95A1] animate-pulse">
                        Loading countdown...
                    </span>
                ) : isClosed ? (
                    <div className="flex flex-col items-center gap-3">
                        <span className="font-cinzel text-3xl md:text-5xl text-[#1A1A1A] uppercase tracking-wider">
                            Closed
                        </span>
                        <span className="font-display text-[13px] tracking-[0.15em] uppercase text-[#7A7A7A] font-medium">
                            All residences have been sold
                        </span>
                    </div>
                ) : isLive ? (
                    <a
                        href="#available-villas"
                        className="flex flex-col items-center gap-3 group cursor-pointer"
                    >
                        <span className="font-cinzel text-3xl md:text-5xl text-[#1A1A1A] uppercase tracking-wider">
                            Now Live
                        </span>
                        <span className="font-display text-[13px] tracking-[0.15em] uppercase text-[#7A7A7A] group-hover:text-[#1A1A1A] transition-colors font-medium">
                            View Available Residences ↓
                        </span>
                    </a>
                ) : (
                    <>
                        <div className="flex flex-row items-center justify-between w-full md:gap-14 px-2 sm:px-6 md:px-0">
                            <CountdownItem
                                value={pad(countdown.days)}
                                label="Days"
                            />
                            <div className="h-8 md:h-12 w-[1px] bg-[#EBEAE5] mx-1 sm:mx-2 md:mx-0"></div>
                            <CountdownItem
                                value={pad(countdown.hours)}
                                label="Hours"
                            />
                            <div className="h-8 md:h-12 w-[1px] bg-[#EBEAE5] mx-1 sm:mx-2 md:mx-0"></div>
                            <CountdownItem
                                value={pad(countdown.minutes)}
                                label="Minutes"
                            />
                            <div className="h-8 md:h-12 w-[1px] bg-[#EBEAE5] mx-1 sm:mx-2 md:mx-0"></div>
                            <CountdownItem
                                value={pad(countdown.seconds)}
                                label="Seconds"
                            />
                        </div>
                    </>
                )}
            </div>

            <p className="font-lato max-w-[650px] mx-auto text-[#4A4A4A] text-[15px] md:text-[16px] leading-[26px] font-light text-center">
                A limited collection of 10 beachfront residences within a gated enclave on Bali's sunrise coast.
                <br className="hidden md:block" />
                Designed for privacy, openness, and a sense of lasting value.
            </p>
        </section>
    );
}

function CountdownItem({ value, label }: { value: string; label: string }) {
    return (
        <div className="flex flex-col items-center w-full min-w-[60px] md:w-20">
            <span className="font-cinzel text-[32px] sm:text-[42px] md:text-[52px] font-normal leading-none md:leading-[48px] text-[#1A1A1A] mb-2 md:mb-3">
                {value}
            </span>
            <span className="font-display text-[8px] sm:text-[9px] md:text-[10px] tracking-widest sm:tracking-[0.2em] uppercase text-[#8C8C8C] font-semibold">
                {label}
            </span>
        </div>
    );
}
