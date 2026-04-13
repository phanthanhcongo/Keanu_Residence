import React from "react";
import { Link } from "react-router-dom";
import { Compass, Heart, Rocket, Key } from "lucide-react";

export default function Onboarding2() {
    const steps = [
        {
            icon: <Compass size={18} className="text-[#A89B8C]" />,
            title: "EXPLORE",
            description: "Explore the masterplan, residences, and the unique lifestyle Keanu offers."
        },
        {
            icon: <Heart size={18} className="text-[#A89B8C]" />,
            title: "SHORTLIST",
            description: "Select your preferred residences or residence types tailored to your needs."
        },
        {
            icon: <Rocket size={18} className="text-[#A89B8C]" />,
            title: "LAUNCH",
            description: "Participate in the exclusive launch event for priority selection access."
        },
        {
            icon: <Key size={18} className="text-[#A89B8C]" />,
            title: "RESERVE",
            description: "Secure your residence with a refundable deposit and begin the allocation."
        }
    ];

    return (
        <div className="h-screen w-full bg-[#F3F2EC] relative flex flex-col overflow-hidden selection:bg-[#A89B8C] selection:text-white">
            {/* Logo */}
            <div className="absolute top-6 left-8 sm:left-12 opacity-30 mix-blend-multiply w-28 md:w-36 pointer-events-none">
                <img
                    src="/images/logos/Primary Logo/Keanu Primary Logo Brown.png"
                    alt="Keanu Logo"
                    className="w-full h-auto object-contain"
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 sm:px-12 md:px-20 relative z-10">
                <span className="font-display text-[12px] md:text-[13px] tracking-[0.2em] uppercase text-[#A89B8C] mb-3 font-semibold">
                    By Private Introduction
                </span>

                <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl text-[#B99A7A] mb-4 md:mb-6 tracking-wide drop-shadow-sm uppercase">
                    The Journey
                </h1>

                <p className="font-lato text-base md:text-lg text-[#5A5A5A] font-light leading-relaxed max-w-2xl mx-auto mb-10 md:mb-14">
                    A seamless path to owning a piece of Bali's sunrise coast. <br className="hidden md:block" />
                    Experience a beachfront residential living through our curated <br className="hidden md:block" />
                    reservation process.
                </p>

                {/* Horizontal Steps Layout */}
                <div className="relative w-full max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 md:gap-4 mb-10 md:mb-14">
                    {/* Connecting Line (Horizontal) */}
                    <div className="hidden md:block absolute top-[24px] left-[12%] right-[12%] h-[1px] bg-[#D5D3CC] z-0"></div>

                    {steps.map((step, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center relative z-10 w-full group">
                            {/* Icon Circle */}
                            <div className="w-12 h-12 rounded-full border border-[#D5D3CC] bg-[#F3F2EC] flex items-center justify-center mb-4 group-hover:border-[#A89B8C] transition-colors relative">
                                {step.icon}
                                {/* Mobile Vertical Connecting Line */}
                                {index !== steps.length - 1 && (
                                    <div className="block md:hidden absolute top-12 left-1/2 -translate-x-1/2 w-[1px] h-8 bg-[#D5D3CC]"></div>
                                )}
                            </div>

                            <h3 className="font-serif text-[17px] md:text-[18px] tracking-wide text-[#1A1A1A] mb-2 uppercase font-bold opacity-90">
                                {step.title}
                            </h3>

                            <p className="font-lato text-[13px] md:text-[14px] text-[#8c8275] font-medium leading-relaxed max-w-[200px]">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Call to Action Button */}
                <Link
                    to="/onboarding-3"
                    className="inline-block px-12 py-4 bg-[#B39373] hover:bg-[#A38363] text-white font-display text-[12px] md:text-[13px] tracking-[0.2em] uppercase transition-colors shadow-md font-bold"
                >
                    Start Your Journey
                </Link>
            </main>

            {/* Footer: Pagination & Disclaimer */}
            <footer className="relative z-20 w-full pb-6 pt-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                    <Link to="/onboarding" className="w-2 h-2 rounded-full bg-[#A89B8C] opacity-40 hover:opacity-100 transition-opacity" aria-label="Step 1"></Link>
                    <Link to="/onboarding-2" className="w-2 h-2 rounded-full bg-[#A89B8C]" aria-label="Step 2"></Link>
                    <Link to="/onboarding-3" className="w-2 h-2 rounded-full bg-[#A89B8C] opacity-40 hover:opacity-100 transition-opacity" aria-label="Step 3"></Link>
                </div>
                <p className="font-display text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-[#A89B8C] font-medium">
                    Keanu Residences © 2026. All visuals are indicative.
                </p>
            </footer>
        </div>
    );
}
