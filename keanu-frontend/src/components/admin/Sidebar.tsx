import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Building2,
    CalendarCheck,
    BarChart3,
    Settings,
    Briefcase,
    Users,
    KeyRound,
    Activity,
    Home,
    Clock,
} from "lucide-react";

const NAV_ITEMS = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "Projects", path: "/admin/projects", icon: Briefcase },
    { name: "Residence Control", path: "/admin/villas", icon: Building2 },
    { name: "Reservations", path: "/admin/reservations", icon: CalendarCheck },
    { name: "Launch Time & FOMO", path: "/admin/launch-time", icon: Clock },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Activity Logs", path: "/admin/activity-logs", icon: Activity },
];

interface SidebarProps {
    className?: string;
    onNavigate?: () => void;
}

export default function Sidebar({ className = "", onNavigate }: SidebarProps) {
    const location = useLocation();

    return (
        <aside className={`w-[280px] bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${className}`}>
            <div className="h-[72px] flex items-center justify-center border-b border-gray-200">
                <Link to="/admin" onClick={onNavigate} className="block outline-none">
                    {/* Mock logo representation */}
                    <span className="text-3xl font-serif text-[#C4B7A6] tracking-tighter italic">K</span>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-8">
                <div className="px-6 mb-6">
                    <Link
                        to="/"
                        onClick={onNavigate}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#A89882]/30 text-[#A89882] hover:bg-[#A89882] hover:text-white transition-all duration-300 font-bold group"
                    >
                        <Home className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
                        <span className="text-sm">Back to Website</span>
                    </Link>
                </div>

                <ul className="space-y-2 px-6">
                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em] mb-4 px-4">Menu</div>
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path || (item.path === "/admin/villas" && location.pathname.includes("villas"));
                        const Icon = item.icon;

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    onClick={onNavigate}
                                    className={`
                    flex items-center gap-4 px-4 py-3 rounded-md transition-all
                    ${isActive
                                            ? "bg-[#EBEAE6] text-[#1C1C1C] font-bold"
                                            : "text-[#4B5563] hover:text-[#1C1C1C] hover:bg-gray-100 font-bold"}
                  `}
                                >
                                    <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 2} />
                                    <span className="text-sm shadow-none">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-6 border-t border-gray-200">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#A89A86] flex items-center justify-center text-white text-sm font-semibold tracking-wider">
                        AD
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Admin User</div>
                        <div className="text-xs text-gray-500 mt-0.5">Head of Sales</div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
