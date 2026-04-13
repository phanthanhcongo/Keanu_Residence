import { fetchWithAuth, fetchResponseWithAuth } from "../utils/api";

async function downloadCsv(endpoint: string, fallbackPrefix: string): Promise<void> {
    const res = await fetchResponseWithAuth(endpoint);

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
            data?.error?.message ||
            data?.message ||
            (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
            "Failed to export CSV";
        throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }

    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const fileName =
        fileNameMatch?.[1] ||
        `${fallbackPrefix}-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function getProjects(includeDeleted: boolean = false): Promise<{ success: boolean; data: any[]; meta: any }> {
    const url = includeDeleted
        ? `/admin/projects?limit=100&includeDeleted=true`
        : `/admin/projects?limit=100`;
    return fetchWithAuth(url);
}

export async function createProject(payload: any): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth("/admin/projects", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateProject(id: string, payload: any): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth(`/admin/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteProject(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithAuth(`/admin/projects/${id}`, {
        method: "DELETE",
    });
}

export async function restoreProject(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithAuth(`/admin/projects/${id}/restore`, {
        method: "PATCH",
    });
}

export async function getVillas(includeDeleted: boolean = false): Promise<{ success: boolean; data: any[]; meta: any }> {
    const url = includeDeleted
        ? `/admin/units?limit=100&includeDeleted=true`
        : `/admin/units?limit=100`;
    return fetchWithAuth(url);
}

export async function createVilla(payload: any): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth("/admin/units", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateVilla(id: string, payload: any): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth(`/admin/units/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteVilla(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithAuth(`/admin/units/${id}`, {
        method: "DELETE",
    });
}

export async function restoreVilla(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithAuth(`/admin/units/${id}/restore`, {
        method: "PATCH",
    });
}

export async function restoreUser(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithAuth(`/admin/users/${id}/restore`, {
        method: "PATCH",
    });
}

export async function getUsers(role?: string, includeDeleted: boolean = false): Promise<{ success: boolean; data: any[]; meta: any }> {
    let url = `/admin/users?limit=100`;
    if (includeDeleted) {
        url += `&includeDeleted=true`;
    }
    if (role && role !== 'ALL') {
        url += `&role=${role}`;
    }
    return fetchWithAuth(url);
}

export async function exportUsersCSV(): Promise<void> {
    return downloadCsv("/admin/users/export-csv", "users-export");
}

export async function createUser(userData: any): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth("/admin/users", {
        method: "POST",
        body: JSON.stringify(userData),
    });
}

export async function updateUserRole(id: string, role: string): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth(`/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
    });
}

export async function updateUserStatus(id: string, data: { status?: string; isVerified?: boolean }): Promise<{ success: boolean; data: any; message?: string }> {
    return fetchWithAuth(`/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify(data),
    });
}

export async function deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchWithAuth(`/admin/users/${id}`, {
        method: "DELETE",
    });
}

export async function getReservations(): Promise<{ success: boolean; data: any; meta: any }> {
    return fetchWithAuth("/admin/reservations?limit=100");
}

export async function updateReservationStatus(id: string, status: string): Promise<{ success: boolean; data: any }> {
    return fetchWithAuth(`/admin/reservations/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
}

export async function updatePaymentStatus(id: string, status: string): Promise<{ success: boolean; data: any }> {
    return fetchWithAuth(`/admin/reservations/${id}/payment-status`, {
        method: "PATCH",
        body: JSON.stringify({ paymentStatus: status }),
    });
}

export async function exportReservationsCSV(): Promise<void> {
    return downloadCsv("/admin/reservations/export-csv", "reservations-export");
}

export async function getActivityLogs(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search?.trim()) searchParams.set("search", params.search.trim());

    const queryString = searchParams.toString();
    const endpoint = queryString
        ? `/admin/activity-logs?${queryString}`
        : `/admin/activity-logs`;

    return fetchWithAuth(endpoint);
}

export async function exportActivityLogsCSV(): Promise<void> {
    return downloadCsv("/admin/activity-logs/export-csv", "activity-logs-export");
}

export async function getStatistics(days: number = 30): Promise<{
    period: string;
    days: number;
    startDate: string;
    endDate: string;
    data: { date: string; registrations: number; visits: number }[];
    summary: {
        totalRegistrations: number;
        totalVisits: number;
        averageRegistrationsPerDay: string;
        averageVisitsPerDay: string;
    };
}> {
    return fetchWithAuth(`/admin/statistics?days=${days}`);
}

// FOMO Effect
export async function triggerFomo(): Promise<any> {
    return fetchWithAuth("/admin/fomo/trigger", {
        method: "POST",
    });
}

export async function stopFomo(): Promise<any> {
    return fetchWithAuth("/admin/fomo/stop", {
        method: "POST",
    });
}

export async function getFomoStatus(): Promise<any> {
    return fetchWithAuth("/admin/fomo/status");
}

export async function getManipulatedUserCount(): Promise<{
    realCount: number;
    delta: number;
    totalCount: number;
    timestamp: string;
}> {
    return fetchWithAuth("/admin/online-users/manipulated");
}

// --- GHL Integration ---
export async function getGHLStatus(): Promise<{
    success: boolean;
    data: {
        connected: boolean;
        status: string;
        locationId?: string;
        companyId?: string;
        tokenExpired?: boolean;
        lastTested?: string;
    };
}> {
    return fetchWithAuth("/v1/integrations/ghl/oauth/status");
}

export async function connectGHL(): Promise<{
    success: boolean;
    data: { authorizationUrl: string };
}> {
    return fetchWithAuth("/v1/integrations/ghl/oauth/authorize", {
        method: "POST",
    });
}

export async function disconnectGHL(): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth("/v1/integrations/ghl/oauth/disconnect", {
        method: "DELETE",
    });
}
