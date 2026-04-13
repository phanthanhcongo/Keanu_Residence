import React, { useState } from "react";
import { Link } from "react-router-dom";

interface FooterProps {
  variant?: "full" | "simple";
}

export function Footer({ variant = "full" }: FooterProps) {
  const [showNewsletterPopup, setShowNewsletterPopup] = useState(false);

  if (variant === "simple") {
    return (
      <footer className="bg-[#F5F2EBE5] px-6 md:px-12 lg:px-16 py-10 border-t border-[#EBEAE5]">
        <div className="flex flex-col md:flex-row justify-between items-center text-[#4A4A4A] text-[12px] tracking-[0.1em] font-display uppercase font-semibold">
          <p>© 2026 KEANU RESIDENCES. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-[#1A1A1A] transition-colors">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-[#1A1A1A] transition-colors">TERMS OF SERVICE</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#F5F2EBE5] px-6 md:px-12 lg:px-16 pt-20 pb-8 border-t border-[#EBEAE5]">
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
        {/* Logo Section */}
        <div className="w-full md:w-1/5 mb-12 md:mb-0">
          <Link to="/" className="inline-block">
            <img
              src="/images/logos/Primary Logo/Keanu Primary Logo Brown.png"
              alt="Keanu Logo"
              className="w-32 md:w-40 h-auto object-contain transition-all"
            />
          </Link>
        </div>

        {/* Links Grid */}
        <div className="w-full md:w-3/4 grid grid-cols-2 gap-8 md:gap-12">
          {/* Residences - Column 1 */}
          <div>
            <h4 className="font-display text-[12px] tracking-[0.15em] uppercase text-[#6B4F3A] mb-6 font-bold">
              Residences
            </h4>
            <div className="flex flex-col gap-4">
              <Link to="/" className="font-lato text-[14px] font-normal text-[#374151] hover:text-[#1A1A1A] hover:underline transition-all">
                Overview
              </Link>
              <Link to="/masterplan" className="font-lato text-[14px] font-normal text-[#374151] hover:text-[#1A1A1A] hover:underline transition-all">
                Masterplan
              </Link>
            </div>
          </div>

          {/* Residences - Column 2 */}
          <div>
            <h4 className="font-display text-[12px] tracking-[0.15em] uppercase text-[#6B4F3A] mb-6 font-bold">
              Residences
            </h4>
            <div className="flex flex-col gap-4">
              <Link to="/#available-villas" className="font-lato text-[14px] font-normal text-[#374151] hover:text-[#1A1A1A] hover:underline transition-all">
                Available Residences
              </Link>
              <Link to="/about" className="font-lato text-[14px] font-normal text-[#374151] hover:text-[#1A1A1A] hover:underline transition-all">
                Explore
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar Details */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-[#4A4A4A] text-[12px] tracking-[0.1em] font-display uppercase font-semibold">
          <p>© 2026 KEANU RESIDENCES. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-[#1A1A1A] transition-colors">PRIVACY POLICY</Link>
            <Link to="/terms" className="hover:text-[#1A1A1A] transition-colors">TERMS OF SERVICE</Link>
          </div>
        </div>
      </div>

      {/* ── Newsletter Success Popup ── */}
      {showNewsletterPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div 
            className="bg-white max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-10 text-center relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-[#FAFAF8] border border-[#EBEAE5] rounded-full flex items-center justify-center mb-8 mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B4F3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </div>
            
            <h3 className="font-serif text-2xl text-[#2C352E] mb-3">Subscription Confirmed</h3>
            <p className="text-[14px] text-[#4A4A4A] leading-relaxed mb-10">
              The latest news from Keanu will be sent to your inbox soon.
            </p>
            
            <button 
              onClick={() => setShowNewsletterPopup(false)}
              className="w-full py-4 bg-[#6B4F3A] text-white font-display text-[11px] tracking-[0.2em] uppercase hover:bg-[#5A3E2A] transition-colors font-bold"
            >
              Discover More
            </button>
          </div>
          {/* Backdrop click to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setShowNewsletterPopup(false)} />
        </div>
      )}
    </footer>
  );
}
