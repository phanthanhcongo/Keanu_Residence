import React from "react";
import { Link } from "react-router-dom";
import { Menu, ArrowRight } from "lucide-react";

export default function Onboarding() {
    return (
        <div className="relative h-screen w-full bg-[#1A1A1A] flex flex-col overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 w-full h-full">
                <img
                    src="/images/onboarding/Onboarding 1.png"
                    alt="Sunrise Coast Living"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40" />
            </div>

 

            {/* Main Content */}
            <main className="relative z-10 flex-1 w-full flex flex-col items-center justify-center px-6 text-center">
                {/* Logo */}
                <img
                    src="/images/logos/Primary Logo/Keanu Primary Logo White.png"
                    alt="Keanu Residences"
                    className="w-48 sm:w-64 md:w-80 lg:w-96 h-auto object-contain mb-6 md:mb-8"
                />

                <span className="font-display text-[10px] md:text-[11px] tracking-[0.3em] uppercase text-white/90 mb-3">
                    Onboarding Step 1
                </span>

                <h1 className="font-playfair text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white uppercase tracking-wider mb-4 md:mb-6 drop-shadow-md">
                    The Vision
                </h1>

                <p className="font-lato text-sm md:text-base text-white/90 max-w-2xl font-light leading-relaxed mb-6 md:mb-8 px-4">
                    A limited collection of 10 beachfront residences within a gated enclave on Bali's sunrise coast. <br className="hidden md:block" />
                    Designed for privacy, openness, and a sense of lasting value.
                </p>

                <Link
                    to="/onboarding-2"
                    className="inline-flex items-center gap-3 px-8 py-3 mt-4 border border-white/80 text-white font-display text-[10px] md:text-[11px] tracking-[0.2em] uppercase hover:bg-white hover:text-[#1A1A1A] transition-all bg-transparent backdrop-blur-sm"
                >
                    Explore The Journeys
                    <ArrowRight size={14} className="ml-1" />
                </Link>
            </main>

            {/* Footer / Bottom Bar */}
            <footer className="relative w-full z-20 px-6 xl:px-16 pb-6 pt-4 flex flex-col md:flex-row justify-between items-center md:items-end pointer-events-none gap-4 md:gap-0">
                {/* Left: Location */}
                <div className="text-left hidden sm:block">
                    <h4 className="font-display text-[10px] tracking-[0.2em] uppercase text-white mb-1">
                        Location
                    </h4>
                    <p className="font-lato text-[11px] text-white/80">
                        Keramas, Bali — Sunrise Coast Living
                    </p>
                </div>

                {/* Center: Pagination & Navigation */}
                <div className="flex items-center gap-5 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <Link to="/onboarding" className="w-2 h-2 rounded-full bg-[#E6E1D6] hover:bg-white transition-colors" aria-label="Step 1"></Link>
                        <Link to="/onboarding-2" className="w-2 h-2 rounded-full bg-white/30 hover:bg-white/60 transition-colors" aria-label="Step 2"></Link>
                        <Link to="/onboarding-3" className="w-2 h-2 rounded-full bg-white/30 hover:bg-white/60 transition-colors" aria-label="Step 3"></Link>
                    </div>
                </div>

                {/* Right: Disclaimer */}
                <div className="text-right hidden sm:block">
                    <h4 className="font-display text-[10px] tracking-[0.2em] uppercase text-white mb-1">
                        Private Introduction
                    </h4>
                    <p className="font-lato text-[9px] text-white/80 leading-relaxed">
                        All visuals are indicative. <br />
                        Final details confirmed in formal sale documentation.
                    </p>
                </div>
            </footer>
        </div>
    );
}
