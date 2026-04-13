import React, { useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { useTracking } from "../hooks/useTracking";

export default function Masterplan() {
    const [selectedVilla, setSelectedVilla] = useState<string | null>("03");
    const { trackPageView, TrackingAction } = useTracking();

    const villas = [
        { id: "01", top: "33%", left: "47%", status: "available" },
        { id: "02", top: "48%", left: "56%", status: "available" },
        { id: "03", top: "40%", left: "68%", status: "available" },
        { id: "04", top: "58%", left: "53%", status: "available" },
    ];

    return (
        <div className="relative w-full h-[100dvh] min-h-screen overflow-hidden text-[#5C4A3A]">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url("/images/masterplan/Backgroud.png")' }}
            ></div>


            {/* Interactive Villas on Map */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="relative w-full h-full max-w-[1440px] mx-auto">
                    {villas.map((villa) => (
                        <div
                            key={villa.id}
                            className={`absolute pointer-events-auto cursor-pointer touch-manipulation flex flex-col items-center group transform -translate-x-1/2 -translate-y-1/2 ${selectedVilla === villa.id ? 'z-20' : 'z-10'}`}
                            style={{ top: villa.top, left: villa.left }}
                            onClick={() => {
                                setSelectedVilla(villa.id);
                                trackPageView(TrackingAction.UNIT_VIEW, villa.id, 'Villa');
                            }}
                        >
                            <div
                                className={`w-11 h-11 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center backdrop-blur-sm transition-all duration-300 ${selectedVilla === villa.id
                                    ? "bg-[#8C8271]/45 border border-[#D5C6AA]"
                                    : "bg-white/10 hover:bg-white/20 border border-white/30"
                                    }`}
                            >
                                <span className={`font-serif text-sm sm:text-base lg:text-lg ${selectedVilla === villa.id ? 'text-white' : 'text-white/80'}`}>
                                    {villa.id}
                                </span>
                            </div>

                            {/* Selected Label */}
                            <div
                                className={`hidden sm:block mt-2 px-3 py-1 bg-[#D5C6AA]/90 backdrop-blur-md rounded text-[10px] uppercase tracking-widest font-medium text-[#4A3E31] transition-all duration-300 ${selectedVilla === villa.id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                                    }`}
                            >
                                Selected
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mobile status bar */}
            <div className="absolute top-[84px] left-3 right-3 z-20 md:hidden pointer-events-none">
                <div className="bg-black/30 border border-white/20 text-white/90 backdrop-blur-sm px-3 py-2.5 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Project Status</p>
                        <p className="text-xs font-light">Phase 1: 80% Sold</p>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#D5C6AA]"></span>Available</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#E5783A]"></span>Reserved</span>
                    </div>
                </div>
            </div>

            {/* Selected Villa Details Panel */}
            {selectedVilla && (
                <div className="absolute z-30 pointer-events-auto overflow-y-auto custom-scrollbar bg-white/90 backdrop-blur-xl shadow-2xl rounded-md p-5 sm:p-6 md:p-8 left-3 right-3 bottom-3 max-h-[56dvh] sm:left-6 sm:right-6 sm:bottom-6 md:top-[100px] md:left-8 md:right-auto md:bottom-auto md:w-[360px] md:max-h-[calc(100vh-240px)] lg:left-12">
                    <button
                        className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-500 hover:text-black hover:bg-black/5 p-1 rounded-sm transition-colors"
                        onClick={() => setSelectedVilla(null)}
                    >
                        <X size={22} strokeWidth={1.5} />
                    </button>

                    <div className="mt-2 mb-2">
                        <span className="inline-flex px-3 py-1.5 md:px-3.5 md:py-2 bg-[#14532D]/15 border border-[#166534]/30 text-[#166534] text-[9px] md:text-[10px] uppercase tracking-widest rounded-sm font-medium">
                            Available • Beachfront
                        </span>
                    </div>

                    <h2 className="font-serif text-[34px] sm:text-[38px] md:text-[42px] text-[#5C4A3A] mb-1.5 md:mb-2">Residence {selectedVilla}</h2>
                    <p className="text-[14px] md:text-[15px] text-[#7A7264] mb-5 md:mb-8 font-light">Sunrise Coast Living</p>

                    <div className="border-t border-b border-[#D5C6AA]/30 py-5 md:py-6 mb-5 md:mb-8">
                        <div className="grid grid-cols-2 gap-y-5 md:gap-y-7 gap-x-4">
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-[#A89B8C] mb-2 font-medium">Land Size</p>
                                <p className="font-serif text-[20px] md:text-[22px] text-[#5C4A3A]">1,060 <span className="text-xs md:text-sm font-serif">sq m</span></p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-[#A89B8C] mb-2 font-medium">Build Size</p>
                                <p className="font-serif text-[20px] md:text-[22px] text-[#5C4A3A]">650 <span className="text-xs md:text-sm font-serif">sq m</span></p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-[#A89B8C] mb-2 font-medium">Bedrooms</p>
                                <p className="font-serif text-[20px] md:text-[22px] text-[#5C4A3A]">4 Suites</p>
                            </div>
                            <div>
                                <p className="text-[9px] uppercase tracking-widest text-[#A89B8C] mb-2 font-medium">Levels</p>
                                <p className="font-serif text-[20px] md:text-[22px] text-[#5C4A3A]">2 + Rooftop</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-6 mb-5 md:mb-8 mt-3 md:mt-8">
                        <p className="text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-[#8B95A1] font-medium whitespace-nowrap">Starting From</p>
                        <p className="font-serif text-[26px] md:text-[28px] text-[#5C4A3A] whitespace-nowrap">$1,850,000</p>
                    </div>

                    <div className="space-y-2.5 md:space-y-3 mb-5 md:mb-8">
                        <button className="w-full bg-[#5C4A3A] hover:bg-[#725e4c] text-white py-4 px-6 flex items-center justify-between transition-all duration-300">
                            <span className="text-[11px] uppercase tracking-widest font-medium">View Full Specs</span>
                            <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button 
                            className="w-full border border-[#D1CDC7] bg-transparent hover:bg-black/5 text-[#5C4A3A] py-4 px-6 flex items-center justify-center transition-colors"
                            onClick={() => trackPageView(TrackingAction.ENQUIRE_CLICK, selectedVilla !== null ? selectedVilla : undefined, 'Villa')}
                        >
                            <span className="text-[11px] uppercase tracking-widest font-medium">Request Floorplan</span>
                        </button>
                    </div>

                    {/* Mini Gallery */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="aspect-[4/3] bg-gray-200" style={{ backgroundImage: 'url("/images/unit_images/3.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        <div className="aspect-[4/3] bg-gray-200" style={{ backgroundImage: 'url("/images/unit_images/6.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                        <div className="aspect-[4/3] bg-gray-200" style={{ backgroundImage: 'url("/images/unit_images/10.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                    </div>
                </div>
            )}

            {/* Bottom Information Layer */}
            <div className="hidden md:flex absolute bottom-8 lg:bottom-12 left-8 lg:left-12 right-8 lg:right-12 justify-between items-end z-10 pointer-events-none text-white/90">

                {/* Project Status */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                        <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-black"></div>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1">Project Status</p>
                        <p className="font-light text-sm">Phase 1: 80% Sold</p>
                    </div>
                </div>

                {/* Legend & Navigation */}
                <div className="flex items-end gap-16">
                    <div className="flex gap-6 mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#D5C6AA]"></div>
                            <span className="text-[10px] uppercase tracking-wider text-white/80">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full border border-white/50"></div>
                            <span className="text-[10px] uppercase tracking-wider text-white/80">Sold</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#E5783A]"></div>
                            <span className="text-[10px] uppercase tracking-wider text-white/80">Reserved</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-wider text-white/80 mb-2">N</span>
                        <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                            <div className="w-[1px] h-6 bg-white/70"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
