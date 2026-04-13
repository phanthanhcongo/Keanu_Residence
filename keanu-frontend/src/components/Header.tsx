import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, CreditCard, Globe, LayoutGrid, LogOut } from "lucide-react";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { EnquiryModal } from "./EnquiryModal";
import { useTracking } from "../hooks/useTracking";
import { TrackingAction } from "../services/trackingService";
import { useAuth } from "../contexts/AuthContext";

export function Header() {
  const { trackAction } = useTracking();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isMasterplan = pathname.startsWith("/masterplan");

  const navLinks = [
    { to: "/", label: "Residences" },
    { to: "/masterplan", label: "Masterplan" },
    { to: "/about", label: "Explore" },
    { to: "/shortlist", label: "Shortlist" },
  ];

  const accountLinks = useMemo(() => {
    const links = [
      { to: "/profile", label: "User Detail", icon: User },
      { to: "/payment-history", label: "History Payment", icon: CreditCard },
      { to: "/contact", label: "Contact Us", icon: Globe },
    ];

    if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
      links.unshift({ to: "/admin", label: "Admin Panel", icon: LayoutGrid });
    }

    return links;
  }, [user?.role]);

  useEffect(() => {
    // Prevent stale mobile overlay after navigation.
    setIsMenuOpen(false);
  }, [pathname]);

  const handleMobileLogout = async () => {
    setIsMenuOpen(false);
    await logout();
    navigate("/login");
  };


  return (
    <>
      <nav className={`w-full z-50 flex items-center justify-between px-6 md:px-12 lg:px-16 py-5 transition-all duration-300 ${isMasterplan ? "absolute top-0 left-0 bg-black/20 border-transparent" : "sticky top-0 bg-[#F5F2EBE5] border-b border-[#EBEAE5]"}`}>
        {/* Left: Logo */}
        <Link to="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
          <img
            src={`/images/logos/Submark/Keanu Submark Logo ${isMasterplan ? 'White' : 'Brown'}.png`}
            alt="Keanu Logo"
            className="w-10 h-auto object-contain"
          />
        </Link>

        {/* Right: Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8 md:gap-12">
          {navLinks.map((link) => {
            const isActive = link.to === pathname;
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`font-display text-[13px] tracking-[0.15em] uppercase transition-all font-medium pb-0.5 border-b-2 ${isActive
                  ? (isMasterplan ? "text-white font-bold border-white" : "text-[#1A1A1A] font-bold border-[#1A1A1A]")
                  : (isMasterplan ? "text-white/80 hover:text-white border-transparent" : "text-[#4A4A4A] hover:text-[#1A1A1A] border-transparent")}`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              setIsEnquiryOpen(true);
              trackAction({ action: TrackingAction.ENQUIRE_CLICK });
            }}
            className={`font-display text-[13px] tracking-[0.15em] uppercase transition-colors px-8 py-3.5 font-bold ${isMasterplan ? "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm" : "bg-[#E6E1D6] text-[#1A1A1A] hover:bg-[#D5D0C5]"}`}
          >
            Enquire
          </button>
          <div className={`ml-2 border-l pl-8 ${isMasterplan ? "border-white/20" : "border-[#EBEAE5]"}`}>
            <UserProfileDropdown isDarkTheme={isMasterplan} />
          </div>
        </div>

        {/* Mobile Toggle Button */}
        <button
          className={`md:hidden p-2 focus:outline-none ${isMasterplan && !isMenuOpen ? 'text-white' : 'text-[#1A1A1A]'}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {
        isMenuOpen && (
          <div className="fixed inset-0 z-40 bg-[#F5F2EBE5] flex flex-col pt-24 px-6 pb-6 animate-fade-in md:hidden">
            <div className="flex flex-col gap-8 text-center flex-1 mt-10">
              {navLinks.map((link) => {
                const isActive = link.to === pathname;
                return (
                  <Link
                    key={link.label}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`font-display text-sm tracking-[0.2em] uppercase transition-all font-bold pb-1 border-b-2 w-fit mx-auto ${isActive ? "text-[#A69279] border-[#A69279]" : "text-[#6B7280] hover:text-[#A69279] border-transparent"}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-5 mt-auto border-t border-[#EBEAE5] pt-6">
              <div className="text-center">
                <p className="font-display text-[10px] tracking-[0.18em] uppercase text-[#8C7E6D] mb-3">
                  Account
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {accountLinks.map((link) => {
                    const isActive = pathname.startsWith(link.to);
                    return (
                      <Link
                        key={link.label}
                        to={link.to}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center justify-center gap-2.5 py-3 px-4 border font-display text-[11px] tracking-[0.14em] uppercase font-semibold transition-colors ${isActive
                          ? "border-[#A69279] text-[#A69279] bg-white"
                          : "border-[#EBEAE5] text-[#4A4A4A] bg-white/70 hover:text-[#A69279] hover:border-[#A69279]"
                          }`}
                      >
                        <link.icon size={14} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}

                  <button
                    onClick={handleMobileLogout}
                    className="flex items-center justify-center gap-2.5 py-3 px-4 border border-[#F2D7D7] text-[#B04444] bg-white font-display text-[11px] tracking-[0.14em] uppercase font-semibold hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEnquiryOpen(true);
                  trackAction({ action: TrackingAction.ENQUIRE_CLICK });
                }}
                className="w-full font-display text-sm tracking-[0.2em] uppercase transition-colors bg-[#E6E1D6] text-[#1A1A1A] hover:bg-[#D5D0C5] py-4"
              >
                Enquire
              </button>
            </div>
          </div>
        )
      }

      <EnquiryModal
        isOpen={isEnquiryOpen}
        onClose={() => setIsEnquiryOpen(false)}
      />
    </>
  );
}
