import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Onboarding3() {
    const navigate = useNavigate();
    const { skipProfileCompletion } = useAuth();

    const handleFinishOnboarding = async () => {
        try {
            await skipProfileCompletion();
            navigate("/");
        } catch (error) {
            console.error("Failed to submit onboarding completion:", error);
            // Optionally, fallback directly to home page anyway
            navigate("/");
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#1A1A1A] text-white">
            {/* Background Image & Overlays */}
            <div className="absolute inset-0 w-full h-full z-0">
                <img
                    src="/images/onboarding/Onboarding3.png"
                    alt="Ocean Waves Background"
                    className="w-full h-full object-cover"
                />
                {/* Dark gradient sweeping from left to right */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#171f1a]/95 via-[#171f1a]/80 to-transparent"></div>
                {/* Subtle dark gradient from bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141814] via-[#141814]/40 to-transparent"></div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 w-full min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 pt-28 pb-32">
                <div className="max-w-xl w-full">

                    {/* Intro subtitle */}
                    <span className="font-display text-[12px] tracking-[0.25em] uppercase text-[#CEAA8C] block mb-6 font-semibold">
                        Private Introduction
                    </span>

                    {/* Title */}
                    <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-wide mb-10 drop-shadow-lg">
                        LAUNCH <br />
                        DAY <br />
                        RULES
                    </h1>

                    {/* Top Divider */}
                    <div className="w-full h-[1px] bg-white/10 mb-8"></div>

                    {/* Rules List */}
                    <div className="flex flex-col gap-6">
                        {/* Rule 1 */}
                        <div className="relative group flex items-baseline justify-between">
                            <div className="flex flex-col gap-2">
                                <span className="font-display text-[11px] tracking-[0.25em] uppercase text-[#A89D92] font-semibold">
                                    Priority Access
                                </span>
                                <p className="font-lato text-base md:text-lg text-white/95 font-light">
                                    Residences are allocated in order of reservation.
                                </p>
                            </div>
                            <span className="font-serif italic text-[#A89D92] text-lg">01</span>
                            {/* Line below rule */}
                            <div className="absolute -bottom-3 left-0 w-full h-[1px] bg-white/10"></div>
                        </div>

                        {/* Rule 2 */}
                        <div className="relative group flex items-baseline justify-between mt-3">
                            <div className="flex flex-col gap-2">
                                <span className="font-display text-[11px] tracking-[0.25em] uppercase text-[#A89D92] font-semibold">
                                    Security
                                </span>
                                <p className="font-lato text-base md:text-lg text-white/95 font-light">
                                    A reservation deposit via Stripe is required to secure the residence.
                                </p>
                            </div>
                            <span className="font-serif italic text-[#A89D92] text-lg">02</span>
                            {/* Line below rule */}
                            <div className="absolute -bottom-3 left-0 w-full h-[1px] bg-white/10"></div>
                        </div>

                        {/* Rule 3 */}
                        <div className="relative group flex items-baseline justify-between mt-3">
                            <div className="flex flex-col gap-2">
                                <span className="font-display text-[11px] tracking-[0.25em] uppercase text-[#A89D92] font-semibold">
                                    Reservation Lock
                                </span>
                                <p className="font-lato text-base md:text-lg text-white/95 font-light">
                                    10-minute reservation hold
                                </p>
                            </div>
                            <span className="font-serif italic text-[#A89D92] text-lg">03</span>
                            {/* Line below rule */}
                            <div className="absolute -bottom-3 left-0 w-full h-[1px] bg-white/10"></div>
                        </div>
                    </div>

                    {/* Button & Disclaimers */}
                    <div className="mt-14 max-w-sm">
                        <button
                            onClick={handleFinishOnboarding}
                            className="inline-block w-full text-center sm:w-auto px-10 py-5 bg-[#CEAA8C] hover:bg-[#B89476] text-[#1A1A1A] font-display font-bold text-[13px] tracking-[0.3em] uppercase transition-colors mb-5 shadow-lg"
                        >
                            Enter Keanu
                        </button>

                        <p className="font-lato text-[11px] text-[#A89D92] font-medium leading-relaxed">
                            By entering, you agree to the terms of service. Availability is <br className="hidden sm:block" />
                            updated in real-time.
                        </p>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="absolute bottom-0 left-0 w-full z-20 px-8 md:px-16 pb-8 pt-4 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="font-display text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#A89D92] font-medium">
                    Keanu Residences © 2026
                </p>
                <div className="flex gap-6 md:gap-8">
                    <Link to="/contact" className="font-display text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#A89D92] hover:text-[#CEAA8C] transition-colors font-medium">
                        Terms
                    </Link>
                    <Link to="/contact" className="font-display text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#A89D92] hover:text-[#CEAA8C] transition-colors font-medium">
                        Privacy
                    </Link>
                    <Link to="/contact" className="font-display text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#A89D92] hover:text-[#CEAA8C] transition-colors font-medium">
                        Contact
                    </Link>
                </div>
            </footer>
            {/* Center: Pagination & Navigation */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-24 md:bottom-[72px] z-30 flex items-center gap-5 pointer-events-auto">
                <div className="flex items-center gap-3">
                    <Link to="/onboarding" className="w-2 h-2 rounded-full bg-white/30 hover:bg-white/60 transition-colors" aria-label="Step 1"></Link>
                    <Link to="/onboarding-2" className="w-2 h-2 rounded-full bg-white/30 hover:bg-white/60 transition-colors" aria-label="Step 2"></Link>
                    <Link to="/onboarding-3" className="w-2 h-2 rounded-full bg-[#CEAA8C] hover:bg-[#CEAA8C]/80 transition-colors" aria-label="Step 3"></Link>
                </div>
            </div>
        </div>
    );
}
