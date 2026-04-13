import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, User, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export default function BookConsultant() {
    const [selectedDate, setSelectedDate] = useState<number | null>(8);
    const [selectedTime, setSelectedTime] = useState<string>("11:30 AM");

    // Mock calendar logic matching the visual
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const days = [
        [null, null, 1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10, 11, 12],
        [13, 14, 15, null, null, null, null]
    ];

    const times = ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"];

    return (
        <div className="min-h-screen bg-[#EBE9E1] font-sans text-[#2A332C] flex flex-col selection:bg-[#9B7A5B] selection:text-white">

            {/* Main Content */}
            <main className="flex-1 w-full max-w-[1400px] mx-auto px-8 md:px-16 py-10 flex flex-col lg:flex-row gap-16 lg:gap-24 items-center lg:items-stretch">
                {/* Left Column */}
                <div className="flex-1 max-w-lg pt-4 w-full">
                    <span className="font-display text-[10px] tracking-[0.25em] uppercase text-[#9B7A5B] block mb-6 font-medium">
                        Private Access
                    </span>
                    <h1 className="font-serif text-[44px] md:text-[56px] text-[#2A332C] leading-[1.15] mb-8">
                        Secure Your <br /> Consultation
                    </h1>

                    <div className="border-l-[3px] border-[#9B7A5B] pl-6 mb-12">
                        <p className="font-lato text-[#7A7E7A] text-sm md:text-[15px] leading-relaxed font-light">
                            Discover the unparalleled serenity of Keanu Residences. Schedule a private introduction with our sales director to discuss ownership opportunities and estate charters.
                        </p>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-[#E4E2D5] p-8 max-w-[360px]">
                        <div className="flex gap-5 items-center mb-6">
                            <div className="w-[72px] h-[72px] bg-[#A3B2A6] overflow-hidden shrink-0">
                                <img src="/images/reservation/bg_reservation_secure.png" alt="Elena Rostova Placeholder" className="w-full h-full object-cover scale-150" />
                            </div>
                            <div>
                                <h3 className="font-serif text-[22px] text-[#2A332C] mb-1 leading-tight">Elena <br /> Rostova</h3>
                                <span className="font-display text-[8px] tracking-[0.2em] uppercase text-[#7A7E7A]">Sales Director</span>
                            </div>
                        </div>
                        <p className="font-lato text-[11px] text-[#7A7E7A] font-light leading-relaxed border-t border-[#D0CEBF] pt-5 opacity-90">
                            "I look forward to personally guiding you through the vision of Keanu—a sanctuary where architectural mastery meets the rhythm of the sunrise coast."
                        </p>
                    </div>
                </div>

                {/* Right Column - Booking Interface */}
                <div className="flex-[1.2] w-full bg-[#F6F5F0] shadow-xl p-8 md:p-12 lg:p-14 border border-[#EBE9E1]">
                    <div className="flex flex-col md:flex-row gap-12 md:gap-16 h-full">

                        {/* Calendar & Times */}
                        <div className="flex-1 flex flex-col">
                            {/* Calendar Header */}
                            <div className="flex items-center gap-3 mb-10">
                                <Calendar size={18} className="text-[#9B7A5B]" />
                                <h3 className="font-serif text-xl text-[#2A332C]">Select Date</h3>
                            </div>

                            {/* Calendar UI */}
                            <div className="mb-12">
                                <div className="flex justify-between items-center mb-8 px-2">
                                    <button className="text-[#2A332C] hover:text-[#9B7A5B] transition-colors"><ChevronLeft size={14} /></button>
                                    <span className="font-display text-[9px] tracking-[0.2em] uppercase font-semibold text-[#2A332C]">October 2023</span>
                                    <button className="text-[#2A332C] hover:text-[#9B7A5B] transition-colors"><ChevronRight size={14} /></button>
                                </div>

                                <div className="grid grid-cols-7 gap-y-4 text-center">
                                    {daysOfWeek.map(day => (
                                        <div key={day} className="font-display text-[8px] tracking-[0.1em] text-[#A0A29F] mb-2">{day}</div>
                                    ))}
                                    {days.map((week, wIdx) => (
                                        <React.Fragment key={wIdx}>
                                            {week.map((date, dIdx) => (
                                                <div key={`${wIdx}-${dIdx}`} className="flex justify-center">
                                                    {date ? (
                                                        <button
                                                            onClick={() => setSelectedDate(date)}
                                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-lato text-sm transition-colors ${selectedDate === date ? 'bg-[#9B7A5B] text-white shadow-md' : 'text-[#7A7E7A] hover:bg-[#EAE8E2] hover:text-[#2A332C]'}`}
                                                        >
                                                            {date}
                                                        </button>
                                                    ) : (
                                                        <div className="w-8 h-8"></div>
                                                    )}
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Available Times */}
                            <div className="mt-auto">
                                <h4 className="font-serif text-lg text-[#2A332C] mb-6">Available Times</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {times.map((time, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-3.5 border font-display text-[9px] tracking-[0.1em] transition-colors ${selectedTime === time ? 'bg-[#9B7A5B] border-[#9B7A5B] text-white shadow-sm' : 'border-[#D5D3CC] text-[#7A7E7A] hover:border-[#9B7A5B] hover:text-[#9B7A5B]'}`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block w-[1px] bg-[#EAE8E2]"></div>

                        {/* Your Details */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-10">
                                <User size={18} className="text-[#9B7A5B]" />
                                <h3 className="font-serif text-xl text-[#2A332C]">Your Details</h3>
                            </div>

                            <form className="flex-1 flex flex-col space-y-8">
                                <div>
                                    <label className="font-display text-[8px] tracking-[0.2em] uppercase text-[#A0A29F] block mb-3">Full Name</label>
                                    <input type="text" placeholder="e.g. Jonathan Doe" className="w-full bg-transparent border-b border-[#D5D3CC] pb-3 font-lato text-sm text-[#2A332C] placeholder:text-[#B5B7B3] focus:outline-none focus:border-[#9B7A5B] transition-colors" />
                                </div>
                                <div>
                                    <label className="font-display text-[8px] tracking-[0.2em] uppercase text-[#A0A29F] block mb-3">Email Address</label>
                                    <input type="email" placeholder="e.g. jonathan@example.com" className="w-full bg-transparent border-b border-[#D5D3CC] pb-3 font-lato text-sm text-[#2A332C] placeholder:text-[#B5B7B3] focus:outline-none focus:border-[#9B7A5B] transition-colors" />
                                </div>
                                <div>
                                    <label className="font-display text-[8px] tracking-[0.2em] uppercase text-[#A0A29F] block mb-3">Phone Number</label>
                                    <input type="tel" placeholder="+1 (555) 000-0000" className="w-full bg-transparent border-b border-[#D5D3CC] pb-3 font-lato text-sm text-[#2A332C] placeholder:text-[#B5B7B3] focus:outline-none focus:border-[#9B7A5B] transition-colors" />
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <label className="font-display text-[8px] tracking-[0.2em] uppercase text-[#A0A29F] block mb-3">Areas of Interest</label>
                                    <textarea placeholder="Specific questions regarding plots, pricing, or architecture..." className="w-full flex-1 min-h-[80px] bg-transparent border-b border-[#D5D3CC] pb-3 font-lato text-[13px] leading-relaxed text-[#2A332C] placeholder:text-[#B5B7B3] resize-none focus:outline-none focus:border-[#9B7A5B] transition-colors"></textarea>
                                </div>

                                <button type="button" className="w-full bg-[#354037] hover:bg-[#2A332C] text-white py-4 px-6 flex justify-between items-center transition-colors group mt-auto shadow-md">
                                    <span className="font-display text-[9px] tracking-[0.25em] uppercase font-semibold">Confirm Booking</span>
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
}
