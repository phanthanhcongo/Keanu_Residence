import React from "react";
import { useNavigate } from "react-router-dom";
import { useTracking } from "../hooks/useTracking";

export function Location() {
  const navigate = useNavigate();
  const { trackPageView, TrackingAction } = useTracking();
  return (
    <section className="bg-[#F3F4F6] py-16 md:py-32 px-8 md:px-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
        <div className="max-w-xl h-full">
          <span className="font-display text-[13px] tracking-[0.15em] uppercase text-[#8C7E6D] mb-4 block font-bold">
            Location
          </span>
          <h2 className="font-cinzel text-3xl md:text-5xl text-[#1A1A1A] mb-4 leading-tight">
            AT THE HEART
            <br />
            OF IT ALL
          </h2>
          <p className="font-lato text-[#4A4A4A] text-[16px] leading-[26px] mb-8 font-light">
            Set on Bali's sunrise coast, Keanu Residences offers a quiet return home
            while remaining within practical reach of Sanur and Ubud. A short drive to
            essentials, international schools, and leading healthcare.
          </p>

          <div className="font-lato space-y-0 border-t border-[#EBEAE5]">
            <div className="flex justify-between items-center py-4 border-b border-[#EBEAE5]">
              <span className="text-[#A69279] text-[20px] font-light">
                Sanur
              </span>
              <span className="text-[#1A1A1A] text-[20px] font-bold">
                30 mins
              </span>
            </div>
            <div className="flex justify-between items-center py-4 border-b border-[#EBEAE5]">
              <span className="text-[#A69279] text-[20px] font-light">
                Dyatmika School
              </span>
              <span className="text-[#1A1A1A] text-[20px] font-bold">
                15 mins
              </span>
            </div>
            <div className="flex justify-between items-center py-4 border-b border-[#EBEAE5]">
              <span className="text-[#A69279] text-[20px] font-light">
                Bali Safari
              </span>
              <span className="text-[#1A1A1A] text-[20px] font-bold">
                5 mins
              </span>
            </div>
            <div className="flex justify-between items-center py-4 border-b border-[#EBEAE5]">
              <span className="text-[#A69279] text-[20px] font-light">
                Ngurah Rai Int. Airport
              </span>
              <span className="text-[#1A1A1A] text-[20px] font-bold">
                55 mins
              </span>
            </div>
          </div>

          <button 
            className="font-lato mt-12 px-8 py-4 border border-[#1A1A1A] text-[#1A1A1A] font-display text-[13px] tracking-[0.15em] uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors font-bold"
            onClick={() => {
              trackPageView(TrackingAction.SEARCH, 'location', 'Neighborhood');
              navigate('/about');
            }}
          >
            Explore Neighborhood
          </button>
        </div>

        <div className="relative w-full overflow-hidden lg:mt-12">
          <img
            src="/images/masterplan/map.png"
            alt="Keanu Residences Location Map"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>
    </section>
  );
}