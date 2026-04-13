import { fetchWithAuth } from "../utils/api";

/* ── Types ── */

export interface ShortlistUnit {
    id: string;
    unitNumber: string;
    unitType: string;
    floor: number | null;
    size: number;
    bedrooms: number;
    bathrooms: number;
    price: number;
    launchPrice: number | null;
    status: string;
    description: string | null;
    floorPlanUrl: string | null;
    imageUrls: string[];
    features: Record<string, any>;
    project: {
        id: string;
        name: string;
        slug: string;
        developer: string;
        location: string | null;
    };
}

export interface ShortlistItem {
    id: string;
    unitId: string;
    createdAt: string;
    unit: ShortlistUnit;
}

export interface ShortlistResponse {
    data: ShortlistItem[];
    total: number;
}

/* ── API Functions ── */

export async function getShortlist(): Promise<ShortlistResponse> {
    return fetchWithAuth<ShortlistResponse>("/shortlist");
}

export async function addToShortlist(unitId: string): Promise<ShortlistItem> {
    return fetchWithAuth<ShortlistItem>(`/shortlist/${unitId}`, {
        method: "POST",
    });
}

export async function removeFromShortlist(unitId: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/shortlist/${unitId}`, {
        method: "DELETE",
    });
}
