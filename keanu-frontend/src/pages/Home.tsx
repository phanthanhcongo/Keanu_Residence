import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Hero } from "../components/Hero";
import { VillaGrid } from "../components/VillaGrid";
import { Location } from "../components/Location";

export default function Home() {
    const location = useLocation();

    useEffect(() => {
        if (location.hash) {
            const element = document.getElementById(location.hash.substring(1));
            if (element) {
                // Ensure DOM is fully rendered then scroll instantly without animation
                setTimeout(() => {
                    element.scrollIntoView();
                }, 0);
            }
        } else {
            window.scrollTo(0, 0);
        }
    }, [location]);

    return (
        <div className="font-lato font-light text-[16px] leading-[26px] tracking-normal">
            <Hero />
            <VillaGrid />
        </div>
    );
}
