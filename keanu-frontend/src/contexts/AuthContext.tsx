import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, logoutApi, skipProfileCompletionApi, User } from "../services/authService";
import { saveAccessToken } from "../utils/api";

interface AuthContextValue {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setAuth: (token: string, user: User) => void;
    updateUser: (user: User) => void;
    logout: () => Promise<void>;
    skipProfileCompletion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(
        () => localStorage.getItem("accessToken")
    );
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount, if we have a token, try to fetch user info
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            setIsLoading(false);
            return;
        }
        setAccessToken(token);
        getMe()
            .then((u) => setUser(u))
            .catch(() => {
                // Token invalid/expired – clear it
                localStorage.removeItem("accessToken");
                setAccessToken(null);
            })
            .finally(() => setIsLoading(false));
    }, []);

    // Listen to global auth expiration (e.g. from axios interceptor or fetch responses)
    useEffect(() => {
        const handleAuthExpired = () => {
            localStorage.removeItem("accessToken");
            setAccessToken(null);
            setUser(null);
        };

        window.addEventListener("auth-expired", handleAuthExpired);
        return () => window.removeEventListener("auth-expired", handleAuthExpired);
    }, []);

    const setAuth = useCallback((token: string, userData: User) => {
        saveAccessToken(token);
        setAccessToken(token);
        setUser(userData);

        // Hydrate full profile (e.g. avatarUrl) in case login response is partial.
        getMe()
            .then((u) => setUser(u))
            .catch(() => {
                // Keep existing userData if hydration fails.
            });
    }, []);

    const updateUser = useCallback((userData: User) => {
        setUser(userData);
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } catch {
            // ignore errors
        } finally {
            localStorage.removeItem("accessToken");
            setAccessToken(null);
            setUser(null);
        }
    }, []);

    const skipProfileCompletion = useCallback(async () => {
        try {
            const updatedUser = await skipProfileCompletionApi();
            setUser(updatedUser);
        } catch (error) {
            console.error("Failed to skip profile completion:", error);
            throw error;
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isAuthenticated: !!accessToken && !!user,
                isLoading,
                setAuth,
                updateUser,
                logout,
                skipProfileCompletion,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
}
