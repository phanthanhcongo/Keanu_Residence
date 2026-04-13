import React from "react";
import { Link } from "react-router-dom";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { User } from "lucide-react";

export function ShortlistNavbar() {
    return (
        <nav className="w-full sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 lg:px-16 pt-8 pb-6 border-b border-[#EBEAE5] bg-[#F5F2EBE5]">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center">
                <img
                    src="/images/logos/Secondary Logo/Keanu Secondary Logo Black.png"
                    alt="Keanu Logo"
                    className="h-5 w-auto object-contain"
                />
            </Link>

            {/* Right: Nav Links + Profile */}
            <div className="hidden md:flex items-center gap-10">
                <Link
                    to="/"
                    className="font-display text-[13px] tracking-[0.1em] uppercase text-[#6B7280] hover:text-[#A69279] transition-colors font-bold"
                >
                    Residences
                </Link>
                <Link
                    to="/masterplan"
                    className="font-display text-[13px] tracking-[0.1em] uppercase text-[#6B7280] hover:text-[#A69279] transition-colors font-bold"
                >
                    Masterplan
                </Link>
                <Link
                    to="/shortlist"
                    className="font-display text-[13px] tracking-[0.1em] uppercase text-[#A69279] border-b-2 border-[#A69279] pb-1 font-bold"
                >
                    My Shortlist
                </Link>

                {/* Profile Dropdown */}
                <div className="ml-2">
                    <UserProfileDropdown />
                </div>
            </div>

            {/* Mobile Profile */}
            <div className="flex md:hidden">
                <UserProfileDropdown />
            </div>
        </nav>
    );
}
