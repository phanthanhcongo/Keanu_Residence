import React from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useLocation } from "react-router-dom";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { pathname } = useLocation();
    // Header exclusions:
    // - Auth routes (typically have unique branding/layout)
    const excludeHeader = ["/login", "/register", "/forgot-password", "/otp-verify"].includes(pathname) || pathname.startsWith("/checkout") || pathname.startsWith("/onboarding");
    const excludeFooter = excludeHeader || pathname.startsWith("/masterplan");

    return (
        <div className="min-h-screen bg-[#F5F2EBE5] selection:bg-[#A89B8C] selection:text-white">
            {!excludeHeader && <Header />}
            <main>{children}</main>
            {!excludeFooter && <Footer />}
        </div>
    );
}
