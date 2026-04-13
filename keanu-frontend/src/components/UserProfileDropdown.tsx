import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, CreditCard, LogOut, ChevronDown, Globe, LayoutGrid } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface UserProfileDropdownProps {
    variant?: "ghost" | "bordered";
    dropUp?: boolean;
    isDarkTheme?: boolean;
    onItemClick?: () => void;
}

const FIXED_PROFILE_AVATAR = "/images/logos/Submark/Keanu Submark Logo Brown.png";

export function UserProfileDropdown({
    variant = "bordered",
    dropUp = false,
    isDarkTheme = false,
    onItemClick,
}: UserProfileDropdownProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Always close dropdown after route changes.
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        setIsOpen(false);
        onItemClick?.();
        await logout();
        navigate("/login");
    };

    const menuItems = [
        { label: "User Detail", to: "/profile", icon: User },
        { label: "History Payment", to: "/payment-history", icon: CreditCard },
        { label: "Contact Us", to: "/contact", icon: Globe },
    ];

    // Add Admin Panel link for admins
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        menuItems.unshift({ label: "Admin Panel", to: "/admin", icon: LayoutGrid });
    }

    const buttonClasses = variant === "bordered"
        ? `w-9 h-9 flex items-center justify-center rounded-full border transition-colors ${isDarkTheme ? 'border-white/30 text-white hover:border-white hover:bg-white/10' : 'border-[#EBEAE5] text-[#5A5A5A] hover:border-[#A89B8C] hover:text-[#1A1A1A]'}`
        : `flex items-center gap-2 transition-colors ${isDarkTheme ? 'text-white/80 hover:text-white' : 'text-[#5A5A5A] hover:text-[#1A1A1A]'}`;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={buttonClasses}
                aria-label="User profile"
            >
                <img 
                    src={user?.avatarUrl || FIXED_PROFILE_AVATAR} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover p-1 bg-white" 
                />
                {variant === "ghost" && <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute right-0 w-56 bg-white/95 backdrop-blur-md border border-[#EBEAE5] shadow-xl z-50 overflow-hidden animate-in fade-in duration-200 ${dropUp ? 'bottom-full mb-3' : 'mt-3'}`}>
                    {/* User Info Header */}
                    <div className="px-5 py-4 border-b border-[#F5F2EBE5] bg-[#F9F9F7]">
                        <p className="font-display text-[10px] tracking-[0.15em] uppercase text-[#A89B8C] mb-0.5">
                            Welcome
                        </p>
                        <p className="font-display text-xs font-bold text-[#1A1A1A] truncate">
                            {user?.firstName && user?.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : (user?.firstName || user?.lastName || user?.email || "Guest")}
                        </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        {menuItems.map((item) => (
                            <Link
                                key={item.label}
                                to={item.to}
                                onClick={() => {
                                    setIsOpen(false);
                                    onItemClick?.();
                                }}
                                className="flex items-center gap-3 px-5 py-3 font-display text-[11px] tracking-[0.1em] uppercase transition-colors hover:bg-[#F5F2EBE5] text-[#6B7280] hover:text-[#A69279] font-bold"
                            >
                                <item.icon size={14} />
                                {item.label}
                            </Link>
                        ))}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-5 py-3 font-display text-[11px] tracking-[0.1em] uppercase transition-colors hover:bg-red-50 text-red-500 font-bold"
                        >
                            <LogOut size={14} />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
