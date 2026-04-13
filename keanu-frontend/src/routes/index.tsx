import React from "react";
import { Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import MainLayout from "../layouts/MainLayout";
import AdminLayout from "../layouts/AdminLayout";
import Auth from "../components/Auth";
import { PageTracker } from "../components/PageTracker";
import ScrollToTop from "../components/ScrollToTop";

// Public Pages
import Home from "../pages/Home";
import Masterplan from "../pages/Masterplan";
import VillaDetail from "../pages/VillaDetail";
import Shortlist from "../pages/Shortlist";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import Register from "../pages/Register";
import OTPVerify from "../pages/OTPVerify";
import BookingReview from "../pages/BookingReview";
import Payment from "../pages/Payment";
import PaymentSuccess from "../pages/PaymentSuccess";
import CheckoutFailed from "../pages/CheckoutFailed";
import Profile from "../pages/Profile";
import PaymentHistory from "../pages/PaymentHistory";
import Contact from "../pages/Contact";
import About from "../pages/About";
import Onboarding from "../pages/Onboarding";
import Onboarding2 from "../pages/Onboarding2";
import Onboarding3 from "../pages/Onboarding3";
import ReservationSecured from "../pages/ReservationSecured";
import BookConsultant from "../pages/BookConsultant";

// Admin Pages
import Dashboard from "../pages/admin/Dashboard";
import Users from "../pages/admin/Users";
import Projects from "../pages/admin/Projects";
import Villas from "../pages/admin/Villas";
import Reservations from "../pages/admin/Reservations";
import LaunchTime from "../pages/admin/LaunchTime";
import ActivityLogs from "../pages/admin/ActivityLogs";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F5F2EBE5] flex items-center justify-center">
                <span className="font-display text-xs tracking-[0.15em] uppercase text-[#8B95A1] animate-pulse">
                    Loading Auth...
                </span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

function MainLayoutWrapper() {
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    );
}

function ProtectedMainLayoutWrapper() {
    return (
        <ProtectedRoute>
            <MainLayout>
                <Outlet />
            </MainLayout>
        </ProtectedRoute>
    );
}

function ProtectedAdminLayoutWrapper() {
    return (
        <ProtectedRoute>
            <AdminLayout>
                <Outlet />
            </AdminLayout>
        </ProtectedRoute>
    );
}

export default function AppRoutes() {
    return (
        <Auth>
            <PageTracker />
            <ScrollToTop />
            <Routes>
                {/* Public Routes with MainLayout */}
                <Route element={<MainLayoutWrapper />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/otp-verify" element={<OTPVerify />} />
                </Route>

                {/* Protected Routes with MainLayout */}
                <Route element={<ProtectedMainLayoutWrapper />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/onboarding-2" element={<Onboarding2 />} />
                    <Route path="/onboarding-3" element={<Onboarding3 />} />
                    <Route path="/masterplan" element={<Masterplan />} />
                    <Route path="/villa/:id" element={<VillaDetail />} />
                    <Route path="/shortlist" element={<Shortlist />} />
                    <Route path="/reservation-secured/:id" element={<ReservationSecured />} />
                    <Route path="/checkout/review/:id" element={<BookingReview />} />
                    <Route path="/checkout/payment/:id" element={<Payment />} />
                    <Route path="/checkout/success/:id" element={<PaymentSuccess />} />
                    <Route path="/checkout/failed/:id" element={<CheckoutFailed />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/payment-history" element={<PaymentHistory />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/book-consultant" element={<BookConsultant />} />
                </Route>

                {/* Admin Routes with AdminLayout */}
                <Route path="/admin" element={<ProtectedAdminLayoutWrapper />}>
                    <Route index element={<Dashboard />} />
                    <Route path="users" element={<Users />} />
                    <Route path="projects" element={<Projects />} />
                    <Route path="villas" element={<Villas />} />
                    <Route path="reservations" element={<Reservations />} />
                    <Route path="launch-time" element={<LaunchTime />} />
                    <Route path="activity-logs" element={<ActivityLogs />} />
                </Route>
            </Routes>
        </Auth>
    );
}
