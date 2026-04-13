import React from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Villa } from "../types";

/* helpers */
function extractBeds(details: string) {
    const m = details.match(/(\d+)\s*Bed/i);
    return m ? m[1] : "–";
}
function extractSqm(specs: { totalBuildArea: string }) {
    const m = specs.totalBuildArea.match(/(\d+)/);
    return m ? m[1] : "–";
}

export function VillaCard({ villa }: { villa: Villa; key?: React.Key }) {
    const beds = extractBeds(villa.details);
    const sqm = extractSqm(villa.specs);

    const getBadgeStyle = (badge: string) => {
        switch (badge?.toUpperCase()) {
            case "AVAILABLE":
                return "bg-white/20 text-white";
            case "RESERVED":
                return "bg-[#D97706]/90 text-white";
            case "PRIVATE SALE":
                return "bg-[#C4956A]/90 text-white";
            case "SOLD":
                return "bg-[#B91C1C]/90 text-white";
            case "LOCKED":
                return "bg-[#475569]/90 text-white";
            case "UNAVAILABLE":
                return "bg-[#6B7280]/90 text-white";
            default:
                return "bg-[#A89B8C]/90 text-white";
        }
    };
    const badgeBg = getBadgeStyle(villa.badge);

    return (
        <div className="group border border-[#EBEAE5] bg-white flex flex-col">
            {/* image */}
            <div className="relative aspect-[4/3] overflow-hidden bg-[#EBEAE5]">
                <img
                    src={villa.image}
                    alt={villa.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                />
                <span
                    className={`absolute top-4 left-4 px-4 py-1.5 ${badgeBg} backdrop-blur-sm text-white font-display text-[11px] tracking-[0.18em] uppercase font-medium`}
                >
                    {villa.badge}
                </span>
            </div>

            {/* info */}
            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="font-serif text-lg text-[#1A1A1A]">
                        {villa.title}
                    </h3>
                    <span className="font-display text-sm font-medium text-[#1A1A1A] whitespace-nowrap">
                        {villa.startingPrice}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-display tracking-[0.1em] uppercase text-[#5A5A5A] mb-5">
                    <span>{beds} Bed</span>
                    <span className="text-[#D5D3CC]">·</span>
                    <span>{sqm} Sqm</span>
                    <span className="text-[#D5D3CC]">·</span>
                    <span>{villa.type}</span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#EBEAE5]">
                    <Link
                        to={`/villa/${villa.id}`}
                        className="flex items-center gap-1.5 font-display text-[10px] tracking-[0.15em] uppercase text-[#5A5A5A] hover:text-[#1A1A1A] transition-colors"
                    >
                        <Eye size={14} />
                        View Details
                    </Link>
                    <button className="px-4 py-2 border border-[#C4956A] font-display text-[10px] tracking-[0.15em] uppercase text-[#C4956A] hover:bg-[#C4956A] hover:text-white transition-colors">
                        Reserve
                    </button>
                </div>
            </div>
        </div>
    );
}
