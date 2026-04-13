import React from "react";
import { Link, useParams } from "react-router-dom";
import { Clock, Download } from "lucide-react";

export default function ReservationSecured() {
    const { id } = useParams<{ id: string }>();

    return (
        <div className="relative min-h-screen w-full bg-[#1A1A1A] text-[#F5F2EBE5] flex flex-col overflow-y-auto">
            {/* Background Image */}
            <div className="fixed inset-0 z-0">
                <img
                    src="/images/reservation/bg_reservation_secure.png"
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 mix-blend-multiply" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            </div>


            {/* Center Main Modal Container */}
            <main className="relative z-10 w-full max-w-[1024px] mx-auto px-6 my-8 lg:my-auto flex flex-col md:flex-row shadow-2xl flex-shrink-0">

                {/* Left Side: Photo */}
                <div className="relative w-full md:w-[45%] h-[350px] md:h-auto overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop"
                        alt="Beachfront Estate"
                        className="w-full h-full object-cover relative z-0"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent z-10"></div>

                    {/* Caption */}
                    <div className="absolute bottom-8 left-8 z-20">
                        <span className="font-display text-[9px] tracking-[0.2em] uppercase text-[#CEAA8C] block mb-2">
                            Residence 04
                        </span>
                        <h3 className="font-serif text-xl sm:text-2xl text-white tracking-wide uppercase">
                            The Beachfront Estate
                        </h3>
                    </div>
                </div>

                {/* Right Side: Details Panel */}
                <div className="w-full md:w-[55%] bg-[#242A22] p-8 sm:p-10 lg:p-14 flex flex-col justify-center">

                    {/* Status badge */}
                    <div className="mb-6">
                        <span className="inline-block border border-[#8C7A5B] text-[#A68F6C] font-display text-[8px] md:text-[9px] uppercase tracking-[0.25em] px-4 py-1.5 opacity-90">
                            Status: Confirmed
                        </span>
                    </div>

                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-[40px] leading-[1.1] mb-5 tracking-wide uppercase text-white drop-shadow-sm">
                        Reservation<br />Secured
                    </h1>

                    <p className="font-lato text-xs sm:text-sm text-[#A89D92] font-light leading-relaxed mb-8 pr-4">
                        Welcome to Keanu. Your place in our private enclave<br className="hidden lg:block" /> has been successfully reserved.
                    </p>

                    <hr className="border-[#393E35] w-full mb-8" />

                    {/* Meta Stats */}
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6 mb-8">
                        <div>
                            <span className="font-display text-[8px] tracking-[0.2em] uppercase text-[#888D82] block mb-2">
                                Reservation ID
                            </span>
                            <span className="font-serif text-[#C4A987] text-lg tracking-wider uppercase">
                                {id || "KR-8821-X"}
                            </span>
                        </div>
                        <div>
                            <span className="font-display text-[8px] tracking-[0.2em] uppercase text-[#888D82] block mb-2">
                                Deposit Amount
                            </span>
                            <span className="font-serif text-[#C4A987] text-lg tracking-wider">
                                $25,000 USD
                            </span>
                        </div>
                        <div className="col-span-2">
                            <span className="font-display text-[8px] tracking-[0.2em] uppercase text-[#888D82] block mb-2">
                                Estimated Completion
                            </span>
                            <span className="font-lato text-sm text-[#EAE8E2] font-light">
                                Q4 2027 (PBG Secured)
                            </span>
                        </div>
                    </div>

                    {/* Next Steps Box */}
                    <div className="bg-[#292F27] border border-[#3E453B] p-5 lg:p-7 mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock size={14} className="text-[#C4A987]" />
                            <span className="font-display text-[9px] tracking-[0.2em] uppercase text-[#EAE8E2]">
                                Next Steps
                            </span>
                        </div>
                        <ul className="space-y-2.5 font-lato text-xs text-[#9FA49A] font-light leading-relaxed">
                            <li>Our concierge will contact you within 24 hours.</li>
                            <li>Formal sales documentation will be shared privately.</li>
                            <li>Schedule your site visit or virtual walkthrough.</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <button className="flex-1 flex items-center justify-center gap-2 bg-[#BA9875] hover:bg-[#A68261] text-[#1A1A1A] font-display font-semibold text-[9px] md:text-[10px] tracking-[0.25em] py-4 px-4 transition-colors">
                            <Download size={12} className="shrink-0" />
                            Download Receipt
                        </button>
                        <Link to="/" className="flex-1 flex items-center justify-center bg-transparent border border-[#40463D] hover:bg-white/5 text-[#A89D92] hover:text-white font-display text-[9px] md:text-[10px] tracking-[0.25em] py-4 px-4 transition-colors text-center">
                            Return To Home
                        </Link>
                    </div>
                </div>
            </main>


        </div>
    );
}
