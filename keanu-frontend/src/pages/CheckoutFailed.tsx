import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, House } from "lucide-react";

export default function CheckoutFailed() {
    const [searchParams] = useSearchParams();
    const reason = searchParams.get("reason");

    return (
        <div className="min-h-screen bg-[#F9F6F3] flex items-center justify-center px-6">
            <div className="w-full max-w-xl bg-white border border-[#E8E2D9] shadow-lg p-8 md:p-10 text-center">
                <div className="mx-auto w-14 h-14 rounded-full bg-[#FFF1F0] text-[#C2410C] flex items-center justify-center mb-6">
                    <AlertTriangle size={24} />
                </div>

                <p className="font-display text-[10px] tracking-[0.2em] uppercase text-[#A08E7A] mb-2">
                    Checkout Failed
                </p>
                <h1 className="font-serif text-3xl text-[#2F2A24] mb-4 uppercase">
                    Payment Was Not Completed
                </h1>
                <p className="font-lato text-sm text-[#5B534A] leading-relaxed mb-8">
                    {reason || "We could not complete your Stripe checkout. Please return to home and try again."}
                </p>

                <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2F2A24] text-white font-display text-[10px] tracking-[0.2em] uppercase hover:bg-[#1F1B16] transition-colors"
                >
                    <House size={14} />
                    Go To Home
                </Link>
            </div>
        </div>
    );
}
