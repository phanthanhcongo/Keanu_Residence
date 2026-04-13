import React, { useEffect, useState } from "react";
import Sidebar from "../components/admin/Sidebar";
import { Bell, Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Map routes to their display names
    const getPageTitle = (path: string) => {
        if (path.includes("/admin/villas")) return "Residence Control";
        if (path.includes("/admin/users")) return "Users";
        if (path.includes("/admin/projects")) return "Projects";
        if (path.includes("/admin/reservations")) return "Reservations";
        if (path.includes("/admin/otp-monitor")) return "OTP Monitor";
        if (path.includes("/admin/activity-logs")) return "Activity Logs";
        return "Overview"; // Default for /admin
    };

    const currentTitle = getPageTitle(location.pathname);

    useEffect(() => {
        // Close mobile drawer after route change.
        setIsSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen bg-[#F5F5F4] overflow-hidden font-sans">
            {/* Desktop sidebar — fixed so it stays visible on scroll */}
            <div className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[280px]">
                <Sidebar className="h-screen overflow-y-auto" />
            </div>

            {/* Mobile sidebar drawer */}
            <div
                className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <Sidebar className="h-full shadow-2xl" onNavigate={() => setIsSidebarOpen(false)} />
            </div>
            {isSidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar overlay"
                    className="fixed inset-0 z-40 bg-black/35 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="flex-1 min-w-0 flex flex-col overflow-y-auto lg:ml-[280px]">
                <header className="h-[72px] border-b border-gray-200 bg-[#F5F5F4] flex items-center justify-between px-4 sm:px-6 lg:px-10 sticky top-0 z-30 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen((v) => !v)}
                            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded border border-gray-200 bg-white text-[#4B5563] hover:text-[#1C1C1C] transition-colors"
                            aria-label="Toggle sidebar menu"
                        >
                            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                        <div className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] text-[#4B5563] uppercase">
                            {currentTitle}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                        <button className="relative p-2 text-[#4B5563] hover:text-[#1C1C1C] transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-[#F5F5F4]"></span>
                        </button>
                        <button className="hidden sm:inline-flex border border-[#D1CEC7] text-[#4B5563] text-[10px] sm:text-xs font-bold tracking-widest uppercase px-4 sm:px-5 py-2 sm:py-2.5 rounded hover:bg-white transition-colors">
                            View Live Site
                        </button>
                    </div>
                </header>
                <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
            </div>
        </div>
    );
}
