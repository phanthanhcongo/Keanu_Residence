// Shared TypeScript types & interfaces

export interface VillaSpecs {
    totalBuildArea: string;
    landSize: string;
    bedrooms: string;
    pool: string;
    completion: string;
    ownership: string;
}

export interface VillaAdvisor {
    name: string;
    avatar: string;
    contactLabel: string;
}

export interface Villa {
    id: number;
    title: string;
    subtitle: string;
    type: string;
    badge: string;
    description: string;
    details: string;
    status: string;
    image: string;
    images: string[];
    specs: VillaSpecs;
    startingPrice: string;
    architectureText: string;
    interiorText: string;
    advisor: VillaAdvisor;
    floorPlanImage?: string;
}
