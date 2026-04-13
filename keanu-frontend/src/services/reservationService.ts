import { fetchWithAuth } from "../utils/api";

export async function createReservationLock(unitId: string, projectId: string) {
    return fetchWithAuth<any>("/reservations", {
        method: "POST",
        body: JSON.stringify({ unitId, projectId }),
    });
}

export async function getReservation(reservationId: string) {
    return fetchWithAuth<any>(`/reservations/${reservationId}`);
}

export async function getReservations(params?: { status?: string; projectId?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append("status", params.status);
    if (params?.projectId) searchParams.append("projectId", params.projectId);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const queryString = searchParams.toString();
    const url = `/reservations${queryString ? `?${queryString}` : ""}`;

    return fetchWithAuth<any>(url);
}

export async function cancelReservation(reservationId: string) {
    return fetchWithAuth<any>(`/reservations/${reservationId}`, {
        method: "DELETE",
    });
}

export async function checkReservationPaymentStatus(
    reservationId: string,
    paymentIntentId?: string,
) {
    const search = paymentIntentId
        ? `?${new URLSearchParams({ paymentIntentId }).toString()}`
        : "";

    return fetchWithAuth<{ updated: boolean; message: string }>(
        `/reservations/${reservationId}/check-payment-status${search}`,
        {
            method: "POST",
        }
    );
}
