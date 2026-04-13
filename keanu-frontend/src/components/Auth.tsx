import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

interface AuthProps {
    children: React.ReactNode;
}

const PUBLIC_ROUTES = ["/login", "/register", "/otp-verify", "/forgot-password"];

export default function Auth({ children }: AuthProps) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoading) return;
        // Unauthenticated user on a protected route → send to login
        if (!isAuthenticated && !PUBLIC_ROUTES.includes(location.pathname)) {
            navigate("/login", { state: { from: location.pathname } });
        }
        // Authenticated user on a public auth route → send to home
        // Keep OTP verify page out of this auto-redirect to avoid racing with
        // post-verification navigation (onboarding / home).
        if (
            isAuthenticated &&
            PUBLIC_ROUTES.includes(location.pathname) &&
            location.pathname !== "/otp-verify"
        ) {
            navigate("/", { replace: true });
        }
    }, [isAuthenticated, isLoading, location.pathname, navigate, user]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F5F2EBE5]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#A89B8C] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#A89B8C] font-medium tracking-widest uppercase text-xs">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
