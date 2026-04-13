const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/**
 * Helper to save token
 */
export function saveAccessToken(token: string) {
    localStorage.setItem("accessToken", token);
}


/**
 * Get standard headers including the Bearer token from localStorage
 */
export function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("accessToken");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Silently refresh the access token using the httpOnly refresh cookie
 */
async function tryRefreshToken(): Promise<boolean> {
    try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include", // Important for cookies
        });

        if (!res.ok) return false;
        const data = await res.json().catch(() => ({}));

        if (data?.accessToken) {
            saveAccessToken(data.accessToken);
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Generic response handler that handles 401s by attempting a silent refresh
 */
export async function handleResponse<T>(
    res: Response, 
    retryFn?: () => Promise<Response>,
    parseJson: boolean = true
): Promise<T | Response> {
    // If 401 Unauthorized and we have a retry function, try refreshing the token once
    if (res.status === 401 && retryFn) {
        const refreshed = await tryRefreshToken();
        
        if (refreshed) {
            // Call the retry function to get a fresh response
            const retryRes = await retryFn();
            // Process the retried response (without a retryFn to prevent infinite recursion)
            return handleResponse<T>(retryRes, undefined, parseJson);
        }
        
        // Refresh failed – clear local token and notify app to redirect to login
        localStorage.removeItem("accessToken");
        window.dispatchEvent(new Event("auth-expired"));
    }

    if (!parseJson) return res;

    // Parse JSON
    const data = await res.json().catch(() => ({}));

    // Handle other non-OK status codes
    if (!res.ok) {
        const message =
            data?.error?.message ||
            data?.message ||
            (Array.isArray(data?.message) ? data.message.join(", ") : null) ||
            "Something went wrong";
        throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }

    return data as T;
}

/**
 * Wrapper around fetch that includes auth headers, credentials, and silent refresh logic
 */
export async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    // Absolute URL or relative to API_URL
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;

    // Function to perform the fetch call (for initial call and optional retry)
    const call = () => {
        const headers = getAuthHeaders() as any;
        if (options.body instanceof FormData) {
            delete headers["Content-Type"];
        }

        return fetch(url, {
            ...options,
            credentials: "include", // Ensure cookies are sent (for refresh token)
            headers: {
                ...headers,
                ...options.headers,
            },
        });
    };

    const res = await call();
    return handleResponse<T>(res, call) as Promise<T>;
}

/**
 * Perform a fetch with auth but return the raw Response object (with silent refresh support)
 */
export async function fetchResponseWithAuth(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
    const call = () => {
        const headers = getAuthHeaders() as any;
        if (options.body instanceof FormData) {
            delete headers["Content-Type"];
        }

        return fetch(url, {
            ...options,
            credentials: "include",
            headers: {
                ...headers,
                ...options.headers,
            },
        });
    };

    const res = await call();
    return handleResponse<Response>(res, call, false) as Promise<Response>;
}
